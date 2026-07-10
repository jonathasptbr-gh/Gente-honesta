"use strict";

// =========================================================================
// NÚCLEO DO APP — Firebase, roteador SPA, diálogos e estado global.
// Carregado ANTES de todos os outros módulos (session, auth, onboarding,
// install, feed), que dependem dos globals definidos aqui.
// =========================================================================

// =========================================================================
// ALTURA REAL DA VIEWPORT (--app-height)
// Fonte mais confiável que 100vh/100dvh em PWAs instalados e webviews, onde esses
// valores às vezes não batem com a área visível — era o que fazia a barra inferior
// do feed "vazar" para baixo da tela. O grid do feed (auto | 1fr | auto) usa esta
// altura para fixar topo e base e rolar só o meio.
// =========================================================================
(function () {
  const setAppHeight = () => {
    document.documentElement.style.setProperty('--app-height', window.innerHeight + 'px');
  };
  setAppHeight();
  window.addEventListener('resize', setAppHeight);
  window.addEventListener('orientationchange', setAppHeight);
})();


// =========================================================================
// CONFIGURAÇÃO CORE DO ECOSSISTEMA
// =========================================================================

// CONFIGURAÇÃO CORE DO ECOSSISTEMA - Service Worker e Atualização do PWA
// O app agora é o ponto de entrada único (index.html), então o registro do SW
// acontece aqui. Sem auto-reload forçado: o novo Service Worker fica esperando
// (self.skipWaiting() só roda quando o usuário confirma — ver service-worker.js)
// e só assumimos/recarregamos quando o usuário toca em "Atualizar" no banner
// (#pwa-update-banner). Verificamos updates a cada abertura/retorno ao app.
if ('serviceWorker' in navigator && window.IS_MOBILE) {
  // Só recarrega no controllerchange se ESTE clique em "Atualizar" pediu a
  // troca — o próprio clients.claim() do SW (service-worker.js) já dispara
  // "controllerchange" sozinho na primeiríssima instalação de um visitante
  // novo (quando ainda não há nenhum controller anterior). Sem essa guarda,
  // todo primeiro acesso recarregaria a página sozinho sem nenhum update real.
  let updateRequested = false;
  let reloadedForUpdate = false;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        console.log('[SW] registrado');

        const banner = document.getElementById('pwa-update-banner');
        const btnUpdate = document.getElementById('btn-pwa-update');

        const showUpdateBanner = (worker) => {
          if (!banner || !btnUpdate || !worker) return;
          banner.classList.remove('u-hidden');
          btnUpdate.onclick = () => {
            btnUpdate.disabled = true;
            btnUpdate.textContent = 'Atualizando...';
            updateRequested = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
          };
        };

        // Já existe uma versão nova pronta (instalada em segundo plano antes
        // desta checagem, ex.: enquanto o app estava em background)
        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdateBanner(registration.waiting);
        }

        // Uma nova versão começou a instalar agora — acompanha até ficar pronta
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(newWorker);
            }
          });
        });

        // CONFIGURAÇÃO CORE DO ECOSSISTEMA - Verificação Ativa de Atualização
        // Verifica assim que o app abre e sempre que volta ao primeiro plano
        // (comum em PWA instalado, que fica muito tempo aberto em background).
        const checkForUpdate = () => registration.update().catch(() => {});
        checkForUpdate();
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate();
        });
      })
      .catch(err => console.warn('[SW] falha no registro:', err));

    // Assim que o novo SW assume o controle (pós-clique em "Atualizar"),
    // recarrega a página para carregar os arquivos novos.
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!updateRequested || reloadedForUpdate) return;
      reloadedForUpdate = true;
      window.location.reload();
    });
  });
}

// CONFIGURAÇÃO CORE DO ECOSSISTEMA - Credenciais e Conexão Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC4tgtXqUs38hDdrLaFd0yFdyy6nlzaXSE",
  authDomain: "gente-honesta.firebaseapp.com",
  projectId: "gente-honesta",
  storageBucket: "gente-honesta.firebasestorage.app",
  messagingSenderId: "312267961981",
  appId: "1:312267961981:web:ee23092fb5c72b819ee314"
};

// CONFIGURAÇÃO CORE DO ECOSSISTEMA - Inicialização e Instância de Autenticação
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();


// =========================================================================
// ESTADO GLOBAL COMPARTILHADO ENTRE SEÇÕES (MEMÓRIA RAM DO SPA)
// =========================================================================

// ESTADO GLOBAL COMPARTILHADO ENTRE SEÇÕES - Objeto Reativo de Memória
window.appState = {
  confirmationResult: null,
  photoBlob: null,
  stream: null,
  selectedTags: [],
  cooldownActive: false,
  locationConfirmed: false,
  serviceProfile: { quality: 0, agility: 0, price: 0 },
  paymentMethods: { cash: false, pix: false, card: 0, nf: false }
};


// =========================================================================
// MAQUINÁRIO DO ROTEADOR SPA (MECÂNICA PURA DE TELAS)
// =========================================================================

// MAQUINÁRIO DO ROTEADOR SPA - Alternância de Views Principais (Seções de Bloco)
// Contrato: screens são controladas EXCLUSIVAMENTE por .screen--active.
// u-hidden NUNCA deve ser aplicado ou removido de elementos .screen aqui.
//
// Cor da barra de status (theme-color): segue o topo de cada tela para ficar
// mesclada. O feed tem top-bar verde → barra verde; intro e onboarding têm fundo
// branco (sem top-bar) → barra branca. Centralizado aqui pois é o único ponto que
// troca de tela.
// Todas as telas hoje têm fundo verde (auth, onboarding, install, feed), então
// a barra de status é verde em todas. (Mantém o mapa por clareza/extensão.)
const THEME_COLOR_BY_VIEW = {
  'view-feed': '#184e1b', // = var(--p-green), igual ao fundo da .top-bar
  'view-auth': '#184e1b',
  'view-onboarding': '#184e1b',
  'view-install': '#184e1b'
};

window.showView = function(viewId) {
  document.querySelectorAll('.screen').forEach(el => {
    el.classList.remove('screen--active');
  });

  const target = document.getElementById(viewId);
  if (target) {
    target.classList.add('screen--active');
    // NÃO esconder o loader aqui: quem o oculta é o onAuthStateChanged
    // (session.js), que faz um fade-out de 0.4s sobre a tela verde já ativa.
    // Escondê-lo instantaneamente aqui (u-hidden = display:none) matava esse
    // fade — o loader sumia de golpe antes da transição começar. Como o loader
    // só está visível no boot (sempre via onAuthStateChanged), deixar a ocultação
    // com o session.js é seguro e restaura a transição suave pós-splash.
  }

  // Atualiza a cor da barra de status conforme a tela ativa (branco por padrão)
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', THEME_COLOR_BY_VIEW[viewId] || '#FFFFFF');
};

// MAQUINÁRIO DO ROTEADOR SPA - Alternância de Sub-fluxos Internos (Sub-telas / Passos)
// Contrato: sub-elementos internos usam EXCLUSIVAMENTE u-hidden.
// ESCOPO: somente as .auth-section DENTRO de #view-auth (passos do login).
// A classe .auth-section também é reutilizada como ESTILO em outras telas
// (ex.: view-install) — escopo global aqui escondia esse conteúdo para sempre
// e causava tela branca após o cadastro.
// A animação stepFadeIn é reativada a cada transição removendo e restaurando
// a propriedade animation, forçando o browser a reprocessá-la do zero.
window.navigateTo = function(stepId) {
  document.querySelectorAll('#view-auth .auth-section').forEach(el => {
    el.classList.add('u-hidden');
  });

  const target = document.getElementById(stepId);
  if (target) {
    target.classList.remove('u-hidden');
    // Força reflow para que a animação reinicie corretamente
    target.style.animation = 'none';
    target.offsetHeight; // leitura deliberada para acionar reflow
    target.style.animation = '';
  }

};


// =========================================================================
// COMPONENTE - INTERFACE GLOBAL - Diálogo Universal Customizado
// =========================================================================

// COMPONENTE - INTERFACE GLOBAL - Diálogo Universal Customizado - Alerta Simples (Ok)
window.customAlert = function(message, title = "Aviso", iconClass = "error") {
  return new Promise((resolve) => {
    const dialog = document.getElementById('dialog-global');
    const btnConfirm = document.getElementById('btn-dialog-confirm');
    const btnCancel = document.getElementById('btn-dialog-cancel');
    const titleEl = document.getElementById('dialog-title');
    const messageEl = document.getElementById('dialog-message');
    const iconEl = document.getElementById('dialog-icon');
    if (!dialog || !btnConfirm || !btnCancel || !titleEl || !messageEl || !iconEl) {
      console.warn('[dialog] elementos ausentes');
      return resolve(true);
    }

    titleEl.innerText = title;
    messageEl.innerText = message;
    iconEl.innerHTML = `<span class="material-symbols-rounded">${iconClass}</span>`;

    btnCancel.classList.add('u-hidden'); // Alerta padrão não exibe opção de rejeição
    btnConfirm.innerText = "Ok";

    dialog.classList.remove('u-hidden');

    const closeHandler = () => {
      dialog.classList.add('u-hidden');
      btnConfirm.removeEventListener('click', closeHandler);
      resolve(true);
    };

    btnConfirm.addEventListener('click', closeHandler);
  });
};

// COMPONENTE - INTERFACE GLOBAL - Diálogo Universal Customizado - Confirmação Dual (Ok/Cancelar)
window.customConfirm = function(message, title = "Confirmação", iconClass = "help") {
  return new Promise((resolve) => {
    const dialog = document.getElementById('dialog-global');
    const btnConfirm = document.getElementById('btn-dialog-confirm');
    const btnCancel = document.getElementById('btn-dialog-cancel');
    const titleEl = document.getElementById('dialog-title');
    const messageEl = document.getElementById('dialog-message');
    const iconEl = document.getElementById('dialog-icon');
    if (!dialog || !btnConfirm || !btnCancel || !titleEl || !messageEl || !iconEl) {
      console.warn('[dialog] elementos ausentes');
      return resolve(false); // default seguro: equivale a cancelar a ação
    }

    titleEl.innerText = title;
    messageEl.innerText = message;
    iconEl.innerHTML = `<span class="material-symbols-rounded">${iconClass}</span>`;

    btnCancel.classList.remove('u-hidden'); // Exibe a opção de cancelamento/recusa
    btnConfirm.innerText = "Confirmar";
    btnCancel.innerText = "Cancelar";

    dialog.classList.remove('u-hidden');

    const confirmHandler = () => {
      cleanup();
      resolve(true);
    };

    const cancelHandler = () => {
      cleanup();
      resolve(false);
    };

    const cleanup = () => {
      dialog.classList.add('u-hidden');
      btnConfirm.removeEventListener('click', confirmHandler);
      btnCancel.removeEventListener('click', cancelHandler);
    };

    btnConfirm.addEventListener('click', confirmHandler);
    btnCancel.addEventListener('click', cancelHandler);
  });
};
