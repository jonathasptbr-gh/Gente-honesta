"use strict";

// =========================================================================
// FORMULÁRIO DE PERFIL (ONBOARDING) — captura de foto, dados pessoais,
// áreas de atuação, localização e padrão de serviço.
// Projetado para reuso: a futura tela de edição de perfil usará os mesmos
// campos e validações — saveProfile/finishRegistration é o ponto de entrada.
// =========================================================================

// HELPER — limpeza dos erros de validação dos campos de nome
const clearNameErrors = () =>
  ['inp-name', 'inp-surname'].forEach(id =>
    document.getElementById(id)?.classList.remove('input-text--error')
  );


// =========================================================================
// COLAPSÁVEL "DETALHES PROFISSIONAIS" — abertura/recolhimento ANIMADO
// Função declaration (hoisted) para ser usada tanto pelo gatilho quanto pelo
// finishRegistration e pelo reset. Anima a ALTURA de 0 → conteúdo (e vice-versa)
// medindo scrollHeight em runtime, então funciona com conteúdo de altura
// variável (barras, pagamento, pro-cta). u-hidden continua sendo o estado
// "fechado" final (display:none) — a animação só acontece na transição.
//
// Timing: abre em 1s (calmo) e fecha em 0.5s. APENAS altura anima (sem fade de
// opacidade, que deixava o verde vazar no fechamento). Overflow:hidden recorta.
//
// EASINGS ESPELHADOS (essencial): abrir usa easeOUT (arranca responsivo e
// DESACELERA suave — a curva material padrão começava lenta e "travava"); fechar
// usa easeIN (o espelho: começa suave e ACELERA até fechar por completo). Usar
// easeOut também no fechamento colapsava ~87% já na metade do tempo e depois
// ARRASTAVA o último naco (sobrava um título "parado") antes de sumir — a
// sanfona parecia não ir até o fim. Com easeIn o fechamento vai suave até 0.
// =========================================================================
const PRODETAILS_OPEN_TRANSITION  = `height 1000ms cubic-bezier(0.33, 1, 0.68, 1)`; // easeOutCubic
const PRODETAILS_CLOSE_TRANSITION = `height 500ms cubic-bezier(0.32, 0, 0.67, 0)`;  // easeInCubic

function setProDetailsOpen(open, animate = true) {
  const panel = document.getElementById('panel-prodetails');
  const collapsible = document.getElementById('btn-toggle-prodetails')?.closest('.collapsible');
  if (!panel || !collapsible) return;

  const isOpen = !panel.classList.contains('u-hidden');
  if (open === isOpen) return; // já no estado desejado

  // Remove o listener de uma animação anterior que não terminou (toggle rápido)
  // e cancela a transição em curso antes de iniciar outra.
  if (panel._proDetailsEnd) {
    panel.removeEventListener('transitionend', panel._proDetailsEnd);
    panel._proDetailsEnd = null;
  }
  panel.style.transition = '';

  const clearInline = () => {
    panel.style.height = '';
    panel.style.overflow = '';
    panel.style.transition = '';
  };

  if (open) {
    // `collapsible--open` gira o chevron; `collapsible--connected` mantém o cap
    // reto do gatilho enquanto o painel existe (do início da abertura ao FIM do
    // fechamento) — evita o "rasgo" verde nos cantos durante a animação.
    collapsible.classList.add('collapsible--open', 'collapsible--connected');
    panel.classList.remove('u-hidden');
    if (!animate) { clearInline(); return; }

    panel.style.overflow = 'hidden';
    panel.style.height = '0px';
    const target = panel.scrollHeight; // altura real do conteúdo (com padding)
    requestAnimationFrame(() => {
      panel.style.transition = PRODETAILS_OPEN_TRANSITION;
      panel.style.height = target + 'px';
    });
    const done = (e) => {
      if (e.target !== panel || e.propertyName !== 'height') return; // ignora filhos
      clearInline(); // volta para altura automática
      panel.removeEventListener('transitionend', done);
      panel._proDetailsEnd = null;
    };
    panel._proDetailsEnd = done;
    panel.addEventListener('transitionend', done);
  } else {
    // Chevron gira de volta IMEDIATAMENTE; o cap reto (connected) só sai quando o
    // painel some de vez (fim da animação), senão o canto arredondaria por cima
    // do painel ainda visível durante o fechamento.
    collapsible.classList.remove('collapsible--open');
    if (!animate) {
      panel.classList.add('u-hidden');
      collapsible.classList.remove('collapsible--connected');
      clearInline();
      return;
    }

    panel.style.overflow = 'hidden';
    panel.style.height = panel.scrollHeight + 'px';
    void panel.offsetHeight; // força reflow para o height inicial "pegar"
    requestAnimationFrame(() => {
      panel.style.transition = PRODETAILS_CLOSE_TRANSITION;
      panel.style.height = '0px';
    });
    const done = (e) => {
      if (e.target !== panel || e.propertyName !== 'height') return; // ignora filhos
      panel.classList.add('u-hidden');
      collapsible.classList.remove('collapsible--connected');
      clearInline();
      panel.removeEventListener('transitionend', done);
      panel._proDetailsEnd = null;
    };
    panel._proDetailsEnd = done;
    panel.addEventListener('transitionend', done);
  }
}

// HELPER — destaca em vermelho os campos ainda vazios da seção de dados
// profissionais (quando o usuário optou por COMPLETAR em vez de ignorar) e rola
// até o primeiro faltante. Só área/profissão e habilidades entram aqui — Padrão
// de Serviço e Pagamento têm defaults e nunca são "obrigatórios".
function highlightMissingProFields({ tags, bio }) {
  const areaInput = document.getElementById('inp-area-search');
  const bioInput = document.getElementById('inp-bio');
  if (!tags) areaInput?.classList.add('input-text--error');
  if (!bio) bioInput?.classList.add('input-text--error');
  // Espera a animação de abertura (~1s) antes de rolar até o campo
  setTimeout(() => {
    const first = !tags ? areaInput : bioInput;
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 1020);
}


// =========================================================================
// TELA - PROCESSO DE ONBOARDING - Persistência do Perfil do Usuário
// =========================================================================

// TELA - PROCESSO DE ONBOARDING - Finalização do Fluxo - CONCLUSÃO DO CADASTRO (updateProfile)
window.finishRegistration = async function() {
  const user = auth.currentUser;
  if (!user) {
    return await customAlert("Sua sessão expirou. Faça login novamente para concluir o cadastro.", "Sessão Expirada", "error");
  }
  const nome = document.getElementById('inp-name')?.value.trim() ?? '';
  const sobrenome = document.getElementById('inp-surname')?.value.trim() ?? '';

  // Limpa erros anteriores
  clearNameErrors();
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

  // DADOS PROFISSIONAIS — obrigatoriedade condicional
  // A seção inteira é opcional; mas se o usuário preencher QUALQUER um de seus
  // itens (área/tags, habilidades ou padrão de serviço), todos passam a ser
  // exigidos para que o perfil profissional fique público. Pagamento é ISENTO
  // (nunca obrigatório). Se ficou pela metade, oferecemos concluir o cadastro
  // básico mesmo assim (os dados profissionais só ficam visíveis quando
  // totalmente preenchidos) OU voltar e completar.
  // Gatilho da seção = campos que o usuário PREENCHE ativamente: área/profissão
  // (tags) ou habilidades (bio). Padrão de Serviço (sempre com um card ativo, base
  // "Padrão") e Pagamento (Dinheiro por padrão) têm valores default e NÃO iniciam
  // a seção sozinhos — senão o cadastro básico sempre cairia no aviso abaixo.
  const bioVal = document.getElementById('inp-bio')?.value.trim() ?? '';
  const proTagsFilled = window.appState.selectedTags.length > 0;
  const proBioFilled = bioVal.length > 0;
  const anyProFilled = proTagsFilled || proBioFilled;
  const allProFilled = proTagsFilled && proBioFilled;

  if (anyProFilled && !allProFilled) {
    const proceed = await customConfirm(
      "Você começou a preencher seus dados profissionais, mas ainda faltam campos. Eles só ficam visíveis publicamente quando estiverem completos.\n\nQuer concluir só o cadastro básico por enquanto? Você pode completar seus dados profissionais depois.",
      "Dados profissionais incompletos",
      "work"
    );
    if (!proceed) {
      // Usuário optou por COMPLETAR: abre a seção (animado), destaca o que falta
      // e rola até o primeiro campo vazio.
      setProDetailsOpen(true);
      highlightMissingProFields({ tags: proTagsFilled, bio: proBioFilled });
      return;
    }
    // proceder: segue com o cadastro básico (dados profissionais parciais NÃO
    // ficam públicos — sem persistência ainda; é o comportamento previsto).
  }

  document.getElementById('loader-global')?.classList.remove('u-hidden');

  try {
    await user.updateProfile({ displayName: `${nome} ${sobrenome}` });
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
// TUTORIAL DO CADASTRO (window.startTutorial — js/tutorial.js)
// Primeiro uso do motor genérico de tour guiado. Passos cujo elemento está
// oculto no momento (ex.: seção "Detalhes profissionais" fechada) são
// ignorados automaticamente pelo motor — não precisa expandir nada aqui.
// =========================================================================
window.startOnboardingTutorial = function () {
  if (typeof window.startTutorial !== 'function') return;

  window.startTutorial([
    {
      selector: '#field-photo',
      title: 'Dados pessoais',
      text: 'Adicione uma foto de perfil e preencha seu nome e sobrenome como você quer ser identificado na plataforma.'
    },
    {
      selector: '#btn-register-location',
      title: 'Sua região',
      text: 'Registre sua localização atual para aparecer nas buscas de quem precisa de profissionais perto de você.'
    },
    {
      selector: '#btn-toggle-prodetails',
      title: 'Detalhes profissionais',
      text: 'Seção opcional: conte sua área de atuação, habilidades e padrão de serviço para montar seu perfil profissional.'
    },
    {
      selector: '.ic-card',
      title: 'Índice de Confiança',
      // position:'top' — este é o último campo antes do botão de concluir, então
      // não há conteúdo suficiente abaixo dele na página para "puxá-lo" até o
      // topo da tela (block:'start' fica limitado pelo fim do documento); forçar
      // o balão acima evita que ele fique sem espaço de nenhum dos lados.
      position: 'top',
      text: 'Sua reputação na plataforma: começa em 70% e sobe ou cai conforme suas ações e avaliações. Cuide bem dela.'
    }
  ], { id: 'onboarding' });
};


// =========================================================================
// INTERAÇÕES, ESCUTADORES E COMPORTAMENTOS NATIVOS DO DOM
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // INTERAÇÕES DO DOM - Reset do formulário de perfil
  // Chamado pelo resetAuthFlow (auth.js) em qualquer logout — limpa todos os
  // campos, foto, tags, localização e barras de serviço.
  window.resetOnboardingForm = () => {
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
    // serviceProfile é redefinido logo abaixo por applyServiceCard(padraoCard)
    // (card "Padrão" = {5,5,5}) — não zerar aqui, evita divergir do default.
    const tagsContainer = document.getElementById('container-tags');
    if (tagsContainer) tagsContainer.innerHTML = '';
    const locBtn = document.getElementById('btn-register-location');
    if (locBtn) locBtn.classList.remove('location-check--confirmed', 'location-check--error', 'location-check--error-validation');
    const locIcon = document.getElementById('icon-location-status');
    if (locIcon) locIcon.innerText = 'radio_button_unchecked';
    const locText = document.getElementById('text-location-status');
    if (locText) locText.innerText = 'Registrar sua região atual';

    // Busca de área (input + lista de resultados)
    const areaInput = document.getElementById('inp-area-search');
    if (areaInput) areaInput.value = '';
    const areaList = document.getElementById('list-area-results');
    if (areaList) { areaList.innerHTML = ''; areaList.classList.add('u-hidden'); }
    document.getElementById('btn-area-clear')?.classList.add('u-hidden');

    // Padrão de serviços: volta ao card "Padrão" pré-selecionado (base)
    const padraoCard = document.querySelector('#container-service-choice [data-service="padrao"]');
    if (padraoCard) applyServiceCard(padraoCard);

    // Métodos de pagamento aceitos: NF/cartão zerados; DINHEIRO fica selecionado
    // por padrão (seção não obrigatória, mas já vem com dinheiro marcado).
    window.appState.paymentMethods = { cash: true, pix: false, card: 0, nf: false };
    document.querySelectorAll('#container-payment-methods .chip, #container-payment-card .chip, #container-payment-nf .chip')
      .forEach(chip => setPaymentChipActive(chip, chip.dataset.payment === 'cash'));

    // Colapsável de detalhes profissionais: fecha (instantâneo, sem animação)
    setProDetailsOpen(false, false);

    // Erros de validação (nome + destaques da seção profissional)
    clearNameErrors();
    document.getElementById('inp-area-search')?.classList.remove('input-text--error');
    document.getElementById('inp-bio')?.classList.remove('input-text--error');
    document.getElementById('container-service-choice')?.classList.remove('service-choice--error');
  };

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Botão cancelar: faz logout e reset completo
  document.getElementById('btn-onboarding-cancel')?.addEventListener('click', async () => {
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

  document.getElementById('form-onboarding')?.addEventListener('submit', (e) => {
    e.preventDefault();
    finishRegistration();
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
    if (e.target.value.trim()) e.target.classList.remove('input-text--error');
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
      // enableHighAccuracy:true aciona o GPS real do aparelho — no navegador do
      // celular a leitura "coarse" (rede/wifi) devolvia POSITION_UNAVAILABLE com
      // frequência e o registro nunca confirmava. O timeout de 10s antes era
      // curto demais: ele inclui o tempo do PRÓPRIO prompt de permissão, então
      // uma confirmação um pouco lenta já estourava (30s dá folga). maximumAge
      // aceita uma leitura recente (5 min) e confirma na hora se já houver fix.
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 300000 }
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
      pill.className = 'chip chip--md tag-pill';
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
        areaSearchInput?.classList.remove('input-text--error');
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

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Padrão de Serviços (seleção por card)
  // 4 perfis prontos; cada card carrega uma combinação de Qualidade/Agilidade/
  // Valor em data-q/data-a/data-v (escala 0-10, máx 8). Seleção ÚNICA estilo
  // rádio: SEMPRE há um card ativo ("Padrão" já vem selecionado como base). Tocar
  // em outro troca a seleção; tocar no já ativo não faz nada. Grava em
  // window.appState.serviceProfile ({quality, agility, price}).
  const serviceCards = document.querySelectorAll('#container-service-choice .service-choice__card');

  const setServiceCardActive = (card, active) => {
    card.classList.toggle('service-choice__card--active', active);
    card.setAttribute('aria-pressed', String(active));
    const check = card.querySelector('.service-choice__check');
    if (check) check.innerText = active ? 'check_circle' : 'radio_button_unchecked';
  };

  // Atualiza o display único de barras (svc-fill-*); a largura anima via CSS
  const updateServiceDisplay = (q, a, v) => {
    const fq = document.getElementById('svc-fill-quality');
    const fa = document.getElementById('svc-fill-agility');
    const fv = document.getElementById('svc-fill-value');
    if (fq) fq.style.width = `${q * 10}%`;
    if (fa) fa.style.width = `${a * 10}%`;
    if (fv) fv.style.width = `${v * 10}%`;
  };

  // function declaration (hoistada): resetOnboardingForm, definida bem antes no
  // callback, a chama — como os flip-helpers de feed.js, precisa ser callable
  // antes de sua posição textual para não depender só da chamada ser assíncrona.
  function applyServiceCard(card) {
    serviceCards.forEach(c => setServiceCardActive(c, c === card));
    const q = Number(card.dataset.q);
    const a = Number(card.dataset.a);
    const v = Number(card.dataset.v);
    window.appState.serviceProfile = { quality: q, agility: a, price: v };
    updateServiceDisplay(q, a, v);
  }

  serviceCards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.getAttribute('aria-pressed') === 'true') return; // rádio: já ativo mantém
      applyServiceCard(card);
    });
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Métodos de pagamento aceitos
  // Além da cor, cada pílula sinaliza a seleção com um check circular
  // (radio_button_unchecked → check_circle) no lugar do ícone de tipo.
  // function declaration (hoistada): chamada por resetOnboardingForm, acima.
  function setPaymentChipActive(chip, active) {
    chip.classList.toggle('chip--active', active);
    chip.setAttribute('aria-pressed', String(active));
    const check = chip.querySelector('.chip__check');
    if (check) check.innerText = active ? 'check_circle' : 'radio_button_unchecked';
  }

  // Dinheiro, Pix, Nota fiscal: pílulas independentes (multi-seleção). NF fica
  // num container à parte (#container-payment-nf), fora do título "aceitos",
  // mas usa a mesma lógica de toggle simples das demais.
  document.querySelectorAll('#container-payment-methods .chip, #container-payment-nf .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const method = chip.dataset.payment;
      const active = chip.getAttribute('aria-pressed') === 'true';
      setPaymentChipActive(chip, !active);
      window.appState.paymentMethods[method] = !active;
    });
  });

  // Cartão: seleção única (débito OU um nível de parcelamento do crédito) —
  // reflete o mesmo formato de dado de pro.pay.card no mock (0 = nenhum,
  // 'debit', ou o número máximo de parcelas). Tocar na pílula já ativa
  // desmarca (volta para "nenhum").
  document.querySelectorAll('#container-payment-card .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const wasActive = chip.getAttribute('aria-pressed') === 'true';
      document.querySelectorAll('#container-payment-card .chip').forEach(c => setPaymentChipActive(c, false));
      if (wasActive) {
        window.appState.paymentMethods.card = 0;
      } else {
        setPaymentChipActive(chip, true);
        const val = chip.dataset.card;
        window.appState.paymentMethods.card = val === 'debit' ? 'debit' : Number(val);
      }
    });
  });

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Colapsável dos Detalhes Profissionais
  (() => {
    const btn = document.getElementById('btn-toggle-prodetails');
    const panel = document.getElementById('panel-prodetails');
    if (!btn || !panel) return;
    btn.addEventListener('click', () => {
      const isOpen = !panel.classList.contains('u-hidden');
      setProDetailsOpen(!isOpen, true); // animação de descompactação/recolhimento
    });
  })();

  // INTERAÇÕES DO DOM - TELA - ONBOARDING - Botões de interrogação com diálogo scrollável
  const helpTexts = {
    'btn-ic-info': {
      title: 'O que é o Índice de Confiança?',
      icon: 'verified_user',
      text: `O Índice de Confiança é uma métrica interna da plataforma Gente Honesta que representa o nível de credibilidade e reputação de um usuário dentro do ecossistema.

Como funciona?
Ao se cadastrar, você recebe automaticamente um Índice de Confiança de 70%, o voto de confiança inicial da plataforma. Esse índice não é fixo: ele sobe e desce conforme suas ações e interações.

O que aumenta seu índice:
• Avaliações positivas de clientes e parceiros
• Cumprimento de acordos e prazos
• Indicações feitas a outros usuários
• Histórico de serviços concluídos com sucesso
• Tempo de atividade consistente na plataforma

O que reduz seu índice:
• Avaliações negativas ou reclamações
• Cancelamentos frequentes sem justificativa
• Disputas abertas contra você
• Inatividade prolongada
• Violações dos Termos de Uso

Por que ele importa?
Usuários com Índice de Confiança alto aparecem primeiro nas buscas, têm mais chances de receber indicações e transmitem mais confiança para novos clientes. Um índice baixo pode limitar funcionalidades e visibilidade no app.

Lembre-se: a confiança é construída devagar e perdida rapidamente. Use a plataforma com honestidade e seu índice refletirá isso naturalmente.`
    },
    'btn-service-help': {
      title: 'Como funciona o Padrão de Serviço?',
      icon: 'tune',
      text: `O Padrão de Serviço mostra aos clientes como você equilibra três atributos no seu trabalho:

Qualidade — cuidado, acabamento e atenção aos detalhes.
Agilidade — rapidez na entrega.
Valor — o quanto você cobra, em relação ao mercado.

Como escolher?
Em vez de ajustar tudo manualmente, você seleciona um dos 4 perfis prontos — o que melhor representa o seu jeito de trabalhar:

• Padrão (equilibrado) — equilíbrio entre os três atributos.
• Premium — foco em qualidade; entrega mais caprichada e valor mais alto.
• Rápido — foco em agilidade; resolve rápido.
• Custo-benefício — valor mais baixo, mantendo uma boa qualidade.

Basta tocar num card para selecioná-lo (toque de novo para desmarcar). Nenhum perfil começa "no máximo": sempre há espaço para crescer.

Importante: essa é só uma escolha inicial. Com o tempo, as avaliações que você receber vão ajustando esses índices automaticamente para refletir sua reputação real — então seja honesto.`
    }
  };

  Object.entries(helpTexts).forEach(([btnId, { title, icon, text }]) => {
    document.getElementById(btnId)?.addEventListener('click', async () => {
      // Abre o diálogo padrão e adiciona classe de scroll após abrir
      const dialog = document.getElementById('dialog-global');
      const msgEl = document.getElementById('dialog-message');
      const titleEl = document.getElementById('dialog-title');
      const iconEl = document.getElementById('dialog-icon');
      const btnCancel = document.getElementById('btn-dialog-cancel');
      const btnConfirm = document.getElementById('btn-dialog-confirm');
      const box = dialog?.querySelector('.dialog-box');
      if (!dialog || !msgEl || !titleEl || !iconEl || !btnCancel || !btnConfirm) return;

      titleEl.innerText = title;
      msgEl.innerText = text;
      iconEl.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
      btnCancel.classList.add('u-hidden');
      btnConfirm.innerText = 'Entendi';
      box?.classList.add('dialog-box--scrollable');
      dialog.classList.remove('u-hidden');

      await new Promise(resolve => {
        const handler = () => {
          dialog.classList.add('u-hidden');
          box?.classList.remove('dialog-box--scrollable');
          btnConfirm.removeEventListener('click', handler);
          resolve();
        };
        btnConfirm.addEventListener('click', handler);
      });
    });
  });

  document.getElementById('btn-subscribe-pro')?.addEventListener('click', () => {
    customAlert('A assinatura do Plano Pro estará disponível em breve.', 'Plano Pro', 'workspace_premium');
  });

});
