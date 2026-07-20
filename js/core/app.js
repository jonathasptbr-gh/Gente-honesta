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
// =========================================================================
// VELOCIDADE ÚNICA DE MOVIMENTO — padroniza a "cara" das animações
// Toda animação de DESLOCAMENTO do app deriva sua DURAÇÃO de uma velocidade
// linear × a distância a percorrer → a velocidade é a MESMA por categoria de
// movimento (o tempo total varia com a distância). Piso/teto evitam movimentos
// curtos instantâneos e longos arrastados. `window.moveMs(distanciaPx, speed)` é
// a FONTE ÚNICA usada por core/feed/onboarding; a CURVA de cada transição
// continua a de sempre — só a DURAÇÃO passa a ser derivada da distância.
//
// DUAS velocidades direcionais + uma neutra:
//   - ABERTURA (elemento ENTRA na tela: gaveta desce, card sobe, seção sobe) →
//     mais SUAVE (mais lenta), p/ o elemento "chegar" com calma.
//   - FECHAMENTO (elemento SAI da tela) → mais ÁGIL (mais rápida), p/ a tela
//     liberar logo — reduz a sensação de espera no fim da animação.
//   - NEUTRA (navegação lateral que não é abrir/fechar: carrossel de abas,
//     `animateConcludeSwap`) → usa `MOVE_SPEED` (default do 2º argumento).
// Ajuste global de cadência = mexer nas 3 constantes abaixo.
// =========================================================================
window.MOVE_SPEED       = 1.3;   // px/ms — NEUTRA (movimentos laterais: abas, swaps)
window.MOVE_SPEED_OPEN  = 1.1;   // px/ms — ABERTURA (entra na tela): mais suave/lenta
window.MOVE_SPEED_CLOSE = 1.5;   // px/ms — FECHAMENTO (sai da tela): mais ágil/rápida
window.MOVE_MIN_MS = 220;    // piso (movimentos curtos não ficam instantâneos)
window.MOVE_MAX_MS = 1200;   // teto (movimentos longos não arrastam)
// MULTIPLICADOR DE VELOCIDADE (acelerador): 1 = normal, 2 = acelerado. O moveGate
// (abaixo) o sobe para 2 enquanto DRENA a fila de movimentos — só o ÚLTIMO da fila
// roda normal; os anteriores são agilizados 2×. Toda duração derivada de moveMs
// (gavetas, carrossel, indicação, popup) encolhe junto, sem tocar cada chamada.
window.MOVE_ACCEL = 1;
window.moveMs = (distancePx, speed = window.MOVE_SPEED) => Math.round(Math.min(window.MOVE_MAX_MS,
  Math.max(window.MOVE_MIN_MS, Math.abs(distancePx) / (speed * (window.MOVE_ACCEL || 1)))));

// =========================================================================
// TRAVA + FILA + ACELERADOR DE MOVIMENTOS (window.moveGate)
// Regra de segurança: uma animação de DESLOCAMENTO não pode COMEÇAR enquanto
// outra ainda não terminou — é o que elimina os bugs de "camadas atravessadas /
// elementos sumindo" ao tocar rápido (dois movimentos reparentando/limpando DOM
// ao mesmo tempo). Movimentos disparados durante um em curso entram na FILA, na
// ordem, e rodam um após o outro.
//
// ACELERADOR (na FILA): cada item ENFILEIRADO roda 2× (via MOVE_ACCEL, que encolhe
// AS DURAÇÕES da própria animação E a duração reportada JUNTAS — sem sobreposição),
// MENOS o ÚLTIMO, que roda normal. O item EM CURSO NÃO é encurtado: a trava só solta
// quando a duração REPORTADA por ele termina — encurtá-lo (como uma tentativa anterior
// via playbackRate fazia) sobrepunha, porque animações multi-fase (flip: rotação→
// expansão em setTimeout) têm fases futuras que o playbackRate não alcança, e a trava
// soltava no meio. Resultado: rajada de toques = sequência que drena ágil (itens da
// fila 2×) e SEMPRE sem sobreposição.
//
// NÃO passam pela trava micro-interações (press/cor) nem estados "parados" (uma
// gaveta/overlay já aberto e em repouso não bloqueia) — só a JANELA de animação.
// Uso: window.moveGate.run('id', () => { …faz o movimento…; return duracaoMs; })
//   - `play()` EXECUTA o movimento e devolve a duração (ms) da sua animação. A duração
//     DEVE cobrir a animação inteira (todas as fases + folga) — é o que garante zero
//     sobreposição. Subestimar solta a trava cedo e o próximo movimento atropela.
// A fila AVANÇA por TIMER (duração devolvida + folga) — nunca depende de
// transitionend, então NUNCA trava (um transitionend perdido não congela o app).
// =========================================================================
window.moveGate = (() => {
  const pending = [];
  let running = null;   // { timer, accelerate, accelerated, settled }
  function launch(item) {
    const accel = pending.length ? 2 : 1;   // há mais na fila atrás → agiliza; senão normal
    const prev = window.MOVE_ACCEL;
    window.MOVE_ACCEL = accel;
    let result = 260;
    try { result = item.play(); } catch (e) { console.warn('[moveGate] play falhou:', e); }
    window.MOVE_ACCEL = prev;
    const rec = { accelerate: item.accelerate || null, accelerated: false, settled: false, timer: null };
    running = rec;
    // A trava solta quando a animação REALMENTE termina. Movimento multi-fase (flip,
    // carrossel) devolve uma PROMISE que resolve no fim de verdade — acelerar faz
    // resolver antes, então a trava NUNCA solta no meio (zero sobreposição, sem depender
    // do timer bater com a animação). O timer é só FALLBACK anti-deadlock. Um movimento
    // simples pode devolver um número (duração) → usa só o timer.
    const done = () => { if (rec.settled) return; rec.settled = true; clearTimeout(rec.timer); running = null; if (pending.length) launch(pending.shift()); };
    rec.done = done;
    if (result && typeof result.then === 'function') {
      result.then(done, done);
      rec.timer = setTimeout(done, 3500);   // fallback generoso (a promise deve resolver antes)
    } else {
      const dur = (typeof result === 'number' && result > 0) ? result : 260;
      rec.timer = setTimeout(done, Math.max(80, dur) + 40);
    }
  }
  // Agiliza 2× o movimento EM CURSO quando um novo chega atrás. NÃO mexe no timer: a
  // trava solta na conclusão REAL da animação (promise) — acelerar só faz essa conclusão
  // vir antes. Assim nunca solta antes do fim, mesmo que a aceleração não seja exata.
  // `accelerate` reprograma TODAS as fases da animação (ver makeFlipTimeline/carouselAccelerate).
  function speedUpRunning() {
    if (!running || !running.accelerate || running.accelerated) return;
    running.accelerated = true;
    try { running.accelerate(); } catch (e) { console.warn('[moveGate] accelerate falhou:', e); }
  }
  return {
    // run(id, play, accelerate?) — `play()` devolve uma PROMISE (resolve no fim real da
    // animação) ou um número (duração, p/ o timer). `accelerate()` (opcional) agiliza 2×
    // a animação em curso; chamado quando um movimento novo entra na fila.
    run(id, play, accelerate) {
      if (running) { pending.push({ id, play, accelerate }); speedUpRunning(); }
      else launch({ id, play, accelerate });
    },
    get busy() { return !!running; },
    get depth() { return pending.length; },
  };
})();

// =========================================================================
// ÍCONES (SVG sprite) — window.icon / window.setIcon
// A antiga fonte Material Symbols foi trocada por um sprite SVG inline (topo do
// <body>, símbolos #ic-NOME). Vantagem: o ícone desenha no 1º paint, sem esperar
// download de fonte e SEM depender de rede — offline-safe no PWA (a fonte cross-
// origin nunca era cacheada pelo Service Worker; offline os glifos viravam texto).
//   window.icon(nome, classeExtra?)  → devolve o HTML de um ícone (<svg><use>).
//   window.setIcon(elIcone, nome)    → troca o glifo de um ícone JÁ no DOM
//                                       (substitui o antigo elemento.textContent = nome).
// A classe .icon foi mantida no <svg> de propósito: preserva a
// cascata das ~40 regras de CSS que dimensionam por font-size e colorem por color
// (agora via fill:currentColor) e os querySelector('.icon') do JS.
// =========================================================================
// Aviso em runtime: um #ic-NOME sem <symbol> no sprite renderiza EM BRANCO, sem
// erro. Este console.warn pega no teste os refs DINÂMICOS que o checker estático
// (scripts/check-icons.mjs) não enxerga. Inócuo em produção (custo O(1), sem UI).
function _warnMissingIcon(name) {
  if (!document.getElementById('ic-' + name)) console.warn('[icon] símbolo ausente no sprite:', name);
}
window.icon = function (name, extraClass) {
  _warnMissingIcon(name);
  return `<svg class="icon${extraClass ? ' ' + extraClass : ''}" aria-hidden="true"><use href="#ic-${name}"></use></svg>`;
};
window.setIcon = function (iconEl, name) {
  _warnMissingIcon(name);
  const use = iconEl && iconEl.querySelector('use');
  if (use) use.setAttribute('href', '#ic-' + name);
};

// =========================================================================
// ERRO DE FORMULÁRIO — fonte única do mecanismo "linha vermelha".
// A CLASSE varia por primitiva (input-text--error, media-capture__display--error,
// location-check--error/-validation, vaga-days--error) e é passada por argumento
// — é BEM legítimo, não deriva. O mecanismo (marcar/limpar/rolar ao primeiro)
// é um só. Usado por onboarding (cadastro/edição) e feed (criar vaga / pedido).
// =========================================================================
window.markFieldError = function (el, cls = 'input-text--error') {
  el?.classList.add(cls);
};
window.clearFieldError = function (el, ...cls) {
  if (!el) return;
  el.classList.remove(...(cls.length ? cls : ['input-text--error']));
};
// Rola até o PRIMEIRO campo marcado dentro do container (comportamento padrão
// da validação do cadastro). Seletor cobre todas as classes de erro do app.
window.focusFirstError = function (container, sel) {
  const first = (container || document).querySelector(
    sel || '.input-text--error, .media-capture__display--error, .location-check--error-validation, .vaga-days--error'
  );
  first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return first;
};

// Frase única da validação de obrigatórios (era duplicada em onboarding e no
// criar-vaga, com finais divergentes — o complemento vai por concatenação).
window.MSG_REQUIRED_FIELDS = 'Preencha os campos obrigatórios destacados em vermelho';

// =========================================================================
// FOCO DAS CAMADAS MODAIS — fonte única (par do backNav).
// As camadas declaram role="dialog" aria-modal, mas nada movia o foco: leitor
// de tela/teclado ficava atrás do véu. enter(el, panelSel?) guarda o abridor e
// foca o painel (tabindex=-1 + preventScroll — sem salto de scroll, sem
// teclado); leave(el) devolve o foco ao abridor se ele ainda existe e o foco
// segue dentro da camada. Supersede-safe: se o foco JÁ está dentro da camada
// (um diálogo substituindo outro), o abridor original registrado é mantido.
// =========================================================================
window.layerFocus = (() => {
  const openers = new WeakMap();
  const safeFocus = (el) => { try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } };
  return {
    enter(el, panelSel) {
      if (!el) return;
      const opener = document.activeElement;
      if (opener && opener !== document.body && !el.contains(opener)) openers.set(el, opener);
      const panel = (panelSel && el.querySelector(panelSel)) || el;
      if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
      safeFocus(panel);
    },
    leave(el) {
      if (!el) return;
      const opener = openers.get(el);
      openers.delete(el);
      if (opener && document.contains(opener) && el.contains(document.activeElement)) safeFocus(opener);
    },
  };
})();

(function () {
  const setViewportVars = () => {
    const root = document.documentElement;
    root.style.setProperty('--app-height', window.innerHeight + 'px');
    // Carrossel de painéis + trilho da action bar deslizam UMA largura de viewport
    // → duração pela mesma velocidade única (recalculada no resize/rotação).
    root.style.setProperty('--panel-slide-dur', `${window.moveMs(window.innerWidth)}ms`);
  };
  setViewportVars();
  window.addEventListener('resize', setViewportVars);
  window.addEventListener('orientationchange', setViewportVars);
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
        // Versão da PÁGINA em execução (o selo do loader; bumpado JUNTO com o
        // CACHE_NAME por regra do projeto — mesmo formato "v###" do APP_VERSION).
        const pageVersion = (document.getElementById('version-badge')?.textContent || '').trim();

        const showUpdateBanner = (worker, version) => {
          if (!banner || !btnUpdate || !worker) return;
          banner.classList.remove('u-hidden');
          const textEl = document.getElementById('pwa-update-text');
          if (version && textEl) textEl.textContent = `Nova versão disponível (${version}).`;
          btnUpdate.onclick = () => {
            btnUpdate.disabled = true;
            btnUpdate.textContent = 'Atualizando...';
            updateRequested = true;
            worker.postMessage({ type: 'SKIP_WAITING' });
          };
        };

        // Decide a UX da atualização pelo confronto de versões (worker novo vs
        // PÁGINA em execução). Com o fetch Network-First (cache:'no-cache'), um
        // cold start pós-deploy já carrega os ARQUIVOS novos com o worker velho
        // ainda no controle — o worker novo instala e oferecia a MESMA versão
        // que a tela já mostrava (banner absurdo p/ o usuário). Regra:
        //  - worker == página → só o worker/cache offline está atrasado: ativa
        //    SILENCIOSAMENTE (SKIP_WAITING sem banner; sem updateRequested o
        //    controllerchange do claim NÃO recarrega — guarda abaixo).
        //  - worker != página (ou sem resposta ao GET_VERSION) → atualização
        //    real surgiu com o app aberto: banner, como sempre.
        const maybeOfferUpdate = (worker) => {
          if (!worker) return;
          let settled = false;
          const showBanner = (v) => { if (!settled) { settled = true; showUpdateBanner(worker, v); } };
          try {
            const channel = new MessageChannel();
            channel.port1.onmessage = (e) => {
              const v = e.data && e.data.version;
              if (settled) return;
              if (v && pageVersion && v === pageVersion) {
                settled = true;
                worker.postMessage({ type: 'SKIP_WAITING' });   // ativação silenciosa
              } else {
                showBanner(v);
              }
            };
            worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
            // Worker antigo sem o handler GET_VERSION (ou resposta perdida):
            // após a folga, cai no banner com o texto padrão.
            setTimeout(() => showBanner(null), 1500);
          } catch (_) { showBanner(null); }
        };

        // Já existe uma versão nova pronta (instalada em segundo plano antes
        // desta checagem, ex.: enquanto o app estava em background)
        if (registration.waiting && navigator.serviceWorker.controller) {
          maybeOfferUpdate(registration.waiting);
        }

        // Uma nova versão começou a instalar agora — acompanha até ficar pronta
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              maybeOfferUpdate(newWorker);
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
// Modelo de UMA ENTRADA POR CAMADA: cada camada aberta cria a SUA própria
// entrada no histórico, no momento da ABERTURA (dentro do gesto do usuário).
// Assim, N camadas abertas = N entradas empilhadas, e cada "voltar" consome
// UMA entrada e fecha UMA camada — SEM precisar re-empilhar nada dentro do
// próprio popstate. (O modelo anterior, de uma sentinela única re-armada no
// popstate, funcionava no desktop mas era instável no PWA instalado / Samsung
// Internet: empilhar histórico DURANTE um "voltar" não é confiável, então o 2º
// "voltar" saía do app em vez de fechar a 2ª camada.)
//
// Contrato de uso (cross-módulo via window.backNav):
//   window.backNav.push('id-unico', fecharFn)  → ao ABRIR uma camada
//   window.backNav.remove('id-unico')          → ao FECHAR pela UI (tap/botão)
//   window.backNav.reset()                     → troca de tela principal (showView)
// A `fecharFn` registrada é o MESMO fechamento da UI; quando o "voltar" a chama,
// o remove() interno vira no-op (guarda handlingPop), evitando recursão.
//
// A sincronização com o histórico é adiada a uma microtask e coalescida: "fechar
// A + abrir B" no mesmo toque (troca de gavetas irmãs) fica com contagem líquida
// inalterada → nenhuma mexida no histórico (B reaproveita a entrada de A).
// =========================================================================
window.backNav = (function () {
  const stack = [];        // [{ id, close }] — camadas abertas (LIFO)
  let pushed = 0;          // nº de entradas que ADICIONAMOS ao histórico (1 por camada)
  let ignorePop = 0;       // popstates dos nossos history.back() a ignorar
  let handlingPop = false; // rodando o close() de um "voltar" real do usuário
  let scheduled = false;

  const findIdx = (id) => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i].id === id) return i;
    return -1;
  };

  // Casa o nº de entradas no histórico com a profundidade da pilha.
  function reconcile() {
    scheduled = false;
    // ADIÇÕES em lote: pushState é seguro e roda ainda no mesmo turno do gesto.
    while (pushed < stack.length) {
      pushed++;
      try { history.pushState({ ghBackNav: pushed }, ''); }
      catch (_) { pushed--; break; }
    }
    // REMOÇÕES (fechamentos pela UI): UMA por vez — o popstate ignorado do nosso
    // history.back() re-agenda a próxima, garantindo 1 popstate por back (sem a
    // ambiguidade de quantos popstates um history.go(-n) dispara).
    if (pushed > stack.length) {
      pushed--;
      ignorePop++;
      try { history.back(); } catch (_) { ignorePop = Math.max(0, ignorePop - 1); }
    }
  }

  function scheduleReconcile() {
    if (scheduled) return;
    scheduled = true;
    Promise.resolve().then(reconcile);
  }

  function push(id, close) {
    if (!id || typeof close !== 'function') return;
    const existing = findIdx(id);
    if (existing !== -1) { stack[existing].close = close; return; } // já rastreada: só atualiza
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

  // Troca de tela principal: as camadas pertencem à tela que está saindo —
  // e precisam FECHAR de verdade, não só sair da pilha: gavetas/overlays são
  // position:fixed e sobrevivem à troca de .screen (uma gaveta aberta no
  // logout ficava visível SOBRE a tela de login). Fecha do topo para a base,
  // como o "voltar" real; handlingPop torna o remove() interno de cada close
  // um no-op (mesma guarda do popstate).
  function reset() {
    if (stack.length) {
      handlingPop = true;
      try {
        while (stack.length) {
          const layer = stack.pop();
          try { layer.close(); }
          catch (e) { console.warn('[backNav] close no reset falhou:', layer.id, e); }
        }
      } finally { handlingPop = false; }
    }
    scheduleReconcile();
  }

  window.addEventListener('popstate', function () {
    if (ignorePop > 0) { ignorePop--; scheduleReconcile(); return; } // nosso history.back(): consome e segue removendo
    // "Voltar" real do usuário: o navegador JÁ consumiu uma das nossas entradas.
    if (pushed > 0) pushed--;
    const layer = stack.pop();
    if (layer) {
      handlingPop = true;
      try { layer.close(); } catch (e) { console.warn('[backNav] close falhou', e); }
      handlingPop = false;
    }
    scheduleReconcile();   // caso o close() tenha mexido na pilha (raro)
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
    iconEl.innerHTML = window.icon(icon);
    btnConfirm.innerText = confirmText;
    btnCancel.innerText = cancelText;
    btnCancel.classList.toggle('u-hidden', !showCancel);
    box?.classList.toggle('dialog-box--scrollable', !!scrollable);
    dialog.classList.remove('u-hidden');
    // Foco entra no botão de ação primária (a11y das camadas modais; supersede
    // preserva o abridor original — ver layerFocus).
    window.layerFocus.enter(dialog, '#btn-dialog-confirm');

    const cleanup = () => {
      window.layerFocus.leave(dialog);
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


// =========================================================================
// BLOQUEIO INTERNO (blur + spinner) — #blocking-loader
// Trava a tela em operações com espera (login por OTP, salvar cadastro, sair).
// Substitui o reuso antigo do #loader-global — que agora é SÓ o spinner de
// entrada (cold start). Fade-out reusa a curva --ease do CSS; a classe é limpa
// no fim p/ reexibições futuras aparecerem.
// =========================================================================
window.showBlockingLoader = function () {
  const el = document.getElementById('blocking-loader');
  if (!el) return;
  clearTimeout(el._hideT);
  el.classList.remove('u-hidden', 'u-fade-out');
};
window.hideBlockingLoader = function () {
  const el = document.getElementById('blocking-loader');
  if (!el) return;
  el.classList.add('u-fade-out');
  el._hideT = setTimeout(() => {
    el.classList.add('u-hidden');
    el.classList.remove('u-fade-out');
  }, 300);
};
