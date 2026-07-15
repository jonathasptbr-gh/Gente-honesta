"use strict";
import { mockIndicatedByPost, mockComments, mockProfessionals, avatarSvg, mockVagas, mockHelpers } from './feed-data.js';
import { SEARCH_PLACEHOLDER_PROS, SEARCH_PLACEHOLDER_CONTRACTS, EASE_STD, availOrder, availabilityMeta, COMMENTS_PAGE, VAGA_CARD_CFG, PRO_CARD_CFG, PRO_FLIP_SETTLE_MS, MAX_VAGAS, DAY_ORDER, HELPER_RATES, LS_HELPER_AVAIL, LS_HELPER_DRAW, TAB_DEFAULTS, SCROLL_TOP_STATE, SCROLL_THRESHOLD, TAB_ORDER } from './feed-config.js';
import { icTier, icShieldIcon, comingSoon, formatPedidoDate, pedidoHoursLeft } from './feed-utils.js';
import { icBarHTML, qavHTML, availHTML, buildCommentHTML, proBackHTML, proFooterHTML, historicoItemHTML } from './feed-templates.js';
import { pinnedPros, filterState, scrolledState, scrollToTopPending, pedidoHistory, myPedido, contractsFilter } from './feed-state.js';

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
    const bar = document.getElementById('feed-action-bar');
    if (bar && el) el.style.setProperty('--sheet-top', `${Math.round(bar.getBoundingClientRect().bottom)}px`);
  }

  // Abridor vira "fechar" (X) enquanto a gaveta está aberta — verde sólido,
  // mesmo padrão do botão de filtros (.agenda-filters__filter-pill--active).
  function setContractsButtonClose(on) {
    btnOpenContracts?.classList.toggle('agenda-filters__icon-btn--active', on);
    const icon = btnOpenContracts?.querySelector('.material-symbols-rounded');
    if (icon) icon.textContent = on ? 'close' : 'contract';
  }

  function applyContractsFilters() {
    const q = contractsFilter.query;
    contractsSheet?.querySelectorAll('.contract-card').forEach((card) => {
      const matchText   = !q || card.textContent.toLowerCase().includes(q);
      const matchStatus = contractsFilter.status === 'all' ||
                          card.classList.contains(`contract-card--${contractsFilter.status}`);
      card.classList.toggle('u-hidden', !(matchText && matchStatus));
    });
    const pending = contractsSheet?.querySelector('.contracts-pending');
    if (pending) {
      let anyMini = false;
      pending.querySelectorAll('.contract-mini').forEach((mini) => {
        const show = contractsFilter.status === 'all' && (!q || mini.textContent.toLowerCase().includes(q));
        mini.classList.toggle('u-hidden', !show);
        if (show) anyMini = true;
      });
      pending.classList.toggle('u-hidden', !anyMini);   // some junto com o rótulo
    }
    updateFilterIndicator();   // reflete o estado dos filtros de contratos na pílula
  }

  // Contagem de filtros de CONTRATOS ativos para o indicador da pílula (mesmo
  // papel visual do activeFilterCount dos profissionais). Status + campos de
  // valor/mês preenchidos (o texto da busca não conta, como nos profissionais).
  function contractsActiveFilterCount() {
    let n = contractsFilter.status !== 'all' ? 1 : 0;
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
    closeFiltersSheet();   // filtros de profissionais, se abertos
    anchorBelowActionBar(contractsSheet);
    contractsSheet?.classList.add('historico-sheet--open');
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
    applyContractsFilters();   // também reflete os filtros de contratos na pílula
  }

  function closeContractsSheet() {
    if (!isContractsSheetOpen()) return;   // guarda: também evita TDZ no setup
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
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'true');
    btn?.classList.add('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }

  function closeContractsFiltersSheet() {
    if (!contractsFiltersSheet?.classList.contains('historico-sheet--open')) return;
    contractsFiltersSheet.classList.remove('historico-sheet--open');
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'false');
    btn?.classList.remove('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }

  btnOpenContracts?.addEventListener('click', () => {
    if (isContractsSheetOpen()) closeContractsSheet(); else openContractsSheet();
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
    searchClearBtn.textContent = has ? 'close' : 'search';
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

  // --- Chips de status dos contratos (Todos / Ativo / Concluído / Cancelado):
  // seleção única no #contracts-filters-sheet + aplica o filtro na lista.
  const statusChips = document.querySelectorAll('[data-filter-status]');
  statusChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      statusChips.forEach((c) => { c.classList.remove('chip--active'); c.setAttribute('aria-pressed', 'false'); });
      chip.classList.add('chip--active');
      chip.setAttribute('aria-pressed', 'true');
      contractsFilter.status = chip.dataset.filterStatus || 'all';
      applyContractsFilters();
    });
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Abertura, Fechamento e Modos
  // =========================================================================

  const feedPanels     = document.getElementById('feed-panels');
  const feedActionBar  = document.getElementById('feed-action-bar');
  const indicatedBlock = document.getElementById('agenda-indicated-block');
  const confirmBlock   = document.getElementById('agenda-indicate-confirm');

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
  };

  const showPedidosPanel = () => {
    feedPanels?.classList.remove('feed-panels--vagas');
    feedPanels?.classList.add('feed-panels--pedidos');
    feedActionBar?.classList.remove('agenda-filters--vagas');
    feedActionBar?.classList.add('agenda-filters--pedidos');
    // fecha painel de filtros / gaveta de contratos se estiverem abertos
    closeFiltersSheet();
    closeContractsSheet();
  };

  const showProsPanel = () => {
    feedPanels?.classList.remove('feed-panels--vagas');
    feedPanels?.classList.remove('feed-panels--pedidos');
    feedActionBar?.classList.remove('agenda-filters--vagas');
    feedActionBar?.classList.remove('agenda-filters--pedidos');
  };

  // Atalhos para compatibilidade interna (indicação vem de dentro dos pedidos)
  const openPedidosSheet  = showPedidosPanel;
  const closePedidosSheet = showProsPanel;

  // TELA - PRINCIPAL (FEED) - MODO INDICAÇÃO (roda na tela principal de contatos)
  // Ao tocar "Indicar alguém" num pedido (dentro do popup), fechamos o popup e
  // ligamos o modo: a top-bar da home é SUBSTITUÍDA pelo bloco "Profissionais já
  // indicados:" (com o X para cancelar) e uma borda de destaque envolve a tela.
  // Ao escolher um profissional na lista, o bloco de confirmação aparece fixo na
  // base. A barra de status permanece verde (todo o app é verde — controlada
  // globalmente em app.js), então este modo não mexe no theme-color.
  const feedBottomBar = document.querySelector('#feed-bottom-bar');
  const screenBorder  = document.getElementById('indicate-screen-border');

  const openIndicatedPopup = (postId) => {
    // Título padrão para pedidos de terceiros; para o pedido próprio o chamador
    // já atualizou para "Indicações para você" antes de chamar esta função.
    const titleEl = document.getElementById('indicated-popup-title');
    if (titleEl && postId !== 'my') titleEl.textContent = 'Profissionais indicados';
    renderIndicatedBlock(postId);
    document.getElementById('indicated-popup')?.classList.add('indicated-popup--open');
  };
  const closeIndicatedPopup = () => {
    document.getElementById('indicated-popup')?.classList.remove('indicated-popup--open');
  };
  document.getElementById('btn-close-indicated-popup')?.addEventListener('click', closeIndicatedPopup);
  document.getElementById('indicated-popup-backdrop')?.addEventListener('click', closeIndicatedPopup);
  bindProCardFlip(document.getElementById('agenda-indicated-list'));
  document.getElementById('indicate-count-badge')?.addEventListener('click', () => {
    if (activePostId != null) openIndicatedPopup(activePostId);
  });

  let indicateMode = false;
  let activePostId = null;
  let selectedProId = null;

  const enterIndicateMode = (postId) => {
    indicateMode = true;
    activePostId = postId;

    // Injeta o card do pedido como referência no topo — sem botões, count à direita do texto
    const refContainer = document.getElementById('indicate-post-ref');
    const sourceCard   = document.getElementById(`post-card-${postId}`);
    if (refContainer && sourceCard) {
      const cloned = sourceCard.cloneNode(true);
      cloned.removeAttribute('id');
      cloned.querySelector('.pedido-item__actions')?.remove();
      refContainer.innerHTML = '';
      refContainer.appendChild(cloned);
    }

    // Atualiza badge de contagem no header
    const indicated = mockIndicatedByPost[postId] || [];
    const countEl = document.getElementById('indicate-count-value');
    if (countEl) countEl.textContent = `${indicated.length}/3`;

    // Reseta a lista de profissionais ao estado original antes de mostrar
    resetAgendaList();

    // Classe na lista controla os botões Cancelar/Indicar dos versos
    document.getElementById('agenda-list')?.classList.add('agenda-list--indicate-mode');

    showProsPanel();
    feedBottomBar?.classList.add('u-hidden');
    indicatedBlock?.classList.remove('u-hidden');
    screenBorder?.classList.add('indicate-screen-border--active');
  };

  const exitIndicateMode = () => {
    indicateMode = false;
    activePostId = null;
    selectedProId = null;
    indicatedBlock?.classList.add('u-hidden');
    feedBottomBar?.classList.remove('u-hidden');
    screenBorder?.classList.remove('indicate-screen-border--active');
    document.getElementById('agenda-list')?.classList.remove('agenda-list--indicate-mode');
    const postRef = document.getElementById('indicate-post-ref');
    if (postRef) postRef.innerHTML = '';
    document.querySelectorAll('.pro-card--selected, .pro-card--flipped, .pro-card--expanded').forEach(el => {
      proCardForceReset(el);
    });
  };

  // Cancelar o modo indicação pelo "Fechar" da top-bar azul → volta para os pedidos
  document.getElementById('btn-cancel-indicate-mode')?.addEventListener('click', () => {
    exitIndicateMode();
    openPedidosSheet();
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
    // Flutuante "Limpar Filtros" na base do feed: só para filtros de PROFISSIONAIS
    document.getElementById('btn-clear-filters')?.classList.toggle('u-hidden', contractsMode || activeFilterCount() === 0);
    syncFilterPillIcon();
  }

  // Ícone da pílula de filtro — decisão ÚNICA a partir dos dois estados:
  //   sheet de filtros (profissionais OU contratos) aberto → seta p/ CIMA
  //   (esconder a gaveta, que se recolhe para cima — não é um cancelar);
  //   filtros ativos → filter_alt; repouso → tune.
  function syncFilterPillIcon() {
    const pill = document.getElementById('btn-toggle-filters');
    const icon = pill?.querySelector('.material-symbols-rounded');
    if (!icon) return;
    const sheetOpen =
      document.getElementById('filters-sheet')?.classList.contains('historico-sheet--open') ||
      document.getElementById('contracts-filters-sheet')?.classList.contains('historico-sheet--open');
    if (sheetOpen) { icon.textContent = 'keyboard_arrow_up'; return; }
    icon.textContent = pill.classList.contains('agenda-filters__filter-pill--filtered') ? 'filter_alt' : 'tune';
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
    filterState.sort = 'ic';
    // Limpa chips visuais no painel de filtros
    document.querySelectorAll('#panel-agenda-filters .chip--active').forEach(c => {
      c.classList.remove('chip--active');
      c.setAttribute('aria-pressed', 'false');
    });
    // Restaura chip de ordenação padrão (nome)
    const defaultSort = document.querySelector('#panel-agenda-filters [data-sort="name"]');
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
        (filterState.includePay.has('cash') && p.pay?.cash) ||
        (filterState.includePay.has('pix')  && p.pay?.pix)  ||
        (filterState.includePay.has('card') && p.pay?.card && p.pay.card !== 0) ||
        (filterState.includePay.has('nf')   && p.nf === true);
      if (!hasMatch) return false;
    }
    return true;
  });

  // Comparador ÚNICO de profissionais conforme filterState.sort (function
  // hoistada). Usado por sortPros (objetos pro) e por sortCards (cards do DOM,
  // que mapeiam id→pro antes de delegar) — antes eram dois switch idênticos.
  function comparePros(a, b) {
    switch (filterState.sort) {
      case 'ic':      return b.ic - a.ic;
      case 'avail':   return (availOrder[a.avail] ?? 3) - (availOrder[b.avail] ?? 3);
      case 'quality': return b.q - a.q;
      case 'agility': return b.a - a.a;
      case 'value':   return b.v - a.v;
      default:        return a.name.localeCompare(b.name, 'pt-BR');
    }
  }

  const sortPros = (pros) => [...pros].sort(comparePros);


  // ---- Modelos padronizados de exibição (reutilizados em vários lugares) ----






  // Appends next batch of comments to the card; removes the button when exhausted.
  // function declaration — chamado antes da sua posição textual em bindProCardFlip e agenda-list.
  function handleLoadMoreComments(e) {
    const btn = e.target.closest('.pro-card__load-more');
    if (!btn) return false;
    const offset = parseInt(btn.dataset.offset, 10);
    const nextBatch = mockComments.slice(offset, offset + COMMENTS_PAGE);
    const list = btn.closest('.pro-card__back-comments')?.querySelector('.pro-card__comments-list');
    if (!list) return true;
    const card = btn.closest('.pro-card');
    const currentH = card ? card.offsetHeight : null;

    nextBatch.forEach((c, i) => {
      const wrap = document.createElement('div');
      wrap.innerHTML = buildCommentHTML(c);
      const el = wrap.firstElementChild;
      el.classList.add('comment--entering');
      el.style.animationDelay = `${i * 45}ms`;
      list.appendChild(el);
    });

    const newOffset = offset + COMMENTS_PAGE;
    if (newOffset >= mockComments.length) btn.remove();
    else btn.dataset.offset = String(newOffset);

    // Anima a altura do card para acomodar os novos comentários suavemente
    if (card && card.classList.contains('pro-card--expanded') && currentH !== null) {
      const back = card.querySelector('.pro-card__back');
      if (back) {
        const newH = back.scrollHeight + (card.querySelector('.pro-card__back-actions')?.offsetHeight || 0);
        card.style.transition = 'none';
        card.style.height = currentH + 'px';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          card.style.transition = `height 0.3s ${EASE_STD}`;
          card.style.height = newH + 'px';
          setTimeout(() => { card.style.height = 'auto'; card.style.transition = ''; }, 320);
        }));
      }
    }

    return true;
  }



  // Card padrão de profissional: coluna esquerda (foto + QAV) e coluna direita
  // (nome/profissão/disponibilidade + ações do cabeçalho + bio).
  // showPin=false omite o botão de fixar (ex: cards de referência na confirmação).

  const proCardHTML = (pro, showPin = true) => {
    const isPinned = pinnedPros.has(pro.id);
    const pinBtn = showPin
      ? `<button type="button" class="pro-card__pin-btn${isPinned ? ' pro-card__pin-btn--pinned' : ''}" aria-label="${isPinned ? 'Remover dos salvos' : 'Salvar contato'}" data-pin-id="${pro.id}">
           <span class="material-symbols-rounded" aria-hidden="true">bookmark</span>
         </button>`
      : '';
    return `
      <div class="pro-card__col-left">
        <div class="pro-card__avatar-wrap">
          <img class="pro-card__avatar" src="${avatarSvg}" alt="">
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
            ${icBarHTML(pro.ic)}
            ${pinBtn}
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
  /** @param {import('./models.js').Professional} pro */
  function buildProCard(pro, { showPin = true, withId = false } = {}) {
    const card = document.createElement('div');
    card.className = 'pro-card';
    if (withId) card.id = pro.id;
    card.innerHTML = `<div class="pro-card__3d"><div class="pro-card__flipper"><div class="pro-card__front">${proCardHTML(pro, showPin)}</div>${proBackHTML()}</div></div>`;
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

  // Registra delegação de cliques de flip num container de pro-cards.
  // Chamar uma vez por container estático; não chamar dentro de funções de render.
  // function declaration (hoisted): o bind em #agenda-indicated-list ocorre acima
  // desta linha; só é seguro porque funções declaradas são içadas no callback.
  function bindProCardFlip(containerEl) {
    if (!containerEl) return;
    containerEl.addEventListener('click', (e) => {
      if (handleLoadMoreComments(e)) return;
      if (e.target.closest('.pro-card__back-btn--whatsapp')) {
        comingSoon('Abrir WhatsApp', 'WhatsApp', 'chat');
        return;
      }
      if (e.target.closest('.pro-card__back-btn--share')) {
        comingSoon('Compartilhar perfil', 'Compartilhar', 'share');
        return;
      }
      if (e.target.closest('.pro-card__back-btn--back') || e.target.closest('.pro-card__back')) {
        const c = e.target.closest('.pro-card');
        if (c) proCardFlipToFront(c);
        return;
      }
      const card = e.target.closest('.pro-card');
      if (!card) return;
      const isFlipped = card.classList.contains('pro-card--flipped');
      containerEl.querySelectorAll('.pro-card--flipped').forEach(el => { if (el !== card) proCardFlipToFront(el); });
      if (isFlipped) proCardFlipToFront(card);
      else { proCardFlipToBack(card); setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), PRO_FLIP_SETTLE_MS); }
    });
  }

  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Monta os mini-cards dos já indicados
  const renderIndicatedBlock = (postId) => {
    const list = document.getElementById('agenda-indicated-list');
    if (!list) return;
    renderFlippableProCards(list, mockIndicatedByPost[postId] || []);
  };


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - CARDS DE POST - Botões de Indicar
  // =========================================================================

  document.getElementById('list-feed')?.addEventListener('click', (e) => {
    // Badge de contagem → popup de indicados
    const badge = e.target.closest('.post-card__indicate-info');
    if (badge) {
      const postId = badge.closest('[data-post-id]')?.dataset.postId;
      if (postId != null) openIndicatedPopup(postId);
      return;
    }
    // Botão "Indicar alguém" → entra no modo indicação
    const btn = e.target.closest('.post-card__indicate-btn');
    if (!btn) return;
    closePedidosSheet();
    enterIndicateMode(btn.dataset.postId);
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Seleção de Profissional
  // =========================================================================

  // TELA - PRINCIPAL (FEED) - LISTA DE CONTATOS - Seleção de profissional (só no modo indicação)
  document.getElementById('agenda-list')?.addEventListener('click', (e) => {
    if (handleLoadMoreComments(e)) return;

    // Botão Salvar (fixar no topo) — atualiza o botão e reordena com
    // animação FLIP, sem reconstruir a lista (sem piscada de re-render)
    if (e.target.closest('.pro-card__pin-btn')) {
      const btn = e.target.closest('.pro-card__pin-btn');
      const proId = btn.dataset.pinId;
      const pinned = !pinnedPros.has(proId);
      if (pinned) pinnedPros.add(proId);
      else pinnedPros.delete(proId);
      btn.classList.toggle('pro-card__pin-btn--pinned', pinned);
      btn.setAttribute('aria-label', pinned ? 'Remover dos salvos' : 'Salvar contato');
      reorderAgendaListAnimated();
      return;
    }

    // Botão Cancelar (modo indicação) → desflipa sem sair do modo.
    // Os botões são controlados pela classe da LISTA, então o card volta à
    // frente sem trocar Cancelar/Indicar por WhatsApp durante a animação.
    if (e.target.closest('.pro-card__back-btn--cancel-indicate')) {
      const c = e.target.closest('.pro-card');
      if (c) { c.classList.remove('pro-card--selected'); selectedProId = null; proCardFlipToFront(c); }
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
      if (c) { c.classList.remove('pro-card--selected'); selectedProId = null; proCardFlipToFront(c); }
      return;
    }

    // Clique no resto do verso (fora dos botões) → fecha
    if (e.target.closest('.pro-card__back')) {
      const c = e.target.closest('.pro-card');
      if (c) { c.classList.remove('pro-card--selected'); proCardFlipToFront(c); }
      return;
    }

    const card = e.target.closest('.pro-card');
    if (!card) return;

    if (indicateMode) {
      // ── Modo indicação: desseleciona anterior e flipa o novo ──
      // (os botões Cancelar/Indicar vêm da classe da lista, não do card)
      document.querySelectorAll('#agenda-list .pro-card--selected').forEach(el => {
        el.classList.remove('pro-card--selected');
        proCardFlipToFront(el);
      });
      card.classList.add('pro-card--selected');
      selectedProId = card.id;
      proCardFlipToBack(card);
      setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), PRO_FLIP_SETTLE_MS);
    } else {
      // ── Navegação normal: flip para o verso ou fecha se já estava aberto ──
      const isFlipped = card.classList.contains('pro-card--flipped');
      document.querySelectorAll('#agenda-list .pro-card--flipped').forEach(el => {
        if (el !== card) proCardFlipToFront(el);
      });
      if (isFlipped) proCardFlipToFront(card);
      else { proCardFlipToBack(card); setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), PRO_FLIP_SETTLE_MS); }
    }
  });





  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Renderiza lista de contatos
  // Salvos e comuns são ordenados separadamente; filtros e ordem são lidos de filterState.
  const renderAgendaList = () => {
    const list = document.getElementById('agenda-list');
    if (!list) return;

    updateFilterIndicator();   // reflete filtros ativos no indicador/limpar da barra
    const query = document.getElementById('inp-agenda-search')?.value.trim().toLowerCase() || '';
    const searched = mockProfessionals.filter(p =>
      p.name.toLowerCase().includes(query) || p.tags.toLowerCase().includes(query)
    );
    const filtered = applyFilters(searched);

    const pinnedList = sortPros(filtered.filter(p =>  pinnedPros.has(p.id)));
    const otherList  = sortPros(filtered.filter(p => !pinnedPros.has(p.id)));
    const final = [...pinnedList, ...otherList];

    list.innerHTML = '';

    if (final.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'list-empty-hint list-empty-hint--block';
      empty.textContent = 'Nenhum profissional encontrado.';
      list.appendChild(empty);
      return;
    }

    final.forEach(pro => list.appendChild(buildProCard(pro, { showPin: true, withId: true })));

    // Fim do feed: linha-aviso de que a lista da região terminou
    list.insertAdjacentHTML('beforeend',
      '<div class="feed-end-cap"><span class="feed-end-cap__text">Você viu todos os profissionais disponíveis na sua região no momento</span></div>');
  };

  // Reordena os cards já existentes com animação FLIP:
  // salvos e comuns são listas separadas, cada uma ordenada por filterState.sort.
  const reorderAgendaListAnimated = () => {
    const list = document.getElementById('agenda-list');
    if (!list) return;
    const cards = [...list.querySelectorAll(':scope > .pro-card')];
    if (cards.length < 2) return;

    const oldTops = new Map(cards.map(c => [c, c.getBoundingClientRect().top]));

    const pinnedCards = cards.filter(c =>  pinnedPros.has(c.id));
    const otherCards  = cards.filter(c => !pinnedPros.has(c.id));

    const proMap = new Map(mockProfessionals.map(p => [p.id, p]));
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
    // Devolve a linha de fim-de-feed ao FIM (os appendChild acima moveram os
    // cards para depois dela)
    const endCap = list.querySelector('.feed-end-cap');
    if (endCap) list.appendChild(endCap);

    cards.forEach(c => {
      const delta = oldTops.get(c) - c.getBoundingClientRect().top;
      if (!delta) return;
      c.style.transition = 'none';
      c.style.transform = `translateY(${delta}px)`;
    });

    // Dois rAF: garante que o navegador pinte o estado deslocado antes de animar
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cards.forEach(c => {
        c.style.transition = `transform 0.45s ${EASE_STD}`;
        c.style.transform = '';
      });
    }));

    setTimeout(() => cards.forEach(c => { c.style.transition = ''; }), 500);
  };

  document.getElementById('inp-agenda-search')?.addEventListener('input', renderAgendaList);
  renderAgendaList();


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - ABA VAGAS - Dados mock e renderização
  // =========================================================================


  const renderVagasList = () => {
    const list = document.getElementById('vagas-list');
    if (!list) return;
    list.innerHTML = '';

    mockVagas.forEach(vaga => {
      const card = document.createElement('article');
      card.className = 'vaga-card';
      card.id = vaga.id;

      const posterTier   = icTier(vaga.poster.ic);
      const posterShield = icShieldIcon(vaga.poster.ic);

      const reqHTML = vaga.requisitos.map(r =>
        `<li class="vaga-card__req"><span class="material-symbols-rounded" aria-hidden="true">check_small</span>${r}</li>`
      ).join('');

      const benefitHTML = vaga.beneficios.map(b =>
        `<span class="vaga-card__benefit"><span class="material-symbols-rounded" aria-hidden="true">${b.icon}</span>${b.label}</span>`
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
                  <span class="material-symbols-rounded" aria-hidden="true">location_on</span>
                  ${vaga.endereco}
                </a>`
        : `<span class="vaga-card__company-address vaga-card__company-address--pending">
                  <span class="material-symbols-rounded" aria-hidden="true">hourglass_top</span>
                  Dados da empresa em verificação
                </span>`;

      // Currículo na candidatura só aparece se a vaga exigir (legado: undefined = exige).
      const exigeCurriculo = vaga.exigeCurriculo !== false;
      const curriculoSectionHTML = exigeCurriculo ? `
              <!-- 5. Currículo -->
              <div class="candid-section">
                <p class="candid-section-label">Currículo completo</p>
                <label class="candid-upload-btn" data-vaga="${vaga.id}">
                  <span class="material-symbols-rounded" aria-hidden="true">attach_file</span>
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

      card.innerHTML = `
        <div class="vaga-card__3d">
        <div class="vaga-card__flipper">
          <!-- FRENTE -->
          <div class="vaga-card__front">
            <div class="vaga-card__company-strip">
              <span class="material-symbols-rounded vaga-card__company-icon" aria-hidden="true">domain</span>
              <div class="vaga-card__company-info">
                <span class="vaga-card__company-name">${companyName}</span>
                ${addressHTML}
              </div>
            </div>
            <div class="vaga-card__poster">
              <img class="vaga-card__poster-avatar" src="${avatarSvg}" alt="">
              <span class="vaga-card__poster-name">Divulgado por <strong>${vaga.poster.name}</strong></span>
              <span class="vaga-card__poster-ic ic-bar--${posterTier}">
                <span class="material-symbols-rounded" aria-hidden="true">${posterShield}</span>${vaga.poster.ic}%
              </span>
            </div>
            <div class="vaga-card__body">
              <div class="vaga-card__role-row">
                <h3 class="vaga-card__role">${vaga.cargo}</h3>
                <span class="vaga-card__vacancies">
                  <span class="material-symbols-rounded" aria-hidden="true">groups</span>
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
                    <span class="material-symbols-rounded" aria-hidden="true">schedule</span>
                    ${vaga.cargaHoraria}
                  </span>
                  <span class="vaga-card__meta-item vaga-card__salary">
                    <span class="material-symbols-rounded" aria-hidden="true">payments</span>
                    ${vaga.salario}
                  </span>
                </div>
              </div>
              ${benefitSectionHTML}
              <div class="vaga-card__actions">
                <button type="button" class="btn vaga-card__btn-apply">
                  Me candidatar
                </button>
                <button type="button" class="btn vaga-card__btn-share" aria-label="Compartilhar vaga">
                  <span class="material-symbols-rounded" aria-hidden="true">share</span>
                </button>
              </div>
            </div>
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
                <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
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


  function flipCardToBack(card, cfg) {
    const frontH = card.offsetHeight;
    card.dataset.frontH = frontH;
    card.style.transition = 'none';
    card.style.height     = frontH + 'px';
    card.style.overflow   = 'visible';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add(cfg.flippedClass);
        setTimeout(() => {
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
              const timing = `${cfg.expandMs}ms ${EASE_STD}`;
              card.style.transition = `height ${timing}`;
              card.style.height     = backH + 'px';
              if (footer) { footer.style.transition = `transform ${timing}`; footer.style.transform = ''; }
              setTimeout(() => {
                card.style.height = 'auto'; card.style.transition = ''; card.style.clipPath = '';
                if (footer) footer.style.transition = '';
              }, cfg.expandMs + 20);
            });
          });
        }, cfg.flipMs);
      });
    });
  }

  function flipCardToFront(card, cfg, onComplete) {
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
        const timing = `${cfg.collMs}ms ${EASE_STD}`;
        card.style.transition = `height ${timing}`;
        card.style.height     = frontH + 'px';
        if (footer) { footer.style.transition = `transform ${timing}`; footer.style.transform = `translateY(-${delta}px)`; }
        setTimeout(() => {
          if (footer) { footer.style.transition = 'none'; footer.style.transform = ''; }
          card.classList.remove(cfg.expandedClass);
          card.style.transition = 'none'; card.style.clipPath = ''; card.style.overflow = 'visible';
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.classList.remove(cfg.flippedClass);
              setTimeout(() => {
                card.style.height = ''; card.style.transition = ''; card.style.overflow = '';
                if (onComplete) onComplete();
              }, cfg.flipMs + 30);
            });
          });
        }, cfg.collMs + 10);
      });
    });
  }

  function flipCardForceReset(card, cfg) {
    card.classList.remove(cfg.flippedClass, cfg.expandedClass);
    card.style.height = card.style.overflow = card.style.transition = card.style.clipPath = '';
    const footer = card.querySelector(cfg.footerSel);
    if (footer) { footer.style.transform = footer.style.transition = ''; }
  }

  // ── Wrappers vaga-card ────────────────────────────────────────────────────
  function vagaCardFlipToBack(card)              { flipCardToBack(card, VAGA_CARD_CFG); }
  function vagaCardFlipToFront(card, onComplete) { flipCardToFront(card, VAGA_CARD_CFG, onComplete); }

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
  // Reseta o verso do card para o estado inicial (primeiros COMMENTS_PAGE comentários).
  // Chamado após o flip-to-front para que a próxima abertura comece do zero.
  function resetProCardBack(card) {
    const commentsList = card.querySelector('.pro-card__comments-list');
    const backComments = card.querySelector('.pro-card__back-comments');
    if (!commentsList || !backComments) return;
    commentsList.innerHTML = mockComments.slice(0, COMMENTS_PAGE).map(buildCommentHTML).join('');
    let btn = backComments.querySelector('.pro-card__load-more');
    if (mockComments.length > COMMENTS_PAGE) {
      if (!btn) {
        btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pro-card__load-more';
        btn.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">expand_more</span>ver mais comentários';
        backComments.appendChild(btn);
      }
      btn.dataset.offset = String(COMMENTS_PAGE);
    } else if (btn) {
      btn.remove();
    }
  }

  function proCardFlipToBack(card)               { flipCardToBack(card, PRO_CARD_CFG); }
  function proCardFlipToFront(card, onComplete)  {
    flipCardToFront(card, PRO_CARD_CFG, () => {
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
      const card = btnApply.closest('.vaga-card');
      if (!card) return;
      document.querySelectorAll('#vagas-list .vaga-card--flipped').forEach(other => {
        if (other !== card) vagaCardFlipToFront(other);
      });
      vagaCardFlipToBack(card);
      return;
    }

    // Volta para a frente — colapsa → flip back
    const btnBack = e.target.closest('.vaga-card__btn-back');
    if (btnBack) {
      const card = btnBack.closest('.vaga-card');
      if (card) vagaCardFlipToFront(card);
      return;
    }

    // Enviar candidatura — colapsa → flip back → alerta
    const btnSubmit = e.target.closest('.vaga-card__btn-submit');
    if (btnSubmit) {
      const card = btnSubmit.closest('.vaga-card');
      if (card) vagaCardFlipToFront(card, () => {
        customAlert('Candidatura enviada com sucesso! Você será notificado quando houver retorno.', 'Candidatura Enviada', 'check_circle');
      });
      return;
    }

    if (e.target.closest('.vaga-card__btn-share')) {
      comingSoon('Compartilhar vaga', 'Compartilhar', 'share');
      return;
    }

    // Clique em qualquer parte da frente do card (exceto link de endereço) → flip
    const front = e.target.closest('.vaga-card__front');
    if (front && !e.target.closest('.vaga-card__company-address')) {
      const card = front.closest('.vaga-card');
      if (card && !card.classList.contains('vaga-card--flipped')) {
        document.querySelectorAll('#vagas-list .vaga-card--flipped').forEach(other => {
          if (other !== card) vagaCardFlipToFront(other);
        });
        vagaCardFlipToBack(card);
      }
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
  // Ao publicar, a vaga entra no topo de mockVagas + re-renderiza a lista, e o
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
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
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
        const on = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].includes(d.dataset.day);
        d.classList.toggle('vaga-day--active', on);
        d.setAttribute('aria-pressed', String(on));
      });
      daysGroup?.classList.remove('vaga-days--error');
      chkCurriculo?.setAttribute('aria-pressed', 'false');
      benefitPills?.querySelectorAll('.vaga-benefit-pill').forEach(p => p.setAttribute('aria-pressed', 'false'));
      setOutrosOpen(false);
      if (reqList) { reqList.innerHTML = ''; addDynRow(reqList, 'Ex: Experiência com atendimento', '', true); }
    };

    // O botão "Criar vaga" vira um botão de fechar (X) enquanto o sheet está aberto.
    const CRIAR_VAGA_HTML = '<span class="material-symbols-rounded" aria-hidden="true">add</span>Criar vaga';
    const FECHAR_VAGA_HTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>Fechar';
    const setCriarVagaClose = (isClose) => {
      if (!btnCriarVaga) return;
      btnCriarVaga.classList.toggle('action-close-mode', isClose);
      btnCriarVaga.innerHTML = isClose ? FECHAR_VAGA_HTML : CRIAR_VAGA_HTML;
    };

    const openVagaSheet = () => {
      anchorBelowActionBar(vagaSheet);
      vagaSheet?.classList.add('pedido-sheet--open');
      setCriarVagaClose(true);
    };
    const closeVagaSheet = () => {
      vagaSheet?.classList.remove('pedido-sheet--open');
      // Só restaura para "Criar vaga" se ainda não há vaga publicada; após publicar,
      // o botão já foi trocado para "Ver vaga" e não deve ser sobrescrito.
      if (!myVagaId) setCriarVagaClose(false);
      else btnCriarVaga?.classList.remove('action-close-mode');
    };

    // Rola a lista de vagas até o card criado e destaca-o brevemente.
    const scrollToMyVaga = () => {
      if (!myVagaId) return;
      const card = document.getElementById(myVagaId);
      if (!card) return;
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.classList.remove('vaga-card--highlight');
      void card.offsetWidth; // reinicia a animação se já aplicada
      card.classList.add('vaga-card--highlight');
    };

    // Botão da action bar: cria (sem vaga) ou vê a vaga já publicada.
    btnCriarVaga?.addEventListener('click', () => {
      if (myVagaId) scrollToMyVaga();
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
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
      mockVagas.unshift({
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

      // Transforma o botão "Criar vaga" em "Ver vaga"
      if (btnCriarVaga) {
        btnCriarVaga.innerHTML = '<span class="material-symbols-rounded" aria-hidden="true">visibility</span>Ver vaga';
      }

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

    // O botão "Serviço de ajudantes" vira botão de fechar (X) enquanto o sheet abre.
    const btnAjudante = document.getElementById('btn-chamar-ajudante');
    const AJUDANTE_HTML = 'Serviço de ajudantes';
    const FECHAR_AJUDANTE_HTML = '<span class="material-symbols-rounded" aria-hidden="true">close</span>Fechar';
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
    };
    const closeAjudanteSheet = () => {
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
        if (chk) chk.innerText = on ? 'check_box' : 'check_box_outline_blank';
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
    let helperCallType = 'light';

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
              ${icBarHTML(h.ic)}
            </div>
          </div>
          <a class="btn pro-card__back-btn pro-card__back-btn--whatsapp helper-wa"
             href="https://wa.me/${h.phone}" target="_blank" rel="noopener"
             aria-label="Conversar com ${h.first} no WhatsApp">
            <span class="material-symbols-rounded" aria-hidden="true">chat</span>Conversar no WhatsApp
          </a>
        </div>
      </div>`;

    // Sorteia N ajudantes distintos de um tipo, excluindo ids já em uso.
    // Fisher-Yates só como placeholder da entrega "aleatória" (real: ordem de chegada).
    const drawHelpers = (type, count, excludeIds = []) => {
      const pool = mockHelpers.filter(h => h.type === type && !excludeIds.includes(h.id));
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
        seg?.classList.toggle('seg-toggle--heavy', helperCallType === 'heavy');
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
        document.getElementById('agenda-list')?.scrollTo({ top: 0, behavior: 'smooth' });
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
    const btn = document.getElementById('btn-toggle-filters');
    btn?.setAttribute('aria-expanded', 'true');
    btn?.classList.add('agenda-filters__filter-pill--active');
    syncFilterPillIcon();
  }

  document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
    // Com a gaveta de CONTRATOS aberta, o mesmo botão alterna o sheet de
    // filtros de CONTRATOS (a barra segue viva sob a variante --bar-clear).
    if (isContractsSheetOpen()) {
      const openC = contractsFiltersSheet?.classList.contains('historico-sheet--open');
      if (openC) closeContractsFiltersSheet(); else openContractsFiltersSheet();
      return;
    }
    const open = document.getElementById('filters-sheet')?.classList.contains('historico-sheet--open');
    if (open) closeFiltersSheet(); else openFiltersSheet();
  });
  // Fecha ao tocar fora do painel (inclui tocar no próprio botão, que agora é "X")
  document.getElementById('filters-sheet')?.addEventListener('click', (e) => {
    if (!e.target.closest('.historico-sheet__panel')) closeFiltersSheet();
  });

  // Botão FLUTUANTE "Limpar filtros" (base do feed de profissionais): zera os
  // 4 grupos de filtro (mantém a ordenação e os pins), des-seleciona os chips do
  // painel e re-renderiza. Ele e o indicador da pílula somem sozinhos (contagem
  // 0) via renderAgendaList → updateFilterIndicator.
  document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
    filterState.includeIc.clear();
    filterState.includeAvail.clear();
    filterState.includePay.clear();
    filterState.savedOnly = false;
    document.querySelectorAll('#panel-agenda-filters [data-filter-ic], #panel-agenda-filters [data-filter-avail], #panel-agenda-filters [data-filter-pay], #panel-agenda-filters [data-filter-saved]')
      .forEach(c => { c.classList.remove('chip--active'); c.setAttribute('aria-pressed', 'false'); });
    renderAgendaList();
  });

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
    slider.style.transform = `translateX(${idx * 100}%)`;
  };
  updateSlider('home'); // posiciona o slider na aba ativa inicial

  let activeTab = 'home';

  const agendaListEl    = document.getElementById('agenda-list');
  const pedidosScrollEl = document.getElementById('pedidos-scroll');
  const vagasScrollEl   = document.getElementById('vagas-scroll');

  const setTabButton = (tabName, scrolled) => {
    const btn = document.querySelector(`.feed-tabs-pill__tab[data-tab="${tabName}"]`);
    if (!btn) return;
    const d = scrolled ? SCROLL_TOP_STATE : (TAB_DEFAULTS[tabName] ?? { icon: 'work', label: tabName });
    btn.querySelector('.material-symbols-rounded').textContent = d.icon;
    btn.querySelector('.feed-tabs-pill__tab-label').textContent = d.label;
    // Seta "Voltar ao topo" REFORÇADA (opsz 24 engrossa o traço no tamanho pequeno)
    btn.classList.toggle('feed-tabs-pill__tab--totop', !!scrolled);
  };

  const switchToTab = (tabName) => {
    if (tabName === activeTab) return;
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
    if (tabName === 'pedidos') showPedidosPanel();
    else if (tabName === 'vagas') showVagasPanel();
    else showProsPanel();
    // Reflete o estado de scroll do NOVO painel na elevação da barra
    updateBarElevation();
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
          if (clickedTab === 'home')    agendaListEl?.scrollTo({ top: 0, behavior: 'smooth' });
          if (clickedTab === 'pedidos') pedidosScrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
          if (clickedTab === 'vagas')   vagasScrollEl?.scrollTo({ top: 0, behavior: 'smooth' });
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
      if (activeTab === 'vagas')   switchToTab('home');
      else if (activeTab === 'home') switchToTab('pedidos');
    } else {
      if (activeTab === 'pedidos') switchToTab('home');
      else if (activeTab === 'home') switchToTab('vagas');
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

  // Elevação da action bar: sombra na fronteira SÓ quando o feed ativo está
  // rolado — barra "flat" = usuário está no TOPO da lista (indicador de topo).
  // function declaration (hoistada): também chamada por switchToTab.
  function updateBarElevation() {
    const el = activeTab === 'home' ? agendaListEl
             : activeTab === 'pedidos' ? pedidosScrollEl : vagasScrollEl;
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
  wireScrollTab(agendaListEl,  'home');
  wireScrollTab(pedidosScrollEl, 'pedidos');
  wireScrollTab(vagasScrollEl,  'vagas');



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

  const getActivePedido = () => pedidoHistory.find(p => p.status === 'active') || null;
  const getPedidoById   = (id) => pedidoHistory.find(p => p.id === id) || null;

  const btnHistorico     = document.getElementById('btn-historico-pedidos');
  const btnMyPedido      = document.getElementById('btn-my-pedido');
  const btnMyPedidoLabel = document.getElementById('btn-my-pedido-label');
  const btnMyPedidoIcon  = btnMyPedido?.querySelector('.pedido-action__icon');

  // Histórico é SEMPRE visível; só o botão principal muda conforme haja pedido ativo.
  const renderMyPedidoButton = () => {
    if (getActivePedido()) {
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Pedido atual';
      if (btnMyPedidoIcon)  btnMyPedidoIcon.innerText  = 'chat';
    } else {
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Fazer pedido';
      if (btnMyPedidoIcon)  btnMyPedidoIcon.innerText  = 'add';
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
      if (btnMyPedidoIcon)  btnMyPedidoIcon.innerText  = 'check_circle';
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Concluir pedido';
    } else if (mode === 'close') {
      if (btnMyPedidoIcon)  btnMyPedidoIcon.innerText  = 'close';
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
      if (icon)  icon.textContent  = 'check_circle';
      if (label) label.textContent = 'Concluir pedido';
    } else if (mode === 'close') {
      if (icon)  icon.textContent  = 'close';
      if (label) label.textContent = 'Fechar';
    } else {
      if (icon)  icon.textContent  = 'history';
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

  const closePedidoSheet = () => {
    pedidoSheet?.classList.remove('pedido-sheet--open');
    pedidoSheet?.classList.remove('pedido-sheet--morph');
    detailPedidoId = null;
    pedidoDetailMode = null;
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
    detailPedidoId = null;
    pedidoDetailMode = null;   // formulário não é um detalhe
    anchorBelowActionBar(pedidoSheet);
    pedidoSheet?.classList.remove('pedido-sheet--full', 'pedido-sheet--morph');
    pedidoSheet?.classList.add('pedido-sheet--open');
    setMyPedidoButton('close');
  };

  // Abre o detalhe unificado (pedido + indicações). `sourceEl` = o item do
  // histórico tocado: quando presente, a abertura ANIMA (FLIP) — o card sobe da
  // posição do item até o topo do detalhe e só então deslizam as indicações, para
  // parecer que continua no histórico vendo mais detalhes do item.
  const openPedidoDetail = (id, sourceEl) => {
    const pedido = getPedidoById(id);
    if (!pedido) return;
    detailPedidoId = id;
    const active = pedido.status === 'active';
    pedidoDetailMode = active ? 'active' : 'old';
    pedidoFormState?.classList.add('u-hidden');
    pedidoDetailsState?.classList.remove('u-hidden');
    renderPedidoDetails(pedido);
    anchorBelowActionBar(pedidoSheet);
    pedidoSheet?.classList.remove('pedido-sheet--full');
    // Botões do topo: Histórico → "Fechar" (nos dois casos); o botão "Pedido atual"
    // vira "Concluir pedido" quando o pedido é ATIVO, ou fica natural quando é
    // ANTIGO (para pular direto ao pedido atual / fazer um novo).
    setHistoricoButton('close');
    setMyPedidoButton(active ? 'conclude' : 'natural');

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
      cardEl.style.transition = 'transform 0.42s var(--sheet-ease, cubic-bezier(0.32,0.72,0,1))';
      cardEl.style.transform = 'translateY(0)';
      const revealIndicated = () => {
        if (!indicatedEl) return;
        indicatedEl.style.transition = 'opacity 0.3s ease, transform 0.38s var(--sheet-ease, cubic-bezier(0.32,0.72,0,1))';
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
    if (!pedido || pedido.status !== 'active') return;
    const ok = await customConfirm('Ao concluir, seu pedido sairá do ar e não receberá novas indicações. Ele continua salvo no seu histórico. Deseja continuar?', 'Concluir pedido', 'check_circle');
    if (!ok) return;
    pedido.status = 'completed';
    pedido.completedAt = Date.now();
    renderMyPedidoButton();
    renderHistoricoList();
    closePedidoSheet();
  };

  // Sem botão Cancelar: fecha pelo botão "Fechar" (opener) ou tocando fora do painel.
  // Toque FORA do painel (barra ou backdrop). Os botões do topo agora têm ação
  // própria dependendo do modo do detalhe, então roteamos o toque:
  //  - detalhe ATIVO + toque no Histórico ("Concluir") → conclui;
  //  - detalhe ANTIGO + toque no Fazer/Pedido atual (natural) → navega;
  //  - qualquer outro toque fora do painel → fecha.
  pedidoSheet?.addEventListener('click', (e) => {
    if (e.target.closest('.pedido-sheet__panel')) return;
    // O botão do lado "Pedido atual" (btnMyPedido) tem ação própria: conclui (pedido
    // ativo) ou navega (pedido antigo). O botão Histórico é "Fechar" (default abaixo).
    if (pedidoDetailMode === 'active' && tapHitsButton(e, btnMyPedido)) { concluirDetailPedido(); return; }
    if (pedidoDetailMode === 'old' && tapHitsButton(e, btnMyPedido)) { myPedidoNavigate(); return; }
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
    myPedido.urgency = 'normal';
    myPedido.duration = '12';
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
      status: 'active',
      // MOCK: semeia indicações para o fluxo "ver indicados" ficar demonstrável.
      indicated: [
        { name: 'Carlos Almeida', tags: 'Eletricista · Encanador',  ic: 78, q: 7, a: 5, v: 6, avail: 'available',   pay: { cash: true,  pix: true,  card: 6  }, nf: true,  bio: 'Atende serviços elétricos e hidráulicos residenciais. Não faz obras de grande porte nem trabalha em altura.' },
        { name: 'Fernanda Lima',  tags: 'Costureira · Designer',    ic: 91, q: 9, a: 5, v: 7, avail: 'available',   pay: { cash: false, pix: true,  card: 12 }, nf: true,  bio: 'Costura sob medida e ajustes de roupas. Não trabalha com couro nem com grandes lotes.' },
        { name: 'Marcos Freitas', tags: 'Marceneiro',               ic: 19, q: 8, a: 4, v: 6, avail: 'full',        pay: { cash: true,  pix: true,  card: 'debit' }, nf: true, bio: 'Móveis sob medida em madeira. Tenho alta demanda, combine o prazo com antecedência.' },
      ],
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
  };
  const closeHistorico = () => {
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

  document.getElementById('btn-open-profile')?.addEventListener('click', async () => {
    const confirmouLogout = await customConfirm(
      "Deseja mesmo sair do aplicativo? Ao retornar, você revisará seus dados de cadastro.",
      "Sair do App",
      "logout"
    );

    if (confirmouLogout) {
      document.getElementById('loader-global')?.classList.remove('u-hidden');

      try {
        window.appState.photoBlob = null;
        await auth.signOut();
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
  });

});
