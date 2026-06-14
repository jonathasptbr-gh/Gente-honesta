"use strict";

// =========================================================================
// TELA - PRINCIPAL (FEED) - Gerenciador de Comportamentos da Interface
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // TELA - PRINCIPAL (FEED) - PAINEL DE NOTIFICAÇÕES - Abertura e Fechamento
  // =========================================================================

  const panelNotif     = document.getElementById('panel-notifications');
  const backdropNotif  = document.getElementById('overlay-notif-backdrop');
  const btnOpen        = document.getElementById('btn-open-notifications');
  const btnClose       = document.getElementById('btn-close-notifications');

  const openNotifPanel = () => {
    backdropNotif?.classList.remove('u-hidden');
    panelNotif?.classList.add('notif-panel--open');
  };

  const closeNotifPanel = () => {
    panelNotif?.classList.remove('notif-panel--open');
    // Aguarda animação antes de ocultar backdrop
    setTimeout(() => backdropNotif?.classList.add('u-hidden'), 320);
  };

  btnOpen?.addEventListener('click', openNotifPanel);
  btnClose?.addEventListener('click', closeNotifPanel);
  backdropNotif?.addEventListener('click', closeNotifPanel);


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
    document.getElementById('panel-agenda-filters')?.classList.remove('agenda-filters__panel--open');
    document.getElementById('btn-toggle-filters')?.setAttribute('aria-expanded', 'false');
  };

  const showPedidosPanel = () => {
    feedPanels?.classList.remove('feed-panels--vagas');
    feedPanels?.classList.add('feed-panels--pedidos');
    feedActionBar?.classList.remove('agenda-filters--vagas');
    feedActionBar?.classList.add('agenda-filters--pedidos');
    // fecha painel de filtros se estiver aberto
    document.getElementById('panel-agenda-filters')?.classList.remove('agenda-filters__panel--open');
    document.getElementById('btn-toggle-filters')?.setAttribute('aria-expanded', 'false');
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
  // ligamos o modo: a top-bar verde da home é SUBSTITUÍDA por uma top-bar AZUL
  // "Profissionais já indicados:" (com o X para cancelar) e a cor da barra de
  // status do sistema passa a azul. Ao escolher um profissional na lista, o bloco
  // de confirmação aparece fixo na base.
  const FEED_THEME_COLOR     = '#184e1b'; // = var(--p-green)
  const feedTopBar    = document.querySelector('#feed-top-bar');
  const feedBottomBar = document.querySelector('#feed-bottom-bar');
  const themeMeta     = document.querySelector('meta[name="theme-color"]');
  const screenBorder  = document.getElementById('indicate-screen-border');

  const openIndicatedPopup = (postId) => {
    renderIndicatedBlock(postId);
    document.getElementById('indicated-popup')?.classList.remove('u-hidden');
  };
  const closeIndicatedPopup = () => {
    document.getElementById('indicated-popup')?.classList.add('u-hidden');
  };
  document.getElementById('btn-close-indicated-popup')?.addEventListener('click', closeIndicatedPopup);
  document.getElementById('indicated-popup-backdrop')?.addEventListener('click', closeIndicatedPopup);
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

    showProsPanel();
    feedTopBar?.classList.add('u-hidden');
    feedBottomBar?.classList.add('u-hidden');
    indicatedBlock?.classList.remove('u-hidden');
    screenBorder?.classList.add('indicate-screen-border--active');
    themeMeta?.setAttribute('content', FEED_THEME_COLOR);
    confirmBlock?.classList.add('u-hidden');
  };

  const exitIndicateMode = () => {
    indicateMode = false;
    activePostId = null;
    selectedProId = null;
    confirmBlock?.classList.add('u-hidden');
    indicatedBlock?.classList.add('u-hidden');
    feedTopBar?.classList.remove('u-hidden');
    feedBottomBar?.classList.remove('u-hidden');
    screenBorder?.classList.remove('indicate-screen-border--active');
    themeMeta?.setAttribute('content', FEED_THEME_COLOR);
    const postRef = document.getElementById('indicate-post-ref');
    if (postRef) postRef.innerHTML = '';
    document.querySelectorAll('.pro-card--selected').forEach(el => {
      el.classList.remove('pro-card--selected');
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

  // IDs dos cards fixados no topo da lista (persistência em memória por sessão)
  const pinnedPros = new Set();

  // Filtros inclusivos: sets vazios = sem filtro = mostra todos.
  // Clicar num chip adiciona ao set (whitelist); clicar de novo remove.
  const filterState = {
    includeIc:    new Set(),
    includeAvail: new Set(),
    includePay:   new Set(),
    savedOnly:    false,
    sort:         'name',
  };

  const applyFilters = (pros) => pros.filter(p => {
    const tier = p.ic >= 75 ? 'ok' : p.ic >= 50 ? 'warn' : p.ic >= 25 ? 'alert' : 'bad';
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

  const availOrder = { available: 0, full: 1, unavailable: 2 };
  const sortPros = (pros) => [...pros].sort((a, b) => {
    switch (filterState.sort) {
      case 'ic':      return b.ic - a.ic;
      case 'avail':   return (availOrder[a.avail] ?? 3) - (availOrder[b.avail] ?? 3);
      case 'quality': return b.q - a.q;
      case 'agility': return b.a - a.a;
      case 'value':   return b.v - a.v;
      default:        return a.name.localeCompare(b.name, 'pt-BR');
    }
  });

  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Dados mockados de indicações por post
  const mockIndicatedByPost = {
    '0': [
      { name: 'Carlos Almeida', tags: 'Eletricista · Encanador', ic: 78, q: 7, a: 5, v: 6, avail: 'available', pay: { cash: true, pix: true, card: 6 }, nf: true, bio: 'Atende serviços elétricos e hidráulicos residenciais. Não faz obras de grande porte nem trabalha em altura.' }
    ],
    '1': []
  };

  // ---- Modelos padronizados de exibição (reutilizados em vários lugares) ----
  // Confiança compacta: (escudo) ##% Confiável — ou vertical (escudo/cima, %/meio, palavra/baixo)
  const icBarHTML = (ic, vertical = false) => {
    // Faixas de 25%: 75–100 verde (check) · 50–74 amarelo (interrogação) ·
    // 25–49 vermelho (exclamação) · 0–24 preto (negado)
    let tier, shield;
    if (ic >= 75)      { tier = 'ok';    shield = 'gpp_good';        }
    else if (ic >= 50) { tier = 'warn';  shield = 'shield_question'; }
    else if (ic >= 25) { tier = 'alert'; shield = 'gpp_maybe';       }
    else               { tier = 'bad';   shield = 'gpp_bad';         }
    return `<div class="ic-bar ic-bar--${tier}${vertical ? ' ic-bar--vertical' : ''}"><span class="material-symbols-rounded ic-bar__shield" aria-hidden="true">${shield}</span><span class="ic-bar__value">${ic}%</span><span class="ic-bar__label">Confiável</span></div>`;
  };

  // Índices Qualidade / Agilidade / Valor: label colorido acima de barra colorida
  const qavHTML = (q, a, v) => `
    <div class="qav">
      <div class="qav__item qav__item--quality"><span class="qav__label">Qualidade</span><div class="qav__bar"><div class="qav__fill" style="width:${q * 10}%"></div></div></div>
      <div class="qav__item qav__item--agility"><span class="qav__label">Agilidade</span><div class="qav__bar"><div class="qav__fill" style="width:${a * 10}%"></div></div></div>
      <div class="qav__item qav__item--value"><span class="qav__label">Valor</span><div class="qav__bar"><div class="qav__fill" style="width:${v * 10}%"></div></div></div>
    </div>`;

  // Disponibilidade do profissional: ponto colorido + rótulo (mesma filosofia de cor da ic-bar).
  // Estados: 'available' (verde), 'full' (amarelo), 'unavailable' (vermelho).
  const availabilityMeta = {
    available:   { cls: 'available',   label: 'Disponível'   },
    full:        { cls: 'full',        label: 'Agenda cheia' },
    unavailable: { cls: 'unavailable', label: 'Indisponível' },
  };
  const availHTML = (state) => {
    const m = availabilityMeta[state] || availabilityMeta.available;
    return `<span class="avail avail--${m.cls}"><span class="avail__dot" aria-hidden="true"></span>${m.label}</span>`;
  };

  // Verso do card (flip): comentários em scroll + barra de ações.
  const mockComments = [
    { text: 'Chegou na hora marcada e resolveu tudo sem complicação. Recomendo sem hesitar.', author: 'Ana Souza', ic: 88 },
    { text: 'Profissional competente e comunicativo. Explicou cada etapa antes de executar, sem surpresas no valor final.', author: 'Marcos Lima', ic: 71 },
    { text: 'Trabalho limpo e rápido. Excelente custo-benefício.', author: 'Júlia Ferreira', ic: 95 },
    { text: 'Contratei para um conserto urgente e não me decepcionou. Além de resolver, deu dicas para evitar o problema no futuro.', author: 'Pedro Alves', ic: 62 },
    { text: 'Segunda vez que contrato e o padrão continua o mesmo. Pode contratar sem medo, profissional exemplar.', author: 'Carla Ramos', ic: 91 },
  ];
  const icTier = ic => ic >= 75 ? 'ok' : ic >= 50 ? 'warn' : ic >= 25 ? 'alert' : 'bad';
  const icShieldIcon = ic => ic >= 75 ? 'gpp_good' : ic >= 50 ? 'shield_question' : ic >= 25 ? 'gpp_maybe' : 'gpp_bad';

  const buildCommentHTML = (c) => {
    const MAX = 150;
    const tier = icTier(c.ic);
    const shield = icShieldIcon(c.ic);
    const text = c.text.length > MAX ? c.text.slice(0, MAX).trimEnd() + '...' : c.text;
    return `<div class="comment"><p class="comment__text">"${text}" <span class="comment__author">${c.author}</span> <span class="comment__ic ic-bar--${tier}"><span class="material-symbols-rounded" aria-hidden="true">${shield}</span>${c.ic}%</span></p></div>`;
  };

  const proBackHTML = () => {
    const commentsHTML = mockComments.map(buildCommentHTML).join('');
    return `
      <div class="pro-card__back">
        <div class="pro-card__back-comments">
          <div class="pro-card__comments-list">${commentsHTML}</div>
        </div>
        <div class="pro-card__back-actions">
          <button type="button" class="pro-card__back-btn pro-card__back-btn--back" aria-label="Voltar">
            <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
          </button>
          <button type="button" class="pro-card__back-btn pro-card__back-btn--whatsapp">
            <span class="material-symbols-rounded" aria-hidden="true">chat</span>Conversar no WhatsApp
          </button>
          <button type="button" class="pro-card__back-btn pro-card__back-btn--share" aria-label="Compartilhar">
            <span class="material-symbols-rounded" aria-hidden="true">share</span>
          </button>
        </div>
      </div>
    `;
  };

  // Rodapé do card: todos os 4 itens sempre visíveis.
  // Ativos (profissional aceita/emite) = estilo normal; inativos = opacos + riscados.
  const proFooterHTML = (pro) => {
    const hasCash = !!pro.pay?.cash;
    const hasPix  = !!pro.pay?.pix;
    const hasCard = pro.pay?.card === 'debit' || pro.pay?.card > 0;
    const hasNF   = pro.nf === true;
    const cardLabel = pro.pay?.card === 'debit' ? 'Débito'
      : pro.pay?.card === 1 ? 'À vista'
      : hasCard ? `até ${pro.pay.card}x`
      : 'Cartão';
    const cls = active => `pro-card__meta-item${active ? '' : ' pro-card__meta-item--inactive'}`;
    return `<div class="pro-card__meta">
      <span class="${cls(hasCash)}"><span class="material-symbols-rounded">attach_money</span>Dinheiro</span>
      <span class="${cls(hasPix)}"><span class="material-symbols-rounded">qr_code_2</span>Pix</span>
      <span class="${cls(hasCard)}"><span class="material-symbols-rounded">credit_card</span>${cardLabel}</span>
      <span class="${cls(hasNF)}"><span class="material-symbols-rounded">receipt_long</span>NF</span>
    </div>`;
  };

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

  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Monta os mini-cards dos já indicados
  const renderIndicatedBlock = (postId) => {
    const list = document.getElementById('agenda-indicated-list');
    if (!list) return;
    list.innerHTML = '';

    const indicated = mockIndicatedByPost[postId] || [];

    if (indicated.length === 0) {
      list.innerHTML = '<span style="font-size:var(--fs-4);color:rgba(255,255,255,0.75);grid-column:1/-1">Nenhuma indicação ainda.</span>';
      return;
    }

    indicated.forEach(pro => {
      const card = document.createElement('div');
      card.className = 'pro-card';
      card.style.cursor = 'default';
      card.innerHTML = `<div class="pro-card__flipper"><div class="pro-card__front">${proCardHTML(pro, false)}</div></div>`;
      list.appendChild(card);
    });
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

    // Botão WhatsApp no verso
    if (e.target.closest('.pro-card__back-btn--whatsapp')) {
      customAlert('Abrir WhatsApp — funcionalidade em breve.', 'WhatsApp', 'chat');
      return;
    }

    // Botão Compartilhar no verso
    if (e.target.closest('.pro-card__back-btn--share')) {
      customAlert('Compartilhar perfil — funcionalidade em breve.', 'Compartilhar', 'share');
      return;
    }

    // Clique no verso (fora dos botões/comentários) → volta à frente
    if (e.target.closest('.pro-card__back')) {
      e.target.closest('.pro-card')?.classList.remove('pro-card--flipped');
      return;
    }

    const card = e.target.closest('.pro-card');
    if (!card) return;

    if (indicateMode) {
      // ── Modo indicação: seleciona o profissional para indicar ──
      document.querySelectorAll('.pro-card--selected').forEach(el => {
        el.classList.remove('pro-card--selected');
      });
      card.classList.add('pro-card--selected');
      selectedProId = card.id;
      renderConfirmBlock(card);
      confirmBlock?.classList.remove('u-hidden');
      confirmBlock?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      // ── Navegação normal: flip para o verso ──
      const isFlipped = card.classList.contains('pro-card--flipped');
      document.querySelectorAll('.pro-card--flipped').forEach(el => el.classList.remove('pro-card--flipped'));
      if (!isFlipped) {
        card.classList.add('pro-card--flipped');
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      }
    }
  });

  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Monta o preview do profissional selecionado antes de confirmar
  const renderConfirmBlock = (proEl) => {
    const preview = document.getElementById('agenda-selected-pro');
    if (!preview) return;
    const pro = mockProfessionals.find(p => p.id === proEl.id);
    if (!pro) return;
    preview.innerHTML = `<div class="pro-card"><div class="pro-card__flipper"><div class="pro-card__front">${proCardHTML(pro, false)}</div></div></div>`;
  };

  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Confirmação da indicação
  // Ao confirmar ou cancelar, sai do modo indicação E volta para o popup de pedidos
  // (de onde o usuário veio ao tocar "Indicar alguém").
  document.getElementById('btn-confirm-indicate')?.addEventListener('click', async () => {
    if (!selectedProId) return;
    exitIndicateMode();
    await customAlert('Indicação registrada com sucesso!', 'Indicação Feita', 'check_circle');
    openPedidosSheet();
  });

  document.getElementById('btn-cancel-indicate')?.addEventListener('click', () => {
    exitIndicateMode();
    openPedidosSheet();
  });


  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Dados mockados de profissionais
  // avail: 'available' (Disponível/verde) | 'full' (Agenda cheia/amarelo) | 'unavailable' (Indisponível/vermelho)
  const mockProfessionals = [
    // pay: formas de pagamento — cash (dinheiro), pix, card (0 = não aceita,
    //      'debit' = só débito, número = crédito parcelado em até Nx) · nf: emite nota fiscal
    { id: 'pro-0', name: 'Carlos Almeida', tags: 'Eletricista · Encanador', ic: 92, q: 8, a: 6, v: 7, avail: 'available',   pay: { cash: true,  pix: true,  card: 6       }, nf: true,  bio: 'Atendo serviços elétricos e hidráulicos residenciais. Não faço obras de grande porte nem trabalho em altura.' },
    { id: 'pro-1', name: 'Paula Ramos',    tags: 'Diarista · Cozinheira',   ic: 64, q: 7, a: 7, v: 7, avail: 'full',        pay: { cash: true,  pix: true,  card: 0       }, nf: false, bio: 'Faço limpeza e cozinha do dia a dia. Não atendo aos finais de semana e não cuido de crianças.' },
    { id: 'pro-2', name: 'Roberto Nunes',  tags: 'Pintor · Gesseiro',       ic: 38, q: 6, a: 5, v: 5, avail: 'unavailable', pay: { cash: true,  pix: false, card: 0       }, nf: false, bio: 'Pintura e pequenos reparos em gesso. Estou no início de carreira, então os prazos podem variar.' },
    { id: 'pro-3', name: 'Fernanda Lima',  tags: 'Costureira · Designer',   ic: 91, q: 9, a: 5, v: 7, avail: 'available',   pay: { cash: false, pix: true,  card: 12      }, nf: true,  bio: 'Costura sob medida e ajustes de roupas. Não trabalho com couro nem com grandes lotes.' },
    { id: 'pro-4', name: 'Marcos Freitas', tags: 'Marceneiro',              ic: 19, q: 8, a: 4, v: 6, avail: 'full',        pay: { cash: true,  pix: true,  card: 'debit' }, nf: true,  bio: 'Móveis sob medida em madeira. Tenho alta demanda, combine o prazo com antecedência.' },
  ];

  const avatarSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555555'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>`;


  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Renderiza lista de contatos
  // Salvos e comuns são ordenados separadamente; filtros e ordem são lidos de filterState.
  const renderAgendaList = () => {
    const list = document.getElementById('agenda-list');
    if (!list) return;

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
      empty.style.cssText = 'text-align:center;color:rgba(255,255,255,0.75);padding:var(--space-xl) 0;font-size:var(--fs-6)';
      empty.textContent = 'Nenhum profissional encontrado.';
      list.appendChild(empty);
      return;
    }

    final.forEach(pro => {
      const card = document.createElement('div');
      card.className = 'pro-card';
      card.id = pro.id;
      card.innerHTML = `<div class="pro-card__flipper"><div class="pro-card__front">${proCardHTML(pro)}</div>${proBackHTML()}</div>`;
      list.appendChild(card);
    });
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

    const sortCards = (arr) => [...arr].sort((a, b) => {
      const proA = mockProfessionals.find(p => p.id === a.id);
      const proB = mockProfessionals.find(p => p.id === b.id);
      if (!proA || !proB) return 0;
      switch (filterState.sort) {
        case 'ic':      return proB.ic - proA.ic;
        case 'avail':   return (availOrder[proA.avail] ?? 3) - (availOrder[proB.avail] ?? 3);
        case 'quality': return proB.q - proA.q;
        case 'agility': return proB.a - proA.a;
        case 'value':   return proB.v - proA.v;
        default:        return proA.name.localeCompare(proB.name, 'pt-BR');
      }
    });

    [...sortCards(pinnedCards), ...sortCards(otherCards)].forEach(c => {
      c.style.animation = 'none'; // evita repetir cardExpand ao reinserir o nó
      list.appendChild(c);
    });

    cards.forEach(c => {
      const delta = oldTops.get(c) - c.getBoundingClientRect().top;
      if (!delta) return;
      c.style.transition = 'none';
      c.style.transform = `translateY(${delta}px)`;
    });

    // Dois rAF: garante que o navegador pinte o estado deslocado antes de animar
    requestAnimationFrame(() => requestAnimationFrame(() => {
      cards.forEach(c => {
        c.style.transition = 'transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)';
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

  const mockVagas = [
    {
      id: 'vaga-0',
      empresa: 'Restaurante da Esquina',
      endereco: 'Rua das Acácias, 142 - Centro',
      mapsQuery: 'Rua das Acácias, 142, Centro',
      poster: { name: 'Marcos Freitas', ic: 91 },
      cargo: 'Auxiliar de Cozinha',
      vagas: 2,
      requisitos: [
        'Ensino médio completo',
        'Experiência básica com culinária',
        'Disponibilidade imediata',
        'Trabalho em equipe',
      ],
      cargaHoraria: '08:00 às 18:00 · Seg–Sáb',
      salario: 'R$ 1.600/mês + benefícios',
      beneficios: [
        { icon: 'lunch_dining',      label: 'Alimentação'     },
        { icon: 'directions_bus',    label: 'Vale-transporte'  },
        { icon: 'health_and_safety', label: 'Plano de saúde'  },
      ],
    },
    {
      id: 'vaga-1',
      empresa: 'Construtora Barreto',
      endereco: 'Av. Industrial, 890 - Distrito Industrial',
      mapsQuery: 'Av. Industrial, 890, Distrito Industrial',
      poster: { name: 'Roberto Nunes', ic: 75 },
      cargo: 'Pedreiro / Servente',
      vagas: 3,
      requisitos: [
        'Experiência comprovada em alvenaria',
        'Disponibilidade para horas extras',
        'Trabalho em altura (EPI fornecido)',
        'Comprometimento com prazo de obra',
        'CNH A ou B (diferencial)',
      ],
      cargaHoraria: '07:00 às 17:00 · Seg–Sáb',
      salario: 'R$ 2.100/mês',
      beneficios: [
        { icon: 'directions_bus',   label: 'Vale-transporte'   },
        { icon: 'restaurant',       label: 'Vale-refeição'     },
        { icon: 'receipt_long',     label: 'Carteira assinada' },
        { icon: 'medical_services', label: 'Seguro de vida'    },
      ],
    },
    {
      id: 'vaga-2',
      empresa: 'Salão Belle Arte',
      endereco: 'Rua das Flores, 57 - Jardim Europa',
      mapsQuery: 'Rua das Flores, 57, Jardim Europa',
      poster: { name: 'Fernanda Lima', ic: 88 },
      cargo: 'Auxiliar de Cabeleireiro',
      vagas: 1,
      requisitos: [
        'Curso técnico em cabeleireiro (em andamento ou concluído)',
        'Boa comunicação com clientes',
        'Organização e cuidado com o espaço',
      ],
      cargaHoraria: '09:00 às 15:00 · Ter–Dom',
      salario: 'R$ 1.300/mês + comissões',
      beneficios: [
        { icon: 'spa',            label: 'Treinamento incluído' },
        { icon: 'directions_bus', label: 'Vale-transporte'      },
      ],
    },
  ];

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

      const vagasLabel = vaga.vagas === 1 ? '1 vaga disponível' : `${vaga.vagas} vagas disponíveis`;

      const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(vaga.mapsQuery)}`;

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
                <span class="vaga-card__company-name">${vaga.empresa}</span>
                <a class="vaga-card__company-address" href="${mapsUrl}" target="_blank" rel="noopener" aria-label="Ver no Google Maps: ${vaga.endereco}">
                  <span class="material-symbols-rounded" aria-hidden="true">location_on</span>
                  ${vaga.endereco}
                </a>
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
              <div class="vaga-card__section">
                <p class="vaga-card__section-label">Benefícios</p>
                <div class="vaga-card__benefits">${benefitHTML}</div>
              </div>
              <div class="vaga-card__actions">
                <button type="button" class="vaga-card__btn-apply">
                  Me candidatar
                </button>
                <button type="button" class="vaga-card__btn-share" aria-label="Compartilhar vaga">
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

              <!-- 5. Currículo -->
              <div class="candid-section">
                <p class="candid-section-label">Currículo completo</p>
                <label class="candid-upload-btn" data-vaga="${vaga.id}">
                  <span class="material-symbols-rounded" aria-hidden="true">attach_file</span>
                  <span class="candid-upload-text">Adicionar currículo em foto ou PDF</span>
                  <input type="file" accept=".pdf,image/*" class="candid-upload-input" data-vaga="${vaga.id}" aria-label="Anexar currículo">
                </label>
              </div>

            </div><!-- /back-form -->
            <div class="vaga-card__back-footer">
              <button type="button" class="vaga-card__btn-back" aria-label="Voltar para a vaga">
                <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
              </button>
              <button type="button" class="vaga-card__btn-submit" data-vaga="${vaga.id}">
                Confirmar
              </button>
            </div>
          </div><!-- /back -->
        </div><!-- /flipper -->
        </div><!-- /3d -->
      `;

      // Atualiza altura do card quando um <details> abre/fecha
      card.querySelectorAll('.candid-req-obs').forEach(det => {
        det.addEventListener('toggle', () => vagaCardUpdateHeight(card));
      });

      list.appendChild(card);
    });
  };

  // ── Animações do card de vaga ───────────────────────────────────────────
  const VAGA_FLIP_MS   = 560;
  const VAGA_EXPAND_MS = 450;
  const VAGA_COLL_MS  = 370;

  function vagaCardFlipToBack(card) {
    const frontH = card.offsetHeight;
    card.dataset.frontH = frontH;

    // Trava altura sem transição, depois dispara o flip 3D
    card.style.transition = 'none';
    card.style.height = frontH + 'px';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.classList.add('vaga-card--flipped');

        // Após o flip completar, muda para layout em fluxo e expande
        setTimeout(() => {
          card.classList.add('vaga-card--expanded');
          const backH  = card.querySelector('.vaga-card__back').scrollHeight;
          const delta  = backH - frontH;
          const footer = card.querySelector('.vaga-card__back-footer');

          // Footer parte da base do card pequeno (espelho do colapso):
          // translateY(-delta) o posiciona em frontH - footerH, ou seja,
          // colado à borda inferior do card antes de expandir.
          if (footer) {
            footer.style.transition = 'none';
            footer.style.transform  = `translateY(-${delta}px)`;
          }

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              const timing = `${VAGA_EXPAND_MS}ms cubic-bezier(0.4,0,0.2,1)`;

              // Card cresce e footer retorna à posição natural em sincronia
              card.style.transition = `height ${timing}`;
              card.style.height     = backH + 'px';

              if (footer) {
                footer.style.transition = `transform ${timing}`;
                footer.style.transform  = '';
              }

              setTimeout(() => {
                card.style.height    = 'auto';
                card.style.transition = '';
                if (footer) footer.style.transition = '';
              }, VAGA_EXPAND_MS + 20);
            });
          });
        }, VAGA_FLIP_MS);
      });
    });
  }

  function vagaCardFlipToFront(card, onComplete) {
    const frontH   = parseInt(card.dataset.frontH || 200);
    const currentH = card.offsetHeight;
    const delta    = currentH - frontH;   // quanto o card vai encolher
    const footer   = card.querySelector('.vaga-card__back-footer');

    // Trava sem transição
    card.style.transition = 'none';
    card.style.height     = currentH + 'px';
    if (footer) footer.style.transition = 'none';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const timing = `${VAGA_COLL_MS}ms cubic-bezier(0.4,0,0.2,1)`;

        // Altura diminui pelo delta (topo fixo, borda inferior sobe).
        // Footer sobe pelo mesmo delta → fica sempre colado à borda do card,
        // cobrindo o conteúdo do formulário de baixo para cima.
        card.style.transition  = `height ${timing}`;
        card.style.height      = frontH + 'px';

        if (footer) {
          footer.style.transition = `transform ${timing}`;
          footer.style.transform  = `translateY(-${delta}px)`;
        }

        setTimeout(() => {
          // Zera o translateY antes do flip (a rotação 3D cobre o reset)
          if (footer) {
            footer.style.transition = 'none';
            footer.style.transform  = '';
          }
          card.classList.remove('vaga-card--expanded');
          card.style.transition = 'none';

          // Flip de volta para a frente
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              card.classList.remove('vaga-card--flipped');

              setTimeout(() => {
                card.style.height    = '';
                card.style.transition = '';
                if (onComplete) onComplete();
              }, VAGA_FLIP_MS + 30);
            });
          });
        }, VAGA_COLL_MS + 10);
      });
    });
  }

  function vagaCardUpdateHeight(card) {
    if (!card.classList.contains('vaga-card--expanded')) return;
    const backH = card.querySelector('.vaga-card__back').scrollHeight;

    card.style.transition = 'none';
    card.style.height = card.offsetHeight + 'px';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.transition = 'height 0.3s cubic-bezier(0.4,0,0.2,1)';
        card.style.height = backH + 'px';

        setTimeout(() => {
          card.style.height = 'auto';
          card.style.transition = '';
        }, 320);
      });
    });
  }

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
      customAlert('Compartilhar vaga — funcionalidade em breve.', 'Compartilhar', 'share');
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

  // Botões da action bar de vagas
  document.getElementById('btn-criar-vaga')?.addEventListener('click', () => {
    customAlert('Criar nova vaga — funcionalidade em breve.', 'Criar Vaga', 'post_add');
  });

  document.getElementById('btn-chamar-ajudante')?.addEventListener('click', () => {
    customAlert('Serviço de ajudantes — funcionalidade em breve.', 'Serviço de Ajudantes', 'handshake');
  });

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

  // Toggle de mostrar/ocultar o painel de filtros
  document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
    const panel = document.getElementById('panel-agenda-filters');
    const btn   = document.getElementById('btn-toggle-filters');
    const nowOpen = panel?.classList.toggle('agenda-filters__panel--open');
    btn?.setAttribute('aria-expanded', String(!!nowOpen));
    const icon = btn?.querySelector('.material-symbols-rounded');
    if (icon) icon.textContent = nowOpen ? 'expand_less' : 'tune';
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

  const TAB_DEFAULTS = {
    vagas:   { icon: 'work',          label: 'Vagas'         },
    home:    { icon: 'person_search', label: 'Profissionais' },
    pedidos: { icon: 'view_agenda',   label: 'Pedidos'       },
  };
  const SCROLL_TOP_STATE = { icon: 'arrow_upward', label: 'Voltar ao topo' };
  const SCROLL_THRESHOLD = 80; // px a partir do qual mostra "Voltar ao topo"

  // Ordem fixa dos painéis (esq → dir): define o translateX do slider
  const TAB_ORDER = ['vagas', 'home', 'pedidos'];

  const updateSlider = (tabName) => {
    const slider = document.querySelector('.feed-tabs-pill__slider');
    if (!slider) return;
    const idx = TAB_ORDER.indexOf(tabName);
    slider.style.transform = `translateX(${idx * 100}%)`;
  };

  const scrolledState = { vagas: false, home: false, pedidos: false };
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
  };

  const switchToTab = (tabName) => {
    if (tabName === activeTab) return;
    // Volta o botão da aba anterior ao padrão
    setTabButton(activeTab, false);
    activeTab = tabName;
    // Marca visualmente a nova aba ativa
    document.querySelectorAll('.feed-tabs-pill__tab').forEach(t => {
      t.classList.toggle('feed-tabs-pill__tab--active', t.dataset.tab === tabName);
    });
    // Restaura o estado de scroll da nova aba no botão
    setTabButton(tabName, scrolledState[tabName] ?? false);
    // Move o slider amarelo para a nova aba
    updateSlider(tabName);
    // Desliza o painel correto
    if (tabName === 'pedidos') showPedidosPanel();
    else if (tabName === 'vagas') showVagasPanel();
    else showProsPanel();
  };

  document.querySelectorAll('.feed-tabs-pill__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const clickedTab = tab.dataset.tab;
      if (clickedTab === activeTab) {
        // Toque na aba já ativa: rola ao topo se estiver scrollada
        if (scrolledState[clickedTab]) {
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

  agendaListEl?.addEventListener('scroll', () => {
    const scrolled = agendaListEl.scrollTop > SCROLL_THRESHOLD;
    if (scrolledState.home !== scrolled) {
      scrolledState.home = scrolled;
      if (activeTab === 'home') setTabButton('home', scrolled);
    }
  }, { passive: true });

  pedidosScrollEl?.addEventListener('scroll', () => {
    const scrolled = pedidosScrollEl.scrollTop > SCROLL_THRESHOLD;
    if (scrolledState.pedidos !== scrolled) {
      scrolledState.pedidos = scrolled;
      if (activeTab === 'pedidos') setTabButton('pedidos', scrolled);
    }
  }, { passive: true });

  vagasScrollEl?.addEventListener('scroll', () => {
    const scrolled = vagasScrollEl.scrollTop > SCROLL_THRESHOLD;
    if (scrolledState.vagas !== scrolled) {
      scrolledState.vagas = scrolled;
      if (activeTab === 'vagas') setTabButton('vagas', scrolled);
    }
  }, { passive: true });



  // =========================================================================
  // POPUP DE PEDIDOS - Botão "Fazer um pedido" / "Detalhes do meu pedido"
  // =========================================================================
  // Fixo no topo do popup de pedidos. Alterna o rótulo conforme o usuário já tem
  // um pedido aberto e exibe o contador de indicações recebidas (X/3), no padrão
  // do botão "Indicar alguém" dos cards. MOCK: o primeiro toque simula a criação
  // do pedido; o fluxo real de criação virá em outra tela.
  let hasPedido = false;
  let pedidoIndications = 0; // indicações recebidas no pedido (mock)

  const btnMyPedido      = document.getElementById('btn-my-pedido');
  const btnMyPedidoLabel = document.getElementById('btn-my-pedido-label');
  const btnMyPedidoIcon  = btnMyPedido?.querySelector('.pedido-action__icon');
  const myPedidoInfo     = document.getElementById('my-pedido-info');
  const myPedidoCount    = document.getElementById('my-pedido-count');

  const renderMyPedidoButton = () => {
    if (hasPedido) {
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Detalhes do meu pedido';
      if (btnMyPedidoIcon)  btnMyPedidoIcon.innerText  = 'receipt_long';
      if (myPedidoCount)    myPedidoCount.innerText    = `${pedidoIndications}/3`;
      myPedidoInfo?.classList.remove('u-hidden');
    } else {
      if (btnMyPedidoLabel) btnMyPedidoLabel.innerText = 'Fazer um pedido';
      if (btnMyPedidoIcon)  btnMyPedidoIcon.innerText  = 'add';
      myPedidoInfo?.classList.add('u-hidden');
    }
  };

  btnMyPedido?.addEventListener('click', async () => {
    if (!hasPedido) {
      // MOCK: simula a criação do pedido (a tela de criação virá depois)
      hasPedido = true;
      pedidoIndications = 2;
      renderMyPedidoButton();
    } else {
      await customAlert('Os detalhes do seu pedido aparecerão aqui.', 'Meu Pedido', 'receipt_long');
    }
  });

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
