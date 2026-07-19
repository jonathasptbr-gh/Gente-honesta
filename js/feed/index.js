"use strict";
import { avatarSvg, getProfessionals, getComments, getVagas, getHelpers, getIndicatedByPost, getPublishSeedIndicated, addVaga, removeVaga } from './repository.js';
import { SEARCH_PLACEHOLDER_PROS, SEARCH_PLACEHOLDER_CONTRACTS, EASE_STD, availOrder, VAGA_CARD_CFG, PRO_CARD_CFG, MAX_VAGAS, MAX_CANDIDATOS, DAY_ORDER, DEFAULT_WORK_DAYS, HELPER_RATES, LS_HELPER_AVAIL, LS_HELPER_DRAW, TAB_DEFAULTS, SCROLL_TOP_STATE, SCROLL_THRESHOLD, TAB_ORDER } from './config.js';
import { icTier, comingSoon, shareOrCopy } from './utils.js';
import { icBarHTML, qavHTML, availHTML, buildCommentHTML, proBackHTML, proFooterHTML, historicoItemHTML } from './templates.js';
import { pinnedPros, filterState, scrolledState, scrollToTopPending, pedidoHistory, myPedido, contractsFilter } from './state.js';
import { PEDIDO_STATUS, PEDIDO_DETAIL_MODE, URGENCY, SORT, TAB, DURATION, HELPER_TYPE, PAY_METHOD, AVAILABILITY, CONTRACT_STATUS } from '../core/domain.js';

// =========================================================================
// TELA - PRINCIPAL (FEED) - Gerenciador de Comportamentos da Interface
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // TELA - PRINCIPAL (FEED) - CONTRATOS — gaveta abaixo da action bar
  // (padrão claro; scaffolding .historico-sheet* + variante --bar-clear: a
  // action bar segue VIVA com a gaveta aberta). A busca de profissionais vira
  // "Buscar contratos" enquanto aberta, e o botão de filtros abre o
  // #contracts-filters-sheet (roteado no listener do #btn-toggle-filters).
  // Texto + chip de status filtram os cards mockados; valor/mês são visuais.
  // =========================================================================

  const contractsSheet        = document.getElementById('contracts-sheet');
  const contractsFiltersSheet = document.getElementById('contracts-filters-sheet');
  const btnOpenContracts      = document.getElementById('btn-open-contracts');
  const agendaSearchInput     = document.getElementById('inp-agenda-search');
  const pendingWrap           = document.getElementById('contracts-pending');
  const btnTogglePending      = document.getElementById('btn-toggle-pending');

  // function declarations (hoistadas): usadas pelo listener do botão de
  // filtros e pelos show*Panel definidos adiante.
  function isContractsSheetOpen() {
    return !!contractsSheet?.classList.contains('historico-sheet--open');
  }

  // Ancora um sheet-dropdown na BASE da action bar (= topo da caixa do feed),
  // via --sheet-top. A barra tem altura variável (safe-area), então medimos em
  // runtime. Helper ÚNICO (function hoistada): usado por TODAS as gavetas —
  // contratos, criar vaga, ajudante, filtros, pedido e histórico.
  function anchorBelowActionBar(el) {
    // No modo indicação a barra de busca vive na barra do OVERLAY — a gaveta de
    // filtros deve descer a partir dela (e não da action bar, atrás do blur).
    const overlayOn = indicateMode && indicateOverlay && !indicateOverlay.classList.contains('u-hidden');
    const bar = overlayOn ? document.getElementById('indicate-bar') : document.getElementById('feed-action-bar');
    if (bar && el) el.style.setProperty('--sheet-top', `${Math.round(bar.getBoundingClientRect().bottom)}px`);
    // A gaveta desliza a altura do próprio painel → a DURAÇÃO do slide deriva dessa
    // distância. DUAS durações (abertura mais suave, fechamento mais ágil): o CSS do
    // painel usa `--sheet-open-dur` no estado `.--open` (entrada) e `--sheet-close-dur`
    // no estado base (saída) — pattern de transição assimétrica, sem tocar cada função
    // de fechar. Chamado em toda abertura (altura já é a final), antes da classe --open.
    const panel = el && el.querySelector('.pedido-sheet__panel, .historico-sheet__panel');
    if (panel && window.moveMs) {
      const h = panel.offsetHeight;
      panel.style.setProperty('--sheet-open-dur',  `${window.moveMs(h, window.MOVE_SPEED_OPEN)}ms`);
      panel.style.setProperty('--sheet-close-dur', `${window.moveMs(h, window.MOVE_SPEED_CLOSE)}ms`);
    }
  }

  // Abridor vira "fechar" (X) enquanto a gaveta está aberta — verde sólido,
  // mesmo padrão do botão de filtros (.agenda-filters__filter-pill--active).
  function setContractsButtonClose(on) {
    btnOpenContracts?.classList.toggle('agenda-filters__icon-btn--active', on);
    const icon = btnOpenContracts?.querySelector('.icon');
    if (icon) window.setIcon(icon, on ? 'close' : 'contract');
  }

  // Revela/oculta a gaveta de contratos pendentes (collapse via grid-rows no
  // CSS). INATIVO: card branco + glifo "contratos com timer" (pending_actions)
  // preto. EM USO (aberto): tint azul (--active) + glifo seta para baixo.
  function setPendingOpen(open) {
    pendingWrap?.classList.toggle('contracts-pending--open', open);
    btnTogglePending?.classList.toggle('contracts-pending-toggle--active', open);
    btnTogglePending?.setAttribute('aria-expanded', open ? 'true' : 'false');
    const icon = btnTogglePending?.querySelector('.icon');
    if (icon) window.setIcon(icon, open ? 'keyboard_arrow_down' : 'pending_actions');
  }

  function applyContractsFilters() {
    const q = contractsFilter.query;
    contractsSheet?.querySelectorAll('.contract-card').forEach((card) => {
      const matchText   = !q || card.textContent.toLowerCase().includes(q);
      const matchStatus = contractsFilter.status === CONTRACT_STATUS.ALL ||
                          card.classList.contains(`contract-card--${contractsFilter.status}`);
      card.classList.toggle('u-hidden', !(matchText && matchStatus));
    });
    // Pendentes: bandeja separada, revelada pelo botão do rodapé. Só faz sentido
    // sob "Todos" (não são um status filtrável) — com status específico, oculta
    // o botão-abridor e recolhe a gaveta. O texto da busca filtra os minicontratos.
    const showPending = contractsFilter.status === CONTRACT_STATUS.ALL;
    btnTogglePending?.classList.toggle('u-hidden', !showPending);
    if (!showPending) setPendingOpen(false);
    pendingWrap?.querySelectorAll('.contract-mini').forEach((mini) => {
      mini.classList.toggle('u-hidden', !!q && !mini.textContent.toLowerCase().includes(q));
    });
    updateFilterIndicator();   // reflete o estado dos filtros de contratos na pílula
  }

  // Contagem de filtros de CONTRATOS ativos para o indicador da pílula (mesmo
  // papel visual do activeFilterCount dos profissionais). Status + campos de
  // valor/mês preenchidos (o texto da busca não conta, como nos profissionais).
  function contractsActiveFilterCount() {
    let n = contractsFilter.status !== CONTRACT_STATUS.ALL ? 1 : 0;
    if (document.getElementById('inp-contracts-min')?.value)  n++;
    if (document.getElementById('inp-contracts-max')?.value)  n++;
    if (document.getElementById('inp-contracts-date')?.value) n++;
    return n;
  }

  // Valor/mês são visuais (mock), mas contam no indicador — sincroniza ao digitar
  ['inp-contracts-min', 'inp-contracts-max', 'inp-contracts-date'].forEach((id) => {
    document.getElementById(id)?.addEventListener('input', updateFilterIndicator);
  });

  function openContractsSheet() {
    closeFiltersSheet();     // filtros de profissionais, se abertos
    closeProfileSheet?.();   // perfil, se aberto (contratos segue sempre visível)
    anchorBelowActionBar(contractsSheet);
    contractsSheet?.classList.add('historico-sheet--open');
    window.backNav?.push('contracts-sheet', closeContractsSheet);
    // Abriu → para de piscar (marca como "visto"). Sem persistência: a cada
    // abertura do app o botão volta a piscar até ser aberto uma vez.
    btnOpenContracts?.classList.remove('agenda-filters__icon-btn--notify');
    setContractsButtonClose(true);
    if (agendaSearchInput) {
      agendaSearchInput.placeholder = SEARCH_PLACEHOLDER_CONTRACTS;
      agendaSearchInput.value = '';
      syncSearchClearIcon();
    }
    contractsFilter.query = '';
    setPendingOpen(false);     // cada abertura começa com a gaveta de pendentes recolhida
    applyContractsFilters();   // também reflete os filtros de contratos na pílula
  }

  function closeContractsSheet() {
    if (!isContractsSheetOpen()) return;   // guarda: também evita TDZ no setup
    window.backNav?.remove('contracts-sheet');
    closeContractsFiltersSheet();
    contractsSheet?.classList.remove('historico-sheet--open');
    setContractsButtonClose(false);
    if (agendaSearchInput) {
      agendaSearchInput.placeholder = SEARCH_PLACEHOLDER_PROS;
      agendaSearchInput.value = '';
      syncSearchClearIcon();
    }
    renderAgendaList();   // devolve a busca (limpa) aos profissionais
  }

  // Sheet de filtros de contratos: aberto pelo MESMO botão de filtros da barra
  // (roteado pelo estado da gaveta no listener do #btn-toggle-filters).
  function openContractsFiltersSheet() {
    anchorBelowActionBar(contractsFiltersSheet);
    contractsFiltersSheet?.classList.add('historico-sheet--open');
    window.backNav?.push('contracts-filters-sheet', closeContractsFiltersSheet);
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'true');
    btn?.classList.add('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }

  function closeContractsFiltersSheet() {
    if (!contractsFiltersSheet?.classList.contains('historico-sheet--open')) return;
    window.backNav?.remove('contracts-filters-sheet');
    contractsFiltersSheet.classList.remove('historico-sheet--open');
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'false');
    btn?.classList.remove('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }

  btnOpenContracts?.addEventListener('click', () => {
    if (isContractsSheetOpen()) closeContractsSheet(); else openContractsSheet();
  });

  // Botão só-ícone do rodapé: alterna a gaveta de contratos pendentes.
  btnTogglePending?.addEventListener('click', () => {
    setPendingOpen(!pendingWrap?.classList.contains('contracts-pending--open'));
  });

  // Tap-outside fecha. Os containers --bar-clear começam ABAIXO da barra, então
  // os toques na barra chegam aos botões/busca reais (sem tapHitsButton).
  contractsSheet?.addEventListener('click', (e) => {
    if (!e.target.closest('.historico-sheet__panel')) closeContractsSheet();
  });
  contractsFiltersSheet?.addEventListener('click', (e) => {
    if (!e.target.closest('.historico-sheet__panel')) closeContractsFiltersSheet();
  });

  // Busca compartilhada: com a gaveta aberta, o texto filtra os contratos (o
  // listener dos profissionais segue re-renderizando a lista oculta atrás).
  agendaSearchInput?.addEventListener('input', () => {
    if (!isContractsSheetOpen()) return;
    contractsFilter.query = agendaSearchInput.value.trim().toLowerCase();
    applyContractsFilters();
  });

  // --- Lupa ↔ X de limpar: com texto digitado, a lupa vira um X clicável que
  // zera o campo. Limpezas PROGRAMÁTICAS do campo (abrir/fechar contratos,
  // resetAgendaList) devem chamar syncSearchClearIcon() — só o evento 'input'
  // re-sincroniza sozinho.
  const searchClearBtn = document.getElementById('btn-search-clear');
  function syncSearchClearIcon() {
    if (!searchClearBtn || !agendaSearchInput) return;
    const has = agendaSearchInput.value.length > 0;
    window.setIcon(searchClearBtn, has ? 'close' : 'search');
    searchClearBtn.classList.toggle('agenda-filters__search-icon--clearable', has);
  }
  agendaSearchInput?.addEventListener('input', syncSearchClearIcon);
  searchClearBtn?.addEventListener('click', () => {
    if (!agendaSearchInput || !agendaSearchInput.value) return;
    agendaSearchInput.value = '';
    // dispara os listeners reais (re-render dos profissionais / filtro de
    // contratos) + o próprio sync do ícone
    agendaSearchInput.dispatchEvent(new Event('input', { bubbles: true }));
  });


  // --- Avatar do botão "Perfil" (top bar): usa a foto salva do cadastro
  // (window.appState.photoBlob) quando existe; senão mantém o placeholder cinza
  // retangular do HTML. Exposto p/ session.js/onboarding.js chamarem ao abrir o feed.
  window.syncProfileAvatar = () => {
    const img = document.getElementById('top-bar-avatar');
    if (img && window.appState && window.appState.photoBlob) img.src = window.appState.photoBlob;
  };
  window.syncProfileAvatar();

  // --- O toque acerta o retângulo de um botão da action bar? Enquanto uma gaveta
  // está aberta, seu container (z-300) cobre a barra, mas os botões ficam VISÍVEIS
  // sob a área transparente do container. Roteamos o toque pelo retângulo do botão
  // (em vez de subir o z-index da barra). function declaration (hoistada) para os
  // handlers de tap-outside de TODAS as gavetas usarem — inclusive a TROCA direta
  // entre gavetas irmãs (tocar no abridor da outra fecha esta e abre aquela).
  function tapHitsButton(e, btn) {
    if (!btn || btn.offsetParent === null) return false;
    const r = btn.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // Animação de abertura do detalhe (pedido/vaga): o botão DOURADO parece "deslizar"
  // do lugar do abridor para a posição do vizinho, virando "Concluir", enquanto o
  // "Fechar" surge no lugar original. Implementação: o botão que VIRA Concluir (o
  // vizinho) entra deslizando a partir da posição do abridor (translateX medido por
  // rect), e o abridor (agora "Fechar", sob o dourado) faz fade-in ao ser revelado.
  // Chamar DEPOIS de aplicar os rótulos/estados finais dos dois botões.
  function animateConcludeSwap(concludeBtn, closeBtn) {
    if (!concludeBtn || !closeBtn) return;
    clearTimeout(concludeBtn._swapT);
    const dx = Math.round(closeBtn.getBoundingClientRect().left - concludeBtn.getBoundingClientRect().left);
    if (!dx) return; // barra não medida (aba não visível) → sem animação, estado final direto
    concludeBtn.style.transition = 'none';
    concludeBtn.style.transform  = `translateX(${dx}px)`;
    concludeBtn.style.zIndex     = '3';
    closeBtn.style.transition = 'none';
    closeBtn.style.opacity    = '0';
    void concludeBtn.offsetWidth; // reflow: fixa o estado inicial
    // Velocidade única: o "deslize" do botão dourado dura conforme a distância (dx).
    const swapMs = window.moveMs ? window.moveMs(dx) : 420;
    concludeBtn.style.transition = `transform ${swapMs}ms var(--sheet-ease, cubic-bezier(0.3,0.9,0.7,1))`;
    concludeBtn.style.transform  = 'translateX(0)';
    closeBtn.style.transition = 'opacity 0.3s ease 0.12s';
    closeBtn.style.opacity    = '1';
    concludeBtn._swapT = setTimeout(() => {
      concludeBtn.style.transition = ''; concludeBtn.style.transform = ''; concludeBtn.style.zIndex = '';
      closeBtn.style.transition = ''; closeBtn.style.opacity = '';
    }, swapMs + 60);
  }

  // Limpa qualquer estado inline deixado pela animação acima (ao fechar o detalhe,
  // os botões voltam ao natural instantaneamente — sem transform/opacity residual).
  function resetConcludeSwap(...btns) {
    btns.forEach(b => {
      if (!b) return;
      clearTimeout(b._swapT);
      b.style.transition = ''; b.style.transform = ''; b.style.opacity = ''; b.style.zIndex = '';
    });
  }

  // --- Chips de status dos contratos (Todos / Ativo / Concluído / Cancelado):
  // seleção única no #contracts-filters-sheet + aplica o filtro na lista.
  const statusChips = document.querySelectorAll('[data-filter-status]');
  statusChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      statusChips.forEach((c) => { c.classList.remove('chip--active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('chip--active');
      chip.setAttribute('aria-pressed', 'true');
      contractsFilter.status = chip.dataset.filterStatus || CONTRACT_STATUS.ALL;
      applyContractsFilters();
    });
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Abertura, Fechamento e Modos
  // =========================================================================

  const feedPanels     = document.getElementById('feed-panels');
  const feedActionBar  = document.getElementById('feed-action-bar');

  // TELA - PRINCIPAL (FEED) - PAINÉIS DESLIZANTES
  // showVagasPanel / showProsPanel / showPedidosPanel: deslizam o container 3-painéis e
  // alternam o estado da action bar (vagas | busca | pedidos).
  const showVagasPanel = () => {
    feedPanels?.classList.add('feed-panels--vagas');
    feedPanels?.classList.remove('feed-panels--pedidos');
    feedActionBar?.classList.add('agenda-filters--vagas');
    feedActionBar?.classList.remove('agenda-filters--pedidos');
    closeFiltersSheet();
    closeContractsSheet();
    closeProfileSheet();
  };

  const showPedidosPanel = () => {
    feedPanels?.classList.remove('feed-panels--vagas');
    feedPanels?.classList.add('feed-panels--pedidos');
    feedActionBar?.classList.remove('agenda-filters--vagas');
    feedActionBar?.classList.add('agenda-filters--pedidos');
    // fecha painel de filtros / gaveta de contratos / perfil se estiverem abertos
    closeFiltersSheet();
    closeContractsSheet();
    closeProfileSheet();
  };

  const showProsPanel = () => {
    feedPanels?.classList.remove('feed-panels--vagas');
    feedPanels?.classList.remove('feed-panels--pedidos');
    feedActionBar?.classList.remove('agenda-filters--vagas');
    feedActionBar?.classList.remove('agenda-filters--pedidos');
    // simetria com showVagasPanel/showPedidosPanel: fecha gavetas abertas ao voltar p/ Profissionais
    closeFiltersSheet();
    closeContractsSheet();
    closeProfileSheet();
  };

  // Atalho para compatibilidade interna (indicação vem de dentro dos pedidos)
  const openPedidosSheet  = showPedidosPanel;

  // TELA - PRINCIPAL (FEED) - MODO INDICAÇÃO (OVERLAY sobre o feed de pedidos)
  // Coreografia (v383, DOIS TEMPOS): ao tocar "Indicar alguém" num pedido, um overlay
  // flutua SOBRE o feed: a tela recebe o blur escuro (o mesmo das gavetas), o card do
  // pedido (nítido, com o botão "Indicar alguém" AINDA visível) flutua até o topo e a
  // seção de profissionais (barra de busca + cards) SOBE deslizando de baixo. SÓ
  // DEPOIS que o card chega ao topo é que o BOTÃO é trocado — animado (crossfade
  // absoluto, sem mudar a altura) — pela frase "Quem você quer indicar..." (2 linhas),
  // MANTENDO o botão de contagem (2/3) ao lado.
  // NÃO troca de painel — o feed de pedidos permanece atrás (borrado). A lista real
  // #agenda-list é MOVIDA para o overlay (reparent) p/ reusar seleção/flip/pin.
  const feedBottomBar    = document.querySelector('#feed-bottom-bar');
  // Casa da bottom bar: ela é MOVIDA para dentro do overlay durante a indicação
  // (fica entre o card e a seção de profissionais no empilhamento) e volta aqui.
  const barHomeParent    = feedBottomBar?.parentElement || null;
  const barHomeNext      = feedBottomBar?.nextElementSibling || null;
  const indicateOverlay  = document.getElementById('indicate-overlay');
  const indicateProsBox  = document.getElementById('indicate-pros');
  const indicateBar      = document.getElementById('indicate-bar');
  const indicateScroll   = document.getElementById('indicate-scroll');
  const indicateCloseBtn = document.getElementById('btn-indicate-close');
  const prosPanelHost    = document.querySelector('.feed-panel--pros');       // dono original do #agenda-list
  const searchWrap       = document.querySelector('.agenda-filters__search-wrap'); // busca real (campo + filtro)
  const barSearchState   = document.getElementById('bar-search-state');       // lar original da barra de busca
  const INDICATE_PROMPT  = 'Quem você quer indicar?';
  const INDICATE_SHEET_EASE = 'cubic-bezier(0.3,0.9,0.7,1)';   // espelha --sheet-ease

  // O "voo" do card (subida na ENTRADA / descida na SAÍDA) usa a velocidade
  // DIRECIONAL do app: ENTRADA na velocidade de ABERTURA (mais suave), SAÍDA na de
  // FECHAMENTO (mais ágil). A distância percorrida vira duração; a curva --sheet-ease
  // é mantida. O chamador passa a velocidade conforme a direção.
  const indicateCardFlightMs = (distancePx, speed) => window.moveMs(distancePx, speed);

  const openIndicatedPopup = (postId) => {
    // Só é chamado com o id numérico do pedido (badges de fração) — sempre título
    // de terceiros. (O caso 'my' era morto: nenhum chamador o passava.)
    const titleEl = document.getElementById('indicated-popup-title');
    if (titleEl) titleEl.textContent = 'Profissionais indicados';
    renderIndicatedBlock(postId);
    const popup = document.getElementById('indicated-popup');
    // Velocidade única: o bottom sheet sobe a própria altura → duração derivada
    // (o var alimenta o slide E o atraso de visibilidade no fechamento).
    const popupSheet = popup?.querySelector('.indicated-popup__sheet');
    if (popup && popupSheet && window.moveMs) {
      // ABERTURA (sobe): velocidade suave.
      popup.style.setProperty('--indicated-sheet-dur', `${window.moveMs(popupSheet.offsetHeight, window.MOVE_SPEED_OPEN)}ms`);
    }
    popup?.classList.add('indicated-popup--open');
    window.backNav?.push('indicated-popup', closeIndicatedPopup);
  };
  const closeIndicatedPopup = () => {
    window.backNav?.remove('indicated-popup');
    const popup = document.getElementById('indicated-popup');
    // FECHAMENTO (desce): velocidade ágil — reseta o var antes de sair (o mesmo var
    // alimenta o slide E o atraso de visibilidade da saída).
    const popupSheet = popup?.querySelector('.indicated-popup__sheet');
    if (popup && popupSheet && window.moveMs) {
      popup.style.setProperty('--indicated-sheet-dur', `${window.moveMs(popupSheet.offsetHeight, window.MOVE_SPEED_CLOSE)}ms`);
    }
    popup?.classList.remove('indicated-popup--open');
  };
  document.getElementById('btn-close-indicated-popup')?.addEventListener('click', closeIndicatedPopup);
  document.getElementById('indicated-popup-backdrop')?.addEventListener('click', closeIndicatedPopup);
  bindProCardFlip(document.getElementById('agenda-indicated-list'));

  let indicateMode = false;
  let activePostId = null;
  let selectedProId = null;
  let morphedSourceCard = null;   // card REAL que é movido para o overlay (restaurar na saída)
  let indicatePlaceholder = null; // espaçador que guarda o lugar do card na lista
  let indicateGen = 0;            // token de geração: cada enter/exit incrementa;
                                  // callbacks assíncronos superados (gen != atual) abortam.

  // =======================================================================
  // VERIFICADOR DE INVARIANTES (dev) — DETECTA (não conserta) estado
  // inconsistente após navegação/animação: DOM reparentado que não voltou pra
  // casa, camadas presas, telas sem ativo. Só console.warn — custo desprezível,
  // ZERO efeito no render. O objetivo é transformar "às vezes se perde/atravessa"
  // num repro exato p/ atacar a causa raiz das corridas de interrupção (o modo
  // indicação MOVE #agenda-list + barra p/ o overlay e devolve em cadeias
  // transitionend/setTimeout — se interrompido, o "voltar pra casa" não roda).
  // Roda ~450ms após a última transição assentar (estado em repouso) e sob
  // demanda: window.checkInvariants('rótulo') → devolve a lista de violações.
  // =======================================================================
  const _isHidden = (el) => !el || el.classList.contains('u-hidden');
  const _within = (el, sel) => !!(el && el.closest(sel));
  function checkInvariants(label = '') {
    const bad = [];
    const active = document.querySelectorAll('.screen.screen--active').length;
    if (active !== 1) bad.push(`telas .screen--active = ${active} (esperado 1)`);

    const overlay = document.getElementById('indicate-overlay');
    if (indicateMode && _isHidden(overlay)) bad.push('indicateMode=true mas #indicate-overlay escondido');
    if (!indicateMode && !_isHidden(overlay)) bad.push('indicateMode=false mas #indicate-overlay visível');

    const agendaList = document.getElementById('agenda-list');
    if (agendaList && !indicateMode && !_within(agendaList, '.feed-panel--pros'))
      bad.push('#agenda-list fora da .feed-panel--pros sem indicação (reparent não voltou → aba Profissionais vazia)');
    if (agendaList && indicateMode && !_within(agendaList, '#indicate-scroll'))
      bad.push('#agenda-list não está no #indicate-scroll durante indicação');

    if (!indicateMode) {
      if (_within(document.getElementById('feed-bottom-bar'), '#indicate-overlay')) bad.push('barra inferior presa no #indicate-overlay sem indicação');
      if (_within(document.querySelector('.agenda-filters__search-wrap'), '#indicate-overlay')) bad.push('barra de busca presa no #indicate-overlay sem indicação');
      if (document.querySelector('.indicate-card-placeholder')) bad.push('.indicate-card-placeholder órfão sem indicação');
      if (document.querySelector('.pedido-item__prompt')) bad.push('.pedido-item__prompt órfão sem indicação');
      const ref = document.getElementById('indicate-post-ref');
      if (ref && ref.children.length) bad.push('#indicate-post-ref ainda segura o card sem indicação (não voltou pro slot)');
      const pros = document.getElementById('indicate-pros');
      if (pros && pros.style.transform && pros.style.transform !== 'none') bad.push(`#indicate-pros com transform inline sobrando: "${pros.style.transform}"`);
    }

    if (bad.length) console.warn('[invariantes' + (label ? ' · ' + label : '') + '] ✗ estado inconsistente:', bad);
    return bad;
  }
  window.checkInvariants = checkInvariants;

  // Auto-run: ~450ms após a ÚLTIMA transição assentar (cada transitionend
  // reinicia o timer → o check só roda no estado em repouso, sem falso-positivo
  // no meio da animação) + ao voltar ao app.
  let _invTimer = null;
  const scheduleInvariantCheck = (label) => { clearTimeout(_invTimer); _invTimer = setTimeout(() => checkInvariants(label), 450); };
  document.addEventListener('transitionend', () => scheduleInvariantCheck('pós-transição'), true);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleInvariantCheck('retorno ao app'); });

  // Substitui (animado) SÓ o botão "Indicar alguém" pela frase de 2 linhas, DENTRO
  // da linha de ações — o botão de contagem (2/3) permanece à direita. Roda no card
  // REAL (que depois é movido para o overlay, não clonado).
  const morphSourceToPrompt = (card) => {
    const btn = card.querySelector('.post-card__indicate-btn');
    if (!btn || card.querySelector('.pedido-item__prompt')) return;
    const prompt = document.createElement('p');
    prompt.className = 'pedido-item__prompt';
    prompt.textContent = INDICATE_PROMPT;   // quebra natural (2 linhas pela largura)
    btn.insertAdjacentElement('beforebegin', prompt);   // frase no lugar do botão, antes da contagem
    void prompt.offsetHeight;   // reflow antes de acender as classes → a transição roda
    btn.classList.add('post-card__indicate-btn--morph-out');
    prompt.classList.add('pedido-item__prompt--in');
  };

  const restoreSourceCard = (card) => {
    if (!card) return;
    // Desfaz o morph de forma ANIMADA e SIMÉTRICA à abertura (crossfade): o botão
    // reexpande (remove --morph-out → max-width 0→400 via a transição base) e a frase
    // colapsa (remove --in → max-width 400→0 + fade) e só então é removida.
    const btn = card.querySelector('.post-card__indicate-btn');
    const prompt = card.querySelector('.pedido-item__prompt');
    btn?.classList.remove('post-card__indicate-btn--morph-out');
    if (prompt) {
      prompt.classList.remove('pedido-item__prompt--in');
      setTimeout(() => prompt.remove(), 340);
    }
  };

  // TIMELINE ACELERÁVEL GENÉRICA (não-flip): guarda os setTimeouts de FASE e, ao
  // acelerar, reprograma cada um p/ metade do restante + dobra o playbackRate das
  // transições em voo dos `roots`. `dur(base)` = duração já escalada pela velocidade;
  // `after(base, fn)` = setTimeout escalável; `promise` resolve no fim (`finish`).
  // Usada pelo modo indicação (enter/exit) — mesmo motor que o flip, sem o bookkeeping
  // por-card. O item EM CURSO acelera quando outro movimento entra na fila do moveGate.
  const makeMoveTL = (roots = []) => {
    const tl = { speed: window.MOVE_ACCEL || 1, done: false, timers: new Set(), roots: roots.filter(Boolean) };
    tl.promise = new Promise((res) => { tl._resolve = res; });
    tl.dur = (baseMs) => Math.round(baseMs / tl.speed);
    tl.after = (baseMs, fn) => {
      const rec = { fn, endAt: performance.now() + baseMs / tl.speed, id: 0 };
      rec.id = setTimeout(() => { tl.timers.delete(rec); fn(); }, baseMs / tl.speed);
      tl.timers.add(rec);
      return rec;
    };
    tl.finish = () => { if (tl.done) return; tl.done = true; tl.timers.clear(); tl._resolve && tl._resolve(); };
    tl.accelerate = () => {
      if (tl.speed >= 2 || tl.done) return;
      tl.speed = 2;
      const t = performance.now();
      for (const rec of [...tl.timers]) {
        clearTimeout(rec.id);
        const remaining = Math.max(0, (rec.endAt - t)) / 2;
        rec.endAt = t + remaining;
        rec.id = setTimeout(() => { tl.timers.delete(rec); rec.fn(); }, remaining);
      }
      for (const r of tl.roots) { try { r.getAnimations({ subtree: true }).forEach(a => { a.playbackRate = 2; }); } catch (_) {} }
    };
    return tl;
  };
  let indicateTL = null;   // timeline do movimento de indicação em curso (p/ acelerar)

  // SNAP SÍNCRONO ao estado FECHADO (baseline limpo). Idempotente e defensivo:
  // desfaz — sem animação — qualquer reparent pendente do modo indicação, seja
  // qual for a metade em que a cadeia assíncrona (transitionend/setTimeout) parou.
  // É a rede de segurança das CORRIDAS de interrupção: se um enter/exit foi
  // superado (token de geração), seus callbacks tardios abortam e deixam DOM pela
  // metade — chamar isto na (re)entrada devolve tudo pra casa antes de reabrir.
  // Bumpa indicateGen: INVALIDA qualquer callback pendente da indicação (o morph
  // do botão, o runReturn) — sem isso, um morph atrasado poderia inserir a frase
  // "Quem você quer indicar?" num card JÁ restaurado (prompt órfão). NÃO mexe no backNav.
  const finalizeIndicateNow = () => {
    indicateGen++;
    const card = morphedSourceCard;
    // Card real de volta ao slot exato (se ainda há placeholder guardando o lugar).
    if (card && indicatePlaceholder && indicatePlaceholder.parentElement) {
      card.style.transition = 'none';
      card.style.transform = '';
      card.style.transformOrigin = '';
      indicatePlaceholder.replaceWith(card);
    }
    indicatePlaceholder = null;
    // Desfaz o morph do botão AGORA (sem o crossfade de 340ms do restoreSourceCard).
    if (card) {
      card.querySelector('.post-card__indicate-btn')?.classList.remove('post-card__indicate-btn--morph-out');
      card.querySelector('.pedido-item__prompt')?.remove();
    }
    // Lista, busca e bottom bar de volta às casas. Guardas por PARENT DIRETO (não
    // `.contains`, que é profundo): a casa da bottom bar (#view-feed) CONTÉM o
    // próprio #indicate-overlay, então `contains` daria true com a barra ainda
    // presa dentro do overlay e o restore era pulado (barra sumia ao trocar de aba).
    const agendaList = document.getElementById('agenda-list');
    agendaList?.classList.remove('agenda-list--indicate-mode');
    if (agendaList && prosPanelHost && agendaList.parentElement !== prosPanelHost) prosPanelHost.appendChild(agendaList);
    if (searchWrap && barSearchState && searchWrap.parentElement !== barSearchState) barSearchState.appendChild(searchWrap);
    if (feedBottomBar && barHomeParent && feedBottomBar.parentElement !== barHomeParent) {
      if (barHomeNext && barHomeNext.parentElement === barHomeParent) barHomeParent.insertBefore(feedBottomBar, barHomeNext);
      else barHomeParent.appendChild(feedBottomBar);
    }
    // Overlay fechado + limpo.
    indicateOverlay?.classList.remove('indicate-overlay--open');
    indicateOverlay?.classList.add('u-hidden');
    if (indicateOverlay) indicateOverlay.style.pointerEvents = '';   // devolve interatividade p/ a próxima abertura
    if (indicateProsBox) { indicateProsBox.style.transition = ''; indicateProsBox.style.transform = ''; indicateProsBox.style.opacity = ''; }
    const postRef = document.getElementById('indicate-post-ref');
    if (postRef) postRef.innerHTML = '';
    // Flags ao repouso.
    indicateMode = false;
    activePostId = null;
    selectedProId = null;
    morphedSourceCard = null;
  };

  // Entrada GATED: abrir a indicação é um movimento (reparenta #agenda-list + barra)
  // → entra na trava/fila do moveGate p/ nunca rodar junto de outro movimento.
  const enterIndicateMode = (postId) => {
    const sourceCard = document.getElementById(`post-card-${postId}`);
    if (!sourceCard || indicateMode) return;
    window.moveGate.run('indicate-enter', () => doEnterIndicate(postId, sourceCard), [indicateOverlay]);
  };
  const doEnterIndicate = (postId, sourceCard) => {
    // Guarda em TEMPO DE EXECUÇÃO (a da chamada é estado velho — o play roda depois,
    // desenfileirado): já aberto → não reabre (evita 2 enters sobreporem e orfanarem
    // o prompt/card).
    if (indicateMode) return 0;
    // Baseline limpo: se um exit anterior ainda não assentou (DOM a meio caminho
    // de voltar pra casa), snap síncrono ao fechado ANTES de reabrir — senão o
    // cleanup tardio dele chegaria e clobbava esta abertura (bug das camadas
    // "atravessadas" ao interagir rápido). O gen abaixo neutraliza esse cleanup.
    finalizeIndicateNow();
    const gen = ++indicateGen;
    indicateMode = true;
    activePostId = postId;
    morphedSourceCard = sourceCard;
    window.backNav?.push('indicate-overlay', exitIndicateMode);

    // DOIS TEMPOS: o card sobe ao topo com o botão "Indicar alguém" AINDA visível e,
    // SÓ depois de chegar ao topo, o botão vira a frase "Quem você quer indicar?"
    // (ver morphAtTop no fim deste passo). Aqui: acende o overlay, MOVE o card e sobe
    // a seção de profissionais. Delay curto só p/ o feedback do toque assentar.
    setTimeout(() => {
      if (gen !== indicateGen) return;   // superado (saída/re-entrada) antes do timer
      const srcRect = sourceCard.getBoundingClientRect();

      // Move a BARRA DE BUSCA real (campo + pílula de filtro com suas funções) para
      // a barra verde do overlay, e a LISTA REAL de profissionais para o wrapper de
      // scroll (reusa render/seleção/flip/pin + as sombras de corte do wrapper).
      if (searchWrap && indicateBar) indicateBar.appendChild(searchWrap);
      if (agendaSearchInput) {
        agendaSearchInput.value = '';
        agendaSearchInput.placeholder = SEARCH_PLACEHOLDER_PROS;
        syncSearchClearIcon();
      }
      const agendaList = document.getElementById('agenda-list');
      if (agendaList && indicateScroll) {
        const bottomShade = indicateScroll.querySelector('.scroll-shade--bottom');
        if (bottomShade) indicateScroll.insertBefore(agendaList, bottomShade);
        else indicateScroll.appendChild(agendaList);
        // Sombras de corte no topo/base do scroll (idempotente: no-op se já observado
        // pelo auto-watch de load). Reposiciona o has-scroll-* ao conteúdo atual.
        window.watchScrollShadows?.(indicateScroll);
      }
      agendaList?.classList.add('agenda-list--indicate-mode');
      resetAgendaList();

      // MOVE o card REAL (não clona): deixa um placeholder da MESMA altura no lugar
      // dele na lista (guarda o layout + a posição exata p/ voltar) e reparenta o
      // card para o topo do overlay.
      const ph = document.createElement('div');
      ph.className = 'indicate-card-placeholder';
      ph.style.height = `${srcRect.height}px`;
      sourceCard.insertAdjacentElement('beforebegin', ph);
      indicatePlaceholder = ph;
      const refContainer = document.getElementById('indicate-post-ref');
      refContainer.innerHTML = '';
      refContainer.appendChild(sourceCard);

      // Mostra o overlay + acende o blur. A bottom bar das abas é MOVIDA para DENTRO
      // do overlay: assim empilha ENTRE o card do pedido (atrás) e a seção de
      // profissionais (na frente) — o card sobe/desce atrás dela, sem sumir nem pular.
      indicateOverlay?.classList.remove('u-hidden');
      if (feedBottomBar && indicateOverlay) indicateOverlay.appendChild(feedBottomBar);
      void indicateOverlay?.offsetHeight;
      indicateOverlay?.classList.add('indicate-overlay--open');

      // FLIP do card: da posição na lista (origem) até o topo do overlay.
      const finalRect = sourceCard.getBoundingClientRect();
      const dx = srcRect.left - finalRect.left;
      const dy = srcRect.top  - finalRect.top;
      sourceCard.style.transformOrigin = 'top left';
      sourceCard.style.transition = 'none';
      sourceCard.style.transform = `translate(${dx}px, ${dy}px)`;

      // Seção de profissionais começa abaixo (fora da tela) e sobe. Slide LIMPO,
      // SEM fade (só transform) — a pedido do produto.
      if (indicateProsBox) {
        indicateProsBox.style.transition = 'none';
        indicateProsBox.style.transform = 'translateY(100%)';
      }

      // Reflow: comita o estado inicial ANTES de aplicar o final (senão o
      // navegador coalesce os transforms e não há animação).
      void sourceCard.offsetHeight;

      // Estado FINAL (anima): card sobe ao topo, seção sobe de baixo. ENTRADA usa a
      // velocidade de ABERTURA (mais suave). A subida do card dura conforme a DISTÂNCIA;
      // a seção sobe num slide LIMPO (sem fade).
      const riseMs = indicateCardFlightMs(Math.hypot(dx, dy), window.MOVE_SPEED_OPEN);
      sourceCard.style.transition = `transform ${riseMs}ms ${INDICATE_SHEET_EASE}`;
      sourceCard.style.transform = 'none';
      if (indicateProsBox) {
        // Slide da seção pela velocidade de ABERTURA (distância = altura da seção).
        const prosMs = window.moveMs(indicateProsBox.offsetHeight, window.MOVE_SPEED_OPEN);
        indicateProsBox.style.transition = `transform ${prosMs}ms ${INDICATE_SHEET_EASE}`;
        indicateProsBox.style.transform = 'translateY(0)';
      }

      // TEMPO 2 — só quando o card TERMINA de subir (fim da transição do transform),
      // com um respiro, o botão "Indicar alguém" vira a frase "Quem você quer indicar?".
      let morphed = false;
      const morphAtTop = () => {
        if (morphed || gen !== indicateGen) return;
        morphed = true;
        morphSourceToPrompt(sourceCard);
      };
      const onRiseEnd = (ev) => {
        if (ev.target === sourceCard && ev.propertyName === 'transform') {
          sourceCard.removeEventListener('transitionend', onRiseEnd);
          setTimeout(morphAtTop, 70);   // pequeno respiro após chegar ao topo
        }
      };
      sourceCard.addEventListener('transitionend', onRiseEnd);
      setTimeout(() => { sourceCard.removeEventListener('transitionend', onRiseEnd); morphAtTop(); }, riseMs + 160); // fallback (fim da subida + folga)
    }, 30);   // delay curto só p/ o feedback do toque (não espera mais o morph)
    // Duração da ABERTURA p/ o gate cronometrar (subida do card + respiros). O
    // MODO fica aberto DEPOIS, mas "parado" — não bloqueia mais a fila. A subida
    // interna (riseMs) é medida no setTimeout acima, JÁ com MOVE_ACCEL=1 (assíncrono),
    // então o est também usa accel=1 (senão subestimaria e a fila abriria cedo demais,
    // sobrepondo). Um enter/exit ENFILEIRADO roda 2x (MOVE_ACCEL); o em curso roda cheio.
    const _a = window.MOVE_ACCEL; window.MOVE_ACCEL = 1;
    const est = window.moveMs(window.innerHeight, window.MOVE_SPEED_OPEN) + 260;
    window.MOVE_ACCEL = _a;
    return est;
  };

  // Saída GATED: fechar a indicação também é um movimento (devolve o DOM às casas).
  // Acelerável: se o usuário dispara outra ação (ex.: deslizar p/ Profissionais) durante
  // o fechamento, o moveGate chama indicateTL.accelerate() → o fechamento vai a 2× e a
  // próxima ação começa logo (era o bug de "não identifica o slide" ao fechar).
  const exitIndicateMode = () => {
    if (!indicateMode) return;
    window.moveGate.run('indicate-exit', () => doExitIndicate(), () => indicateTL && indicateTL.accelerate());
  };
  const doExitIndicate = () => {
    if (!indicateMode) return 0;
    const gen = ++indicateGen;   // supera qualquer callback pendente da abertura
    const tl = makeMoveTL([morphedSourceCard, indicateProsBox]);   // acelerável (roots = card + seção)
    indicateTL = tl;
    // Durante o FECHAMENTO o overlay deixa os toques ATRAVESSAREM até o #feed-panels:
    // assim um "deslizar p/ Profissionais" já é reconhecido (vira switchToTab, entra na
    // fila atrás do fechamento E o acelera) em vez de bater no overlay e ser ignorado.
    if (indicateOverlay) indicateOverlay.style.pointerEvents = 'none';
    window.backNav?.remove('indicate-overlay');
    indicateMode = false;
    activePostId = null;
    selectedProId = null;
    closeFiltersSheet();   // fecha a gaveta de filtros, se aberta no overlay
    if (agendaSearchInput) { agendaSearchInput.value = ''; syncSearchClearIcon(); }

    const card = morphedSourceCard;

    // TEMPO 1 (fechar) — INVERSO da abertura: o botão "Indicar alguém" VOLTA
    // (un-morph, frase → botão) ANTES de qualquer movimento. Na abertura o morph vem
    // DEPOIS da subida; no fechamento o un-morph vem ANTES da descida.
    if (card) restoreSourceCard(card);

    // TEMPO 2 — só após o botão reaparecer (respiro do un-morph) o card DESCE de volta
    // ao lugar, a seção desce e o blur some. A distância é medida AQUI (card já com a
    // altura final do botão) p/ o pouso casar com o placeholder.
    const UNMORPH_MS = 300;   // ~duração do crossfade do botão (ver restoreSourceCard)
    const runReturn = () => {
      if (gen !== indicateGen) { tl.finish(); return; }   // superado → resolve p/ a fila avançar
      // FLIP REVERSO do card REAL: do topo até a posição do placeholder na lista.
      let flightMs = 700;
      if (card && indicatePlaceholder) {
        const cRect = card.getBoundingClientRect();
        const pRect = indicatePlaceholder.getBoundingClientRect();
        const dx = pRect.left - cRect.left;
        const dy = pRect.top  - cRect.top;
        // Descida na velocidade de FECHAMENTO (mais ágil): distância → duração (base,
        // accel=1 aqui pois é assíncrono); tl.dur escala se estiver acelerado/enfileirado.
        flightMs = indicateCardFlightMs(Math.hypot(dx, dy), window.MOVE_SPEED_CLOSE);
        card.style.transition = `transform ${tl.dur(flightMs)}ms ${INDICATE_SHEET_EASE}`;
        card.style.transform = `translate(${dx}px, ${dy}px)`;
      }

      // Blur some e a seção de profissionais desce junto (slide LIMPO, sem fade),
      // na velocidade de FECHAMENTO (distância = altura da seção).
      indicateOverlay?.classList.remove('indicate-overlay--open');
      let prosMs = 700;
      if (indicateProsBox) {
        prosMs = window.moveMs(indicateProsBox.offsetHeight, window.MOVE_SPEED_CLOSE);
        indicateProsBox.style.transition = `transform ${tl.dur(prosMs)}ms ${INDICATE_SHEET_EASE}`;
        indicateProsBox.style.transform = 'translateY(100%)';
      }

      document.querySelectorAll('.pro-card--selected, .pro-card--flipped, .pro-card--expanded').forEach(el => {
        proCardForceReset(el);
      });

      // Ao fim: DEVOLVE o card real ao slot do placeholder (some o transform → cai
      // exatamente no lugar), devolve a barra de busca e a lista, e esconde o overlay.
      // O un-morph já ocorreu no TEMPO 1 (não roda mais aqui).
      tl.after(Math.max(flightMs, prosMs) + 40, () => {
        if (gen === indicateGen) {   // re-entrada não assumiu → seguro restaurar
          if (card && indicatePlaceholder) {
            card.style.transition = 'none';
            card.style.transform = '';
            card.style.transformOrigin = '';
            indicatePlaceholder.replaceWith(card);   // card real de volta ao slot exato
          }
          indicatePlaceholder = null;

          const agendaList = document.getElementById('agenda-list');
          agendaList?.classList.remove('agenda-list--indicate-mode');
          if (agendaList && prosPanelHost) prosPanelHost.appendChild(agendaList);
          // Barra de busca volta para a search-row da action bar (único filho dela).
          if (searchWrap && barSearchState) barSearchState.appendChild(searchWrap);
          resetAgendaList();

          // Devolve a bottom bar para a casa ANTES de esconder o overlay (senão sumiria
          // junto, por estar dentro dele).
          if (feedBottomBar && barHomeParent) {
            if (barHomeNext && barHomeNext.parentElement === barHomeParent) barHomeParent.insertBefore(feedBottomBar, barHomeNext);
            else barHomeParent.appendChild(feedBottomBar);
          }

          indicateOverlay?.classList.add('u-hidden');
          if (indicateProsBox) { indicateProsBox.style.transition = ''; indicateProsBox.style.transform = ''; indicateProsBox.style.opacity = ''; }
          const postRef = document.getElementById('indicate-post-ref');
          if (postRef) postRef.innerHTML = '';
          morphedSourceCard = null;
        }
        tl.finish();   // resolve a promise SEMPRE (a fila do moveGate precisa avançar)
      });   // espera o FLIP reverso E o slide da seção
    };

    tl.after(UNMORPH_MS, runReturn);
    return tl.promise;   // trava solta na conclusão REAL (acelerar faz resolver antes)
  };

  // Fechar o overlay pelo botão de fechar da barra flutuante. (A busca e o filtro
  // são a barra REAL, movida para o overlay — já têm seus próprios handlers.)
  indicateCloseBtn?.addEventListener('click', exitIndicateMode);

  // Toques no card MOVIDO para o overlay (durante a indicação):
  // - botão de contagem (2/3) → abre o popup de indicados (mesma função do original);
  // - qualquer outro ponto do card → FECHA a indicação (simétrico ao "tocar no card
  //   para abrir" na lista de pedidos).
  document.getElementById('indicate-post-ref')?.addEventListener('click', (e) => {
    const badge = e.target.closest('.post-card__indicate-info');
    if (badge) {
      const postId = badge.closest('[data-post-id]')?.dataset.postId;
      if (postId != null) openIndicatedPopup(postId);
      return;
    }
    exitIndicateMode();
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Renderização do Bloco de Indicados
  // =========================================================================



  // Quantos FILTROS estão ativos (ordenação NÃO conta — não esconde ninguém).
  // Alimenta o indicador/limpar ao lado do campo de busca.
  function activeFilterCount() {
    return filterState.includeIc.size + filterState.includeAvail.size +
           filterState.includePay.size + (filterState.savedOnly ? 1 : 0);
  }
  function updateFilterIndicator() {
    // Indicador UNIFICADO na própria pílula de filtro (direita do campo): com
    // filtros ativos ela fica no tint azul (--filtered) com filter_alt + contagem.
    // Com a gaveta de CONTRATOS aberta, a pílula reflete os filtros de CONTRATOS
    // (mesmo papel visual da barra); senão, os de profissionais.
    const contractsMode = isContractsSheetOpen();
    const n = contractsMode ? contractsActiveFilterCount() : activeFilterCount();
    const pill = document.getElementById('btn-toggle-filters');
    const cnt  = document.getElementById('filter-count');
    if (cnt) {
      cnt.textContent = n;
      cnt.classList.toggle('u-hidden', n === 0);
    }
    pill?.classList.toggle('agenda-filters__filter-pill--filtered', n > 0);
    // syncFilterPillIcon decide o glifo (tune/filter_alt/seta) e a visibilidade
    // do X de limpar conforme filtro ativo + gaveta aberta/fechada.
    syncFilterPillIcon();
  }

  // Ícone da pílula de filtro — decisão ÚNICA a partir dos dois estados:
  //   sheet de filtros (profissionais OU contratos) aberto → seta p/ BAIXO
  //   (mesma linguagem do abridor de pendentes: seta para baixo indica a gaveta
  //   que desce; toque recolhe); filtros ativos → filter_alt; repouso → tune.
  function syncFilterPillIcon() {
    const pill = document.getElementById('btn-toggle-filters');
    const icon = pill?.querySelector('.icon');   // 1º glifo = principal
    if (!icon) return;
    const clearX = pill.querySelector('.agenda-filters__filter-clear-x');
    const sheetOpen =
      document.getElementById('filters-sheet')?.classList.contains('historico-sheet--open') ||
      document.getElementById('contracts-filters-sheet')?.classList.contains('historico-sheet--open');
    if (sheetOpen) {
      window.setIcon(icon, 'keyboard_arrow_down');
      clearX?.classList.add('u-hidden');
      pill.setAttribute('aria-label', 'Fechar filtros');
      return;
    }
    // Gaveta fechada: com filtro ativo, a pílula vira "Limpar" (filter_alt + X);
    // sem filtro, é o abridor (tune).
    const filtered = pill.classList.contains('agenda-filters__filter-pill--filtered');
    window.setIcon(icon, filtered ? 'filter_alt' : 'tune');
    clearX?.classList.toggle('u-hidden', !filtered);
    pill.setAttribute('aria-label', filtered ? 'Limpar filtros' : 'Filtrar');
  }

  // Reseta lista de profissionais: desvira cards, limpa filtros, vai ao topo
  const resetAgendaList = () => {
    // Desvira qualquer card virado e limpa estilos inline residuais
    document.querySelectorAll('#agenda-list .pro-card--flipped, #agenda-list .pro-card--expanded, #agenda-list .pro-card--selected').forEach(el => {
      proCardForceReset(el);
    });
    // Limpa estado dos filtros
    filterState.includeIc.clear();
    filterState.includeAvail.clear();
    filterState.includePay.clear();
    filterState.savedOnly = false;
    filterState.sort = SORT.IC;
    // Limpa chips visuais no painel de filtros
    document.querySelectorAll('#panel-agenda-filters .chip--active').forEach(c => {
      c.classList.remove('chip--active');
      c.setAttribute('aria-pressed', 'false');
    });
    // Restaura o chip de ordenação padrão (Confiança) — CASA com filterState.sort
    // (SORT.IC) acima e com o chip ativo no load inicial.
    const defaultSort = document.querySelector(`#panel-agenda-filters [data-sort="${SORT.IC}"]`);
    if (defaultSort) { defaultSort.classList.add('chip--active'); defaultSort.setAttribute('aria-pressed', 'true'); }
    // Limpa campo de busca (limpeza programática → re-sincroniza a lupa/X)
    const search = document.getElementById('inp-agenda-search');
    if (search) search.value = '';
    syncSearchClearIcon();
    // Fecha painel de filtros se aberto
    closeFiltersSheet();
    // Re-renderiza e volta ao topo
    renderAgendaList();
    document.getElementById('agenda-list')?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const applyFilters = (pros) => pros.filter(p => {
    const tier = icTier(p.ic);
    if (filterState.includeIc.size > 0 && !filterState.includeIc.has(tier)) return false;
    if (filterState.includeAvail.size > 0 && !filterState.includeAvail.has(p.avail)) return false;
    if (filterState.savedOnly && !pinnedPros.has(p.id)) return false;
    // Pagamento: OR — passa se aceitar ao menos um dos métodos marcados.
    if (filterState.includePay.size > 0) {
      const hasMatch =
        (filterState.includePay.has(PAY_METHOD.CASH) && p.pay?.cash) ||
        (filterState.includePay.has(PAY_METHOD.PIX)  && p.pay?.pix)  ||
        (filterState.includePay.has(PAY_METHOD.CARD) && p.pay?.card && p.pay.card !== 0) ||
        (filterState.includePay.has(PAY_METHOD.NF)   && p.nf === true);
      if (!hasMatch) return false;
    }
    return true;
  });

  // Comparador ÚNICO de profissionais conforme filterState.sort (function
  // hoistada). Usado por sortPros (objetos pro) e por sortCards (cards do DOM,
  // que mapeiam id→pro antes de delegar) — antes eram dois switch idênticos.
  function comparePros(a, b) {
    switch (filterState.sort) {
      case SORT.IC:      return b.ic - a.ic;
      case SORT.AVAIL:   return (availOrder[a.avail] ?? 3) - (availOrder[b.avail] ?? 3);
      case SORT.QUALITY: return b.q - a.q;
      case SORT.AGILITY: return b.a - a.a;
      case SORT.VALUE:   return b.v - a.v;
      default:           return a.name.localeCompare(b.name, 'pt-BR');
    }
  }

  const sortPros = (pros) => [...pros].sort(comparePros);


  // ---- Modelos padronizados de exibição (reutilizados em vários lugares) ----








  // Card padrão de profissional: coluna esquerda (foto + QAV) e coluna direita
  // (nome/profissão/disponibilidade + ações do cabeçalho + bio).
  // showPin=false omite o botão de fixar (ex: cards de referência na confirmação).

  const proCardHTML = (pro, showPin = true) => {
    // Indicador PASSIVO de "salvo": FITA DE MARCADOR no canto superior esquerdo,
    // cruzando por cima da foto do contato. Só visual — o salvar/dessalvar é por
    // pressionar longamente o card (não há mais botão de fixar). A fita só é
    // renderizada nos cards da lista principal (showPin) e sua visibilidade é
    // controlada pela classe .pro-card--pinned no card (toggle sem re-render).
    const savedRibbon = showPin
      ? `<span class="pro-card__saved-ribbon" aria-hidden="true"></span>`
      : '';
    return `
      <div class="pro-card__col-left">
        <div class="pro-card__avatar-wrap">
          <img class="pro-card__avatar" src="${avatarSvg}" alt="">
          ${savedRibbon}
        </div>
        ${qavHTML(pro.q, pro.a, pro.v)}
      </div>
      <div class="pro-card__col-right">
        <div class="pro-card__head">
          <div class="pro-card__head-text">
            <div class="pro-card__name">${pro.name}</div>
            <div class="pro-card__tags">${pro.tags}</div>
            ${availHTML(pro.avail)}
          </div>
          <div class="pro-card__head-right">
            ${icBarHTML(pro.ic, 'lg')}
          </div>
        </div>
        <p class="pro-card__bio">${pro.bio}</p>
      </div>
      ${showPin ? proFooterHTML(pro) : ''}
    `;
  };

  // Constrói UM card de profissional flipável (frente + verso). Fonte ÚNICA do
  // scaffolding — antes o mesmo innerHTML era montado inline aqui e em
  // renderAgendaList. `showPin` inclui o botão salvar + rodapé (só na lista
  // principal); `withId` põe o id do pro no card (usado pela reordenação FLIP).
  // function declaration (hoisted).
  /** @param {import('../core/models.js').Professional} pro */
  function buildProCard(pro, { showPin = true, withId = false } = {}) {
    const card = document.createElement('div');
    card.className = 'pro-card';
    // Marca visual de "salvo" só nos cards da lista principal (showPin).
    if (showPin && pinnedPros.has(pro.id)) card.classList.add('pro-card--pinned');
    if (withId) card.id = pro.id;
    card.innerHTML = `<div class="pro-card__3d"><div class="pro-card__flipper"><div class="pro-card__front">${proCardHTML(pro, showPin)}</div>${proBackHTML()}</div></div>`;
    // Sombras de borda + scroll interno dos comentários do verso (injeta as shades).
    window.watchScrollShadows?.(card.querySelector('.pro-card__back-comments'));
    return card;
  }

  // Renderiza cards de profissional flipáveis (com verso de comentários + WhatsApp)
  // numa lista arbitrária. Reutilizado no popup de indicados e nos detalhes do pedido.
  // function declaration (hoisted): pode ser chamada antes da sua linha no callback.
  function renderFlippableProCards(listEl, pros) {
    listEl.innerHTML = '';
    if (!pros || pros.length === 0) {
      listEl.innerHTML = '<span class="list-empty-hint">Nenhuma indicação ainda.</span>';
      return;
    }
    pros.forEach(pro => listEl.appendChild(buildProCard(pro, { showPin: false })));
  }

  // Fecha (flip→front) um pro-card COMO MOVIMENTO — passa pela trava/fila do moveGate,
  // igual à abertura. Sem isto, fechar pelo botão "Voltar"/toque no verso rodaria FORA
  // da trava e poderia sobrepor um carrossel/gaveta. `pre` roda antes (limpar seleção).
  const gateCloseProCard = (c, pre) => {
    if (!c) return;
    window.moveGate.run('flip', () => {
      if (pre) pre();
      return proCardFlipToFront(c).promise;   // trava solta na conclusão REAL do flip
    }, accelerateActiveFlips);
  };
  // Idem para os cards de VAGA (abrir = flip→back com accordion; fechar = flip→front).
  const gateVagaFlipBack = (card) => {
    if (!card || card.classList.contains('vaga-card--flipped')) return;
    window.moveGate.run('flip', () => {
      document.querySelectorAll('#vagas-list .vaga-card--flipped').forEach(other => { if (other !== card) vagaCardFlipToFront(other); });
      return vagaCardFlipToBack(card).promise;
    }, accelerateActiveFlips);
  };
  const gateVagaFlipFront = (card, done) => {
    if (!card) return;
    window.moveGate.run('flip', () => {
      return vagaCardFlipToFront(card, done).promise;
    }, accelerateActiveFlips);
  };

  // Registra delegação de cliques de flip num container de pro-cards.
  // Chamar uma vez por container estático; não chamar dentro de funções de render.
  // function declaration (hoisted): o bind em #agenda-indicated-list ocorre acima
  // desta linha; só é seguro porque funções declaradas são içadas no callback.
  function bindProCardFlip(containerEl) {
    if (!containerEl) return;
    containerEl.addEventListener('click', (e) => {
      // Botão de ordenação dos comentários — ANTES do catch-all do verso (que fecha).
      const sortBtn = e.target.closest('.pro-card__sort-btn');
      if (sortBtn) { sortProComments(sortBtn); return; }
      if (e.target.closest('.pro-card__back-btn--whatsapp')) {
        comingSoon('Abrir WhatsApp', 'WhatsApp', 'chat');
        return;
      }
      if (e.target.closest('.pro-card__back-btn--share')) {
        comingSoon('Compartilhar perfil', 'Compartilhar', 'share');
        return;
      }
      if (e.target.closest('.pro-card__back-btn--back') || e.target.closest('.pro-card__back')) {
        gateCloseProCard(e.target.closest('.pro-card'));
        return;
      }
      const card = e.target.closest('.pro-card');
      if (!card) return;
      // Flip é um MOVIMENTO → passa pela trava/fila (não sobrepõe carrossel/gaveta/
      // indicação nem outro flip). Um flip enfileirado roda 2x (MOVE_ACCEL). Estado lido
      // em tempo de execução (o play roda desenfileirado).
      window.moveGate.run('flip', () => {
        const isFlipped = card.classList.contains('pro-card--flipped');
        containerEl.querySelectorAll('.pro-card--flipped').forEach(el => { if (el !== card) proCardFlipToFront(el); });
        if (isFlipped) return proCardFlipToFront(card).promise;
        const tl = proCardFlipToBack(card);
        return tl.promise;
      }, accelerateActiveFlips);
    });
  }

  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Monta os mini-cards dos já indicados
  const renderIndicatedBlock = (postId) => {
    const list = document.getElementById('agenda-indicated-list');
    if (!list) return;
    renderFlippableProCards(list, getIndicatedByPost(postId));
  };


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - PRESSIONAR LONGAMENTE (long-press)
  // Gesto genérico: salvar profissional (aba Profissionais) e denunciar pedido
  // (aba Pedidos) migraram de botão dedicado para o pressionar-longo do card.
  // =========================================================================

  // Flag compartilhada: um long-press dispara no touchend e, logo depois, o
  // navegador emite o `click` sintético — os handlers de clique dos cards
  // checam esta flag para NÃO tratar esse clique como toque normal. Ela se
  // auto-limpa por timer caso nenhum click chegue (evita engolir o próximo).
  let longPressConsumed = false;

  // Anexa detecção de pressionar-longo a um container (delegação por `selector`).
  // Dispara no touchend, após o limiar, se o dedo não arrastou — assim o diálogo
  // só abre com o dedo já solto (não rouba o toque). Ao atingir o limiar, dá
  // feedback tátil + marca o card (`.long-press-armed`) para o usuário perceber.
  // function declaration (hoistada).
  function attachLongPress(container, selector, onLongPress, { duration = 480, moveTol = 12 } = {}) {
    if (!container) return;
    let timer = null, startX = 0, startY = 0, target = null, moved = false, armed = false;
    const disarm = () => {
      if (timer) { clearTimeout(timer); timer = null; }
      if (target) target.classList.remove('long-press-armed');
    };
    container.addEventListener('touchstart', (e) => {
      target = e.target.closest(selector);
      if (!target) return;
      moved = false; armed = false;
      startX = e.touches[0].clientX; startY = e.touches[0].clientY;
      timer = setTimeout(() => {
        if (moved || !target) return;
        armed = true;
        try { navigator.vibrate?.(15); } catch (_) {}
        target.classList.add('long-press-armed');
      }, duration);
    }, { passive: true });
    container.addEventListener('touchmove', (e) => {
      if (!target || moved) return;
      const dx = Math.abs(e.touches[0].clientX - startX);
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > moveTol || dy > moveTol) { moved = true; disarm(); }
    }, { passive: true });
    container.addEventListener('touchend', () => {
      const wasArmed = armed, el = target;
      disarm(); target = null; armed = false;
      if (wasArmed && !moved && el) {
        longPressConsumed = true;
        setTimeout(() => { longPressConsumed = false; }, 450);
        onLongPress(el);
      }
    });
    container.addEventListener('touchcancel', () => { disarm(); target = null; armed = false; }, { passive: true });
  }

  // Denúncia de pedido (via long-press). Placeholder sem backend: confirma e
  // dá o feedback de "recebido" (a moderação real virá com o Firestore).
  async function reportPedido() {
    const ok = await customConfirm(
      'Deseja denunciar este pedido por conteúdo impróprio, golpe ou informação falsa?',
      'Denunciar pedido', 'flag');
    if (ok) customAlert('Denúncia enviada. Nossa equipe vai analisar este pedido.', 'Denúncia registrada', 'check_circle');
  }

  // Salvar/dessalvar profissional (via long-press no card). Reordena com FLIP
  // (salvos ao topo), sem reconstruir a lista — igual ao antigo botão de fixar.
  const togglePinPro = (card) => {
    if (indicateMode) return;                                  // no modo indicação o toque seleciona
    if (card.classList.contains('pro-card--flipped')) return;  // card aberto: não salva
    const proId = card.id;
    if (!proId) return;
    const pinned = !pinnedPros.has(proId);
    if (pinned) pinnedPros.add(proId); else pinnedPros.delete(proId);
    card.classList.toggle('pro-card--pinned', pinned);
    reorderAgendaListAnimated();
  };

  attachLongPress(document.getElementById('agenda-list'), '.pro-card', togglePinPro);
  attachLongPress(document.getElementById('list-feed'), '.pedido-item', () => reportPedido());


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - CARDS DE POST - Botões de Indicar
  // =========================================================================

  document.getElementById('list-feed')?.addEventListener('click', (e) => {
    // Se um pressionar-longo acabou de abrir a denúncia, engole o clique que
    // segue o touchend (senão entraria no modo indicação em cima da denúncia).
    if (longPressConsumed) { longPressConsumed = false; return; }
    // Badge de contagem → popup de indicados
    const badge = e.target.closest('.post-card__indicate-info');
    if (badge) {
      const postId = badge.closest('[data-post-id]')?.dataset.postId;
      if (postId != null) openIndicatedPopup(postId);
      return;
    }
    // Tocar em QUALQUER outro ponto do card (inclusive o botão "Indicar alguém")
    // entra no modo indicação (overlay SOBRE os pedidos; NÃO troca de painel — o
    // feed de pedidos permanece atrás, borrado).
    const card = e.target.closest('.pedido-item');
    if (!card) return;
    enterIndicateMode(card.dataset.postId);
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Seleção de Profissional
  // =========================================================================

  // TELA - PRINCIPAL (FEED) - LISTA DE CONTATOS - Seleção de profissional (só no modo indicação)
  document.getElementById('agenda-list')?.addEventListener('click', (e) => {
    // Se um pressionar-longo acabou de salvar/dessalvar o card, engole o clique
    // que segue o touchend (senão o card flipava logo após salvar).
    if (longPressConsumed) { longPressConsumed = false; return; }

    // Botão de ordenação dos comentários — ANTES do catch-all do verso (que fecha).
    const sortBtn = e.target.closest('.pro-card__sort-btn');
    if (sortBtn) { sortProComments(sortBtn); return; }

    // Botão Cancelar (modo indicação) → desflipa sem sair do modo.
    // Os botões são controlados pela classe da LISTA, então o card volta à
    // frente sem trocar Cancelar/Indicar por WhatsApp durante a animação.
    if (e.target.closest('.pro-card__back-btn--cancel-indicate')) {
      const c = e.target.closest('.pro-card');
      gateCloseProCard(c, () => { c.classList.remove('pro-card--selected'); selectedProId = null; });
      return;
    }

    // Botão Indicar (modo indicação) → confirma e sai
    if (e.target.closest('.pro-card__back-btn--confirm-indicate')) {
      exitIndicateMode();
      customAlert('Indicação registrada com sucesso!', 'Indicação Feita', 'check_circle').then(openPedidosSheet);
      return;
    }

    // Botão WhatsApp no verso
    if (e.target.closest('.pro-card__back-btn--whatsapp')) {
      comingSoon('Abrir WhatsApp', 'WhatsApp', 'chat');
      return;
    }

    // Botão Compartilhar no verso
    if (e.target.closest('.pro-card__back-btn--share')) {
      comingSoon('Compartilhar perfil', 'Compartilhar', 'share');
      return;
    }

    // Botão Voltar no verso → desflipa
    if (e.target.closest('.pro-card__back-btn--back')) {
      const c = e.target.closest('.pro-card');
      gateCloseProCard(c, () => { c.classList.remove('pro-card--selected'); selectedProId = null; });
      return;
    }

    // Clique no resto do verso (fora dos botões) → fecha
    if (e.target.closest('.pro-card__back')) {
      const c = e.target.closest('.pro-card');
      gateCloseProCard(c, () => c.classList.remove('pro-card--selected'));
      return;
    }

    const card = e.target.closest('.pro-card');
    if (!card) return;

    // Flip é um MOVIMENTO → passa pela trava/fila do moveGate (não sobrepõe carrossel/
    // gaveta/indicação nem outro flip). Um flip enfileirado roda 2x (MOVE_ACCEL).
    if (indicateMode) {
      // ── Modo indicação: desseleciona anterior e flipa o novo ──
      // (os botões Cancelar/Indicar vêm da classe da lista, não do card)
      window.moveGate.run('flip', () => {
        document.querySelectorAll('#agenda-list .pro-card--selected').forEach(el => {
          el.classList.remove('pro-card--selected');
          proCardFlipToFront(el);
        });
        card.classList.add('pro-card--selected');
        selectedProId = card.id;
        const tl = proCardFlipToBack(card);
        return tl.promise;
      }, accelerateActiveFlips);
    } else {
      // ── Navegação normal: flip para o verso ou fecha se já estava aberto ──
      window.moveGate.run('flip', () => {
        const isFlipped = card.classList.contains('pro-card--flipped');
        document.querySelectorAll('#agenda-list .pro-card--flipped').forEach(el => {
          if (el !== card) proCardFlipToFront(el);
        });
        if (isFlipped) return proCardFlipToFront(card).promise;
        const tl = proCardFlipToBack(card);
        return tl.promise;
      }, accelerateActiveFlips);
    }
  });





  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Renderiza lista de contatos
  // Salvos e comuns são ordenados separadamente; filtros e ordem são lidos de filterState.
  // CTA de fim/vazio da lista de profissionais: em vez de uma simples mensagem
  // de "fim da lista", convida a abrir um pedido público por indicações. O botão
  // (#btn-agenda-cta-pedido) é tratado por delegação em #agenda-list (dois tempos:
  // desliza p/ a aba de pedidos → abre a gaveta de fazer pedido).
  const AGENDA_CTA_PEDIDO_HTML = `
    <div class="agenda-cta-pedido">
      <svg class="icon agenda-cta-pedido__icon" aria-hidden="true"><use href="#ic-person_search"></use></svg>
      <p class="agenda-cta-pedido__text">Não está conseguindo achar o profissional que procura? Faça um pedido público por indicações.</p>
      <button type="button" class="btn btn--accent agenda-cta-pedido__btn" id="btn-agenda-cta-pedido">
        <svg class="icon" aria-hidden="true"><use href="#ic-add"></use></svg>Fazer pedido
      </button>
    </div>`;

  // Variante no MODO INDICAÇÃO (procurando quem indicar): ao chegar ao fim/vazio,
  // em vez de "fazer pedido", convida a COMPARTILHAR o pedido com alguém de fora
  // da plataforma (um conhecido ainda não cadastrado). Botão #btn-agenda-cta-share.
  const AGENDA_CTA_SHARE_HTML = `
    <div class="agenda-cta-pedido agenda-cta-pedido--share">
      <svg class="icon agenda-cta-pedido__icon" aria-hidden="true"><use href="#ic-ios_share"></use></svg>
      <p class="agenda-cta-pedido__text">Não encontrou quem indicar aqui? Compartilhe este pedido com alguém de fora da plataforma — leve a um conhecido de confiança que ainda não se cadastrou.</p>
      <button type="button" class="btn btn--accent agenda-cta-pedido__btn" id="btn-agenda-cta-share">
        <svg class="icon" aria-hidden="true"><use href="#ic-share"></use></svg>Compartilhar pedido
      </button>
    </div>`;

  const renderAgendaList = () => {
    const list = document.getElementById('agenda-list');
    if (!list) return;

    updateFilterIndicator();   // reflete filtros ativos no indicador/limpar da barra
    const query = document.getElementById('inp-agenda-search')?.value.trim().toLowerCase() || '';
    const searched = getProfessionals().filter(p =>
      p.name.toLowerCase().includes(query) || p.tags.toLowerCase().includes(query)
    );
    const filtered = applyFilters(searched);

    const pinnedList = sortPros(filtered.filter(p =>  pinnedPros.has(p.id)));
    const otherList  = sortPros(filtered.filter(p => !pinnedPros.has(p.id)));
    const final = [...pinnedList, ...otherList];

    list.innerHTML = '';

    // No modo indicação (procurando quem indicar), o CTA de fim/vazio vira
    // "compartilhar este pedido fora da plataforma"; fora dele, "fazer pedido".
    const ctaHTML = indicateMode ? AGENDA_CTA_SHARE_HTML : AGENDA_CTA_PEDIDO_HTML;

    if (final.length === 0) {
      // Lista vazia (busca sem resultado ou filtros): mostra o CTA do contexto.
      list.insertAdjacentHTML('beforeend', ctaHTML);
      return;
    }

    final.forEach(pro => list.appendChild(buildProCard(pro, { showPin: true, withId: true })));

    // Fim do feed: CTA do contexto (mesmo bloco do estado vazio).
    list.insertAdjacentHTML('beforeend', ctaHTML);
  };

  // Reordena os cards já existentes com animação FLIP:
  // salvos e comuns são listas separadas, cada uma ordenada por filterState.sort.
  const reorderAgendaListAnimated = () => {
    const list = document.getElementById('agenda-list');
    if (!list || list.querySelectorAll(':scope > .pro-card').length < 2) return;
    // Deslocamento de cards = passa pela trava do moveGate (não sobrepõe a outro
    // movimento — troca de aba, flip, indicação). Enfileirado nasce 2× (o moveMs
    // lê MOVE_ACCEL); o play devolve uma PROMISE que resolve no FIM REAL do FLIP.
    window.moveGate.run('agenda-reorder', () => {
      // Query FRESCA dentro do play (roda desenfileirado; a lista pode ter sido
      // reconstruída entre o clique e a vez na fila).
      const cards = [...list.querySelectorAll(':scope > .pro-card')];
      if (cards.length < 2) return 0;

      const oldTops = new Map(cards.map(c => [c, c.getBoundingClientRect().top]));

      const pinnedCards = cards.filter(c =>  pinnedPros.has(c.id));
      const otherCards  = cards.filter(c => !pinnedPros.has(c.id));

      const proMap = new Map(getProfessionals().map(p => [p.id, p]));
      const sortCards = (arr) => [...arr].sort((a, b) => {
        const proA = proMap.get(a.id);
        const proB = proMap.get(b.id);
        if (!proA || !proB) return 0;
        return comparePros(proA, proB);
      });

      [...sortCards(pinnedCards), ...sortCards(otherCards)].forEach(c => {
        c.style.animation = 'none'; // evita repetir cardExpand ao reinserir o nó
        list.appendChild(c);
      });
      // Devolve o CTA de fim-de-feed ao FIM (os appendChild acima moveram os
      // cards para depois dele)
      const endCta = list.querySelector('.agenda-cta-pedido');
      if (endCta) list.appendChild(endCta);

      let maxDelta = 0;
      cards.forEach(c => {
        const delta = oldTops.get(c) - c.getBoundingClientRect().top;
        if (!delta) return;
        maxDelta = Math.max(maxDelta, Math.abs(delta));
        c.style.transition = 'none';
        c.style.transform = `translateY(${delta}px)`;
      });
      if (!maxDelta) return 0;   // nada se moveu — solta a trava na hora

      // Duração pela VELOCIDADE ÚNICA (maior deslocamento); + MOVE_ACCEL se enfileirado.
      const dur = window.moveMs(maxDelta);
      let resolveEnd, settled = false;
      const promise = new Promise((res) => { resolveEnd = res; });
      const finish = () => {
        if (settled) return; settled = true;
        cards.forEach(c => { c.style.transition = ''; });
        resolveEnd();
      };

      // Dois rAF: garante que o navegador pinte o estado deslocado antes de animar
      requestAnimationFrame(() => requestAnimationFrame(() => {
        cards.forEach(c => {
          c.style.transition = `transform ${dur}ms ${EASE_STD}`;
          c.style.transform = '';
        });
      }));

      setTimeout(finish, dur + 80);   // fim real + respiro dos 2 rAF
      return promise;
    });
  };

  document.getElementById('inp-agenda-search')?.addEventListener('input', renderAgendaList);
  renderAgendaList();

  // Compartilhar o pedido em indicação com alguém FORA da plataforma (Web Share
  // no celular; fallback copia p/ a área de transferência no desktop). Usa o
  // texto do pedido em indicação (activePostId) + convite para o app.
  const sharePedidoExternal = async (postId) => {
    const card = document.getElementById(`post-card-${postId}`) || morphedSourceCard;
    let pedidoText = '';
    const textEl = card?.querySelector('.pedido-item__text');
    if (textEl) {
      const clone = textEl.cloneNode(true);
      clone.querySelector('.pedido-item__urgent-badge')?.remove();   // tira o "Urgente"
      pedidoText = clone.textContent.trim();
    }
    const url = 'https://gentehonesta.com.br';
    const msg = pedidoText
      ? `Vi um pedido no Gente Honesta e lembrei de você:\n\n"${pedidoText}"\n\nConhece um profissional de confiança? Entre e indique (é rápido): ${url}`
      : `Tem um pedido por indicação no Gente Honesta. Conhece alguém de confiança? Entre e indique: ${url}`;
    await shareOrCopy({
      title: 'Gente Honesta — pedido por indicação', text: msg, url,
      copiedTitle: 'Compartilhar pedido',
      copiedMsg: 'Mensagem do pedido copiada! Cole no WhatsApp (ou onde quiser) para convidar seu conhecido.',
    });
  };

  // CTAs de fim/vazio da lista de profissionais (delegação — os botões são
  // recriados a cada render):
  //  • #btn-agenda-cta-pedido (navegação normal) → leva à aba de Pedidos e abre a
  //    gaveta de fazer pedido, em DOIS TEMPOS (calmo): (1) desliza o carrossel;
  //    (2) só quando o slide termina, com um respiro, abre a gaveta.
  //  • #btn-agenda-cta-share (modo indicação) → compartilha o pedido fora da app.
  document.getElementById('agenda-list')?.addEventListener('click', (e) => {
    if (e.target.closest('#btn-agenda-cta-share')) {
      sharePedidoExternal(activePostId);
      return;
    }
    if (!e.target.closest('#btn-agenda-cta-pedido')) return;
    // Tempo 1 — desliza para a aba de Pedidos (mesma curva/duração do carrossel).
    switchToTab(TAB.PEDIDOS);
    // Tempo 2 — abre a gaveta quando o slide do painel terminar, com um respiro.
    let opened = false;
    const openDrawer = () => {
      if (opened) return;
      opened = true;
      feedPanels?.removeEventListener('transitionend', onSlideEnd);
      setTimeout(() => myPedidoNavigate(), 180);   // respiro entre os dois tempos
    };
    const onSlideEnd = (ev) => {
      if (ev.target === feedPanels && ev.propertyName === 'transform') openDrawer();
    };
    feedPanels?.addEventListener('transitionend', onSlideEnd);
    // fallback caso o transitionend não dispare — folga sobre a duração do painel
    // (agora derivada da velocidade única, via --panel-slide-dur).
    const panelDur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--panel-slide-dur')) || 600;
    setTimeout(openDrawer, panelDur + 200);
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - ABA VAGAS - Dados mock e renderização
  // =========================================================================


  // Conteúdo visual da vaga (faixa da empresa + divulgador + corpo com
  // requisitos/detalhes/benefícios), SEM o casco do card nem as ações. Fonte
  // ÚNICA usada pela FRENTE do card de vaga (renderVagasList) E pela gaveta de
  // detalhe da vaga (renderVagaDetail) — o "mesmo visual do card, sem o card".
  // `bodyTailHTML` é injetado ao FIM do corpo (no card = as ações apply/share).
  // Hoistada (function) para ficar disponível antes de suas chamadas.
  function vagaContentHTML(vaga, bodyTailHTML = '') {
    const reqHTML = vaga.requisitos.map(r =>
      `<li class="vaga-card__req"><svg class="icon" aria-hidden="true"><use href="#ic-check_small"></use></svg>${r}</li>`
    ).join('');

    const benefitHTML = vaga.beneficios.map(b =>
      `<span class="vaga-card__benefit"><svg class="icon" aria-hidden="true"><use href="#ic-${b.icon}"></use></svg>${b.label}</span>`
    ).join('');

    // Seção de benefícios só aparece se a vaga tiver algum (vagas do usuário
    // podem não ter benefícios — evita um cabeçalho "Benefícios" vazio).
    const benefitSectionHTML = vaga.beneficios.length ? `
              <div class="vaga-card__section">
                <p class="vaga-card__section-label">Benefícios</p>
                <div class="vaga-card__benefits">${benefitHTML}</div>
              </div>` : '';

    const vagasLabel = vaga.vagas === 1 ? '1 vaga disponível' : `${vaga.vagas} vagas disponíveis`;

    const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(vaga.mapsQuery)}`;

    // Nome da empresa: se ainda não temos os dados oficiais (vaga criada por
    // CNPJ), mostramos o próprio CNPJ como identificador. Idem para o endereço,
    // que vira uma nota "pendente" (não-link) até virem os dados do sistema.
    const companyName = vaga.empresa || (vaga.cnpj ? `CNPJ ${vaga.cnpj}` : '');
    const addressHTML = vaga.endereco
      ? `<a class="vaga-card__company-address" href="${mapsUrl}" target="_blank" rel="noopener" aria-label="Ver no Google Maps: ${vaga.endereco}">
                  <svg class="icon" aria-hidden="true"><use href="#ic-location_on"></use></svg>
                  ${vaga.endereco}
                </a>`
      : `<span class="vaga-card__company-address vaga-card__company-address--pending">
                  <svg class="icon" aria-hidden="true"><use href="#ic-hourglass_top"></use></svg>
                  Dados da empresa em verificação
                </span>`;

    // Afordância "ver no mapa" à direita do cabeçalho (ícone de mapa + seta) —
    // só quando há endereço oficial (vaga por CNPJ pendente não tem mapa ainda).
    const mapsAffordanceHTML = vaga.endereco
      ? `<a class="vaga-card__company-maps" href="${mapsUrl}" target="_blank" rel="noopener" aria-label="Ver endereço no mapa">
                  <svg class="icon" aria-hidden="true"><use href="#ic-map"></use></svg>
                  <svg class="icon vaga-card__company-maps-arrow" aria-hidden="true"><use href="#ic-chevron_right"></use></svg>
                </a>`
      : '';

    return `
            <div class="vaga-card__company-strip">
              <svg class="icon vaga-card__company-icon" aria-hidden="true"><use href="#ic-domain"></use></svg>
              <div class="vaga-card__company-info">
                <span class="vaga-card__company-name">${companyName}</span>
                ${addressHTML}
              </div>
              ${mapsAffordanceHTML}
            </div>
            <div class="vaga-card__body">
              <div class="vaga-card__role-row">
                <h3 class="vaga-card__role">${vaga.cargo}</h3>
                <span class="vaga-card__vacancies">
                  <svg class="icon" aria-hidden="true"><use href="#ic-groups"></use></svg>
                  ${vagasLabel}
                </span>
              </div>
              <div class="vaga-card__section">
                <p class="vaga-card__section-label">Requisitos</p>
                <ul class="vaga-card__requirements">${reqHTML}</ul>
              </div>
              <div class="vaga-card__section">
                <p class="vaga-card__section-label">Detalhes</p>
                <div class="vaga-card__meta-row">
                  <span class="vaga-card__meta-item">
                    <svg class="icon" aria-hidden="true"><use href="#ic-schedule-o"></use></svg>
                    ${vaga.cargaHoraria}
                  </span>
                  <span class="vaga-card__meta-item vaga-card__salary">
                    <svg class="icon" aria-hidden="true"><use href="#ic-payments"></use></svg>
                    ${vaga.salario}
                  </span>
                </div>
              </div>
              ${benefitSectionHTML}
              ${bodyTailHTML}
            </div>`;
  }

  const renderVagasList = () => {
    const list = document.getElementById('vagas-list');
    if (!list) return;
    list.innerHTML = '';

    getVagas().forEach(vaga => {
      const card = document.createElement('article');
      card.className = 'vaga-card';
      card.id = vaga.id;

      // Currículo na candidatura só aparece se a vaga exigir (legado: undefined = exige).
      const exigeCurriculo = vaga.exigeCurriculo !== false;
      const curriculoSectionHTML = exigeCurriculo ? `
              <!-- 5. Currículo -->
              <div class="candid-section">
                <p class="candid-section-label">Currículo completo</p>
                <label class="candid-upload-btn" data-vaga="${vaga.id}">
                  <svg class="icon" aria-hidden="true"><use href="#ic-attach_file-o"></use></svg>
                  <span class="candid-upload-text">Adicionar currículo em foto ou PDF</span>
                  <input type="file" accept=".pdf,image/*" class="candid-upload-input" data-vaga="${vaga.id}" aria-label="Anexar currículo">
                </label>
              </div>` : '';

      const reqObsHTML = vaga.requisitos.map((r, i) => `
        <details class="candid-req-obs">
          <summary class="candid-req-obs-label">${r}</summary>
          <textarea
            class="candid-req-obs-input"
            name="obs-${vaga.id}-${i}"
            rows="2"
            placeholder="Escreva uma observação…"
            aria-label="Observação sobre: ${r}"
          ></textarea>
        </details>
      `).join('');

      const cardActionsHTML = `
              <div class="vaga-card__actions">
                <button type="button" class="btn vaga-card__btn-apply">
                  Me candidatar
                </button>
                <button type="button" class="btn vaga-card__btn-share" aria-label="Compartilhar vaga">
                  <svg class="icon" aria-hidden="true"><use href="#ic-share"></use></svg>
                </button>
              </div>`;

      card.innerHTML = `
        <div class="vaga-card__3d">
        <div class="vaga-card__flipper">
          <!-- FRENTE -->
          <div class="vaga-card__front">
            ${vagaContentHTML(vaga, cardActionsHTML)}
          </div><!-- /front -->

          <!-- VERSO: formulário de candidatura (sem header) -->
          <div class="vaga-card__back">
            <div class="vaga-card__back-form">

              <!-- 1. Observações por requisito + Confirmação -->
              <div class="candid-section">
                <p class="candid-section-label">Observações dos requisitos</p>
                <p class="candid-section-hint">Abra o(s) requisito(s) que quiser comentar</p>
                ${reqObsHTML}
                <label class="candid-check candid-check--confirm">
                  <input type="checkbox" name="confirm-req-${vaga.id}">
                  <span>Confirmo que possuo todos os requisitos obrigatórios</span>
                </label>
              </div>

              <!-- 2. Disponibilidade -->
              <div class="candid-section">
                <p class="candid-section-label">Disponibilidade</p>
                <div class="candid-radio-group">
                  <label class="candid-radio">
                    <input type="radio" name="disponib-${vaga.id}" value="imediata">
                    <span>Imediata</span>
                  </label>
                  <label class="candid-radio">
                    <input type="radio" name="disponib-${vaga.id}" value="7dias">
                    <span>7 dias</span>
                  </label>
                  <label class="candid-radio">
                    <input type="radio" name="disponib-${vaga.id}" value="30dias">
                    <span>30 dias</span>
                  </label>
                </div>
              </div>

              <!-- 3+4. Flexibilidade e Transporte lado a lado -->
              <div class="candid-two-col">
                <div class="candid-section">
                  <p class="candid-section-label">Flexibilidade</p>
                  <label class="candid-check">
                    <input type="checkbox" name="flex-${vaga.id}" value="horas-extras">
                    <span>Horas extras</span>
                  </label>
                  <label class="candid-check">
                    <input type="checkbox" name="flex-${vaga.id}" value="sabados">
                    <span>Sábados</span>
                  </label>
                  <label class="candid-check">
                    <input type="checkbox" name="flex-${vaga.id}" value="feriados">
                    <span>Feriados</span>
                  </label>
                </div>
                <div class="candid-section">
                  <p class="candid-section-label">Transporte</p>
                  <label class="candid-check">
                    <input type="checkbox" name="transp-${vaga.id}" value="pe-bicicleta">
                    <span>A pé / Bicicleta</span>
                  </label>
                  <label class="candid-check">
                    <input type="checkbox" name="transp-${vaga.id}" value="onibus">
                    <span>Ônibus</span>
                  </label>
                  <div class="candid-check-row">
                    <label class="candid-check">
                      <input type="checkbox" name="transp-${vaga.id}" value="carro">
                      <span>Carro</span>
                    </label>
                    <label class="candid-check">
                      <input type="checkbox" name="transp-${vaga.id}" value="moto">
                      <span>Moto</span>
                    </label>
                  </div>
                </div>
              </div>
              ${curriculoSectionHTML}

            </div><!-- /back-form -->
            <div class="vaga-card__back-footer">
              <button type="button" class="btn vaga-card__btn-back" aria-label="Voltar para a vaga">
                <svg class="icon" aria-hidden="true"><use href="#ic-arrow_back"></use></svg>
              </button>
              <button type="button" class="btn btn--primary vaga-card__btn-submit" data-vaga="${vaga.id}">
                Confirmar
              </button>
            </div>
          </div><!-- /back -->
        </div><!-- /flipper -->
        </div><!-- /3d -->
      `;

      // Abertura/fechamento ANIMADO dos <details> de observação por requisito.
      // O <details> nativo abre de uma vez (salto na altura). Aqui interceptamos o
      // clique no resumo e animamos a ALTURA DO PRÓPRIO PAINEL do details (de só o
      // resumo até resumo+campo, e vice-versa). Como o card de candidatura fica em
      // `height:auto` quando expandido, ele ACOMPANHA o crescimento do painel frame
      // a frame — o campo abre suave e o card se estende junto.
      card.querySelectorAll('.candid-req-obs').forEach(det => {
        const summary = det.querySelector('.candid-req-obs-label');
        summary?.addEventListener('click', (e) => {
          e.preventDefault(); // controlamos a abertura para animar
          if (det.dataset.reqAnim) return; // ignora toques durante a animação
          animateReqDetails(det, summary);
        });
      });

      list.appendChild(card);
    });

    // Fim do feed: linha-aviso de que a lista da região terminou
    list.insertAdjacentHTML('beforeend',
      '<div class="feed-end-cap"><span class="feed-end-cap__text">Você viu todas as vagas disponíveis na sua região no momento</span></div>');
  };


  // ── MOTOR DE FLIP ACELERÁVEL ────────────────────────────────────────────────
  // O flip tem DUAS fases sequenciais (rotação → expansão de altura) separadas por
  // setTimeout. Para o moveGate poder AGILIZAR um flip EM CURSO (quando o usuário
  // toca outro card / desliza a aba), TODAS as fases precisam acelerar juntas — não
  // basta o playbackRate da fase atual (a fase futura, ainda em setTimeout, correria
  // cheia e a próxima animação atropelaria). A "timeline" abaixo guarda os timers
  // pendentes e, ao acelerar, reprograma cada um p/ METADE do restante E dobra o
  // playbackRate das transições em voo — o flip inteiro passa a 2×.
  const activeFlipTLs = new Set();
  const makeFlipTimeline = (card) => {
    if (card.__flipTL && !card.__flipTL.done) card.__flipTL.cancel();
    const tl = { speed: window.MOVE_ACCEL || 1, done: false, timers: new Set() };
    // promise resolvida quando a animação REALMENTE termina — é o que a trava do
    // moveGate espera (acelerar faz resolver antes; a trava nunca solta no meio).
    tl.promise = new Promise((res) => { tl._resolve = res; });
    activeFlipTLs.add(tl);
    card.__flipTL = tl;
    tl.dur = (baseMs) => Math.round(baseMs / tl.speed);   // duração de CSS já escalada
    tl.after = (baseMs, fn) => {                            // setTimeout escalável
      const rec = { fn, endAt: performance.now() + baseMs / tl.speed, id: 0 };
      rec.id = setTimeout(() => { tl.timers.delete(rec); fn(); }, baseMs / tl.speed);
      tl.timers.add(rec);
      return rec;
    };
    tl._scroll = null;   // controller do scroll de ajuste (última fase do ABRIR)
    tl.finish = () => { tl.done = true; tl.timers.clear(); activeFlipTLs.delete(tl); if (card.__flipTL === tl) card.__flipTL = null; tl._resolve && tl._resolve(); };
    tl.cancel = () => { tl.timers.forEach(r => clearTimeout(r.id)); tl._scroll && tl._scroll.cancel(); tl.finish(); };
    tl.accelerate = () => {                                 // 2× em voo: timers + visual + scroll
      if (tl.speed >= 2 || tl.done) return;
      tl.speed = 2;
      const t = performance.now();
      for (const rec of [...tl.timers]) {
        clearTimeout(rec.id);
        const remaining = Math.max(0, (rec.endAt - t)) / 2;
        rec.endAt = t + remaining;
        rec.id = setTimeout(() => { tl.timers.delete(rec); rec.fn(); }, remaining);
      }
      try { card.getAnimations({ subtree: true }).forEach(a => { a.playbackRate = 2; }); } catch (_) {}
      if (tl._scroll) tl._scroll.accelerate();
    };
    // Última fase do ABRIR: rola SÓ o container do card p/ trazê-lo à vista (na
    // velocidade única, acelerável) e só então resolve a promise (tl.finish).
    tl.settleScroll = () => {
      const container = scrollableAncestor(card);
      const sc = animateScrollTo(container, container ? nearestScrollTarget(card, container) : 0);
      tl._scroll = sc;
      if (tl.speed >= 2) sc.accelerate();
      sc.promise.then(() => tl.finish());
    };
    return tl;
  };
  // Callback de aceleração passado ao moveGate: agiliza TODOS os flips em voo (o que
  // abre + os que o accordion está fechando).
  const accelerateActiveFlips = () => { for (const tl of [...activeFlipTLs]) tl.accelerate(); };

  // ── SCROLL ANIMADO UNIFICADO ────────────────────────────────────────────────
  // Rola SÓ o container passado (nunca ancestrais — era o que fazia o scrollIntoView
  // pós-flip puxar o carrossel de volta) até targetTop. Duração pela VELOCIDADE ÚNICA
  // (window.moveMs). Devolve um controller acelerável (ctrl.accelerate() → 2×) e
  // cancelável (ctrl.cancel()); ctrl.promise resolve no FIM real — é o que empacota o
  // scroll no movimento (a trava do moveGate espera por ele, e ele acelera junto).
  const animateScrollTo = (container, targetTop) => {
    const ctrl = { speed: window.MOVE_ACCEL || 1, done: false, raf: 0, _resolve: null };
    ctrl.promise = new Promise((res) => { ctrl._resolve = res; });
    const finish = () => { if (ctrl.done) return; ctrl.done = true; cancelAnimationFrame(ctrl.raf); ctrl._resolve(); };
    ctrl.accelerate = () => { ctrl.speed = Math.max(ctrl.speed, 2); };
    ctrl.cancel = finish;
    if (!container) { finish(); return ctrl; }
    const from = container.scrollTop;
    const dist = Math.round(targetTop) - from;
    if (Math.abs(dist) < 2) { finish(); return ctrl; }
    const baseDur = window.moveMs(Math.abs(dist));   // âncora de velocidade única
    let prog = 0, lastT = performance.now();
    const tick = (t) => {
      if (ctrl.done) return;
      const dt = t - lastT; lastT = t;
      prog = Math.min(1, prog + (dt * ctrl.speed) / baseDur);   // acelera com ctrl.speed
      container.scrollTop = from + dist * (1 - Math.pow(1 - prog, 3));   // easeOutCubic
      if (prog < 1) ctrl.raf = requestAnimationFrame(tick);
      else finish();
    };
    ctrl.raf = requestAnimationFrame(tick);
    return ctrl;
  };
  // Ancestral rolável mais próximo (o container de scroll do card) — para rolar SÓ ele.
  const scrollableAncestor = (el) => {
    let p = el && el.parentElement;
    while (p && p !== document.body) {
      const oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight + 1) return p;
      p = p.parentElement;
    }
    return null;
  };
  // scrollTop mínimo p/ trazer o card à vista dentro do container (semântica block:'nearest').
  const nearestScrollTarget = (card, container) => {
    const cr = card.getBoundingClientRect(), kr = container.getBoundingClientRect();
    let delta = 0;
    if (cr.bottom > kr.bottom) delta = cr.bottom - kr.bottom;   // desce só o necessário
    else if (cr.top < kr.top)  delta = cr.top - kr.top;         // sobe só o necessário (negativo)
    return container.scrollTop + delta;
  };

  function flipCardToBack(card, cfg) {
    // Velocidade padrão: honra o acelerador. Um flip ENFILEIRADO nasce em 2× (speed);
    // um flip EM CURSO é levado a 2× por tl.accelerate() quando outro movimento chega.
    const tl = makeFlipTimeline(card);
    const flipper = card.querySelector(cfg.flipperSel);
    // A ROTAÇÃO é CSS: casa com flipMs via duração inline no flipper (senão a expansão
    // começaria antes da rotação terminar). Ao acelerar em voo, o playbackRate cobre.
    if (flipper) flipper.style.transitionDuration = tl.dur(cfg.flipMs) + 'ms';
    const frontH = card.offsetHeight;
    card.dataset.frontH = frontH;
    card.style.transition = 'none';
    card.style.height     = frontH + 'px';
    card.style.overflow   = 'visible';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add(cfg.flippedClass);
        tl.after(cfg.flipMs, () => {
          card.style.overflow = '';
          card.classList.add(cfg.expandedClass);
          const back   = card.querySelector(cfg.backSel);
          const backH  = back.offsetHeight;
          const delta  = backH - frontH;
          const footer = card.querySelector(cfg.footerSel);
          if (footer) { footer.style.transition = 'none'; footer.style.transform = `translateY(-${delta}px)`; }
          card.style.clipPath = 'inset(0 0 0 0)';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const timing = `${tl.dur(cfg.expandMs)}ms ${EASE_STD}`;
              card.style.transition = `height ${timing}`;
              card.style.height     = backH + 'px';
              if (footer) { footer.style.transition = `transform ${timing}`; footer.style.transform = ''; }
              tl.after(cfg.expandMs + 20, () => {
                card.style.height = 'auto'; card.style.transition = ''; card.style.clipPath = '';
                if (footer) footer.style.transition = '';
                tl.settleScroll();   // ajuste de scroll = última fase (resolve a promise)
              });
            });
          });
        });
      });
    });
    return tl;
  }

  function flipCardToFront(card, cfg, onComplete) {
    const tl = makeFlipTimeline(card);
    const flipper = card.querySelector(cfg.flipperSel);
    if (flipper) flipper.style.transitionDuration = tl.dur(cfg.flipMs) + 'ms';
    const frontH   = parseInt(card.dataset.frontH || 200);
    const currentH = card.offsetHeight;
    const delta    = currentH - frontH;
    const footer   = card.querySelector(cfg.footerSel);
    card.style.transition = 'none';
    card.style.height     = currentH + 'px';
    if (footer) footer.style.transition = 'none';
    card.style.clipPath = 'inset(0 0 0 0)';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const timing = `${tl.dur(cfg.collMs)}ms ${EASE_STD}`;
        card.style.transition = `height ${timing}`;
        card.style.height     = frontH + 'px';
        if (footer) { footer.style.transition = `transform ${timing}`; footer.style.transform = `translateY(-${delta}px)`; }
        tl.after(cfg.collMs + 10, () => {
          if (footer) { footer.style.transition = 'none'; footer.style.transform = ''; }
          card.classList.remove(cfg.expandedClass);
          card.style.transition = 'none'; card.style.clipPath = ''; card.style.overflow = 'visible';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.classList.remove(cfg.flippedClass);
              tl.after(cfg.flipMs + 30, () => {
                card.style.height = ''; card.style.transition = ''; card.style.overflow = '';
                if (flipper) flipper.style.transitionDuration = '';   // volta à duração do CSS
                tl.finish();
                if (onComplete) onComplete();
              });
            });
          });
        });
      });
    });
    return tl;
  }

  function flipCardForceReset(card, cfg) {
    if (card.__flipTL && !card.__flipTL.done) card.__flipTL.cancel();   // mata timers pendentes
    card.classList.remove(cfg.flippedClass, cfg.expandedClass);
    card.style.height = card.style.overflow = card.style.transition = card.style.clipPath = '';
    const footer = card.querySelector(cfg.footerSel);
    if (footer) { footer.style.transform = footer.style.transition = ''; }
    const flipper = card.querySelector(cfg.flipperSel);
    if (flipper) flipper.style.transitionDuration = '';   // volta à duração do CSS
  }

  // ── Wrappers vaga-card ────────────────────────────────────────────────────
  function vagaCardFlipToBack(card)              { return flipCardToBack(card, VAGA_CARD_CFG); }
  function vagaCardFlipToFront(card, onComplete) { return flipCardToFront(card, VAGA_CARD_CFG, onComplete); }

  // Anima a altura do PAINEL de um <details> de observação: de só o resumo até
  // resumo+campo (abrir) ou o contrário (fechar). O card de candidatura, em
  // `height:auto` quando expandido, cresce/encolhe junto frame a frame. No FECHAR,
  // o `open` só sai no fim, para o campo ficar visível durante o encolhimento.
  // Fallback por timer caso o transitionend não dispare.
  function animateReqDetails(det, summary) {
    const opening = !det.hasAttribute('open');
    det.dataset.reqAnim = '1';
    det.style.overflow = 'hidden';
    const summaryH = summary.offsetHeight;
    let fromH, toH;
    if (opening) {
      det.setAttribute('open', '');       // revela o campo p/ medir a altura cheia
      fromH = summaryH;
      toH = det.scrollHeight;
    } else {
      fromH = det.offsetHeight;
      toH = summaryH;                      // mantém `open` até o fim (campo visível)
    }
    det.style.height = fromH + 'px';
    void det.offsetHeight;                 // reflow: fixa a altura inicial
    requestAnimationFrame(() => {
      det.style.transition = `height 0.3s ${EASE_STD}`;
      det.style.height = toH + 'px';
    });
    const finish = (ev) => {
      if (ev && ev.propertyName !== 'height') return;
      det.removeEventListener('transitionend', finish);
      clearTimeout(det._reqTimer);
      if (!opening) det.removeAttribute('open');
      det.style.height = ''; det.style.transition = ''; det.style.overflow = '';
      delete det.dataset.reqAnim;
    };
    det.addEventListener('transitionend', finish);
    det._reqTimer = setTimeout(finish, 400);
  }

  // ── Wrappers pro-card ─────────────────────────────────────────────────────
  // Reseta o verso do card após o flip-to-front: volta o scroll dos comentários ao
  // topo p/ a próxima abertura começar do início (não há mais paginação "ver mais").
  function resetProCardBack(card) {
    const backComments = card.querySelector('.pro-card__back-comments');
    if (backComments) backComments.scrollTop = 0;
  }

  // Ordenação dos comentários do verso — alterna entre 'recent' (ordem natural do
  // repositório = mais recentes) e 'ic' (maior Índice de Confiança primeiro). A
  // seleção ativa fica em azul (padrão de seleção). Reescreve SÓ a lista do card
  // tocado e volta o scroll ao topo p/ ver o começo da nova ordem. (hoisted)
  function sortProComments(btn) {
    if (btn.getAttribute('aria-pressed') === 'true') return;   // já é a ordem atual
    const card  = btn.closest('.pro-card');
    const group = btn.closest('.pro-card__comments-sort');
    const list  = card?.querySelector('.pro-card__comments-list');
    if (!card || !group || !list) return;
    group.querySelectorAll('.pro-card__sort-btn').forEach(b => {
      const on = b === btn;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const comments = [...getComments()];
    const ordered  = btn.dataset.sort === 'ic' ? comments.sort((a, b) => b.ic - a.ic) : comments;
    list.innerHTML = ordered.map(buildCommentHTML).join('');
    const cc = card.querySelector('.pro-card__back-comments');
    if (cc) cc.scrollTop = 0;
  }

  function proCardFlipToBack(card)               { return flipCardToBack(card, PRO_CARD_CFG); }
  function proCardFlipToFront(card, onComplete)  {
    return flipCardToFront(card, PRO_CARD_CFG, () => {
      resetProCardBack(card);
      if (onComplete) onComplete();
    });
  }
  const proCardForceReset = (card) => {
    card.classList.remove('pro-card--selected');
    flipCardForceReset(card, PRO_CARD_CFG);
  };

  // Delegação de cliques nos cards de vaga
  document.getElementById('vagas-list')?.addEventListener('click', (e) => {
    // Flip para o verso — recolhe qualquer outro card aberto em paralelo
    const btnApply = e.target.closest('.vaga-card__btn-apply');
    if (btnApply) {
      gateVagaFlipBack(btnApply.closest('.vaga-card'));
      return;
    }

    // Volta para a frente — colapsa → flip back
    const btnBack = e.target.closest('.vaga-card__btn-back');
    if (btnBack) {
      gateVagaFlipFront(btnBack.closest('.vaga-card'));
      return;
    }

    // Enviar candidatura — colapsa → flip back → alerta
    const btnSubmit = e.target.closest('.vaga-card__btn-submit');
    if (btnSubmit) {
      gateVagaFlipFront(btnSubmit.closest('.vaga-card'), () => {
        customAlert('Candidatura enviada com sucesso! Você será notificado quando houver retorno.', 'Candidatura Enviada', 'check_circle');
      });
      return;
    }

    if (e.target.closest('.vaga-card__btn-share')) {
      comingSoon('Compartilhar vaga', 'Compartilhar', 'share');
      return;
    }

    // Cabeçalho (faixa da empresa) LEVA AO MAPA, nunca à candidatura → NUNCA flipa.
    // Se o toque não caiu num link nativo (endereço/ícone de mapa), encaminha ao
    // link de mapa do próprio cabeçalho (quando a vaga tem endereço oficial).
    const strip = e.target.closest('.vaga-card__company-strip');
    if (strip) {
      if (!e.target.closest('a[href]')) {
        (strip.querySelector('.vaga-card__company-maps') ||
         strip.querySelector('.vaga-card__company-address[href]'))?.click();
      }
      return;
    }

    // Clique em qualquer OUTRA parte da frente do card → flip (o cabeçalho já saiu acima)
    const front = e.target.closest('.vaga-card__front');
    if (front) {
      gateVagaFlipBack(front.closest('.vaga-card'));
      return;
    }
  });

  // Exibir nome do arquivo no label após seleção
  document.getElementById('vagas-list')?.addEventListener('change', (e) => {
    const input = e.target.closest('.candid-upload-input');
    if (!input) return;
    const label = input.closest('.candid-upload-btn');
    const file = input.files?.[0];
    if (file && label) {
      label.querySelector('.candid-upload-text').textContent = file.name;
    }
  });

  // ── Sheet "Criar vaga" ─────────────────────────────────────────────────
  // Formulário de criação de vaga (mock, sem persistência no Firestore).
  // Ao publicar, a vaga entra no topo da lista via addVaga() + re-renderiza, e o
  // botão "Criar vaga" da action bar vira "Ver vaga" (rola até o card criado).
  {
    const vagaSheet    = document.getElementById('vaga-sheet');
    const btnCriarVaga = document.getElementById('btn-criar-vaga');
    const reqList      = document.getElementById('vaga-req-list');
    const benefitList  = document.getElementById('vaga-benefit-list');
    const benefitPills = document.getElementById('vaga-benefit-pills');
    const benefitOutros = document.getElementById('vaga-benefit-outros');
    const inpCnpj      = document.getElementById('inp-vaga-cnpj');
    const inpCargo     = document.getElementById('inp-vaga-cargo');
    const inpSalario   = document.getElementById('inp-vaga-salario');
    const timeState    = { inicio: '08:00', fim: '18:00' }; // horários dos steppers
    const daysGroup    = document.getElementById('vaga-days');
    const countValueEl = document.getElementById('vaga-count-value');
    const btnCountDec  = document.getElementById('vaga-count-dec');
    const btnCountInc  = document.getElementById('vaga-count-inc');
    const chkCurriculo = document.getElementById('chk-vaga-curriculo');

    let vagaCount = 1;
    let myVagaId  = null;

    // ── Número de vagas: stepper +/- ──
    const renderCount = () => {
      if (countValueEl) countValueEl.textContent = String(vagaCount);
      if (btnCountDec) btnCountDec.disabled = vagaCount <= 1;
      if (btnCountInc) btnCountInc.disabled = vagaCount >= MAX_VAGAS;
    };
    btnCountDec?.addEventListener('click', () => { if (vagaCount > 1)         { vagaCount--; renderCount(); } });
    btnCountInc?.addEventListener('click', () => { if (vagaCount < MAX_VAGAS) { vagaCount++; renderCount(); } });

    // ── Steppers de hora (meia em meia hora, com giro 23:30 → 00:00) ──
    // Substituem o <select> nativo do sistema pelo padrão do app (.vaga-stepper).
    const timeToMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const minToTime = (m) => {
      const mm = ((m % 1440) + 1440) % 1440;
      return `${String(Math.floor(mm / 60)).padStart(2, '0')}:${String(mm % 60).padStart(2, '0')}`;
    };
    const renderTime = (key) => {
      const el = document.getElementById(key === 'inicio' ? 'vaga-hora-inicio-value' : 'vaga-hora-fim-value');
      if (el) el.textContent = timeState[key];
    };
    const wireTimeStepper = (stepperId, key) => {
      document.getElementById(stepperId)?.addEventListener('click', (e) => {
        const btn = e.target.closest('.vaga-stepper__btn');
        if (!btn) return;
        timeState[key] = minToTime(timeToMin(timeState[key]) + 30 * parseInt(btn.dataset.step, 10));
        renderTime(key);
      });
    };
    wireTimeStepper('stepper-hora-inicio', 'inicio');
    wireTimeStepper('stepper-hora-fim', 'fim');

    // ── Dias de trabalho: toggle múltiplo ──
    const getSelectedDays = () =>
      DAY_ORDER.filter(d => daysGroup?.querySelector(`.vaga-day[data-day="${d}"]`)?.classList.contains('vaga-day--active'));

    daysGroup?.addEventListener('click', (e) => {
      const btn = e.target.closest('.vaga-day');
      if (!btn) return;
      btn.classList.toggle('vaga-day--active');
      btn.setAttribute('aria-pressed', String(btn.classList.contains('vaga-day--active')));
      daysGroup.classList.remove('vaga-days--error');
    });

    // Compacta os dias selecionados: uma sequência contígua vira "Seg–Sex";
    // caso contrário, junta com vírgula ("Seg, Qua, Sex").
    const formatDays = (days) => {
      if (days.length <= 1) return days.join('');
      const idx = days.map(d => DAY_ORDER.indexOf(d));
      const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
      return contiguous ? `${days[0]}–${days[days.length - 1]}` : days.join(', ');
    };

    // ── CNPJ: máscara 00.000.000/0000-00 ──
    const formatCnpj = (value) => {
      const d = value.replace(/\D/g, '').slice(0, 14);
      let out = d;
      if (d.length > 2)  out = `${d.slice(0, 2)}.${d.slice(2)}`;
      if (d.length > 5)  out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
      if (d.length > 8)  out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
      if (d.length > 12) out = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
      return out;
    };
    inpCnpj?.addEventListener('input', () => {
      inpCnpj.value = formatCnpj(inpCnpj.value);
      inpCnpj.classList.remove('input-text--error');
    });

    // ── Salário: só dígitos, formatado com separador de milhar ──
    inpSalario?.addEventListener('input', () => {
      const d = inpSalario.value.replace(/\D/g, '');
      inpSalario.value = d ? Number(d).toLocaleString('pt-BR') : '';
      inpSalario.classList.remove('input-text--error');
    });

    // ── Check "Exigir currículo" ──
    chkCurriculo?.addEventListener('click', () => {
      const on = chkCurriculo.getAttribute('aria-pressed') === 'true';
      chkCurriculo.setAttribute('aria-pressed', String(!on));
    });

    // Mapeia palavras-chave do benefício para um ícone Material coerente.
    const benefitIcon = (label) => {
      const l = label.toLowerCase();
      if (/alimenta|refei|lanche/.test(l))   return 'lunch_dining';
      if (/transporte|ônibus|onibus/.test(l)) return 'directions_bus';
      if (/sa[úu]de|m[ée]dic|plano/.test(l))  return 'health_and_safety';
      if (/vida|seguro/.test(l))              return 'medical_services';
      if (/carteira|assinad|clt/.test(l))     return 'receipt_long';
      if (/trein|curso|capacita/.test(l))     return 'school';
      if (/comiss|b[ôo]nus|bonus/.test(l))    return 'paid';
      return 'redeem';
    };

    // Cria uma linha de input dinâmico (requisito ou benefício) com botão remover.
    // keepLast=true (requisitos, que exigem ≥1): remover a ÚLTIMA linha apenas
    // LIMPA o campo, mantendo sempre uma linha disponível — nunca some tudo.
    const addDynRow = (listEl, placeholder, value = '', keepLast = false) => {
      const row = document.createElement('div');
      row.className = 'vaga-dyn-row';
      row.innerHTML = `
        <input type="text" class="input-text vaga-dyn-input" maxlength="80" placeholder="${placeholder}">
        <button type="button" class="vaga-dyn-remove" aria-label="Remover">
          <svg class="icon" aria-hidden="true"><use href="#ic-close"></use></svg>
        </button>
      `;
      const input = row.querySelector('.vaga-dyn-input');
      input.value = value;
      input.addEventListener('input', () => input.classList.remove('input-text--error'));
      row.querySelector('.vaga-dyn-remove').addEventListener('click', (e) => {
        // stopPropagation: o botão remove a linha do DOM; sem isto, o clique
        // borbulharia até o tap-outside da gaveta, cujo e.target.closest() falha
        // (elemento já destacado) e FECHAVA a gaveta inteira de criar vaga.
        e.stopPropagation();
        const onlyRow = listEl.querySelectorAll('.vaga-dyn-row').length === 1;
        if (keepLast && onlyRow) {
          input.value = '';
          input.classList.remove('input-text--error');
          input.focus();
        } else {
          row.remove();
        }
      });
      listEl.appendChild(row);
      return input;
    };

    // Benefícios "Outros": revela a lista de texto livre para benefícios extras.
    const btnAddBenefit = document.getElementById('btn-add-benefit');
    const setOutrosOpen = (open) => {
      benefitList?.classList.toggle('u-hidden', !open);
      btnAddBenefit?.classList.toggle('u-hidden', !open);
      if (open) {
        if (benefitList && !benefitList.querySelector('.vaga-dyn-input')) addDynRow(benefitList, 'Ex: Auxílio creche');
      } else if (benefitList) {
        benefitList.innerHTML = '';
      }
    };

    // Pílulas de benefício: seleção múltipla; "Outros" abre a lista de texto livre.
    benefitPills?.addEventListener('click', (e) => {
      const pill = e.target.closest('.vaga-benefit-pill');
      if (!pill) return;
      const on = pill.getAttribute('aria-pressed') === 'true';
      pill.setAttribute('aria-pressed', String(!on));
      if (pill === benefitOutros) setOutrosOpen(!on);
    });

    // Zera o formulário para o estado inicial.
    const resetVagaForm = () => {
      [inpCnpj, inpCargo, inpSalario].forEach(el => {
        if (el) { el.value = ''; el.classList.remove('input-text--error'); }
      });
      vagaCount = 1;
      renderCount();
      timeState.inicio = '08:00';
      timeState.fim = '18:00';
      renderTime('inicio');
      renderTime('fim');
      daysGroup?.querySelectorAll('.vaga-day').forEach(d => {
        const on = DEFAULT_WORK_DAYS.includes(d.dataset.day);
        d.classList.toggle('vaga-day--active', on);
        d.setAttribute('aria-pressed', String(on));
      });
      daysGroup?.classList.remove('vaga-days--error');
      chkCurriculo?.setAttribute('aria-pressed', 'false');
      benefitPills?.querySelectorAll('.vaga-benefit-pill').forEach(p => p.setAttribute('aria-pressed', 'false'));
      setOutrosOpen(false);
      if (reqList) { reqList.innerHTML = ''; addDynRow(reqList, 'Ex: Experiência com atendimento', '', true); }
    };

    // O abridor da action bar vira "Fechar" (X) enquanto QUALQUER gaveta de vaga
    // está aberta. O rótulo NATURAL depende do estado: "Criar vaga" antes de
    // publicar, "Ver vaga" depois (myVagaId setado).
    const CRIAR_VAGA_HTML  = '<svg class="icon" aria-hidden="true"><use href="#ic-add"></use></svg>Criar vaga';
    const VER_VAGA_HTML    = '<svg class="icon" aria-hidden="true"><use href="#ic-visibility"></use></svg>Ver vaga';
    const FECHAR_VAGA_HTML = '<svg class="icon" aria-hidden="true"><use href="#ic-close"></use></svg>Fechar';
    const naturalVagaHTML  = () => (myVagaId ? VER_VAGA_HTML : CRIAR_VAGA_HTML);
    const setVagaOpenerClose = (isClose) => {
      if (!btnCriarVaga) return;
      btnCriarVaga.classList.toggle('action-close-mode', isClose);
      btnCriarVaga.innerHTML = isClose ? FECHAR_VAGA_HTML : naturalVagaHTML();
    };

    const openVagaSheet = () => {
      anchorBelowActionBar(vagaSheet);
      vagaSheet?.classList.add('pedido-sheet--open');
      setVagaOpenerClose(true);
      window.backNav?.push('vaga-sheet', closeVagaSheet);
    };
    const closeVagaSheet = () => {
      window.backNav?.remove('vaga-sheet');
      vagaSheet?.classList.remove('pedido-sheet--open');
      // Restaura o rótulo natural do abridor (Criar vaga OU Ver vaga, conforme
      // já exista uma vaga publicada).
      setVagaOpenerClose(false);
    };

    // ── Gaveta de DETALHE da vaga (visão do dono: a vaga que ele publicou) ──
    // Reusa o scaffolding .pedido-sheet* (mesma gaveta clara do Criar vaga).
    // Mostra o MESMO visual do card (via vagaContentHTML), SEM o card e SEM o
    // "Me candidatar"; no rodapé, "Analisar candidatos" + a fração de candidatos
    // inscritos (0..MAX_CANDIDATOS) — o mesmo padrão de fração dos cards de pedido.
    const vagaDetailSheet = document.getElementById('vaga-detail-sheet');
    const renderVagaDetail = () => {
      const vaga = getVagas().find(v => v.id === myVagaId);
      const host = document.getElementById('vaga-detail-content');
      if (!vaga || !host) return;
      const taken = vaga.candidatos?.length || 0;
      host.innerHTML = `
        ${vagaContentHTML(vaga)}
        <div class="vaga-detail__actions">
          <button type="button" class="btn btn--accent vaga-detail__analyze-btn">
            <svg class="icon" aria-hidden="true"><use href="#ic-group_search"></use></svg>Analisar candidatos
          </button>
          <button type="button" class="vaga-detail__count" aria-label="${taken} de ${MAX_CANDIDATOS} candidatos inscritos, ver candidatos">
            <span class="vaga-detail__count-value">${taken}/${MAX_CANDIDATOS}</span>
            <svg class="icon" aria-hidden="true"><use href="#ic-groups"></use></svg>
          </button>
        </div>`;
    };
    // Enquanto o detalhe está aberto, o botão IRMÃO (Serviço de ajudantes, à
    // direita) vira "Concluir vaga" — mesmo sistema dos pedidos (o outro lado
    // vira "Fechar"). É o mesmo botão que a barra usa para o Serviço de ajudantes,
    // manipulado aqui direto por ID (o setter próprio dele vive no bloco de
    // ajudantes; o rótulo natural "Serviço de ajudantes" é o mesmo dos dois lados).
    const btnAjudanteBar = document.getElementById('btn-chamar-ajudante');
    const AJUDANTE_NATURAL_HTML = 'Diárias';
    const CONCLUIR_VAGA_HTML = '<svg class="icon" aria-hidden="true"><use href="#ic-check_circle"></use></svg>Concluir vaga';
    const setAjudanteConcludeVaga = (isConclude) => {
      if (!btnAjudanteBar) return;
      btnAjudanteBar.classList.toggle('action-conclude-mode', isConclude);
      btnAjudanteBar.innerHTML = isConclude ? CONCLUIR_VAGA_HTML : AJUDANTE_NATURAL_HTML;
    };

    const openVagaDetailSheet = () => {
      renderVagaDetail();
      anchorBelowActionBar(vagaDetailSheet);
      vagaDetailSheet?.classList.add('pedido-sheet--open');
      setVagaOpenerClose(true);       // opener (Ver vaga, à esquerda) → "Fechar"
      setAjudanteConcludeVaga(true);  // irmão (Ajudantes, à direita) → "Concluir vaga"
      // O dourado "desliza" do abridor (Ver vaga) para o vizinho (Ajudantes),
      // virando "Concluir vaga"; "Fechar" surge no lugar do abridor.
      animateConcludeSwap(btnAjudanteBar, btnCriarVaga);
      window.backNav?.push('vaga-detail-sheet', closeVagaDetailSheet);
    };
    const closeVagaDetailSheet = () => {
      window.backNav?.remove('vaga-detail-sheet');
      vagaDetailSheet?.classList.remove('pedido-sheet--open');
      resetConcludeSwap(btnAjudanteBar, btnCriarVaga); // limpa a animação de abertura
      setVagaOpenerClose(false);
      setAjudanteConcludeVaga(false); // restaura o botão de ajudantes
    };

    // Conclui a vaga do dono: sai do ar do feed (sem histórico de vagas). Mesmo
    // fluxo de confirmação do "Concluir pedido".
    const concluirVaga = async () => {
      if (!myVagaId) return;
      const ok = await customConfirm('Ao concluir, sua vaga sairá do ar e não receberá novas candidaturas. Deseja continuar?', 'Concluir vaga', 'check_circle');
      if (!ok) return;
      removeVaga(myVagaId);
      myVagaId = null;                // opener volta a "Criar vaga"
      renderVagasList();
      closeVagaDetailSheet();
      await customAlert('Sua vaga foi concluída e saiu do ar.', 'Vaga concluída', 'check_circle');
    };

    // Botão da action bar: sem vaga → abre o formulário de criação; com vaga
    // publicada → abre a gaveta de detalhe da vaga.
    btnCriarVaga?.addEventListener('click', () => {
      if (myVagaId) openVagaDetailSheet();
      else openVagaSheet();
    });

    // Sem botão Cancelar: fecha pelo botão "Fechar" (opener) ou tocando fora do painel.
    // Fecha ao tocar fora do painel — inclui tocar no próprio botão (agora "X"),
    // que fica sob a área transparente do container sobre a barra. TROCA DIRETA:
    // tocar no abridor da gaveta IRMÃ (Serviço de ajudantes) fecha esta e abre
    // aquela num único toque (fecha+abre animam juntas, uma sobe e a outra desce).
    vagaSheet?.addEventListener('click', (e) => {
      if (e.target.closest('.pedido-sheet__panel')) return;
      const sibling = document.getElementById('btn-chamar-ajudante');
      if (tapHitsButton(e, sibling)) { closeVagaSheet(); sibling.click(); return; }
      closeVagaSheet();
    });

    // Gaveta de detalhe: "Analisar candidatos" e a fração são placeholders
    // (sem backend de candidatura ainda). O botão IRMÃO (à direita) está em
    // "Concluir vaga" → tocar nele conclui (o container z-300 cobre a barra, então
    // o toque cai aqui e não no listener natural do botão). Qualquer outro toque
    // fora do painel fecha.
    vagaDetailSheet?.addEventListener('click', (e) => {
      if (e.target.closest('.vaga-detail__analyze-btn')) { comingSoon('Analisar candidatos', 'Candidatos', 'group_search'); return; }
      if (e.target.closest('.vaga-detail__count'))        { comingSoon('Ver candidatos inscritos', 'Candidatos', 'groups'); return; }
      if (e.target.closest('.pedido-sheet__panel')) return;
      if (tapHitsButton(e, btnAjudanteBar)) { concluirVaga(); return; }
      closeVagaDetailSheet();
    });

    document.getElementById('btn-add-req')?.addEventListener('click', () =>
      addDynRow(reqList, 'Ex: Disponibilidade imediata', '', true).focus());
    btnAddBenefit?.addEventListener('click', () =>
      addDynRow(benefitList, 'Ex: Auxílio creche').focus());

    // Limpa o destaque de erro ao digitar no cargo
    inpCargo?.addEventListener('input', () => inpCargo.classList.remove('input-text--error'));


    // Publicar vaga
    document.getElementById('btn-vaga-publish')?.addEventListener('click', async () => {
      let firstError = null;
      const markError = (el) => { el?.classList.add('input-text--error'); if (!firstError) firstError = el; };

      // CNPJ: exige 14 dígitos
      const cnpjDigits = (inpCnpj?.value || '').replace(/\D/g, '');
      if (cnpjDigits.length !== 14) markError(inpCnpj);

      // Cargo obrigatório
      if (!inpCargo.value.trim()) markError(inpCargo);

      // Salário numérico obrigatório
      const salarioDigits = (inpSalario?.value || '').replace(/\D/g, '');
      if (!salarioDigits) markError(inpSalario);

      // Ao menos 1 requisito preenchido
      const reqInputs = [...reqList.querySelectorAll('.vaga-dyn-input')];
      const requisitos = reqInputs.map(i => i.value.trim()).filter(Boolean);
      if (requisitos.length === 0 && reqInputs[0]) markError(reqInputs[0]);

      // Ao menos 1 dia selecionado
      const dias = getSelectedDays();
      if (dias.length === 0) {
        daysGroup?.classList.add('vaga-days--error');
        if (!firstError) firstError = daysGroup;
      }

      if (firstError) {
        // Rola SÓ o corpo da gaveta (nunca ancestrais — scrollIntoView puxaria o feed
        // atrás junto), na velocidade única, centralizando o campo com erro.
        const sc = scrollableAncestor(firstError);
        if (sc) {
          const cr = firstError.getBoundingClientRect(), kr = sc.getBoundingClientRect();
          animateScrollTo(sc, sc.scrollTop + (cr.top - kr.top) - (kr.height - cr.height) / 2);
        }
        await customAlert('Preencha os campos obrigatórios destacados em vermelho para publicar a vaga.', 'Vaga incompleta', 'edit_note');
        return;
      }

      // Benefícios = pílulas selecionadas (exceto "Outros") + entradas de texto livre.
      const pillBenefits = [...benefitPills.querySelectorAll('.vaga-benefit-pill[aria-pressed="true"]')]
        .filter(p => p !== benefitOutros)
        .map(p => ({ icon: p.dataset.icon, label: p.dataset.label }));
      const customBenefits = [...benefitList.querySelectorAll('.vaga-dyn-input')]
        .map(i => i.value.trim())
        .filter(Boolean)
        .map(label => ({ icon: benefitIcon(label), label }));
      const beneficios = [...pillBenefits, ...customBenefits];

      const cnpj = formatCnpj(inpCnpj.value);
      const cargaHoraria = `${timeState.inicio} às ${timeState.fim} · ${formatDays(dias)}`;
      const salario = `R$ ${Number(salarioDigits).toLocaleString('pt-BR')}/mês`;
      const displayName = window.auth?.currentUser?.displayName || 'Você';

      myVagaId = `vaga-user-${Date.now()}`;
      addVaga({
        id: myVagaId,
        cnpj,                 // dados oficiais (nome/endereço) serão buscados depois
        empresa: '',          // vazio → o card mostra o CNPJ até virem os dados oficiais
        endereco: '',
        mapsQuery: '',
        poster: { name: displayName, ic: 100 },
        cargo: inpCargo.value.trim(),
        vagas: vagaCount,
        requisitos,
        cargaHoraria,
        salario,
        beneficios,
        exigeCurriculo: chkCurriculo?.getAttribute('aria-pressed') === 'true',
      });
      renderVagasList();

      // Transforma o botão "Criar vaga" em "Ver vaga" (agora abre a gaveta de
      // detalhe da vaga). myVagaId já está setado → naturalVagaHTML() = "Ver vaga".
      if (btnCriarVaga) btnCriarVaga.innerHTML = VER_VAGA_HTML;

      closeVagaSheet();
      resetVagaForm();
      await customAlert('Sua vaga está no ar! Os profissionais da plataforma já podem se candidatar.', 'Vaga publicada', 'check_circle');
    });

    resetVagaForm();
  }

  // =========================================================================
  // FEED - ABA VAGAS - SERVIÇO DE AJUDANTES (sheet #ajudante-sheet)
  // Duas funções independentes:
  //  (1) Disponibilizar-me — checkbox leve/pesado, com diária padrão
  //      (pesado > leve), iguais para todo usuário.
  //  (2) Chamar ajudante — sorteia 2 contatos por dia, expostos até a
  //      meia-noite daquele dia; depois o botão de chamar volta a ficar
  //      disponível e os ajudantes antigos somem da visualização.
  // Sorteio e persistência são MOCK (localStorage) — placeholder do backend,
  // onde a entrega real seria "por ordem de chegada". Reusa icBarHTML/avatarSvg.
  // =========================================================================
  {

    // Data local AAAA-MM-DD — a validade do sorteio é "até a meia-noite daquele
    // dia", então basta comparar a data do calendário local.
    const helperToday = () => {
      const d = new Date();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${d.getFullYear()}-${mm}-${dd}`;
    };

    const readHelperJSON = (key, fallback) => {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch { return fallback; }
    };
    const writeHelperJSON = (key, val) => {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage indisponível */ }
    };

    // ---- Sheet: abrir / fechar (as duas funções ficam sempre visíveis) ----
    const ajudanteSheet = document.getElementById('ajudante-sheet');

    // O botão "Diárias" vira botão de fechar (X) enquanto o sheet abre.
    const btnAjudante = document.getElementById('btn-chamar-ajudante');
    const AJUDANTE_HTML = 'Diárias';
    const FECHAR_AJUDANTE_HTML = '<svg class="icon" aria-hidden="true"><use href="#ic-close"></use></svg>Fechar';
    const setAjudanteClose = (isClose) => {
      if (!btnAjudante) return;
      btnAjudante.classList.toggle('action-close-mode', isClose);
      btnAjudante.innerHTML = isClose ? FECHAR_AJUDANTE_HTML : AJUDANTE_HTML;
    };

    const openAjudanteSheet = () => {
      renderHelperAvailability();
      renderHelperCall();
      anchorBelowActionBar(ajudanteSheet);
      ajudanteSheet?.classList.add('pedido-sheet--open');
      setAjudanteClose(true);
      window.backNav?.push('ajudante-sheet', closeAjudanteSheet);
    };
    const closeAjudanteSheet = () => {
      window.backNav?.remove('ajudante-sheet');
      ajudanteSheet?.classList.remove('pedido-sheet--open');
      setAjudanteClose(false);
    };

    btnAjudante?.addEventListener('click', openAjudanteSheet);
    // Fecha ao tocar fora do painel — inclui tocar no próprio botão (agora "X").
    // TROCA DIRETA: tocar no abridor da irmã (Criar vaga / Ver vaga) fecha esta e
    // dispara aquele botão num único toque.
    ajudanteSheet?.addEventListener('click', (e) => {
      if (e.target.closest('.pedido-sheet__panel')) return;
      const sibling = document.getElementById('btn-criar-vaga');
      if (tapHitsButton(e, sibling)) { closeAjudanteSheet(); sibling.click(); return; }
      closeAjudanteSheet();
    });

    // ---- Função 1: disponibilidade (checkbox leve/pesado) ----
    const getHelperAvailability = () => readHelperJSON(LS_HELPER_AVAIL, { light: false, heavy: false });

    const renderHelperAvailability = () => {
      const avail = getHelperAvailability();
      // Reflete as diárias padrão (fonte única: HELPER_RATES).
      document.querySelectorAll('[data-rate]').forEach(el => {
        const rate = HELPER_RATES[el.dataset.rate];
        if (typeof rate === 'number') el.innerText = `R$ ${rate}`;
      });
      document.querySelectorAll('.helper-toggle[data-avail]').forEach(btn => {
        const on = !!avail[btn.dataset.avail];
        btn.classList.toggle('helper-toggle--on', on);
        btn.setAttribute('aria-pressed', String(on));
        const chk = btn.querySelector('.helper-toggle__check');
        if (chk) window.setIcon(chk, on ? 'check_box' : 'check_box_outline_blank');
      });
    };

    document.querySelectorAll('.helper-toggle[data-avail]').forEach(btn => {
      btn.addEventListener('click', () => {
        const avail = getHelperAvailability();
        const key = btn.dataset.avail;
        avail[key] = !avail[key];
        writeHelperJSON(LS_HELPER_AVAIL, avail);
        renderHelperAvailability();
      });
    });

    // ---- Função 2: chamar um ajudante ----
    let helperCallType = HELPER_TYPE.LIGHT;

    // Card do ajudante: mesmo padrão visual dos cards de profissional do feed
    // (classes .pro-card__*: avatar retrato, nome, IC-bar, botão WhatsApp verde),
    // porém com elementos reduzidos — só foto, nome+sobrenome e índice de confiança.
    // Layout: foto à ESQUERDA; à direita dela, uma linha com nome+sobrenome e o
    // índice de confiança e, ABAIXO dessa linha (ainda ao lado da foto), o botão
    // do WhatsApp — tudo dentro de .pro-card__col-right.
    const helperPersonHTML = (h) => `
      <div class="pro-card__front pro-card__front--helper" data-id="${h.id}">
        <div class="pro-card__col-left">
          <div class="pro-card__avatar-wrap">
            <img class="pro-card__avatar" src="${avatarSvg}" alt="">
          </div>
        </div>
        <div class="pro-card__col-right">
          <div class="pro-card__head">
            <div class="pro-card__head-text">
              <div class="pro-card__name">${h.first} ${h.last}</div>
            </div>
            <div class="pro-card__head-right">
              ${icBarHTML(h.ic, 'sm')}
            </div>
          </div>
          <a class="btn pro-card__back-btn pro-card__back-btn--whatsapp helper-wa"
             href="https://wa.me/${h.phone}" target="_blank" rel="noopener"
             aria-label="Conversar com ${h.first} no WhatsApp">
            <svg class="icon" aria-hidden="true"><use href="#ic-chat"></use></svg>Conversar no WhatsApp
          </a>
        </div>
      </div>`;

    // Sorteia N ajudantes distintos de um tipo, excluindo ids já em uso.
    // Fisher-Yates só como placeholder da entrega "aleatória" (real: ordem de chegada).
    const drawHelpers = (type, count, excludeIds = []) => {
      const pool = getHelpers().filter(h => h.type === type && !excludeIds.includes(h.id));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, count);
    };

    // Retorna o sorteio de hoje se ainda válido (mesma data); senão null.
    const getActiveHelperDraw = () => {
      const draw = readHelperJSON(LS_HELPER_DRAW, null);
      if (draw && draw.date === helperToday() && Array.isArray(draw.helpers) && draw.helpers.length) {
        return draw;
      }
      return null;
    };

    // Dois estados na função "chamar ajudante" (SEM bloqueio de tempo/cooldown —
    // removido para facilitar o teste/reteste): sorteio ativo → contatos + Cancelar;
    // sem sorteio → formulário liberado.
    const renderHelperCall = () => {
      const form     = document.getElementById('helper-call-form');
      const result   = document.getElementById('helper-result');
      const list     = document.getElementById('helper-list');
      const cancelBtn = document.getElementById('btn-cancel-helper');
      if (!form || !result || !list) return;

      const draw = getActiveHelperDraw();
      if (draw) {
        form.classList.add('u-hidden');
        result.classList.remove('u-hidden');
        cancelBtn?.classList.remove('u-hidden');
        list.innerHTML = draw.helpers.map(helperPersonHTML).join('');
        return;
      }
      // Sem sorteio → formulário liberado na hora (nada de cooldown).
      list.innerHTML = '';
      result.classList.add('u-hidden');
      cancelBtn?.classList.add('u-hidden');
      localStorage.removeItem(LS_HELPER_DRAW);
      form.classList.remove('u-hidden');
    };

    // Seletor SLIDE (leve/pesado): move o thumb e atualiza o tipo escolhido.
    document.querySelectorAll('#helper-type .seg-toggle__opt').forEach(opt => {
      opt.addEventListener('click', () => {
        helperCallType = opt.dataset.type;
        const seg = document.getElementById('helper-type');
        seg?.classList.toggle('seg-toggle--heavy', helperCallType === HELPER_TYPE.HEAVY);
        seg?.querySelectorAll('.seg-toggle__opt').forEach(o => {
          const active = o === opt;
          o.classList.toggle('seg-toggle__opt--active', active);
          o.setAttribute('aria-pressed', String(active));
        });
      });
    });

    // Botão "Chamar ajudante": sorteia 2 do tipo escolhido e fixa até a meia-noite.
    document.getElementById('btn-call-helper')?.addEventListener('click', () => {
      const helpers = drawHelpers(helperCallType, 2);
      if (!helpers.length) {
        customAlert('Nenhum ajudante disponível para esse tipo de serviço no momento. Tente novamente mais tarde.', 'Sem ajudantes', 'info');
        return;
      }
      writeHelperJSON(LS_HELPER_DRAW, { date: helperToday(), type: helperCallType, helpers });
      renderHelperCall();
    });

    // Botão "Cancelar pedido": remove os contatos e libera o formulário na HORA
    // (sem cooldown — removido para facilitar o teste/reteste).
    document.getElementById('btn-cancel-helper')?.addEventListener('click', async () => {
      const ok = await customConfirm(
        'Cancelar remove os ajudantes chamados e libera um novo pedido. Deseja continuar?',
        'Cancelar pedido', 'help'
      );
      if (!ok) return;
      localStorage.removeItem(LS_HELPER_DRAW);
      renderHelperCall();
    });

    // Limpeza automática à meia-noite: se o app ficar aberto quando o dia virar,
    // remove o sorteio antigo e libera o botão de chamar sozinho.
    let helperMidnightTimer = null;
    const scheduleHelperMidnightReset = () => {
      if (helperMidnightTimer) clearTimeout(helperMidnightTimer);
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5, 0);
      helperMidnightTimer = setTimeout(() => {
        renderHelperCall();
        scheduleHelperMidnightReset();
      }, midnight.getTime() - now.getTime());
    };

    // Revalida ao voltar o foco ao app (pode ter passado da meia-noite em segundo plano).
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) renderHelperCall();
    });

    scheduleHelperMidnightReset();
    renderHelperAvailability();
    renderHelperCall();
  }

  renderVagasList();

  // ── Clique na busca já focada → volta ao topo da lista ───────────────────
  {
    const searchEl = document.getElementById('inp-agenda-search');
    let wasFocused = false;
    searchEl?.addEventListener('touchstart', () => {
      wasFocused = document.activeElement === searchEl;
    }, { passive: true });
    searchEl?.addEventListener('mousedown', () => {
      wasFocused = document.activeElement === searchEl;
    });
    searchEl?.addEventListener('click', () => {
      if (wasFocused) {
        const list = document.getElementById('agenda-list');
        let sc = null;
        window.moveGate.run('scroll-top', () => { sc = animateScrollTo(list, 0); return sc.promise; }, () => sc && sc.accelerate());
      }
    });
  }


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - FILTROS DA BUSCA - Painel colapsável + chips
  // =========================================================================

  // Painel de filtros = DROPDOWN top-level (#filters-sheet), mesmo padrão de
  // submenu do histórico/fazer pedido. O próprio botão de filtro (tune) vira um
  // botão de fechar (X) enquanto o painel está aberto. (function declarations →
  // hoistadas, usáveis por showVagasPanel/showPedidosPanel/reset acima.)
  function closeFiltersSheet() {
    const sheet = document.getElementById('filters-sheet');
    // Só restaura o título se o sheet estava mesmo aberto: closeFiltersSheet é
    // chamado preventivamente nas trocas de aba e não pode apagar o título de
    // outra gaveta.
    window.backNav?.remove('filters-sheet');
    sheet?.classList.remove('historico-sheet--open');
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'false');
    btn?.classList.remove('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }
  function openFiltersSheet() {
    const sheet = document.getElementById('filters-sheet');
    anchorBelowActionBar(sheet);
    sheet?.classList.add('historico-sheet--open');
    window.backNav?.push('filters-sheet', closeFiltersSheet);
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'true');
    btn?.classList.add('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }

  document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
    // 3 comportamentos por estado: gaveta aberta → fecha; filtro ativo + gaveta
    // fechada → LIMPA (a pílula está em modo X); repouso → abre.
    // Com a gaveta de CONTRATOS aberta, tudo opera sobre os filtros de CONTRATOS
    // (a barra segue viva sob a variante --bar-clear).
    if (isContractsSheetOpen()) {
      if (contractsFiltersSheet?.classList.contains('historico-sheet--open')) { closeContractsFiltersSheet(); return; }
      if (contractsActiveFilterCount() > 0) { clearContractsFilters(); return; }
      openContractsFiltersSheet();
      return;
    }
    if (document.getElementById('filters-sheet')?.classList.contains('historico-sheet--open')) { closeFiltersSheet(); return; }
    if (activeFilterCount() > 0) { clearProsFilters(); return; }
    openFiltersSheet();
  });
  // Fecha ao tocar fora do painel (inclui tocar no próprio botão, que agora é "X")
  document.getElementById('filters-sheet')?.addEventListener('click', (e) => {
    if (!e.target.closest('.historico-sheet__panel')) closeFiltersSheet();
  });

  // "Limpar filtros" dos PROFISSIONAIS (acionado pela própria pílula de filtro
  // em modo X): zera os 4 grupos (mantém ordenação e pins), des-seleciona os
  // chips e re-renderiza. A pílula volta a "tune" sozinha (contagem 0) via
  // renderAgendaList → updateFilterIndicator. (function hoistada.)
  function clearProsFilters() {
    filterState.includeIc.clear();
    filterState.includeAvail.clear();
    filterState.includePay.clear();
    filterState.savedOnly = false;
    document.querySelectorAll('#panel-agenda-filters [data-filter-ic], #panel-agenda-filters [data-filter-avail], #panel-agenda-filters [data-filter-pay], #panel-agenda-filters [data-filter-saved]')
      .forEach(c => { c.classList.remove('chip--active'); c.setAttribute('aria-pressed', 'false'); });
    renderAgendaList();
  }

  // "Limpar filtros" dos CONTRATOS (pílula de filtro em modo X, gaveta de
  // contratos aberta): volta o status a "Todos", zera valor/mês e re-aplica. A
  // busca (texto) fica — só os filtros são limpos. (function hoistada.)
  function clearContractsFilters() {
    contractsFilter.status = CONTRACT_STATUS.ALL;
    document.querySelectorAll('[data-filter-status]').forEach((c) => {
      const isAll = c.dataset.filterStatus === CONTRACT_STATUS.ALL;
      c.classList.toggle('chip--active', isAll);
      c.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    });
    ['inp-contracts-min', 'inp-contracts-max', 'inp-contracts-date'].forEach((id) => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    applyContractsFilters();
  }

  // Ordenação (dentro do painel) e filtros: um único handler delegado.
  document.getElementById('panel-agenda-filters')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;

    // Ordenação: seleção exclusiva (radio)
    if (chip.dataset.sort !== undefined) {
      document.querySelectorAll('#panel-agenda-filters [data-sort]').forEach(c => {
        c.classList.remove('chip--active');
        c.setAttribute('aria-pressed', 'false');
      });
      chip.classList.add('chip--active');
      chip.setAttribute('aria-pressed', 'true');
      filterState.sort = chip.dataset.sort;
      renderAgendaList();
      return;
    }

    // "Apenas salvos": toggle
    if (chip.hasAttribute('data-filter-saved')) {
      filterState.savedOnly = !filterState.savedOnly;
      chip.classList.toggle('chip--active', filterState.savedOnly);
      chip.setAttribute('aria-pressed', String(filterState.savedOnly));
      renderAgendaList();
      return;
    }

    // Confiança (IC): toggle inclusão (whitelist)
    if (chip.dataset.filterIc) {
      const val = chip.dataset.filterIc;
      if (filterState.includeIc.has(val)) { filterState.includeIc.delete(val); chip.classList.remove('chip--active'); chip.setAttribute('aria-pressed', 'false'); }
      else                                { filterState.includeIc.add(val);    chip.classList.add('chip--active');    chip.setAttribute('aria-pressed', 'true');  }
      renderAgendaList();
      return;
    }

    // Disponibilidade: toggle inclusão (whitelist)
    if (chip.dataset.filterAvail) {
      const val = chip.dataset.filterAvail;
      if (filterState.includeAvail.has(val)) { filterState.includeAvail.delete(val); chip.classList.remove('chip--active'); chip.setAttribute('aria-pressed', 'false'); }
      else                                   { filterState.includeAvail.add(val);    chip.classList.add('chip--active');    chip.setAttribute('aria-pressed', 'true');  }
      renderAgendaList();
      return;
    }

    // Pagamento: toggle inclusão (whitelist)
    if (chip.dataset.filterPay) {
      const val = chip.dataset.filterPay;
      if (filterState.includePay.has(val)) { filterState.includePay.delete(val); chip.classList.remove('chip--active'); chip.setAttribute('aria-pressed', 'false'); }
      else                                 { filterState.includePay.add(val);    chip.classList.add('chip--active');    chip.setAttribute('aria-pressed', 'true');  }
      renderAgendaList();
      return;
    }
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - FEED TABS PÍLULA - Navegação por seção
  // Comportamento extra: ao rolar para baixo em qualquer painel, o ícone e
  // label da aba ativa mudam para "Voltar ao topo". Clicar na aba ativa rola
  // de volta ao início. Trocar de aba restaura a aparência padrão da aba
  // anterior; ao retornar, a aba reflete o estado real do scroll da lista.
  // =========================================================================


  const updateSlider = (tabName) => {
    const slider = document.querySelector('.feed-tabs-pill__slider');
    if (!slider) return;
    const idx = TAB_ORDER.indexOf(tabName);
    // Duração via --panel-slide-dur (definida no switchToTab): o slider é parte do
    // MESMO gesto que o painel/trilho e desliza junto, não como movimento à parte.
    slider.style.transform = `translateX(${idx * 100}%)`;
  };
  updateSlider(TAB.HOME); // posiciona o slider na aba ativa inicial

  let activeTab = TAB.HOME;

  const agendaListEl    = document.getElementById('agenda-list');
  const pedidosScrollEl = document.getElementById('pedidos-scroll');
  const vagasScrollEl   = document.getElementById('vagas-scroll');

  const setTabButton = (tabName, scrolled) => {
    const btn = document.querySelector(`.feed-tabs-pill__tab[data-tab="${tabName}"]`);
    if (!btn) return;
    const d = scrolled ? SCROLL_TOP_STATE : (TAB_DEFAULTS[tabName] ?? { icon: 'work', label: tabName });
    window.setIcon(btn.querySelector('.icon'), d.icon);
    btn.querySelector('.feed-tabs-pill__tab-label').textContent = d.label;
    // Seta "Voltar ao topo" REFORÇADA (opsz 24 engrossa o traço no tamanho pequeno)
    btn.classList.toggle('feed-tabs-pill__tab--totop', !!scrolled);
  };

  // Entrada GATED: o carrossel é um movimento — entra na trava/fila do moveGate p/
  // não deslizar por cima de outro movimento em curso (nem outro por cima dele).
  // Acelera 2× o carrossel EM CURSO (painel + trilho da barra + slider das abas) —
  // é single-fase (só transições CSS), então dobrar o playbackRate cobre tudo e é
  // seguro a trava soltar na metade. Passado ao moveGate como callback de aceleração.
  const carouselAccelerate = () => {
    // A barra NÃO desliza mais (troca de aba = fade curto, independente); só o
    // painel do feed e o slider das abas deslizam por --panel-slide-dur.
    ['#feed-panels', '.feed-tabs-pill__slider'].forEach(sel => {
      document.querySelector(sel)?.getAnimations?.().forEach(a => { try { a.playbackRate = 2; } catch (_) {} });
    });
  };
  const switchToTab = (tabName) => {
    if (tabName === activeTab) return;
    window.moveGate.run('carousel', () => doSwitchToTab(tabName), carouselAccelerate);
  };
  // Corpo real: FAZ a troca e devolve a DURAÇÃO do slide (ms) p/ o gate cronometrar.
  const doSwitchToTab = (tabName) => {
    if (tabName === activeTab) return 0;
    // Modo indicação é camada persistente sobre o feed de pedidos: sair dele NA HORA
    // (snap, sem animar) antes do carrossel — senão o #agenda-list reparentado
    // deslizaria e a aba Profissionais ficaria vazia.
    if (indicateMode) { window.backNav?.remove('indicate-overlay'); finalizeIndicateNow(); }
    // Velocidade única: painel + trilho + slider são UM gesto; a duração deriva da
    // distância percorrida (nº de painéis atravessados × largura da viewport).
    // moveMs já embute o MOVE_ACCEL do gate (acelerado se há fila atrás).
    const hops = Math.abs(TAB_ORDER.indexOf(tabName) - TAB_ORDER.indexOf(activeTab)) || 1;
    const dur = window.moveMs ? window.moveMs(hops * window.innerWidth) : 300;
    document.documentElement.style.setProperty('--panel-slide-dur', `${dur}ms`);
    // Volta o botão da aba anterior ao padrão
    setTabButton(activeTab, false);
    activeTab = tabName;
    // Marca visualmente a nova aba ativa (+ aria-selected p/ leitor de tela)
    document.querySelectorAll('.feed-tabs-pill__tab').forEach(t => {
      const isActive = t.dataset.tab === tabName;
      t.classList.toggle('feed-tabs-pill__tab--active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });
    // Restaura o estado de scroll da nova aba no botão
    setTabButton(tabName, scrolledState[tabName] ?? false);
    // Move o slider amarelo para a nova aba
    updateSlider(tabName);
    // Desliza o painel correto
    if (tabName === TAB.PEDIDOS) showPedidosPanel();
    else if (tabName === TAB.VAGAS) showVagasPanel();
    else showProsPanel();
    // Reflete o estado de scroll do NOVO painel na elevação da barra
    updateBarElevation();
    // Botão "voltar" do sistema fora da aba inicial (Profissionais) → retorna a ela
    // antes de sair do app. Camada única: trocar entre abas não-inicial não empilha.
    if (window.backNav) {
      if (tabName === TAB.HOME) window.backNav.remove('feed-tab');
      else window.backNav.push('feed-tab', () => switchToTab(TAB.HOME));
    }
    // Resolve na CONCLUSÃO REAL do slide (transitionend do #feed-panels) — acelerar
    // faz o transitionend vir antes, então a trava solta na hora certa, nunca no meio.
    return new Promise((resolve) => {
      let settled = false;
      const finishSlide = () => { if (settled) return; settled = true; feedPanels?.removeEventListener('transitionend', onEnd); resolve(); };
      const onEnd = (e) => { if (e.target === feedPanels && e.propertyName === 'transform') finishSlide(); };
      feedPanels?.addEventListener('transitionend', onEnd);
      setTimeout(finishSlide, dur + 140);   // fallback se o transitionend não vier
    });
  };

  document.querySelectorAll('.feed-tabs-pill__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const clickedTab = tab.dataset.tab;
      if (clickedTab === activeTab) {
        // Toque na aba já ativa: rola ao topo se estiver scrollada
        if (scrolledState[clickedTab]) {
          // Marca a subida programática ANTES de rolar: o handler de scroll
          // ignora o botão até chegar ao topo (senão a seta pisca durante a
          // animação, quando scrollTop ainda está acima do threshold).
          scrollToTopPending[clickedTab] = true;
          // "Voltar ao topo" também é um MOVIMENTO: passa pela trava/fila + velocidade
          // única + aceleração (via animateScrollTo), como o resto.
          const el = clickedTab === TAB.HOME ? agendaListEl : clickedTab === TAB.PEDIDOS ? pedidosScrollEl : vagasScrollEl;
          let sc = null;
          window.moveGate.run('scroll-top', () => { sc = animateScrollTo(el, 0); return sc.promise; }, () => sc && sc.accelerate());
          scrolledState[clickedTab] = false;
          setTabButton(clickedTab, false);
        }
      } else {
        switchToTab(clickedTab);
      }
    });
  });


  // =========================================================================
  // SWIPE HORIZONTAL — desliza entre o painel de Profissionais e de Pedidos
  // Só ativa em arrasto predominantemente horizontal (dx > dy) e fora do modo indicação.
  // =========================================================================
  let swipeTouchStartX = 0;
  let swipeTouchStartY = 0;

  feedPanels?.addEventListener('touchstart', (e) => {
    swipeTouchStartX = e.touches[0].clientX;
    swipeTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  feedPanels?.addEventListener('touchend', (e) => {
    if (indicateMode) return;
    const dx = e.changedTouches[0].clientX - swipeTouchStartX;
    const dy = e.changedTouches[0].clientY - swipeTouchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    // Ordem dos painéis: vagas ← home → pedidos
    if (dx < 0) {
      if (activeTab === TAB.VAGAS)   switchToTab(TAB.HOME);
      else if (activeTab === TAB.HOME) switchToTab(TAB.PEDIDOS);
    } else {
      if (activeTab === TAB.PEDIDOS) switchToTab(TAB.HOME);
      else if (activeTab === TAB.HOME) switchToTab(TAB.VAGAS);
    }
  }, { passive: true });


  // =========================================================================
  // SCROLL-TO-TOP — detecta scroll nos painéis e atualiza o botão da aba ativa
  // =========================================================================

  // OVERSCROLL elástico no TOPO dos 3 feeds: puxar para baixo já no topo
  // estica a lista (com resistência) e ela volta com mola ao soltar —
  // indicador físico de "você está no topo da lista". O preventDefault no
  // gesto de estique também segura o pull-to-refresh nativo do navegador
  // (reforçado pelo overscroll-behavior-y: contain no CSS dos 3 feeds).
  function attachTopOverscroll(el) {
    if (!el) return;
    let startY = 0;
    let pulling = false;
    el.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      pulling = false;
    }, { passive: true });
    el.addEventListener('touchmove', (e) => {
      // Guarda: o toque começou DENTRO de um scroller aninhado (comentários do verso
      // do card). Não sequestra o gesto — o `preventDefault` do estique ROUBAVA o
      // scroll interno dos comentários quando a lista mãe estava no topo (scrollTop 0):
      // o overscroll disparava antes de rolar os comentários. Deixa o nested rolar nativo.
      if (e.target.closest?.('.pro-card__back-comments')) return;
      // Guarda: só age se o elemento é DE FATO o scroller (conteúdo transborda).
      // No modo indicação #agenda-list vira overflow:visible (quem rola é o wrapper)
      // e seu scrollTop fica sempre 0 — sem esta guarda, o handler achava que estava
      // "no topo" e dava preventDefault em QUALQUER arrasto p/ cima, travando a lista.
      if (el.scrollHeight <= el.clientHeight) return;
      const dy = e.touches[0].clientY - startY;
      if (el.scrollTop <= 0 && dy > 0) {
        pulling = true;
        el.style.transition = 'none';
        el.style.transform = `translateY(${Math.min(70, dy / 2.5)}px)`;   // resistência + teto
        e.preventDefault();
      } else if (pulling) {
        // o dedo voltou para cima durante o estique: solta na hora
        pulling = false;
        el.style.transition = 'transform 0.3s var(--sheet-ease, ease)';
        el.style.transform = '';
      }
    }, { passive: false });
    const release = () => {
      if (!pulling) return;
      pulling = false;
      el.style.transition = 'transform 0.35s var(--sheet-ease, ease)';
      el.style.transform = '';
      setTimeout(() => { el.style.transition = ''; }, 400);
    };
    el.addEventListener('touchend', release);
    el.addEventListener('touchcancel', release);
  }
  attachTopOverscroll(agendaListEl);
  attachTopOverscroll(pedidosScrollEl);
  attachTopOverscroll(vagasScrollEl);
  attachTopOverscroll(indicateScroll);   // wrapper de scroll da seção de profissionais no overlay

  // Elevação da action bar: sombra na fronteira SÓ quando o feed ativo está
  // rolado — barra "flat" = usuário está no TOPO da lista (indicador de topo).
  // function declaration (hoistada): também chamada por switchToTab.
  function updateBarElevation() {
    const el = activeTab === TAB.HOME ? agendaListEl
             : activeTab === TAB.PEDIDOS ? pedidosScrollEl : vagasScrollEl;
    feedActionBar?.classList.toggle('agenda-filters--elevated', (el?.scrollTop || 0) > 2);
  }

  // Fábrica ÚNICA para os 3 feeds: eleva a barra + alterna o botão da aba para
  // "Voltar ao topo" ao passar do threshold (antes eram 3 handlers idênticos).
  const wireScrollTab = (el, tabKey) => {
    el?.addEventListener('scroll', () => {
      updateBarElevation();
      // Durante a subida "Voltar ao topo": não mexe no botão (ele já foi
      // restaurado ao ícone padrão no clique). Libera ao chegar ao topo.
      if (scrollToTopPending[tabKey]) {
        if (el.scrollTop <= SCROLL_THRESHOLD) scrollToTopPending[tabKey] = false;
        return;
      }
      const scrolled = el.scrollTop > SCROLL_THRESHOLD;
      if (scrolledState[tabKey] !== scrolled) {
        scrolledState[tabKey] = scrolled;
        if (activeTab === tabKey) setTabButton(tabKey, scrolled);
      }
    }, { passive: true });
    // Se o usuário interrompe a subida tocando na lista, cancela o modo
    // "pending" para o botão voltar a refletir o scroll real na hora.
    el?.addEventListener('touchstart', () => { scrollToTopPending[tabKey] = false; }, { passive: true });
  };
  wireScrollTab(agendaListEl,  TAB.HOME);
  wireScrollTab(pedidosScrollEl, TAB.PEDIDOS);
  wireScrollTab(vagasScrollEl,  TAB.VAGAS);



  // =========================================================================
  // PEDIDOS - Botões "Histórico" + "Fazer pedido" / "Pedido atual"
  // =========================================================================
  // A action-bar (pedidos) tem SEMPRE dois botões:
  //   - "Histórico" → sheet com todos os pedidos (ativo + concluídos), por data.
  //   - "Fazer pedido" (sem pedido ativo) → formulário de CRIAÇÃO.
  //     "Pedido atual" (com pedido ativo) → detalhe UNIFICADO: o pedido no topo
  //     e, logo abaixo, as indicações recebidas (antes eram dois popups
  //     separados: detalhes + visualizador de indicações).
  // Tocar num item do histórico abre esse MESMO detalhe unificado.
  // MOCK: nada persiste no Firestore; histórico e indicações vivem em memória.
  let pedidoIdSeq = 1;
  let detailPedidoId = null;      // id do pedido exibido no sheet de detalhe
  // Modo do topo enquanto um DETALHE de pedido está aberto:
  //  'active' → btn Histórico vira "Concluir pedido"; btn Fazer/Pedido vira "Fechar"
  //  'old'    → btn Histórico vira "Fechar"; btn Fazer/Pedido fica natural (navega)
  //  null     → sem detalhe aberto (comportamento normal)
  let pedidoDetailMode = null;

  const getActivePedido = () => pedidoHistory.find(p => p.status === PEDIDO_STATUS.ACTIVE) || null;
  const getPedidoById   = (id) => pedidoHistory.find(p => p.id === id) || null;

  const btnHistorico     = document.getElementById('btn-historico-pedidos');
  const btnMyPedido      = document.getElementById('btn-my-pedido');
  const btnMyPedidoLabel = document.getElementById('btn-my-pedido-label');
  const btnMyPedidoIcon  = btnMyPedido?.querySelector('.pedido-action__icon');

  // Histórico é SEMPRE visível; só o botão principal muda conforme haja pedido ativo.
  const renderMyPedidoButton = () => {
    if (getActivePedido()) {
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Pedido atual';
      if (btnMyPedidoIcon)  window.setIcon(btnMyPedidoIcon, 'receipt_long');
    } else {
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Fazer pedido';
      if (btnMyPedidoIcon)  window.setIcon(btnMyPedidoIcon, 'add');
    }
  };

  // O botão "Fazer pedido"/"Pedido atual" assume 3 estados:
  //  'natural'  → "Fazer pedido"/"Pedido atual" (via renderMyPedidoButton)
  //  'close'    → "Fechar" (fecha o formulário)
  //  'conclude' → "Concluir pedido" (dourado; no detalhe do pedido ATIVO — fica no
  //               lado do "Pedido atual", enquanto o Histórico vira "Fechar")
  const setMyPedidoButton = (mode) => {
    btnMyPedido?.classList.toggle('action-close-mode', mode === 'close');
    btnMyPedido?.classList.toggle('action-conclude-mode', mode === 'conclude');
    if (mode === 'conclude') {
      if (btnMyPedidoIcon)  window.setIcon(btnMyPedidoIcon, 'check_circle');
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Concluir pedido';
    } else if (mode === 'close') {
      if (btnMyPedidoIcon)  window.setIcon(btnMyPedidoIcon, 'close');
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Fechar';
    } else {
      renderMyPedidoButton();
    }
  };

  // O botão "Histórico" assume 3 estados conforme o contexto:
  //  'natural'  → "Histórico" (abre o histórico)
  //  'close'    → "Fechar" (fecha o histórico OU o detalhe de um pedido antigo)
  //  'conclude' → "Concluir pedido" (dourado; ao ver o detalhe do pedido ATIVO)
  const setHistoricoButton = (mode) => {
    const icon  = btnHistorico?.querySelector('.pedido-action__icon');
    const label = btnHistorico?.querySelector('[data-btn-label]');
    btnHistorico?.classList.toggle('action-close-mode', mode === 'close');
    btnHistorico?.classList.toggle('action-conclude-mode', mode === 'conclude');
    if (mode === 'conclude') {
      if (icon)  window.setIcon(icon, 'check_circle');
      if (label) label.textContent = 'Concluir pedido';
    } else if (mode === 'close') {
      if (icon)  window.setIcon(icon, 'close');
      if (label) label.textContent = 'Fechar';
    } else {
      if (icon)  window.setIcon(icon, 'history');
      if (label) label.textContent = 'Histórico';
    }
  };

  // ── Elementos do sheet de criação / detalhe ──
  const pedidoSheet        = document.getElementById('pedido-sheet');
  const pedidoFormState    = document.getElementById('pedido-form-state');
  const pedidoDetailsState = document.getElementById('pedido-details-state');
  const inpPedidoText      = document.getElementById('inp-pedido-text');
  const pedidoCharCount    = document.getElementById('pedido-char-count');
  const pedidoNeighbors    = document.getElementById('pedido-neighbors');
  const btnPedidoConcluir  = document.getElementById('btn-pedido-concluir');
  // Rodapé fixo do "Publicar pedido" (só no estado de criação).
  const pedidoPublishFooter = document.getElementById('pedido-publish-footer');

  const closePedidoSheet = () => {
    window.backNav?.remove('pedido-sheet');
    pedidoSheet?.classList.remove('pedido-sheet--open');
    pedidoSheet?.classList.remove('pedido-sheet--morph');
    pedidoPublishFooter?.classList.add('u-hidden');
    detailPedidoId = null;
    pedidoDetailMode = null;
    resetConcludeSwap(btnHistorico, btnMyPedido); // limpa transform/opacity da animação de abertura
    setMyPedidoButton('natural');
    // Restaura o botão Histórico e o título da top bar: se o histórico continua
    // aberto atrás, volta a "Fechar" + "Histórico de pedidos"; senão, ao natural.
    const historicoOpen = document.getElementById('historico-sheet')?.classList.contains('historico-sheet--open');
    setHistoricoButton(historicoOpen ? 'close' : 'natural');
  };




  // Preenche o detalhe: card de REFERÊNCIA no topo (MESMO modelo do histórico,
  // via historicoItemHTML) + fração + lista de indicados. O card de baixo
  // (Concluir) fica sempre oculto; concluir vive no topo (botão Pedido atual).
  const renderPedidoDetails = (pedido) => {
    const container = document.getElementById('pedido-detail-card-container');
    if (container) container.innerHTML = historicoItemHTML(pedido);
    const fractionEl = document.getElementById('pedido-detail-fraction');
    if (fractionEl) fractionEl.textContent = `${pedido.indicated.length}/3`;
    const listEl = document.getElementById('pedido-detail-indicated-list');
    if (listEl) renderFlippableProCards(listEl, pedido.indicated);
  };

  // Abre o formulário de criação (não há pedido ativo) como DROPDOWN que desce
  // da base da action bar — mesmo slide-down do histórico (sem --full, que é
  // reservado ao detalhe em tela cheia).
  const openPedidoForm = () => {
    pedidoFormState?.classList.remove('u-hidden');
    pedidoDetailsState?.classList.add('u-hidden');
    pedidoPublishFooter?.classList.remove('u-hidden'); // rodapé fixo do "Publicar pedido"
    detailPedidoId = null;
    pedidoDetailMode = null;   // formulário não é um detalhe
    anchorBelowActionBar(pedidoSheet);
    pedidoSheet?.classList.remove('pedido-sheet--full', 'pedido-sheet--morph');
    pedidoSheet?.classList.add('pedido-sheet--open');
    setMyPedidoButton('close');
    window.backNav?.push('pedido-sheet', closePedidoSheet);
  };

  // Abre o detalhe unificado (pedido + indicações). `sourceEl` = o item do
  // histórico tocado: quando presente, a abertura ANIMA (FLIP) — o card sobe da
  // posição do item até o topo do detalhe e só então deslizam as indicações, para
  // parecer que continua no histórico vendo mais detalhes do item.
  const openPedidoDetail = (id, sourceEl) => {
    const pedido = getPedidoById(id);
    if (!pedido) return;
    window.backNav?.push('pedido-sheet', closePedidoSheet);
    detailPedidoId = id;
    const active = pedido.status === PEDIDO_STATUS.ACTIVE;
    pedidoDetailMode = active ? PEDIDO_DETAIL_MODE.ACTIVE : PEDIDO_DETAIL_MODE.OLD;
    pedidoFormState?.classList.add('u-hidden');
    pedidoDetailsState?.classList.remove('u-hidden');
    pedidoPublishFooter?.classList.add('u-hidden'); // detalhe não tem "Publicar pedido"
    renderPedidoDetails(pedido);
    anchorBelowActionBar(pedidoSheet);
    pedidoSheet?.classList.remove('pedido-sheet--full');
    // Botões do topo:
    //  ATIVO → "Concluir pedido" no lado HISTÓRICO + "Fechar" no lado Pedido atual.
    //  ANTIGO → "Fechar" no lado Histórico + Pedido atual natural (pular ao pedido
    //           atual / fazer um novo).
    if (active) {
      setHistoricoButton('conclude');
      setMyPedidoButton('close');
      // O dourado "desliza" do abridor (Pedido atual) para o vizinho (Histórico),
      // virando "Concluir pedido"; "Fechar" surge no lugar do Pedido atual.
      animateConcludeSwap(btnHistorico, btnMyPedido);
    } else {
      setHistoricoButton('close');
      setMyPedidoButton('natural');
    }

    const cardEl = document.querySelector('#pedido-detail-card-container .historico-item');
    const indicatedEl = pedidoSheet?.querySelector('.pedido-detail-indicated');
    // limpa estilos inline de uma animação anterior
    if (indicatedEl) { indicatedEl.style.transition = ''; indicatedEl.style.opacity = ''; indicatedEl.style.transform = ''; }

    const sourceRect = sourceEl ? sourceEl.getBoundingClientRect() : null;
    if (sourceRect && cardEl) {
      // FLIP: painel aparece na hora (mesmo --bg-canvas do histórico, sem "flash"),
      // o card sobe da posição do item tocado e as indicações entram depois.
      pedidoSheet.classList.add('pedido-sheet--morph');
      pedidoSheet.classList.add('pedido-sheet--open');
      const last = cardEl.getBoundingClientRect();
      const dy = Math.round(sourceRect.top - last.top);
      cardEl.style.transition = 'none';
      cardEl.style.transform = `translateY(${dy}px)`;
      if (indicatedEl) { indicatedEl.style.transition = 'none'; indicatedEl.style.opacity = '0'; indicatedEl.style.transform = 'translateY(18px)'; }
      void cardEl.offsetWidth; // reflow: fixa o estado inicial
      cardEl.style.transition = 'transform 0.42s var(--sheet-ease, cubic-bezier(0.3,0.9,0.7,1))';
      cardEl.style.transform = 'translateY(0)';
      const revealIndicated = () => {
        if (!indicatedEl) return;
        indicatedEl.style.transition = 'opacity 0.3s ease, transform 0.38s var(--sheet-ease, cubic-bezier(0.3,0.9,0.7,1))';
        indicatedEl.style.opacity = '1';
        indicatedEl.style.transform = 'translateY(0)';
      };
      let revealed = false;
      const onEnd = (ev) => { if (ev.propertyName !== 'transform') return; cardEl.removeEventListener('transitionend', onEnd); if (!revealed) { revealed = true; revealIndicated(); } };
      cardEl.addEventListener('transitionend', onEnd);
      setTimeout(() => { if (!revealed) { revealed = true; revealIndicated(); } }, 480); // fallback
      setTimeout(() => { // limpeza pós-animação
        pedidoSheet.classList.remove('pedido-sheet--morph');
        cardEl.style.transition = ''; cardEl.style.transform = '';
        if (indicatedEl) { indicatedEl.style.transition = ''; indicatedEl.style.opacity = ''; indicatedEl.style.transform = ''; }
      }, 950);
    } else {
      // Sem item de origem (ex.: abriu pelo botão "Pedido atual"): slide-down padrão.
      pedidoSheet?.classList.remove('pedido-sheet--morph');
      pedidoSheet?.classList.add('pedido-sheet--open');
    }
  };

  // Ação do botão principal (Fazer pedido / Pedido atual): abre o formulário de
  // criação ou o detalhe do pedido ativo. Reusado pelo clique direto e pelo modo
  // "pedido antigo" (onde esse botão fica natural para pular ao pedido atual).
  const myPedidoNavigate = () => {
    const active = getActivePedido();
    if (active) openPedidoDetail(active.id);
    else openPedidoForm();
  };

  // Conclui o pedido em exibição (ativo). Chamado pelo botão "Concluir" do topo
  // (Histórico em modo conclude) — o botão de baixo foi ocultado para não duplicar.
  const concluirDetailPedido = async () => {
    const pedido = getPedidoById(detailPedidoId);
    if (!pedido || pedido.status !== PEDIDO_STATUS.ACTIVE) return;
    const ok = await customConfirm('Ao concluir, seu pedido sairá do ar e não receberá novas indicações. Ele continua salvo no seu histórico. Deseja continuar?', 'Concluir pedido', 'check_circle');
    if (!ok) return;
    pedido.status = PEDIDO_STATUS.COMPLETED;
    pedido.completedAt = Date.now();
    renderMyPedidoButton();
    renderHistoricoList();
    closePedidoSheet();
  };

  // Sem botão Cancelar: fecha pelo botão "Fechar" (opener) ou tocando fora do painel.
  // Toque FORA do painel (barra ou backdrop). Os botões do topo têm ação própria
  // dependendo do modo do detalhe, então roteamos o toque:
  //  - detalhe ATIVO + toque no HISTÓRICO ("Concluir pedido") → conclui;
  //    (o lado Pedido atual está "Fechar" → cai no fechar padrão abaixo);
  //  - detalhe ANTIGO + toque no Fazer/Pedido atual (natural) → navega;
  //  - qualquer outro toque fora do painel → fecha.
  pedidoSheet?.addEventListener('click', (e) => {
    if (e.target.closest('.pedido-sheet__panel')) return;
    // ATIVO: "Concluir pedido" está no lado HISTÓRICO; o lado Pedido atual é "Fechar".
    if (pedidoDetailMode === PEDIDO_DETAIL_MODE.ACTIVE && tapHitsButton(e, btnHistorico)) { concluirDetailPedido(); return; }
    if (pedidoDetailMode === PEDIDO_DETAIL_MODE.OLD && tapHitsButton(e, btnMyPedido)) { myPedidoNavigate(); return; }
    // TROCA DIRETA para o Histórico: no FORM "Fazer pedido" o botão Histórico está
    // NATURAL (não é "Fechar"/"Concluir") → tocar nele fecha o pedido e abre o
    // histórico num único toque.
    const histNatural = btnHistorico &&
      !btnHistorico.classList.contains('action-close-mode') &&
      !btnHistorico.classList.contains('action-conclude-mode');
    if (histNatural && tapHitsButton(e, btnHistorico)) { closePedidoSheet(); btnHistorico.click(); return; }
    closePedidoSheet();
  });
  // O card de referência do topo do detalhe é um item de histórico completo —
  // inclui a lixeira. Excluir dali confirma, remove e fecha o detalhe.
  document.getElementById('pedido-detail-card-container')?.addEventListener('click', (e) => {
    const delBtn = e.target.closest('.historico-item__delete');
    if (delBtn) { e.stopPropagation(); deletePedido(parseInt(delBtn.dataset.deleteId, 10)); }
  });

  bindProCardFlip(document.getElementById('pedido-detail-indicated-list'));

  // Contador de caracteres do texto do pedido
  inpPedidoText?.addEventListener('input', () => {
    if (pedidoCharCount) pedidoCharCount.textContent = inpPedidoText.value.length;
    inpPedidoText.classList.remove('input-text--error');
  });

  // Seleção única dentro de um grupo de chips (urgência / duração)
  const wirePedidoChipGroup = (groupId, dataKey, onPick) => {
    const group = document.getElementById(groupId);
    group?.addEventListener('click', (e) => {
      const chip = e.target.closest('.pedido-chip');
      if (!chip) return;
      group.querySelectorAll('.pedido-chip').forEach(c => { c.classList.remove('pedido-chip--active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('pedido-chip--active');
      chip.setAttribute('aria-pressed', 'true');
      onPick(chip.dataset[dataKey]);
    });
  };
  wirePedidoChipGroup('pedido-urgency', 'urgency', v => { myPedido.urgency = v; });
  wirePedidoChipGroup('pedido-duration', 'duration', v => { myPedido.duration = v; });

  // Toggle "cidades vizinhas"
  pedidoNeighbors?.addEventListener('click', () => {
    myPedido.neighbors = !myPedido.neighbors;
    pedidoNeighbors.setAttribute('aria-pressed', String(myPedido.neighbors));
  });

  // Volta o formulário aos defaults (após publicar ou ao concluir/limpar).
  const resetPedidoForm = () => {
    myPedido.text = '';
    myPedido.urgency = URGENCY.NORMAL;
    myPedido.duration = DURATION.H12;
    myPedido.neighbors = false;
    // Marca o chip cujo data-* CASA com o valor default — não por posição no
    // DOM: se a ordem dos chips mudar, seleção visual e myPedido não divergem.
    const selectDefaultChip = (groupId, dataKey, value) => {
      document.querySelectorAll(`#${groupId} .pedido-chip`).forEach((c) => {
        const on = c.dataset[dataKey] === value;
        c.classList.toggle('pedido-chip--active', on);
        c.setAttribute('aria-pressed', String(on));
      });
    };
    selectDefaultChip('pedido-urgency', 'urgency', myPedido.urgency);
    selectDefaultChip('pedido-duration', 'duration', myPedido.duration);
    if (pedidoNeighbors) pedidoNeighbors.setAttribute('aria-pressed', 'false');
    if (inpPedidoText) { inpPedidoText.value = ''; inpPedidoText.classList.remove('input-text--error'); }
    if (pedidoCharCount) pedidoCharCount.textContent = '0';
  };

  // Publicar → cria o pedido no histórico como ATIVO e semeia indicações (mock).
  document.getElementById('btn-pedido-publish')?.addEventListener('click', async () => {
    const text = inpPedidoText?.value.trim() || '';
    if (text.length < 10) {
      inpPedidoText?.classList.add('input-text--error');
      await customAlert('Descreva seu pedido com pelo menos 10 caracteres para os profissionais entenderem o que você precisa.', 'Pedido incompleto', 'edit_note');
      return;
    }
    const pedido = {
      id: pedidoIdSeq++,
      text,
      urgency: myPedido.urgency,
      duration: myPedido.duration,
      neighbors: myPedido.neighbors,
      createdAt: Date.now(),
      completedAt: null,
      status: PEDIDO_STATUS.ACTIVE,
      // MOCK: semeia indicações para o fluxo "ver indicados" ficar demonstrável
      // (fonte única no repositório; cópia nova por pedido).
      indicated: getPublishSeedIndicated(),
    };
    pedidoHistory.push(pedido);
    resetPedidoForm();
    renderMyPedidoButton();
    closePedidoSheet();
    await customAlert('Seu pedido está no ar! Você será avisado quando alguém indicar um profissional de confiança.', 'Pedido publicado', 'check_circle');
  });

  // Botão "Concluir" de baixo (oculto): mantém o handler apontando para a mesma
  // lógica, caso volte a ser exibido no futuro.
  btnPedidoConcluir?.addEventListener('click', concluirDetailPedido);

  // ── Histórico de pedidos ──
  const historicoSheet = document.getElementById('historico-sheet');
  const historicoList  = document.getElementById('historico-list');

  // Markup de UM item de pedido — usado tanto na lista do histórico quanto como
  // card de referência no TOPO do detalhe (mesmo modelo de card). function
  // declaration → hoistada, usável por renderPedidoDetails (definida acima).

  // Renderiza a lista do histórico, mais recentes no topo.
  function renderHistoricoList() {
    if (!historicoList) return;
    if (pedidoHistory.length === 0) {
      historicoList.innerHTML = `<p class="historico-empty">Você ainda não fez nenhum pedido.</p>`;
      return;
    }
    const ordered = [...pedidoHistory].sort((a, b) => b.createdAt - a.createdAt);
    historicoList.innerHTML = ordered.map(historicoItemHTML).join('');
  }

  // Exclui um pedido do histórico (usado pela lista e pelo card do detalhe).
  const deletePedido = async (id) => {
    if (!getPedidoById(id)) return;
    const ok = await customConfirm('Deseja excluir este pedido do seu histórico? Esta ação não pode ser desfeita.', 'Excluir pedido', 'delete');
    if (!ok) return;
    const idx = pedidoHistory.findIndex(p => p.id === id);
    if (idx !== -1) pedidoHistory.splice(idx, 1);
    if (detailPedidoId === id) closePedidoSheet();
    renderMyPedidoButton();
    renderHistoricoList();
  };

  // Dropdown que desce da BASE da action bar (topo da caixa do feed).
  const openHistorico = () => {
    renderHistoricoList();
    anchorBelowActionBar(historicoSheet);
    historicoSheet?.classList.add('historico-sheet--open');
    setHistoricoButton('close');
    window.backNav?.push('historico-sheet', closeHistorico);
  };
  const closeHistorico = () => {
    window.backNav?.remove('historico-sheet');
    historicoSheet?.classList.remove('historico-sheet--open');
    // Se um detalhe (ativo ou antigo) está aberto sobre o histórico, o botão
    // Histórico segue como "Fechar" e o título do DETALHE permanece na top bar;
    // senão ambos voltam ao natural.
    setHistoricoButton(pedidoDetailMode ? 'close' : 'natural');
  };

  historicoSheet?.addEventListener('click', (e) => {
    if (e.target.closest('.historico-sheet__panel')) return;
    // TROCA DIRETA para "Fazer pedido"/"Pedido atual": esse botão (btnMyPedido)
    // fica NATURAL enquanto o histórico está aberto → tocar nele fecha o histórico
    // e abre o pedido num único toque.
    const myPedidoNatural = btnMyPedido &&
      !btnMyPedido.classList.contains('action-close-mode') &&
      !btnMyPedido.classList.contains('action-conclude-mode');
    if (myPedidoNatural && tapHitsButton(e, btnMyPedido)) { closeHistorico(); btnMyPedido.click(); return; }
    closeHistorico();
  });

  // Delegação: excluir (botão) tem prioridade; senão, abre o detalhe do item
  // com a animação FLIP (o card tocado sobe até o topo do detalhe).
  historicoList?.addEventListener('click', async (e) => {
    const delBtn = e.target.closest('.historico-item__delete');
    if (delBtn) {
      e.stopPropagation();
      await deletePedido(parseInt(delBtn.dataset.deleteId, 10));
      return;
    }
    const item = e.target.closest('.historico-item');
    if (item) openPedidoDetail(parseInt(item.dataset.pedidoId, 10), item);
  });

  btnHistorico?.addEventListener('click', openHistorico);

  // Botão principal: detalhe do pedido atual (se ativo) ou formulário de criação.
  btnMyPedido?.addEventListener('click', myPedidoNavigate);

  renderMyPedidoButton();


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - Barra de Navegação do Topo - PROCESSO DE LOGOUT SEGURO
  // Sucesso: onAuthStateChanged intercepta o signOut e assume o loader e o redirecionamento.
  // Erro: estado de auth não muda, então o loader é removido manualmente.
  // =========================================================================

  // =========================================================================
  // GAVETA - PERFIL (#profile-sheet) — visão do próprio profissional.
  // Gaveta slide-down (reusa .historico-sheet* + --bar-clear), aberta pelo
  // AVATAR da action bar (que vira o Fechar, no mesmo lugar). Os DADOS
  // PRINCIPAIS são o MESMO card de profissional do feed (buildProCard +
  // bindProCardFlip): foto, QAV, escudo de IC, tags, disponibilidade, pagamento
  // e — no flip — os comentários. Abaixo, o card de AVALIAÇÃO (QR + compartilhar).
  // Sair/Editar vivem na ACTION BAR como overlay (#bar-profile-actions, classe
  // agenda-filters--profile); o avatar vira o Fechar. Registrada no backNav p/ o "voltar".
  // =========================================================================

  // IC do próprio perfil (mock — a persistência da reputação é feature futura).
  const PROFILE_IC = 78;
  // Disponibilidade exibida no card (passiva, como em qualquer card do feed).
  const PROFILE_AVAIL = AVAILABILITY.AVAILABLE;

  // Deriva um "pro" (contrato de models.js) do estado vivo (appState + Firebase)
  // para alimentar buildProCard — o MESMO builder dos cards do feed. O que ainda
  // é mock (IC, comentários via proBackHTML) sai das mesmas fontes do feed.
  /** @returns {import('../core/models.js').Professional} */
  function buildSelfPro() {
    const st = window.appState || {};
    const tags = Array.isArray(st.selectedTags) ? st.selectedTags.filter(Boolean) : [];
    const sp = st.serviceProfile || { quality: 5, agility: 5, price: 5 };
    const pm = st.paymentMethods || {};
    const bio = document.getElementById('inp-bio')?.value.trim();
    return {
      id: 'self',
      name: window.auth?.currentUser?.displayName || 'Seu Nome',
      tags: tags.length ? tags.join(', ') : 'Adicione sua profissão',
      ic: PROFILE_IC,
      q: sp.quality, a: sp.agility, v: sp.price,
      avail: PROFILE_AVAIL,
      pay: { cash: !!pm.cash, pix: !!pm.pix, card: pm.card ?? 0 },
      nf: !!pm.nf,
      bio: bio || 'Conte suas qualidades e limitações para os clientes.',
    };
  }

  // Monta o card real no host e liga a delegação de flip UMA vez (o listener
  // fica no host e sobrevive à troca de innerHTML dos re-renders).
  let profileFlipBound = false;
  function populateProfile() {
    const host = document.getElementById('profile-pro-card');
    if (!host) return;
    host.innerHTML = '';
    host.appendChild(buildProCard(buildSelfPro(), { showPin: true }));
    if (!profileFlipBound) { bindProCardFlip(host); profileFlipBound = true; }
    // A foto do card é o avatar genérico por padrão; troca pela foto capturada.
    const img = host.querySelector('.pro-card__avatar');
    if (img && window.appState?.photoBlob) img.src = window.appState.photoBlob;
  }

  // Gaveta de perfil: mesmo maquinário das outras (--bar-clear = barra viva).
  // O AVATAR que abre vira o botão de FECHAR (X) no mesmo lugar. function
  // declarations (hoistadas) — showVagasPanel/showPedidosPanel as chamam.
  function isProfileSheetOpen() {
    return !!document.getElementById('profile-sheet')?.classList.contains('historico-sheet--open');
  }

  // Avatar ↔ X de fechar (mantém a posição). Sem trocar de tela: a gaveta
  // flutua sobre o feed, como as outras.
  function setProfileAvatarClose(on) {
    const btn = document.getElementById('btn-open-profile');
    btn?.classList.toggle('agenda-filters__profile--close', on);
    btn?.setAttribute('aria-label', on ? 'Fechar perfil' : 'Perfil');
    btn?.setAttribute('aria-expanded', String(on));   // abridor de camada: estado ARIA sincronizado
  }

  // Overlay Sair/Editar sobre a zona do meio da action bar (só com a gaveta
  // aberta). Classe na BARRA (não na search-row) → funciona em qualquer aba.
  function setProfileBarActions(on) {
    document.getElementById('feed-action-bar')?.classList.toggle('agenda-filters--profile', on);
  }

  function openProfileSheet() {
    const sheet = document.getElementById('profile-sheet');
    if (!sheet) return;
    closeFiltersSheet();
    closeContractsSheet();
    populateProfile();                 // constrói o card ANTES de medir a altura do painel
    anchorBelowActionBar(sheet);       // --sheet-top + durações derivadas da altura
    sheet.classList.add('historico-sheet--open');
    window.backNav?.push('profile-sheet', closeProfileSheet);
    setProfileAvatarClose(true);
    setProfileBarActions(true);        // Sair/Editar = overlay sobre a zona do meio (qualquer aba)
  }

  function closeProfileSheet() {
    const sheet = document.getElementById('profile-sheet');
    if (!sheet?.classList.contains('historico-sheet--open')) return;
    window.backNav?.remove('profile-sheet');
    sheet.classList.remove('historico-sheet--open');
    setProfileAvatarClose(false);
    setProfileBarActions(false);       // devolve a busca
  }

  // Exposto p/ o onboarding reabrir a gaveta ao sair da EDIÇÃO (Cancelar/Salvar
  // voltam para o perfil, não para o feed nu).
  window.openProfileSheet = openProfileSheet;

  // Logout (movido do avatar para o botão "Sair" da top bar do perfil).
  async function doLogout() {
    const confirmouLogout = await customConfirm(
      "Deseja mesmo sair do aplicativo? Ao retornar, você revisará seus dados de cadastro.",
      "Sair do App",
      "logout"
    );
    if (!confirmouLogout) return;

    document.getElementById('loader-global')?.classList.remove('u-hidden');
    try {
      window.appState.photoBlob = null;
      await window.auth.signOut();
      // Sucesso: onAuthStateChanged assume o controle do loader e do redirecionamento
    } catch (err) {
      console.error("Erro no processamento de logout do feed:", err);
      document.getElementById('loader-global')?.classList.add('u-hidden');
      await customAlert(
        "Não foi possível encerrar sua sessão de forma segura. Verifique sua conexão e tente novamente.",
        "Erro no Logout",
        "warning"
      );
    }
  }

  // Compartilhar o perfil (para pedir avaliações). Web Share API no celular;
  // fallback copiando o link (mesmo padrão do sharePedidoExternal).
  async function shareProfile() {
    const url = 'https://gentehonesta.com.br';
    const msg = `Veja meu perfil no Gente Honesta e avalie meu trabalho: ${url}`;
    await shareOrCopy({
      title: 'Meu perfil no Gente Honesta', text: msg, url,
      copiedTitle: 'Compartilhar perfil',
      copiedMsg: 'Link do seu perfil copiado! Cole no WhatsApp (ou onde quiser) para pedir uma avaliação.',
    });
  }

  // Avatar da action bar → abre/fecha a gaveta de perfil (o avatar É o abridor
  // e o fechador, no mesmo lugar). Antes disparava o logout direto.
  document.getElementById('btn-open-profile')?.addEventListener('click', () => {
    if (isProfileSheetOpen()) closeProfileSheet(); else openProfileSheet();
  });
  // Tap-outside do painel fecha (container --bar-clear começa abaixo da barra,
  // então o toque no avatar chega ao handler acima; aqui só o resto da gaveta).
  document.getElementById('profile-sheet')?.addEventListener('click', (e) => {
    if (!e.target.closest('.historico-sheet__panel')) closeProfileSheet();
  });
  document.getElementById('btn-profile-logout')?.addEventListener('click', doLogout);
  // Editar → reabre o formulário do onboarding em MODO EDIÇÃO, já preenchido com
  // os dados do perfil (perfil e cadastro compartilham o mesmo appState).
  // enterProfileEdit (onboarding.js) liga o modo, popula, tira o snapshot p/
  // desfazer e abre o formulário.
  document.getElementById('btn-profile-edit')?.addEventListener('click', () => {
    closeProfileSheet();
    if (typeof window.enterProfileEdit === 'function') window.enterProfileEdit();
  });
  document.getElementById('btn-profile-share')?.addEventListener('click', shareProfile);

});
