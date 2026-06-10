"use strict";

// =========================================================================
// CONFIGURAÇÃO E INSTÂNCIAS DE ESCOPO GLOBAL
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
// MONITOR DE SESSÃO CENTRALIZADO (FIREBASE AUTH STATE LIFECYCLE)
// =========================================================================

(() => {
  // BLOQUEIO DESKTOP: em desktop o app não inicializa — a tela de bloqueio
  // (CSS via html.is-desktop) cobre tudo e o monitor de sessão nem é registrado.
  if (!window.IS_MOBILE) return;

  const MINIMUM_LOADER_TIME = 1000;
  const startTime = Date.now();

  // MONITOR DE SESSÃO CENTRALIZADO - Observador Ativo do Estado de Autenticação
  auth.onAuthStateChanged(async (user) => {
    const loader = document.getElementById('loader-global');

    const timeElapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MINIMUM_LOADER_TIME - timeElapsed);
    await new Promise(resolve => setTimeout(resolve, remainingTime));

    if (user) {
      const lastSignInTimestamp = new Date(user.metadata.lastSignInTime).getTime();
      const nowTimestamp = Date.now();
      const secondsSinceSignIn = (nowTimestamp - lastSignInTimestamp) / 1000;
      const isNewSignIn = secondsSinceSignIn < 15;

      // MONITOR DE SESSÃO CENTRALIZADO - Verificação de Perfil Existente e Redirecionamento
      if (user.displayName && !isNewSignIn) {
        if (typeof showView === 'function') showView('view-feed');
        const userImg = document.getElementById('img-user-avatar');
        if (userImg && window.appState.photoBlob) {
          userImg.src = window.appState.photoBlob;
        }
      }
      // MONITOR DE SESSÃO CENTRALIZADO - Redirecionamento para Perfil Incompleto (Onboarding)
      else {
        if (typeof showView === 'function') showView('view-onboarding');
      }
    }
    // MONITOR DE SESSÃO CENTRALIZADO - Inicialização de Usuário Deslogado (Fallback)
    else {
      if (typeof showView === 'function') {
        showView('view-auth');
        // Reset central: garante que QUALQUER logout (feed, onboarding ou expiração
        // de sessão) limpe campos, timer de cooldown e reCAPTCHA antes de voltar à intro.
        if (typeof window.resetAuthFlow === 'function') window.resetAuthFlow();
        navigateTo('step-intro');
      }
    }

    // MONITOR DE SESSÃO CENTRALIZADO - Única responsável por esconder o loader após qualquer mudança de estado
    if (loader) {
      loader.classList.add('u-fade-out');
      setTimeout(() => loader.classList.add('u-hidden'), 400);
    }
  });
})();


// =========================================================================
// TELA - PROCESSO DE AUTENTICAÇÃO - Mecânica e Requisições SMS
// =========================================================================

// TELA - PROCESSO DE AUTENTICAÇÃO - Formulário de Telefone - GATILHO DO SMS (signInWithPhoneNumber)
// isResend: quando true, não navega para form-otp (já estamos lá) e não reinicia o cooldown UI
window.sendOTP = async function(isResend = false) {
  if (window.appState.cooldownActive && !isResend) {
    return await customAlert("Aguarde o tempo de segurança expirar antes de tentar um novo envio.", "Aguarde", "schedule");
  }

  const rawPhone = document.getElementById('inp-phone').value;
  const btn = document.getElementById('btn-send-sms');
  const originalText = btn.innerHTML;

  const cleanPhone = "+55" + rawPhone.replace(/\D/g, "");

  if (cleanPhone.length < 13) {
    return await customAlert("Insira um telefone válido com DDD para podermos enviar o código.", "Número Inválido", "phone_disabled");
  }

  document.activeElement?.blur();

  // Só atualiza o btn-send-sms se não for reenvio (ele está em outra tela)
  if (!isResend) {
    btn.disabled = true;
    btn.innerHTML = '<span class="material-symbols-rounded" style="display: inline-block; animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px; font-size: 22px;">autorenew</span> Enviando...';
    btn.classList.add('btn--loading');
  }

  // Limpeza do reCAPTCHA
  if (window.recaptchaVerifier) {
    try { window.recaptchaVerifier.clear(); } catch(e) { console.warn("Erro ao limpar verifier anterior:", e); }
    window.recaptchaVerifier = null;
  }

  const parentContainer = document.getElementById('recaptcha-container');
  if (parentContainer) parentContainer.innerHTML = '';
  else console.error("Elemento pai #recaptcha-container não foi encontrado no HTML.");

  const uniqueId = "recaptcha_" + Date.now();
  const dynamicChild = document.createElement('div');
  dynamicChild.id = uniqueId;
  parentContainer.appendChild(dynamicChild);

  try {
    window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier(uniqueId, {
      'size': 'invisible',
      'callback': () => {},
      'expired-callback': () => {
        if (!isResend) {
          btn.disabled = false;
          btn.innerHTML = originalText;
          btn.classList.remove('btn--loading');
        }
      }
    });
  } catch (initErr) {
    console.error("Erro catastrófico ao instanciar RecaptchaVerifier dinâmico:", initErr);
    if (!isResend) {
      btn.disabled = false;
      btn.innerHTML = originalText;
      btn.classList.remove('btn--loading');
    }
    return await customAlert("Erro na inicialização do módulo de segurança. Recarregue o app.", "Falha Interna", "sync");
  }

  // Retorna uma Promise para o chamador poder aguardar o resultado real
  return new Promise((resolve) => {
    auth.signInWithPhoneNumber(cleanPhone, window.recaptchaVerifier)
      .then((result) => {
        window.appState.confirmationResult = result;

        if (!isResend) {
          document.getElementById('text-display-phone').innerText = rawPhone;
          btn.disabled = false;
          btn.innerHTML = originalText;
          btn.classList.remove('btn--loading');
          navigateTo('form-otp');
        }

        startCooldown();
        resolve('success');
      })
      .catch(async (err) => {
        console.error("Erro detectado no Firebase Auth SMS:", err);

        if (!isResend) {
          btn.disabled = false;
          btn.innerHTML = originalText;
          btn.classList.remove('btn--loading');
        }

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

  const code = Array.from(document.querySelectorAll('.otp-grid__input'))
                    .map(i => i.value)
                    .join('');

  if (code.length < 6) {
    return await customAlert("Digite o código de verificação de 6 dígitos completo.", "Código Incompleto", "shield");
  }

  const btnVerify = document.getElementById('btn-verify-otp');
  let originalText = "Verificar e Entrar";

  if (btnVerify) {
    originalText = btnVerify.innerHTML;
    btnVerify.disabled = true;
    btnVerify.innerHTML = '<span class="material-symbols-rounded" style="display: inline-block; animation: spin 1s linear infinite; vertical-align: middle; margin-right: 8px; font-size: 22px;">autorenew</span> Verificando...';
    btnVerify.classList.add('btn--loading');
  }

  // TELA - PROCESSO DE AUTENTICAÇÃO - Verificação de Código OTP - Oculta teclado antes do carregamento
  document.activeElement?.blur();

  document.getElementById('loader-global')?.classList.remove('u-hidden');

  window.appState.confirmationResult.confirm(code)
    .then(() => {
      // Sucesso: onAuthStateChanged assume o controle do loader e do redirecionamento
      if (btnVerify) {
        btnVerify.disabled = false;
        btnVerify.innerHTML = originalText;
        btnVerify.classList.remove('btn--loading');
      }
    })
    .catch(async (err) => {
      console.error(err);
      // Erro: estado de auth não muda, então removemos o loader manualmente
      document.getElementById('loader-global')?.classList.add('u-hidden');
      if (btnVerify) {
        btnVerify.disabled = false;
        btnVerify.innerHTML = originalText;
        btnVerify.classList.remove('btn--loading');
      }
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
// TELA - PROCESSO DE ONBOARDING - Persistência do Perfil do Usuário
// =========================================================================

// TELA - PROCESSO DE ONBOARDING - Finalização do Fluxo - CONCLUSÃO DO CADASTRO (updateProfile)
window.finishRegistration = async function() {
  const user = auth.currentUser;
  const nome = document.getElementById('inp-name').value.trim();
  const sobrenome = document.getElementById('inp-surname').value.trim();

  // Limpa erros anteriores
  ['inp-name', 'inp-surname'].forEach(id => {
    document.getElementById(id)?.classList.remove('input-text--error');
  });
  document.getElementById('media-preview')?.classList.remove('media-capture__display--error');
  document.getElementById('btn-register-location')?.classList.remove('location-check--error-validation');

  let hasError = false;

  if (!window.appState.photoBlob) {
    document.getElementById('media-preview')?.classList.add('media-capture__display--error');
    hasError = true;
  }

  if (!nome) {
    document.getElementById('inp-name')?.classList.add('input-text--error');
    hasError = true;
  }

  if (!sobrenome) {
    document.getElementById('inp-surname')?.classList.add('input-text--error');
    hasError = true;
  }

  if (!window.appState.locationConfirmed) {
    document.getElementById('btn-register-location')?.classList.add('location-check--error-validation');
    hasError = true;
  }

  if (hasError) {
    // Rola suavemente até o primeiro campo com erro
    const firstError = document.querySelector(
      '.input-text--error, .media-capture__display--error, .location-check--error-validation'
    );
    if (firstError) {
      firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return await customAlert("Preencha os campos obrigatórios destacados em vermelho para concluir seu cadastro.", "Cadastro Incompleto", "error");
  }

  document.getElementById('loader-global')?.classList.remove('u-hidden');

  try {
    await user.updateProfile({ displayName: `${nome} ${sobrenome}` });
    const userImg = document.getElementById('img-user-avatar');
    if (userImg) userImg.src = window.appState.photoBlob;
    // updateProfile não dispara onAuthStateChanged — removemos o loader manualmente aqui
    document.getElementById('loader-global')?.classList.add('u-hidden');

    // PÓS-CADASTRO: se o app já roda como PWA instalado, vai direto ao feed.
    // Caso contrário, exibe (uma única vez, aqui) a tela-guia de instalação.
    if (typeof showView === 'function') {
      if (window.isStandalone && window.isStandalone()) {
        showView('view-feed');
      } else {
        if (typeof window.prepareInstallView === 'function') window.prepareInstallView();
        showView('view-install');
      }
    }
  } catch (err) {
    console.error(err);
    document.getElementById('loader-global')?.classList.add('u-hidden');
    await customAlert("Houve um erro técnico ao salvar as informações do seu perfil. Tente novamente.", "Erro ao Salvar", "database");
  }
};


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

  // INTERAÇÕES DO DOM - TELA - INSTALAÇÃO PWA - Preparação, estágios e ações
  // prepareInstallView é exposta em window para o finishRegistration decidir o
  // bloco visível NO MOMENTO de exibir a tela (o beforeinstallprompt pode ter
  // sido capturado a qualquer instante após o load).
  const installBlocks = () => ({
    android:  document.getElementById('install-block-android'),
    ios:      document.getElementById('install-block-ios'),
    generic:  document.getElementById('install-block-generic'),
    progress: document.getElementById('install-block-progress'),
    skip:     document.getElementById('btn-skip-install'),
    hero:     document.getElementById('icon-install-hero'),
    title:    document.getElementById('text-install-title'),
    sub:      document.getElementById('text-install-sub'),
    retry:    document.getElementById('btn-retry-install'),
  });

  window.prepareInstallView = () => {
    const el = installBlocks();
    [el.android, el.ios, el.generic, el.progress].forEach(b => b?.classList.add('u-hidden'));
    el.skip?.classList.remove('u-hidden');

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (window.deferredInstallPrompt) {
      el.android?.classList.remove('u-hidden'); // instalação em 1 toque
    } else if (isIOS) {
      el.ios?.classList.remove('u-hidden');     // passo a passo do Safari
    } else {
      el.generic?.classList.remove('u-hidden'); // instrução via menu do navegador
    }
  };

  // Estágio "instalação em andamento": o aceite no prompt NÃO significa app
  // instalado — informa o andamento, avisa que a aba pode ser fechada, oferece
  // retry discreto e REMOVE o acesso ao feed por esta tela (some o "Continuar
  // no navegador").
  const showInstallProgress = () => {
    const el = installBlocks();
    [el.android, el.ios, el.generic].forEach(b => b?.classList.add('u-hidden'));
    el.skip?.classList.add('u-hidden');
    el.progress?.classList.remove('u-hidden');
    if (el.hero)  el.hero.innerText = 'downloading';
    if (el.title) el.title.innerHTML = 'Instalação em<br>andamento...';
    if (el.sub)   el.sub.innerText = 'Em instantes o Gente Honesta estará disponível na sua tela inicial ou na gaveta de aplicativos. Você já pode fechar esta aba — depois, é só abrir o app pelo ícone.';
  };

  // Quando o sistema confirmar a instalação de fato (evento appinstalled),
  // atualiza o estágio para "instalado" e esconde o retry.
  window.addEventListener('appinstalled', () => {
    const progress = document.getElementById('install-block-progress');
    if (!progress || progress.classList.contains('u-hidden')) return; // não estamos neste fluxo
    const el = installBlocks();
    if (el.hero)  el.hero.innerText = 'task_alt';
    if (el.title) el.title.innerHTML = 'App instalado!';
    if (el.sub)   el.sub.innerText = 'Abra o Gente Honesta pelo ícone na sua tela inicial ou na gaveta de aplicativos. Esta aba já pode ser fechada.';
    el.retry?.classList.add('u-hidden');
  });

  // Dispara o prompt nativo de instalação (compartilhado pelo botão principal
  // e pelo retry). Aceitou → estágio de andamento. Cancelou → permanece na
  // tela, com o botão disponível para tentar de novo.
  const triggerInstallPrompt = async () => {
    const promptEvent = window.deferredInstallPrompt;
    if (!promptEvent) {
      // Prompt indisponível/já consumido — orienta o caminho manual.
      window.prepareInstallView();
      await customAlert(
        'O instalador automático não está disponível agora. Você pode instalar pelo menu do navegador: toque em ⋮ e escolha "Instalar app" ou "Adicionar à tela inicial".',
        'Instalação Manual',
        'info'
      );
      return;
    }

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.deferredInstallPrompt = null; // o evento só pode ser usado uma vez

    if (outcome === 'accepted') {
      showInstallProgress();
    }
    // Cancelou ("dismissed"): nada a fazer — a tela permanece com o botão
    // "Instalar agora" visível, e o feed continua acessível apenas pelo
    // "Continuar no navegador".
  };

  document.getElementById('btn-install-app')?.addEventListener('click', triggerInstallPrompt);
  document.getElementById('btn-retry-install')?.addEventListener('click', triggerInstallPrompt);

  // Botão "Continuar no navegador": ÚNICO caminho desta tela para o feed.
  document.getElementById('btn-skip-install')?.addEventListener('click', () => {
    if (typeof showView === 'function') showView('view-feed');
  });

  // INTERAÇÕES DO DOM - Reset completo do fluxo de auth
  // Exposto em window para que o observador central de sessão (onAuthStateChanged)
  // possa chamá-lo em QUALQUER logout — não só ao voltar do onboarding.
  // Chamado sempre que o usuário retorna à intro — limpa todos os campos e estado.
  window.resetAuthFlow = () => {
    // Telefone — restaura valor e placeholder explicitamente
    const phoneInput = document.getElementById('inp-phone');
    if (phoneInput) {
      phoneInput.value = '';
      phoneInput.placeholder = "(00) 0 0000-0000";
    }

    // OTP
    document.querySelectorAll('.otp-grid__input').forEach(f => f.value = '');

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

    // Campos do onboarding — input-float: limpar valor e forçar placeholder=" "
    // para que o label flutua/sobe funcione corretamente no próximo acesso
    const floatFields = ['inp-name', 'inp-surname'];
    floatFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.value = ''; el.placeholder = ' '; }
    });

    const bioEl = document.getElementById('inp-bio');
    if (bioEl) bioEl.value = '';
    const bioCounter = document.getElementById('text-bio-counter');
    if (bioCounter) bioCounter.innerText = '0';

    // Foto
    window.appState.photoBlob = null;
    if (window.appState.stream) {
      window.appState.stream.getTracks().forEach(t => t.stop());
      window.appState.stream = null;
    }
    const photoPreview = document.getElementById('media-preview');
    if (photoPreview) {
      photoPreview.style.backgroundImage = 'none';
      photoPreview.classList.remove('media-capture__display--captured', 'media-capture__display--error');
    }
    document.getElementById('media-placeholder')?.classList.remove('u-hidden');

    // Tags e localização
    window.appState.selectedTags = [];
    window.appState.locationConfirmed = false;
    window.appState.serviceProfile = { quality: 0, agility: 0, price: 0 };
    const tagsContainer = document.getElementById('container-tags');
    if (tagsContainer) tagsContainer.innerHTML = '';
    const locBtn = document.getElementById('btn-register-location');
    if (locBtn) locBtn.classList.remove('location-check--confirmed', 'location-check--error', 'location-check--error-validation');
    const locIcon = document.getElementById('icon-location-status');
    if (locIcon) locIcon.innerText = 'radio_button_unchecked';
    const locText = document.getElementById('text-location-status');
    if (locText) locText.innerText = 'Registrar sua região atual';

    // Erros de validação
    ['inp-name', 'inp-surname'].forEach(id => {
      document.getElementById(id)?.classList.remove('input-text--error');
    });
  };

  // INTERAÇÕES DO DOM - Mapeamento e Escuta de Cliques de Navegação Core
  document.getElementById('btn-start')?.addEventListener('click', () => navigateTo('form-phone'));

  document.getElementById('btn-back-phone')?.addEventListener('click', () => {
    // Limpa OTP ao voltar para o telefone
    document.querySelectorAll('.otp-grid__input').forEach(f => f.value = '');
    navigateTo('form-phone');
    const btnSend = document.getElementById('btn-send-sms');
    if (btnSend && window.appState.cooldownActive) {
      btnSend.disabled = true;
    }
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Botão voltar: faz logout e reset completo
  document.getElementById('btn-onboarding-back')?.addEventListener('click', async () => {
    const confirmed = await customConfirm(
      "Ao voltar, sua sessão será encerrada e você precisará confirmar seu número novamente.",
      "Sair do cadastro?",
      "logout"
    );
    if (confirmed) {
      document.getElementById('loader-global')?.classList.remove('u-hidden');
      try {
        await auth.signOut();
        // onAuthStateChanged centraliza o reset (window.resetAuthFlow) e o
        // redirecionamento para view-auth automaticamente.
      } catch (err) {
        console.error("Erro ao sair do onboarding:", err);
        document.getElementById('loader-global')?.classList.add('u-hidden');
      }
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

  document.getElementById('form-onboarding')?.addEventListener('submit', (e) => {
    e.preventDefault();
    finishRegistration();
  });

  // Reenvio: limpa OTP, mostra feedback persistente no link de reenvio e aguarda resultado real
  document.getElementById('btn-resend-sms')?.addEventListener('click', async () => {
    const btnResend = document.getElementById('btn-resend-sms');

    // Limpa campos OTP
    document.querySelectorAll('.otp-grid__input').forEach(f => f.value = '');

    // Feedback visual — muda o texto do link para "Enviando..." e desabilita
    const originalHTML = btnResend.innerHTML;
    btnResend.disabled = true;
    btnResend.innerHTML = '<span class="material-symbols-rounded" style="display:inline-block;animation:spin 1s linear infinite;vertical-align:middle;font-size:16px;margin-right:4px">autorenew</span>Enviando...';

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
      let v = e.target.value.replace(/\D/g, "").slice(0, 11);

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

  // INTERAÇÕES DO DOM - TELA - AUTENTICAÇÃO - Gerenciador Avançado das Caixas do Código OTP
  const otpFields = document.querySelectorAll('.otp-grid__input');
  otpFields.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/\D/g, "");
      e.target.value = val.slice(0, 1);

      if (e.target.value && index < otpFields.length - 1) {
        otpFields[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === "Backspace") {
        if (!input.value && index > 0) {
          otpFields[index - 1].value = "";
          otpFields[index - 1].focus();
        } else {
          input.value = "";
        }
        e.preventDefault();
      }
    });

    input.addEventListener('paste', (e) => {
      const data = e.clipboardData.getData('text').replace(/\D/g, "");
      if (data.length === 6) {
        otpFields.forEach((field, i) => field.value = data[i] || "");
        otpFields[5].focus();
        e.preventDefault();
      }
    });
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Navegação por Enter entre campos de texto
  const fieldOrder = ['inp-name', 'inp-surname', 'inp-bio'];
  fieldOrder.forEach((id, index) => {
    document.getElementById(id)?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const nextId = fieldOrder[index + 1];
        if (nextId) {
          document.getElementById(nextId)?.focus();
        } else {
          document.activeElement?.blur();
        }
      }
    });
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Limpeza de erros em tempo real
  // Nome e sobrenome: limpa ao digitar
  ['inp-name', 'inp-surname'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.classList.toggle('input-text--maxed', el.value.length >= parseInt(el.maxLength));
      if (el.value.trim()) el.classList.remove('input-text--error');
    });
  });

  // Localização: já limpa no próprio handler de sucesso (location-check--confirmed remove --error-validation)

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Contador e limite de vocação
  document.getElementById('inp-bio')?.addEventListener('input', (e) => {
    const counter = document.getElementById('text-bio-counter');
    if (counter) counter.innerText = e.target.value.length;
    e.target.classList.toggle('input-text--maxed', e.target.value.length >= 200);
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Câmera como dialog (padrão nativo do app)
  const videoElement      = document.getElementById('media-video');
  const btnSnap           = document.getElementById('btn-snap');
  const btnCameraCancel   = document.getElementById('btn-camera-cancel');
  const overlayCamera     = document.getElementById('overlay-camera');
  const photoPreviewImg   = document.getElementById('overlay-photo-preview');
  const photoPlaceholder  = document.getElementById('media-placeholder');
  const canvasElement     = document.getElementById('media-canvas');
  const mediaPreview      = document.getElementById('media-preview');

  let cameraPhotoTaken = false;

  const stopStream = () => {
    if (window.appState.stream) {
      window.appState.stream.getTracks().forEach(t => t.stop());
      window.appState.stream = null;
    }
  };

  // Inicia câmera no dialog (sem abrir/fechar o dialog)
  const startCameraStream = async () => {
    try {
      window.appState.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' }, audio: false
      });
      if (videoElement) {
        videoElement.srcObject = window.appState.stream;
        videoElement.style.display = '';
        videoElement.classList.remove('u-hidden');
      }
      if (photoPreviewImg) photoPreviewImg.classList.add('u-hidden');
    } catch (err) {
      console.error('Erro ao acessar câmera:', err);
      closeCameraDialog();
      await customAlert('Não foi possível acessar a câmera. Verifique as permissões nas configurações do dispositivo.', 'Acesso Negado', 'videocam_off');
    }
  };

  // Define botões no estado "tirar foto" (sem foto ainda)
  const setButtonsCapture = () => {
    if (btnSnap) {
      btnSnap.className = 'btn btn--outline camera-view__action-btn';
      btnSnap.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">photo_camera</span>Tirar foto';
      btnSnap.setAttribute('aria-label', 'Tirar foto');
    }
    if (btnCameraCancel) {
      btnCameraCancel.className = 'btn camera-view__action-btn camera-view__action-btn--cancel';
      btnCameraCancel.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>Cancelar';
      btnCameraCancel.setAttribute('aria-label', 'Cancelar');
    }
  };

  // Define botões no estado "foto tirada"
  const setButtonsReview = () => {
    if (btnSnap) {
      btnSnap.className = 'btn btn--outline camera-view__action-btn';
      btnSnap.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">replay</span>Outra foto';
      btnSnap.setAttribute('aria-label', 'Tirar outra foto');
    }
    if (btnCameraCancel) {
      btnCameraCancel.className = 'btn camera-view__action-btn camera-view__action-btn--confirm';
      btnCameraCancel.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">check</span>Usar foto';
      btnCameraCancel.setAttribute('aria-label', 'Confirmar foto');
    }
  };

  const openCameraDialog = async () => {
    cameraPhotoTaken = !!window.appState.photoBlob;
    if (cameraPhotoTaken) {
      // Foto já existe — mostra preview direto
      if (videoElement) { videoElement.style.display = 'none'; videoElement.classList.add('u-hidden'); }
      if (photoPreviewImg) { photoPreviewImg.src = window.appState.photoBlob; photoPreviewImg.classList.remove('u-hidden'); }
      setButtonsReview();
    } else {
      setButtonsCapture();
      overlayCamera?.classList.remove('u-hidden');
      await startCameraStream();
      return;
    }
    overlayCamera?.classList.remove('u-hidden');
  };

  const closeCameraDialog = () => {
    stopStream();
    overlayCamera?.classList.add('u-hidden');
    if (videoElement) { videoElement.style.display = ''; videoElement.classList.add('u-hidden'); }
    if (photoPreviewImg) photoPreviewImg.classList.add('u-hidden');
  };

  // Abre ao clicar na moldura
  mediaPreview?.addEventListener('click', openCameraDialog);
  mediaPreview?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCameraDialog(); }
  });

  // Botão esquerdo: tirar foto OU refazer
  btnSnap?.addEventListener('click', async () => {
    if (cameraPhotoTaken) {
      // Refazer: descarta foto e reinicia câmera SEM fechar/abrir o dialog
      window.appState.photoBlob = null;
      cameraPhotoTaken = false;
      if (mediaPreview) {
        mediaPreview.style.backgroundImage = 'none';
        mediaPreview.classList.remove('media-capture__display--captured');
      }
      if (photoPlaceholder) photoPlaceholder.classList.remove('u-hidden');
      setButtonsCapture();
      // Reinicia stream dentro do mesmo dialog
      await startCameraStream();
      return;
    }

    // Captura frame
    if (!videoElement || !canvasElement || !window.appState.stream) return;
    const ctx = canvasElement.getContext('2d');
    const vw = videoElement.videoWidth;
    const vh = videoElement.videoHeight;
    const ratio = 3 / 4;
    let sx = 0, sy = 0, sw = vw, sh = vh;
    if (vw / vh > ratio) { sw = vh * ratio; sx = (vw - sw) / 2; }
    else { sh = vw / ratio; sy = (vh - sh) / 2; }
    ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, 500, 667);
    window.appState.photoBlob = canvasElement.toDataURL('image/jpeg', 0.85);
    cameraPhotoTaken = true;

    stopStream();
    if (videoElement) videoElement.style.display = 'none';
    if (photoPreviewImg) { photoPreviewImg.src = window.appState.photoBlob; photoPreviewImg.classList.remove('u-hidden'); }
    setButtonsReview();
  });

  // Botão direito: cancelar OU confirmar
  btnCameraCancel?.addEventListener('click', () => {
    if (cameraPhotoTaken) {
      // Confirmar — aplica foto na moldura
      if (mediaPreview) {
        mediaPreview.style.backgroundImage = `url(${window.appState.photoBlob})`;
        mediaPreview.style.backgroundSize = 'cover';
        mediaPreview.style.backgroundPosition = 'center';
        mediaPreview.classList.add('media-capture__display--captured');
        mediaPreview.classList.remove('media-capture__display--error');
        if (photoPlaceholder) photoPlaceholder.classList.add('u-hidden');
      }
    }
    // Tanto cancelar quanto confirmar fecham o dialog
    closeCameraDialog();
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Botão de Localização com mensagens anti-falha
  document.getElementById('btn-register-location')?.addEventListener('click', async () => {
    if (window.appState.locationConfirmed) return;

    const btn = document.getElementById('btn-register-location');
    const icon = document.getElementById('icon-location-status');
    const statusText = document.getElementById('text-location-status');

    if (!navigator.geolocation) {
      if (btn) btn.classList.add('location-check--error');
      if (icon) icon.innerText = 'location_off';
      if (statusText) statusText.innerText = 'GPS não disponível neste dispositivo.';
      return;
    }

    if (btn) {
      btn.classList.remove('location-check--error', 'location-check--error-validation');
      btn.classList.add('location-check--loading');
    }
    if (icon) icon.innerText = 'progress_activity';
    if (statusText) statusText.innerText = 'Obtendo localização...';

    // Garante um loading mínimo visível para suavizar a confirmação,
    // inclusive quando a permissão já existe e o GPS responde instantaneamente.
    const startedAt = Date.now();
    const settle = (fn) => {
      const wait = Math.max(0, 750 - (Date.now() - startedAt));
      setTimeout(() => {
        if (btn) btn.classList.remove('location-check--loading');
        fn();
      }, wait);
    };

    navigator.geolocation.getCurrentPosition(
      () => settle(() => {
        window.appState.locationConfirmed = true;
        if (btn) {
          btn.classList.remove('location-check--error');
          btn.classList.remove('location-check--error-validation');
          btn.classList.add('location-check--confirmed');
        }
        if (icon) icon.innerText = 'check_circle';
        if (statusText) statusText.innerText = 'Região registrada com sucesso.';
      }),
      (err) => settle(() => {
        if (btn) {
          btn.classList.remove('location-check--confirmed');
          btn.classList.add('location-check--error');
        }
        if (icon) icon.innerText = 'location_off';

        if (err.code === err.PERMISSION_DENIED) {
          if (statusText) statusText.innerText = 'Permissão negada. Ative a localização nas configurações do app.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          if (statusText) statusText.innerText = 'Localização indisponível. Verifique se o GPS está ativado.';
        } else {
          if (statusText) statusText.innerText = 'Tempo esgotado. Tente novamente.';
        }
      }),
      { enableHighAccuracy: false, timeout: 10000 }
    );
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Busca de Áreas de Atuação
  const profesionalTags = [
    "Pedreiro", "Pintor", "Marceneiro", "Eletricista", "Encanador",
    "Serralheiro", "Gesseiro", "Azulejista", "Jardineiro", "Técnico em Informática",
    "Fotógrafo", "Designer Gráfico", "Cozinheiro", "Motorista", "Mecânico",
    "Borracheiro", "Chaveiro", "Vidraceiro", "Climatizador", "Montador de Móveis"
  ];
  const areaSearchInput = document.getElementById('inp-area-search');
  const areaResultsList = document.getElementById('list-area-results');
  const areaClearBtn    = document.getElementById('btn-area-clear');
  const tagsContainer   = document.getElementById('container-tags');

  const renderSelectedTags = () => {
    if (!tagsContainer) return;
    tagsContainer.innerHTML = '';
    window.appState.selectedTags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'tag-pill';
      pill.innerHTML = `${tag}<button type="button" class="tag-pill__remove" aria-label="Remover ${tag}">×</button>`;
      pill.querySelector('.tag-pill__remove').addEventListener('click', () => {
        window.appState.selectedTags = window.appState.selectedTags.filter(t => t !== tag);
        renderSelectedTags();
      });
      tagsContainer.appendChild(pill);
    });
  };

  const closeAreaResults = () => {
    areaResultsList?.classList.add('u-hidden');
    if (areaClearBtn) areaClearBtn.classList.add('u-hidden');
  };

  const updateAreaResults = () => {
    const query = areaSearchInput?.value.trim().toLowerCase() || '';

    const matches = profesionalTags.filter(t =>
      (query === '' || t.toLowerCase().includes(query)) && !window.appState.selectedTags.includes(t)
    );
    if (!areaResultsList) return;
    areaResultsList.innerHTML = '';
    if (matches.length === 0) { closeAreaResults(); return; }

    matches.forEach(tag => {
      const li = document.createElement('li');
      li.textContent = tag;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        // Feedback imediato de seleção
        li.classList.add('is-selecting');
        window.appState.selectedTags.push(tag);
        renderSelectedTags();
        if (areaSearchInput) areaSearchInput.value = '';
        if (areaClearBtn) areaClearBtn.classList.add('u-hidden');
        if (areaSearchInput) areaSearchInput.focus();
        updateAreaResults();
      });
      areaResultsList.appendChild(li);
    });
    areaResultsList.classList.remove('u-hidden');
    if (areaClearBtn && areaSearchInput?.value.trim()) areaClearBtn.classList.remove('u-hidden');
  };

  areaSearchInput?.addEventListener('focus', () => {
    setTimeout(() => {
      const el = document.getElementById('inp-area-search');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const screen = document.getElementById('view-onboarding');
      if (screen && rect.top > 120) {
        screen.scrollBy({ top: rect.top - 120, behavior: 'smooth' });
      }
    }, 350);
    updateAreaResults();
  });

  areaSearchInput?.addEventListener('input', updateAreaResults);

  // Blur: fecha lista e limpa texto
  areaSearchInput?.addEventListener('blur', () => {
    setTimeout(() => {
      closeAreaResults();
      if (areaSearchInput) areaSearchInput.value = '';
    }, 150); // pequeno delay para o mousedown da lista ter tempo de disparar
  });

  // X: limpa tudo e fecha lista
  areaClearBtn?.addEventListener('click', () => {
    if (areaSearchInput) { areaSearchInput.value = ''; areaSearchInput.focus(); }
    closeAreaResults();
  });

  // Fecha lista ao clicar fora
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.area-search')) closeAreaResults();
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Sistema de barras de pontos (qualidade + agilidade → valor)
  const TOTAL_POINTS = 10;
  const serviceState = { quality: 0, agility: 0 };

  const getValueTier = (v) => {
    if (v >= 8) return 'service-bar__fill--gold';
    if (v >= 5) return 'service-bar__fill--silver';
    return 'service-bar__fill--bronze';
  };

  const updateServiceBars = () => {
    const price = Math.floor((serviceState.quality + serviceState.agility) / 2);
    const pool = TOTAL_POINTS - serviceState.quality - serviceState.agility;

    document.getElementById('val-quality').innerText = serviceState.quality;
    document.getElementById('val-agility').innerText = serviceState.agility;
    document.getElementById('val-price').innerText = price;
    document.getElementById('val-pool').innerText = pool;

    document.getElementById('fill-quality').style.width = `${serviceState.quality * 10}%`;
    document.getElementById('fill-agility').style.width = `${serviceState.agility * 10}%`;

    const priceFill = document.getElementById('fill-price');
    priceFill.style.width = `${price * 10}%`;
    priceFill.className = `service-bar__fill ${getValueTier(price)}`;

    document.getElementById('btn-quality-minus').disabled = serviceState.quality === 0;
    document.getElementById('btn-quality-plus').disabled  = pool === 0 || serviceState.quality === 10;
    document.getElementById('btn-agility-minus').disabled = serviceState.agility === 0;
    document.getElementById('btn-agility-plus').disabled  = pool === 0 || serviceState.agility === 10;

    window.appState.serviceProfile = { quality: serviceState.quality, agility: serviceState.agility, price };
  };

  document.getElementById('btn-quality-plus')?.addEventListener('click', () => {
    if (serviceState.quality + serviceState.agility < TOTAL_POINTS) { serviceState.quality++; updateServiceBars(); }
  });
  document.getElementById('btn-quality-minus')?.addEventListener('click', () => {
    if (serviceState.quality > 0) { serviceState.quality--; updateServiceBars(); }
  });
  document.getElementById('btn-agility-plus')?.addEventListener('click', () => {
    if (serviceState.quality + serviceState.agility < TOTAL_POINTS) { serviceState.agility++; updateServiceBars(); }
  });
  document.getElementById('btn-agility-minus')?.addEventListener('click', () => {
    if (serviceState.agility > 0) { serviceState.agility--; updateServiceBars(); }
  });

  updateServiceBars(); // estado inicial

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Colapsável dos Detalhes Profissionais
  (() => {
    const btn = document.getElementById('btn-toggle-prodetails');
    const panel = document.getElementById('panel-prodetails');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const collapsible = btn.closest('.collapsible');
      const isOpen = !panel.classList.contains('u-hidden');
      if (isOpen) {
        panel.classList.add('u-hidden');
        collapsible?.classList.remove('collapsible--open');
      } else {
        panel.classList.remove('u-hidden');
        collapsible?.classList.add('collapsible--open');
      }
    });
  })();

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Botões de interrogação com diálogo scrollável
  const helpTexts = {
    'btn-ic-info': {
      title: 'O que é o Índice de Confiança?',
      icon: 'verified_user',
      text: `O Índice de Confiança (IC) é uma métrica interna da plataforma Gente Honesta que representa o nível de credibilidade e reputação de um usuário dentro do ecossistema.

Como funciona?
Ao se cadastrar, você recebe automaticamente 100 pontos — o voto de confiança inicial da plataforma. Esse índice não é fixo: ele sobe e desce conforme suas ações e interações.

O que aumenta seu IC:
• Avaliações positivas de clientes e parceiros
• Cumprimento de acordos e prazos
• Indicações recebidas de outros usuários
• Histórico de serviços concluídos com sucesso
• Tempo de atividade consistente na plataforma

O que reduz seu IC:
• Avaliações negativas ou reclamações
• Cancelamentos frequentes sem justificativa
• Disputas abertas contra você
• Inatividade prolongada
• Violações dos Termos de Uso

Por que ele importa?
Usuários com IC alto aparecem primeiro nas buscas, têm mais chances de receber indicações e transmitem mais confiança para novos clientes. Um IC baixo pode limitar funcionalidades e visibilidade no app.

Lembre-se: a confiança é construída devagar e perdida rapidamente. Use a plataforma com honestidade e seu índice refletirá isso naturalmente.`
    },
    'btn-service-help': {
      title: 'Como funciona o Padrão de Serviço?',
      icon: 'tune',
      text: `O Padrão de Serviço é uma forma de você comunicar aos clientes como você equilibra qualidade, agilidade e custo nos seus trabalhos.

Os três atributos:

Qualidade — representa o cuidado, acabamento e atenção aos detalhes do seu trabalho. Um profissional focado em qualidade entrega resultados impecáveis, mas pode levar mais tempo.

Agilidade — representa a velocidade de entrega. Um profissional ágil resolve rápido, mas pode sacrificar parte do acabamento ou cobrar mais pela urgência.

Valor cobrado — calculado automaticamente com base nos dois anteriores. Quanto mais qualidade e agilidade você oferece, maior tende a ser o valor percebido e cobrado pelo seu serviço.

Como distribuir os pontos?
Você tem 10 pontos para dividir entre Qualidade e Agilidade. Não existe distribuição certa ou errada — a ideia é ser honesto sobre como você trabalha de verdade.

Importante: essa configuração é apenas um ponto de partida. Com o tempo, as avaliações que você receber no app vão ajustar automaticamente esses índices para refletir sua reputação real. Então não se preocupe em ser perfeito agora — seja honesto.`
    }
  };

  Object.entries(helpTexts).forEach(([btnId, { title, icon, text }]) => {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      // Abre o diálogo padrão e adiciona classe de scroll após abrir
      const dialog = document.getElementById('dialog-global');
      const msgEl = document.getElementById('dialog-message');
      const box = dialog?.querySelector('.dialog-box');

      document.getElementById('dialog-title').innerText = title;
      msgEl.innerText = text;
      document.getElementById('dialog-icon').innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
      document.getElementById('btn-dialog-cancel').classList.add('u-hidden');
      document.getElementById('btn-dialog-confirm').innerText = 'Entendi';
      box?.classList.add('dialog-box--scrollable');
      dialog?.classList.remove('u-hidden');

      await new Promise(resolve => {
        const btn = document.getElementById('btn-dialog-confirm');
        const handler = () => {
          dialog.classList.add('u-hidden');
          box?.classList.remove('dialog-box--scrollable');
          btn.removeEventListener('click', handler);
          resolve();
        };
        btn.addEventListener('click', handler);
      });
    });
  });

});
