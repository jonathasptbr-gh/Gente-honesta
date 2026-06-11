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
// TELA - PROCESSO DE ONBOARDING - Persistência do Perfil do Usuário
// =========================================================================

// TELA - PROCESSO DE ONBOARDING - Finalização do Fluxo - CONCLUSÃO DO CADASTRO (updateProfile)
window.finishRegistration = async function() {
  const user = auth.currentUser;
  const nome = document.getElementById('inp-name').value.trim();
  const sobrenome = document.getElementById('inp-surname').value.trim();

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
    clearNameErrors();
  };

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
