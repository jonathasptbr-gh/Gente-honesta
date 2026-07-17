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
// BLOQUEIO DE ORIENTAÇÃO PAISAGEM (classe html.is-landscape via JS)
// Antes o bloqueio (.rotate-block) era acionado SÓ por CSS com
// `@media (orientation: landscape) and (max-height: 500px)`. Como o viewport usa
// `interactive-widget=resizes-content`, ao abrir o teclado virtual (ex.: digitar
// o nome no cadastro) a ALTURA da viewport encolhe abaixo da largura → o CSS
// passava a reportar `orientation: landscape` + `max-height` MESMO em retrato,
// e a tela "Gire o celular" cobria o app, travando o cadastro.
// Aqui detectamos a orientação REAL do dispositivo (que NÃO muda com o teclado)
// via Screen Orientation API, com fallbacks para `window.orientation` (iOS antigo)
// e, em último caso, o matchMedia. O CSS aciona o bloqueio por `html.is-landscape`.
// =========================================================================
(function () {
  const landscapeMq = window.matchMedia('(orientation: landscape)');
  const isDeviceLandscape = () => {
    const type = window.screen && window.screen.orientation && window.screen.orientation.type;
    if (type) return type.indexOf('landscape') === 0;
    if (typeof window.orientation === 'number') return Math.abs(window.orientation) === 90;
    return landscapeMq.matches;
  };
  const updateOrientationClass = () => {
    document.documentElement.classList.toggle('is-landscape', isDeviceLandscape());
  };
  updateOrientationClass();
  window.addEventListener('resize', updateOrientationClass);
  window.addEventListener('orientationchange', updateOrientationClass);
  if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
    window.screen.orientation.addEventListener('change', updateOrientationClass);
  }
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

          // Pergunta ao NOVO worker qual a versão dele e exibe no banner, para o
          // usuário saber qual atualização está disponível. Via MessageChannel:
          // a resposta chega na port1. Se o worker for de uma versão antiga (sem
          // o handler GET_VERSION), o texto padrão permanece.
          try {
            const textEl = document.getElementById('pwa-update-text');
            const channel = new MessageChannel();
            channel.port1.onmessage = (e) => {
              const v = e.data && e.data.version;
              if (v && textEl) textEl.textContent = `Nova versão disponível (${v}).`;
            };
            worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
          } catch (_) { /* sem versão: mantém o texto padrão */ }

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
  // "Padrão" (equilibrado) já vem selecionado como base no cadastro
  serviceProfile: { quality: 5, agility: 5, price: 5 },
  // Dinheiro já vem selecionado por padrão (a seção de pagamento não é obrigatória)
  paymentMethods: { cash: true, pix: false, card: 0, nf: false },
  // Perfil visível na busca/indicações da região — DESMARCADO por padrão
  // (o usuário básico não tem cadastro profissional; o check pressupõe os
  // dados profissionais preenchidos)
  profilePublic: false
};


// =========================================================================
// MAQUINÁRIO DO ROTEADOR SPA (MECÂNICA PURA DE TELAS)
// =========================================================================

// MAQUINÁRIO DO ROTEADOR SPA - Alternância de Views Principais (Seções de Bloco)
// Contrato: screens são controladas EXCLUSIVAMENTE por .screen--active.
// u-hidden NUNCA deve ser aplicado ou removido de elementos .screen aqui.
//
// Cor da barra de status (theme-color): centralizada aqui pois este é o único
// ponto que troca de tela. Todas as telas hoje têm fundo verde (auth, onboarding,
// install, feed), então a barra é verde em todas — uma constante única. Se algum
// dia uma tela precisar de outra cor, trocar por um mapa view→cor aqui.
const THEME_COLOR = '#184e1b'; // = var(--p-green)
window.THEME_COLOR = THEME_COLOR; // exposto p/ outros módulos (ex.: feed.js)

let _activeViewId = null;
window.showView = function(viewId) {
  // Troca de tela principal: descarta as camadas "voltar" da tela que SAI
  // (sub-passos do login, gavetas, diálogos) para não deixar sentinela órfã.
  // Só quando a tela REALMENTE muda — chamadas repetidas para a MESMA tela
  // (ex.: onAuthStateChanged do Firebase reemitindo com o mesmo usuário) NÃO
  // podem zerar as camadas abertas do feed (aba/gaveta/modo indicação).
  if (window.backNav && viewId !== _activeViewId) window.backNav.reset();
  _activeViewId = viewId;

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

  // Atualiza a cor da barra de status (verde em todas as telas)
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.setAttribute('content', THEME_COLOR);
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
// NAVEGAÇÃO PELO BOTÃO "VOLTAR" DO SISTEMA (Android / gesto de retorno)
// -------------------------------------------------------------------------
// O app é um SPA sem URLs: sem isto, o "voltar" do celular SAI do PWA em vez
// de fechar a gaveta/diálogo/passo aberto. Aqui mantemos uma PILHA de camadas
// dispensáveis (sheets, diálogos, popups, sub-passos do login, abas do feed,
// tutorial) sincronizada com a History API.
//
// Modelo de UMA sentinela: enquanto houver QUALQUER camada aberta existe
// exatamente UMA entrada extra no histórico. Cada "voltar" real fecha a camada
// do TOPO e, se ainda restarem camadas, re-arma a sentinela — assim um toque em
// "voltar" fecha uma camada de cada vez, sem nunca sair do app antes da hora.
//
// Contrato de uso (cross-módulo via window.backNav):
//   window.backNav.push('id-unico', fecharFn)  → ao ABRIR uma camada
//   window.backNav.remove('id-unico')          → ao FECHAR pela UI (tap/botão)
//   window.backNav.reset()                     → troca de tela principal (showView)
// A `fecharFn` registrada é o MESMO fechamento da UI; quando o "voltar" a chama,
// o remove() interno vira no-op (guarda handlingPop), evitando recursão.
//
// A reconciliação com o histórico é adiada para uma microtask e coalescida, de
// modo que "fechar A + abrir B" no mesmo toque (troca de gavetas irmãs) não gere
// history.back()+pushState no mesmo tick (condição de corrida) — vira um no-op.
// =========================================================================
window.backNav = (function () {
  const stack = [];            // [{ id, close }] — camadas abertas (LIFO)
  let sentinelActive = false;  // há uma sentinela no histórico ainda não consumida?
  let ignorePop = 0;           // popstates programáticos (nosso history.back) a ignorar
  let handlingPop = false;     // rodando o close() de um "voltar" real do usuário
  let reconcileScheduled = false;

  const findIdx = (id) => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].id === id) return i;
    return -1;
  };

  function reconcile() {
    reconcileScheduled = false;
    if (stack.length > 0 && !sentinelActive) {
      sentinelActive = true;
      try { history.pushState({ ghBackNav: true }, ''); } catch (_) { sentinelActive = false; }
    } else if (stack.length === 0 && sentinelActive) {
      sentinelActive = false;
      ignorePop++;
      try { history.back(); } catch (_) { ignorePop = Math.max(0, ignorePop - 1); }
    }
  }

  function scheduleReconcile() {
    if (reconcileScheduled) return;
    reconcileScheduled = true;
    Promise.resolve().then(reconcile);
  }

  function push(id, close) {
    if (!id || typeof close !== 'function') return;
    const existing = findIdx(id);
    if (existing !== -1) stack.splice(existing, 1);   // reabertura: move ao topo
    stack.push({ id, close });
    scheduleReconcile();
  }

  function remove(id) {
    if (handlingPop) return;                    // um "voltar" real já está desempilhando
    const idx = id ? findIdx(id) : stack.length - 1;
    if (idx === -1) return;                     // não rastreada (já fechada) — no-op
    stack.splice(idx, 1);
    scheduleReconcile();
  }

  // Troca de tela principal: as camadas pertencem à tela que está saindo.
  function reset() {
    if (!stack.length) { scheduleReconcile(); return; }
    stack.length = 0;
    scheduleReconcile();
  }

  window.addEventListener('popstate', function () {
    if (ignorePop > 0) { ignorePop--; return; }   // nosso próprio history.back()
    if (!sentinelActive) return;                  // não é nossa sentinela: deixa navegar
    // "Voltar" real do usuário consumindo a sentinela:
    sentinelActive = false;
    const layer = stack.pop();
    if (layer) {
      handlingPop = true;
      try { layer.close(); } catch (e) { console.warn('[backNav] close falhou', e); }
      handlingPop = false;
    }
    scheduleReconcile();   // re-arma a sentinela se ainda há camadas abertas
  });

  return {
    push, remove, reset,
    has: (id) => findIdx(id) !== -1,
    depth: () => stack.length,
  };
})();


// =========================================================================
// COMPONENTE - INTERFACE GLOBAL - Diálogo Universal Customizado
// =========================================================================

// COMPONENTE - INTERFACE GLOBAL - Diálogo Universal Customizado - PRIMITIVO ÚNICO
// Monta/popula/desmonta o #dialog-global com teardown ÚNICO (remove os dois
// listeners E limpa sempre a classe --scrollable, mesmo quando o alerta não a
// usou — antes um diálogo de ajuda interrompido deixava a classe presa no
// próximo alerta). Se um novo diálogo abrir sobre um pendente, o anterior é
// resolvido como `false` (cancelar) e seus handlers são desligados, evitando o
// empilhamento em que um clique resolvia dois diálogos.
// Retorna Promise<boolean>: true = confirmar, false = cancelar/fechar.
let _dialogSupersede = null; // teardown do diálogo atualmente aberto (se houver)
window.openDialog = function({ title = "Aviso", message = "", icon = "error",
                               showCancel = false, confirmText = "Ok",
                               cancelText = "Cancelar", scrollable = false } = {}) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('dialog-global');
    const btnConfirm = document.getElementById('btn-dialog-confirm');
    const btnCancel = document.getElementById('btn-dialog-cancel');
    const titleEl = document.getElementById('dialog-title');
    const messageEl = document.getElementById('dialog-message');
    const iconEl = document.getElementById('dialog-icon');
    const box = dialog?.querySelector('.dialog-box');
    if (!dialog || !btnConfirm || !btnCancel || !titleEl || !messageEl || !iconEl) {
      console.warn('[dialog] elementos ausentes');
      return resolve(false); // default seguro: equivale a cancelar a ação
    }

    // Substitui um diálogo ainda pendente (resolve o anterior como cancelar).
    if (_dialogSupersede) _dialogSupersede();

    titleEl.innerText = title;
    messageEl.innerText = message;
    iconEl.innerHTML = `<span class="material-symbols-rounded">${icon}</span>`;
    btnConfirm.innerText = confirmText;
    btnCancel.innerText = cancelText;
    btnCancel.classList.toggle('u-hidden', !showCancel);
    box?.classList.toggle('dialog-box--scrollable', !!scrollable);
    dialog.classList.remove('u-hidden');

    const cleanup = () => {
      dialog.classList.add('u-hidden');
      box?.classList.remove('dialog-box--scrollable');
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      _dialogSupersede = null;
      // Consome a camada "voltar" deste diálogo (no-op se o fechamento veio do
      // próprio botão "voltar" do sistema, que já a desempilhou).
      if (window.backNav) window.backNav.remove('dialog-global');
    };
    const settle = (value) => { cleanup(); resolve(value); };
    const onConfirm = () => settle(true);
    const onCancel = () => settle(false);
    // Botão "voltar" do sistema fecha o diálogo como cancelar/negar.
    if (window.backNav) window.backNav.push('dialog-global', onCancel);
    // Se superado por outro diálogo: desliga sem esconder (o novo já reusa o box).
    _dialogSupersede = () => {
      btnConfirm.removeEventListener('click', onConfirm);
      btnCancel.removeEventListener('click', onCancel);
      _dialogSupersede = null;
      resolve(false);
    };

    btnConfirm.addEventListener('click', onConfirm);
    btnCancel.addEventListener('click', onCancel);
  });
};

// Alerta simples (Ok) — sem opção de rejeição.
window.customAlert = function(message, title = "Aviso", iconClass = "error") {
  return window.openDialog({ title, message, icon: iconClass, showCancel: false, confirmText: "Ok" });
};

// Confirmação dual (Confirmar/Cancelar).
window.customConfirm = function(message, title = "Confirmação", iconClass = "help") {
  return window.openDialog({ title, message, icon: iconClass, showCancel: true,
                             confirmText: "Confirmar", cancelText: "Cancelar" });
};


// =========================================================================
// SOMBRAS DE FRONTEIRA DE SCROLL (mecânica ÚNICA, reutilizável)
// Todo container com a classe .js-scroll-shadows ganha um par de "shades"
// sticky (topo e base, injetadas aqui) que acendem quando há conteúdo
// CONTINUANDO sob aquela borda — estado nas classes has-scroll-above /
// has-scroll-below do próprio container (estilos em components.css).
// Usada na tela de cadastro (#view-onboarding) e nos containers de scroll
// das gavetas do feed (histórico, filtros, contratos, pedido, vaga,
// ajudante). Para um container criado em runtime, chame
// window.watchScrollShadows(el).
// =========================================================================
window.watchScrollShadows = function watchScrollShadows(el) {
  if (!el || el.dataset.shadowsWatched) return;
  el.dataset.shadowsWatched = '1';

  const mkShade = (pos) => {
    const d = document.createElement('div');
    d.className = `scroll-shade scroll-shade--${pos}`;
    d.setAttribute('aria-hidden', 'true');
    return d;
  };
  el.prepend(mkShade('top'));
  el.appendChild(mkShade('bottom'));

  // Escreve a classe SÓ quando muda — senão o próprio toggle realimentaria o
  // MutationObserver abaixo em loop.
  const set = (cls, on) => {
    if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
  };
  const update = () => {
    set('has-scroll-above', el.scrollTop > 2);
    set('has-scroll-below', el.scrollTop + el.clientHeight < el.scrollHeight - 2);
  };

  el.addEventListener('scroll', update, { passive: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(update).observe(el);
  // Conteúdo dinâmico (listas re-renderizadas, colapsáveis animando altura,
  // estados alternados por u-hidden) muda o scrollHeight sem rolar.
  new MutationObserver(update).observe(el, {
    childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'],
  });
  update();
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.js-scroll-shadows').forEach(window.watchScrollShadows);
});
