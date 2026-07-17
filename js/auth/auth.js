"use strict";

// =========================================================================
// LOGIN POR TELEFONE — intro, envio de SMS, verificação OTP e cooldown.
// O onboarding (formulário de perfil) vive em onboarding.js; o monitor de
// sessão que decide a tela inicial vive em session.js.
// =========================================================================

// CONFIGURAÇÃO E INSTÂNCIAS DE ESCOPO GLOBAL - Instância de Controle do Timer
window.authTimerInstance = null;

// CONFIGURAÇÃO E INSTÂNCIAS DE ESCOPO GLOBAL - Estado interno do cooldown (ancoragem temporal)
// cooldownEndsAt: instante-alvo (Date.now() + 60s). A cada tick os segundos restantes são
//   derivados do relógio real a partir deste valor, em vez de apenas decrementar um contador
//   — o setInterval é estrangulado/pausado em segundo plano e acumularia erro.
// cooldownVisibilityHandler: referência do listener de 'visibilitychange', guardada para
//   poder removê-lo em stopCooldown (evita listener órfão após o fim do cooldown ou um reset).
let cooldownEndsAt = 0;
let cooldownVisibilityHandler = null;


// =========================================================================
// HELPERS DE INTERFACE — REUTILIZADOS NO FLUXO DE LOGIN
// =========================================================================

// Renderiza os 6 quadradinhos do OTP a partir do valor do input ÚNICO.
// Função declaration (hoisted) para o clearOTPFields (const, abaixo) usar.
function renderOtpCells() {
  const input = document.getElementById('otp-input');
  const cells = document.querySelectorAll('.otp-cell');
  if (!input || !cells.length) return;
  const val = input.value;
  const focused = document.activeElement === input;
  const activeIdx = Math.min(val.length, cells.length - 1); // célula do "cursor"
  cells.forEach((cell, i) => {
    cell.textContent = val[i] || '';
    cell.classList.toggle('otp-cell--filled', !!val[i]);
    cell.classList.toggle('otp-cell--active', focused && i === activeIdx);
  });
}

const clearOTPFields = () => {
  const input = document.getElementById('otp-input');
  if (input) input.value = '';
  renderOtpCells();
};

const onlyDigits = (value) => value.replace(/\D/g, "");

function setButtonLoading(btn, label) {
  btn.disabled = true;
  // Spinner via classe .btn__spinner (components.css) — antes o estilo era
  // inline e duplicado aqui e no handler de reenvio.
  btn.innerHTML = `<span class="material-symbols-rounded btn__spinner">autorenew</span> ${label}`;
}

function restoreButton(btn, html) {
  btn.disabled = false;
  btn.innerHTML = html;
}


// =========================================================================
// TELA - PROCESSO DE AUTENTICAÇÃO - Mecânica e Requisições SMS
// =========================================================================

// TELA - PROCESSO DE AUTENTICAÇÃO - Formulário de Telefone - GATILHO DO SMS (signInWithPhoneNumber)
// isResend: quando true, não navega para form-otp (já estamos lá) e não reinicia o cooldown UI
window.sendOTP = async function(isResend = false) {
  if (window.appState.cooldownActive && !isResend) {
    return await customAlert("Aguarde o tempo de segurança expirar antes de tentar um novo envio.", "Aguarde", "schedule");
  }

  const phoneEl = document.getElementById('inp-phone');
  const btn = document.getElementById('btn-send-sms');
  if (!phoneEl || !btn) return;
  const rawPhone = phoneEl.value;
  const originalText = btn.innerHTML;

  const cleanPhone = "+55" + onlyDigits(rawPhone);

  if (cleanPhone.length < 13) {
    return await customAlert("Insira um telefone válido com DDD para podermos enviar o código.", "Número Inválido", "phone_disabled");
  }

  // WHITELIST DE TESTERS: verifica no Firestore se o número está autorizado.
  // Remova este bloco quando o app estiver aberto ao público.
  if (!isResend) {
    try {
      const testerDoc = await firebase.firestore().collection('testers').doc(cleanPhone).get();
      if (!testerDoc.exists) {
        return await customAlert(
          "Este número ainda não está na lista de acesso ao teste. Entre em contato com o administrador.",
          "Acesso Restrito",
          "lock"
        );
      }
    } catch (whitelistErr) {
      console.warn('[Whitelist] Erro ao verificar acesso:', whitelistErr);
      return await customAlert(
        "Não foi possível verificar seu acesso. Verifique sua conexão e tente novamente.",
        "Erro de Verificação",
        "cloud_off"
      );
    }
  }

  document.activeElement?.blur();

  // Só atualiza o btn-send-sms se não for reenvio (ele está em outra tela)
  if (!isResend) setButtonLoading(btn, 'Enviando...');

  // Limpeza do reCAPTCHA
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch(e) { console.warn("Erro ao limpar verifier anterior:", e); }
    window.recaptchaVerifier = null;
  }

  const parentContainer = document.getElementById('recaptcha-container');
  if (!parentContainer) {
    // Sem o container não há como montar o reCAPTCHA — aborta com o mesmo
    // tratamento da falha catastrófica abaixo (antes, o appendChild seguinte
    // lançava TypeError justamente no caso que este guarda previa).
    console.error("Elemento pai #recaptcha-container não foi encontrado no HTML.");
    if (!isResend) restoreButton(btn, originalText);
    return await customAlert("Erro na inicialização do módulo de segurança. Recarregue o app.", "Falha Interna", "sync");
  }
  parentContainer.innerHTML = '';

  const uniqueId = "recaptcha_" + Date.now();
  const dynamicChild = document.createElement('div');
  dynamicChild.id = uniqueId;
  parentContainer.appendChild(dynamicChild);

  try {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(uniqueId, {
      'size': 'invisible',
      'callback': () => {},
      'expired-callback': () => {
        if (!isResend) restoreButton(btn, originalText);
      }
    });
  } catch (initErr) {
    console.error("Erro catastrófico ao instanciar RecaptchaVerifier dinâmico:", initErr);
    if (!isResend) restoreButton(btn, originalText);
    return await customAlert("Erro na inicialização do módulo de segurança. Recarregue o app.", "Falha Interna", "sync");
  }

  // Retorna uma Promise para o chamador poder aguardar o resultado real
  return new Promise((resolve) => {
    auth.signInWithPhoneNumber(cleanPhone, window.recaptchaVerifier)
      .then((result) => {
        window.appState.confirmationResult = result;

        if (!isResend) {
          const phoneDisplay = document.getElementById('text-display-phone');
          if (phoneDisplay) phoneDisplay.innerText = rawPhone;
          restoreButton(btn, originalText);
          navigateTo('form-otp');
          // Botão "voltar" do sistema no passo OTP → retorna ao passo do telefone
          // (mesmo comportamento do "Alterar número").
          window.backNav?.push('auth:step-otp', () => {
            clearOTPFields();
            navigateTo('form-phone');
            const bs = document.getElementById('btn-send-sms');
            if (bs && window.appState.cooldownActive) bs.disabled = true;
          });
        }

        startCooldown();
        resolve('success');
      })
      .catch(async (err) => {
        console.error("Erro detectado no Firebase Auth SMS:", err);

        if (!isResend) restoreButton(btn, originalText);

        if (window.recaptchaVerifier) {
          try { window.recaptchaVerifier.clear(); } catch(e){}
          window.recaptchaVerifier = null;
        }
        if (parentContainer) parentContainer.innerHTML = '';

        await customAlert("Não conseguimos enviar o SMS. Verifique o número digitado ou sua conexão com a internet.", "Falha no Envio", "warning");
        resolve('error');
      });
  });
};

// TELA - PROCESSO DE AUTENTICAÇÃO - Verificação de Código OTP - VALIDAÇÃO DO TOKEN SMS (confirm)
// O loader é exibido aqui para feedback imediato, mas sua remoção é delegada
// exclusivamente ao onAuthStateChanged, que é disparado após o confirm() bem-sucedido.
// Em caso de erro, o loader é removido manualmente pois o estado de auth não muda.
window.verifyOTP = async function() {
  // Guarda de pré-condição: sem o resultado de confirmação (definido em sendOTP) não há
  // o que validar. Pode ocorrer se a tela de OTP for alcançada fora de ordem ou após um
  // reset de estado — evita o TypeError em confirmationResult.confirm().
  if (!window.appState.confirmationResult) {
    return await customAlert(
      "Sua sessão de verificação expirou. Volte e solicite um novo código por SMS.",
      "Sessão Expirada",
      "schedule"
    );
  }

  const code = document.getElementById('otp-input')?.value ?? '';

  if (code.length < 6) {
    return await customAlert("Digite o código de verificação de 6 dígitos completo.", "Código Incompleto", "shield");
  }

  const btnVerify = document.getElementById('btn-verify-otp');
  let originalText = "Verificar e Entrar";

  if (btnVerify) {
    originalText = btnVerify.innerHTML;
    setButtonLoading(btnVerify, 'Verificando...');
  }

  // TELA - PROCESSO DE AUTENTICAÇÃO - Verificação de Código OTP - Oculta teclado antes do carregamento
  document.activeElement?.blur();

  document.getElementById('loader-global')?.classList.remove('u-hidden');

  window.appState.confirmationResult.confirm(code)
    .then(() => {
      // Sucesso: onAuthStateChanged assume o controle do loader e do redirecionamento
      if (btnVerify) restoreButton(btnVerify, originalText);
    })
    .catch(async (err) => {
      console.error(err);
      // Erro: estado de auth não muda, então removemos o loader manualmente
      document.getElementById('loader-global')?.classList.add('u-hidden');
      if (btnVerify) restoreButton(btnVerify, originalText);
      await customAlert("O código inserido é inválido ou já expirou. Peça um novo envio se necessário.", "Código Inválido", "cancel");
    });
};


// =========================================================================
// TELA - PROCESSO DE AUTENTICAÇÃO - Controle do Temporizador (Cooldown)
// =========================================================================

// TELA - PROCESSO DE AUTENTICAÇÃO - Verificação de Código OTP - GERENCIADOR DE TEMPO RESILIENTE
// Resiliência real por ancoragem temporal: guardamos o instante-alvo de término
// (cooldownEndsAt) e, a cada tick, derivamos os segundos restantes de Date.now(). Assim o
// valor exibido reflete o tempo real decorrido mesmo que o app tenha ficado suspenso em
// segundo plano (onde o setInterval é estrangulado/pausado). Um listener de
// 'visibilitychange' re-sincroniza no instante em que o app volta ao primeiro plano,
// evitando o "salto" do número só no próximo tick.
function startCooldown() {
  // Encerra qualquer cooldown anterior (timer + listener) antes de iniciar um novo
  stopCooldown();

  const COOLDOWN_MS = 60000;
  cooldownEndsAt = Date.now() + COOLDOWN_MS;
  window.appState.cooldownActive = true;

  // TELA - PROCESSO DE AUTENTICAÇÃO - Verificação de Código OTP - Atualizador de Estado Visível da UI
  // Apenas reflete na UI os segundos recebidos; o encerramento do timer é centralizado
  // em stopCooldown (chamado pelo tick quando o tempo zera).
  const updateCooldownUI = (currentSeconds) => {
    const display = document.getElementById('text-seconds');
    const btnResend = document.getElementById('btn-resend-sms');
    const btnSend = document.getElementById('btn-send-sms');
    const wrapper = document.getElementById('text-timer');

    if (currentSeconds > 0) {
      if (btnResend) btnResend.classList.add('u-hidden');
      if (wrapper) wrapper.classList.remove('u-hidden');
      if (display) display.innerText = currentSeconds;

      if (btnSend) {
        btnSend.disabled = true;
        btnSend.innerText = `Aguarde (${currentSeconds}s)`;
      }
    } else {
      if (btnResend) {
        btnResend.classList.remove('u-hidden');
        if (wrapper) wrapper.classList.add('u-hidden');
      }

      if (btnSend) {
        btnSend.disabled = false;
        btnSend.innerText = "Enviar SMS";
      }
    }
  };

  // Recalcula os segundos restantes a partir do relógio real (não acumula erro)
  const tick = () => {
    const remaining = Math.max(0, Math.ceil((cooldownEndsAt - Date.now()) / 1000));
    updateCooldownUI(remaining);
    if (remaining <= 0) stopCooldown();
  };

  tick(); // estado imediato (evita 1s de atraso até o primeiro intervalo)
  window.authTimerInstance = setInterval(tick, 1000);

  // Re-sincroniza imediatamente ao retornar do segundo plano
  cooldownVisibilityHandler = () => {
    if (document.visibilityState === 'visible') tick();
  };
  document.addEventListener('visibilitychange', cooldownVisibilityHandler);
}

// TELA - PROCESSO DE AUTENTICAÇÃO - Controle do Temporizador (Cooldown) - ENCERRAMENTO CENTRALIZADO
// Único ponto que desliga o cooldown: limpa o intervalo, remove o listener de
// visibilidade e zera o estado. Usado pelo tick (tempo esgotado), por um novo
// startCooldown e pelo resetAuthFlow (logout/voltar).
function stopCooldown() {
  if (window.authTimerInstance) {
    clearInterval(window.authTimerInstance);
    window.authTimerInstance = null;
  }
  if (cooldownVisibilityHandler) {
    document.removeEventListener('visibilitychange', cooldownVisibilityHandler);
    cooldownVisibilityHandler = null;
  }
  window.appState.cooldownActive = false;
}


// =========================================================================
// INTERAÇÕES, ESCUTADORES E COMPORTAMENTOS NATIVOS DO DOM
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // INTERAÇÕES DO DOM - TELA - INTRO - Carrossel de apresentação (3 painéis)
  // Scroll-snap nativo no CSS faz o deslize; o JS só sincroniza os dots com a
  // posição de rolagem e permite tocar num dot para navegar até o slide.
  (() => {
    const track = document.getElementById('intro-carousel-track');
    const dots = Array.from(document.querySelectorAll('.intro-carousel__dot'));
    if (!track || dots.length === 0) return;

    const setActiveDot = (index) => {
      dots.forEach((dot, i) => dot.classList.toggle('intro-carousel__dot--active', i === index));
    };

    track.addEventListener('scroll', () => {
      const index = Math.round(track.scrollLeft / track.clientWidth);
      setActiveDot(Math.max(0, Math.min(dots.length - 1, index)));
    }, { passive: true });

    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' });
      });
    });
  })();

  // INTERAÇÕES DO DOM - Reset completo do fluxo de auth
  // Exposto em window para que o observador central de sessão (session.js)
  // possa chamá-lo em QUALQUER logout — não só ao voltar do onboarding.
  // Limpa o estado de login aqui e delega o formulário de perfil ao
  // resetOnboardingForm (onboarding.js).
  window.resetAuthFlow = () => {
    // Telefone — restaura valor e placeholder explicitamente
    const phoneInput = document.getElementById('inp-phone');
    if (phoneInput) {
      phoneInput.value = '';
      phoneInput.placeholder = "(00) 0 0000-0000";
    }

    // OTP
    clearOTPFields();

    // Cooldown — encerramento centralizado (timer + listener de visibilidade + estado)
    stopCooldown();
    const btnSend = document.getElementById('btn-send-sms');
    if (btnSend) { btnSend.disabled = false; btnSend.innerText = 'Enviar SMS'; }
    document.getElementById('btn-resend-sms')?.classList.add('u-hidden');
    document.getElementById('text-timer')?.classList.add('u-hidden');

    // reCAPTCHA
    if (window.recaptchaVerifier) {
      try { window.recaptchaVerifier.clear(); } catch(e){}
      window.recaptchaVerifier = null;
    }
    const recaptcha = document.getElementById('recaptcha-container');
    if (recaptcha) recaptcha.innerHTML = '';

    // Formulário de perfil (campos, foto, tags, localização, barras)
    if (typeof window.resetOnboardingForm === 'function') window.resetOnboardingForm();
  };

  // INTERAÇÕES DO DOM - Mapeamento e Escuta de Cliques de Navegação Core
  document.getElementById('btn-start')?.addEventListener('click', () => {
    navigateTo('form-phone');
    // Botão "voltar" do sistema no passo do telefone → retorna à intro (carrossel).
    window.backNav?.push('auth:step-phone', () => navigateTo('step-intro'));
  });

  document.getElementById('btn-back-phone')?.addEventListener('click', () => {
    // Consome a camada "voltar" do passo OTP (fechamento pela UI).
    window.backNav?.remove('auth:step-otp');
    clearOTPFields();
    navigateTo('form-phone');
    const btnSend = document.getElementById('btn-send-sms');
    if (btnSend && window.appState.cooldownActive) {
      btnSend.disabled = true;
    }
  });

  // INTERAÇÕES DO DOM - Mapeamento de Envios de Formulário (Melhor suporte mobile)
  document.getElementById('form-phone')?.addEventListener('submit', (e) => {
    e.preventDefault();
    sendOTP();
  });

  document.getElementById('form-otp')?.addEventListener('submit', (e) => {
    e.preventDefault();
    verifyOTP();
  });

  // Reenvio: limpa OTP, mostra feedback persistente no link de reenvio e aguarda resultado real
  document.getElementById('btn-resend-sms')?.addEventListener('click', async () => {
    const btnResend = document.getElementById('btn-resend-sms');

    clearOTPFields();

    // Feedback visual — muda o texto do link para "Enviando..." e desabilita
    const originalHTML = btnResend.innerHTML;
    btnResend.disabled = true;
    btnResend.innerHTML = '<span class="material-symbols-rounded btn__spinner btn__spinner--sm">autorenew</span>Enviando...';

    // Chama sendOTP em modo reenvio — não navega, não pisca, retorna Promise real
    const result = await sendOTP(true);

    // Após resposta: se erro, restaura o botão para o usuário tentar de novo
    // Se sucesso, startCooldown() já ocultará o botão via updateCooldownUI
    if (result === 'error') {
      btnResend.disabled = false;
      btnResend.innerHTML = originalHTML;
    }
    // Em caso de sucesso o botão será ocultado pelo cooldown — não precisa restaurar
  });

  // INTERAÇÕES DO DOM - TELA - AUTENTICAÇÃO - Máscara RegEx de Entrada de Telefone Br
  const phoneInput = document.getElementById('inp-phone');
  if (phoneInput) {
    phoneInput.maxLength = 16;
    const placeholderText = "(00) 0 0000-0000";
    phoneInput.placeholder = placeholderText;

    phoneInput.addEventListener('focus', () => {
      phoneInput.placeholder = "";
    });

    phoneInput.addEventListener('blur', () => {
      if (phoneInput.value === "") {
        phoneInput.placeholder = placeholderText;
      }
    });

    phoneInput.addEventListener('input', (e) => {
      let v = onlyDigits(e.target.value).slice(0, 11);

      if (v.length === 0) {
        e.target.value = "";
        return;
      }

      if (v.length <= 2) {
        v = `(${v}`;
      } else if (v.length === 3) {
        v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
      } else if (v.length <= 6) {
        v = `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3)}`;
      } else if (v.length <= 7) {
        v = `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}`;
      } else {
        v = `(${v.slice(0, 2)}) ${v.slice(2, 3)} ${v.slice(3, 7)}-${v.slice(7)}`;
      }

      e.target.value = v;
    });
  }

  // INTERAÇÕES DO DOM - TELA - AUTENTICAÇÃO - OTP (input ÚNICO + 6 células)
  // Um só input mantém o foco o tempo todo → o teclado não pisca/balança como
  // acontecia ao mover o foco entre 6 caixas. Digitar, apagar (Backspace), colar
  // e o autofill de SMS disparam 'input' — que sanitiza (só dígitos, máx 6) e
  // redesenha as células. Sem gerência manual de foco entre campos.
  const otpInput = document.getElementById('otp-input');
  if (otpInput) {
    const syncOtp = () => {
      otpInput.value = onlyDigits(otpInput.value).slice(0, 6);
      renderOtpCells();
    };
    otpInput.addEventListener('input', syncOtp);
    otpInput.addEventListener('focus', renderOtpCells);
    otpInput.addEventListener('blur', renderOtpCells);
    renderOtpCells(); // estado inicial (vazio)
  }

});
