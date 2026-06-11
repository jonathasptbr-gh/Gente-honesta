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

  const sheetAgenda      = document.getElementById('sheet-agenda');
  const backdropAgenda   = document.getElementById('overlay-agenda-backdrop');
  const btnCloseAgenda   = document.getElementById('btn-close-agenda');
  const btnOpenPedidos   = document.getElementById('btn-open-agenda'); // botão "Pedidos" da barra inferior
  const agendaTitle      = document.getElementById('agenda-sheet-title');
  const indicatedBlock   = document.getElementById('agenda-indicated-block');
  const confirmBlock     = document.getElementById('agenda-indicate-confirm');

  // TELA - PRINCIPAL (FEED) - SHEET DE PEDIDOS (antiga sheet de contatos)
  // TROCA: os contatos viraram a tela principal e os PEDIDOS passaram para este popup.
  // Abrir/fechar é simples — os cards de pedido são estáticos dentro da sheet.
  const openPedidosSheet = () => {
    exitIndicateMode();            // abre sempre limpo (sai de um modo indicação pendente)
    agendaTitle.innerText = 'Pedidos de indicação';
    backdropAgenda?.classList.remove('u-hidden');
    sheetAgenda?.classList.remove('u-hidden');
    sheetAgenda?.offsetHeight; // leitura deliberada para acionar reflow (anima a entrada)
    sheetAgenda?.classList.add('agenda-sheet--open');
  };

  const closePedidosSheet = () => {
    sheetAgenda?.classList.remove('agenda-sheet--open');
    setTimeout(() => {
      sheetAgenda?.classList.add('u-hidden');
      backdropAgenda?.classList.add('u-hidden');
    }, 350);
  };

  btnOpenPedidos?.addEventListener('click', openPedidosSheet);
  btnCloseAgenda?.addEventListener('click', closePedidosSheet);
  backdropAgenda?.addEventListener('click', () => {
    // No modo indicação o backdrop não está ativo; só fecha o popup de pedidos.
    closePedidosSheet();
  });

  // TELA - PRINCIPAL (FEED) - MODO INDICAÇÃO (roda na tela principal de contatos)
  // Ao tocar "Indicar alguém" num pedido (dentro do popup), fechamos o popup e
  // ligamos o modo: a top-bar verde da home é SUBSTITUÍDA por uma top-bar AZUL
  // "Profissionais já indicados:" (com o X para cancelar) e a cor da barra de
  // status do sistema passa a azul. Ao escolher um profissional na lista, o bloco
  // de confirmação aparece fixo na base.
  const FEED_THEME_COLOR     = '#1e3d2c'; // = var(--p-green)
  const INDICATE_THEME_COLOR = '#c8a23a'; // = var(--a-gold)
  const feedTopBar    = document.querySelector('#feed-top-bar');
  const feedBottomBar = document.querySelector('#feed-bottom-bar');
  const themeMeta     = document.querySelector('meta[name="theme-color"]');
  const btnToggleIndicated = document.getElementById('btn-toggle-indicated');
  const indicatedList      = document.getElementById('agenda-indicated-list');

  // Expande/colapsa a lista de "já indicados" dentro da top-bar provisória.
  const setIndicatedExpanded = (expanded) => {
    indicatedList?.classList.toggle('u-hidden', !expanded);
    btnToggleIndicated?.setAttribute('aria-expanded', String(expanded));
    const chevron = btnToggleIndicated?.querySelector('.agenda-indicated__chevron');
    if (chevron) chevron.innerText = expanded ? 'expand_less' : 'expand_more';
    const label = btnToggleIndicated?.querySelector('.agenda-indicated__label');
    if (label) label.innerText = expanded
      ? 'Ocultar profissionais já indicados'
      : 'Ver profissionais já indicados';
  };

  btnToggleIndicated?.addEventListener('click', () => {
    const expanded = btnToggleIndicated.getAttribute('aria-expanded') === 'true';
    setIndicatedExpanded(!expanded);
  });

  let indicateMode = false;
  let activePostId = null;
  let selectedProId = null;

  const enterIndicateMode = (postId) => {
    indicateMode = true;
    activePostId = postId;

    // Injeta o card do pedido (sem os botões) como referência no topo azul
    const refContainer = document.getElementById('indicate-post-ref');
    const sourceCard   = document.getElementById(`post-card-${postId}`);
    if (refContainer && sourceCard) {
      const cloned = sourceCard.cloneNode(true);
      cloned.removeAttribute('id'); // evita id duplicado
      cloned.querySelectorAll('.post-card__footer').forEach(el => el.remove());
      refContainer.innerHTML = '';
      refContainer.appendChild(cloned);
    }

    renderIndicatedBlock(postId);
    setIndicatedExpanded(false);                   // inicia colapsada a cada indicação
    feedTopBar?.classList.add('u-hidden');         // esconde a top-bar verde
    feedBottomBar?.classList.add('u-hidden');      // esconde a barra de abas inferior
    indicatedBlock?.classList.remove('u-hidden');  // mostra a top-bar azul provisória
    themeMeta?.setAttribute('content', INDICATE_THEME_COLOR);
    confirmBlock?.classList.add('u-hidden'); // só aparece após escolher um profissional
  };

  const exitIndicateMode = () => {
    indicateMode = false;
    activePostId = null;
    selectedProId = null;
    confirmBlock?.classList.add('u-hidden');
    indicatedBlock?.classList.add('u-hidden');     // esconde a top-bar azul
    feedTopBar?.classList.remove('u-hidden');       // restaura a top-bar verde
    feedBottomBar?.classList.remove('u-hidden');    // restaura a barra de abas inferior
    themeMeta?.setAttribute('content', FEED_THEME_COLOR);
    document.getElementById('indicate-post-ref').innerHTML = ''; // limpa referência
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
    return `<div class="comment"><p class="comment__text">"${text}"</p><p class="comment__meta"><span class="comment__author">${c.author}</span> <span class="comment__ic ic-bar--${tier}"><span class="material-symbols-rounded" aria-hidden="true">${shield}</span>${c.ic}%</span></p></div>`;
  };

  const proBackHTML = () => {
    const commentsHTML = mockComments.map(buildCommentHTML).join('');
    return `
      <div class="pro-card__back">
        <div class="pro-card__back-comments">
          <div class="pro-card__comments-list">${commentsHTML}</div>
        </div>
        <div class="pro-card__back-actions">
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

  // Rodapé do card normal: formas de pagamento e NF em células de igual largura.
  const proFooterHTML = (pro) => {
    const items = [];
    if (pro.pay?.cash) items.push(`<span class="pro-card__meta-item"><span class="material-symbols-rounded">attach_money</span>Dinheiro</span>`);
    if (pro.pay?.pix)  items.push(`<span class="pro-card__meta-item"><span class="material-symbols-rounded">qr_code_2</span>Pix</span>`);
    if (pro.pay?.card === 'debit') items.push(`<span class="pro-card__meta-item"><span class="material-symbols-rounded">credit_card</span>Débito</span>`);
    else if (pro.pay?.card > 0)   items.push(`<span class="pro-card__meta-item"><span class="material-symbols-rounded">credit_card</span>${pro.pay.card}x</span>`);
    if (typeof pro.nf === 'boolean') {
      items.push(pro.nf
        ? `<span class="pro-card__meta-item"><span class="material-symbols-rounded">receipt_long</span>NF</span>`
        : `<span class="pro-card__meta-item"><span class="icon-crossed material-symbols-rounded">receipt_long</span>Sem NF</span>`);
    }
    return items.length ? `<div class="pro-card__meta">${items.join('')}</div>` : '';
  };

  // Card padrão de profissional: coluna esquerda (foto + QAV) e coluna direita
  // (nome/profissão/disponibilidade + ações do cabeçalho + bio).
  // showPin=false omite o botão de fixar (ex: cards de referência na confirmação).
  const proCardHTML = (pro, showPin = true) => {
    const isPinned = pinnedPros.has(pro.id);
    const pinBtn = showPin
      ? `<button type="button" class="pro-card__pin-btn${isPinned ? ' pro-card__pin-btn--pinned' : ''}" aria-label="${isPinned ? 'Remover dos salvos' : 'Salvar contato'}" data-pin-id="${pro.id}">
           Salvar<span class="material-symbols-rounded" aria-hidden="true">bookmark</span>
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
            ${pinBtn}
            ${icBarHTML(pro.ic)}
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
      list.innerHTML = '<span style="font-size:0.82rem;color:rgba(255,255,255,0.75);grid-column:1/-1">Nenhuma indicação ainda.</span>';
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
    const btn = e.target.closest('.post-card__indicate-btn');
    if (!btn) return;
    // Os pedidos agora vivem no popup; indicar fecha o popup e ativa o modo
    // indicação na lista de profissionais da home.
    closePedidosSheet();
    enterIndicateMode(btn.dataset.postId);
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - AGENDA SHEET - Seleção de Profissional
  // =========================================================================

  // TELA - PRINCIPAL (FEED) - LISTA DE CONTATOS - Seleção de profissional (só no modo indicação)
  document.getElementById('agenda-list')?.addEventListener('click', (e) => {
    // Botão Salvar (fixar no topo)
    if (e.target.closest('.pro-card__pin-btn')) {
      const btn = e.target.closest('.pro-card__pin-btn');
      const proId = btn.dataset.pinId;
      if (pinnedPros.has(proId)) pinnedPros.delete(proId);
      else pinnedPros.add(proId);
      renderAgendaList();
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
  // Fixados aparecem primeiro; dentro de cada grupo, a ordem original é preservada.
  const renderAgendaList = () => {
    const list = document.getElementById('agenda-list');
    if (!list) return;

    const query = document.getElementById('inp-agenda-search')?.value.trim().toLowerCase() || '';
    const filtered = mockProfessionals.filter(p =>
      p.name.toLowerCase().includes(query) || p.tags.toLowerCase().includes(query)
    );
    const sorted = [...filtered].sort((a, b) =>
      (pinnedPros.has(b.id) ? 1 : 0) - (pinnedPros.has(a.id) ? 1 : 0)
    );

    list.innerHTML = '';

    if (sorted.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:var(--t-sub);padding:var(--space-xl) 0;font-size:0.9rem">Nenhum profissional encontrado.</p>';
      return;
    }

    sorted.forEach(pro => {
      const card = document.createElement('div');
      card.className = 'pro-card';
      card.id = pro.id;
      card.innerHTML = `<div class="pro-card__flipper"><div class="pro-card__front">${proCardHTML(pro)}</div>${proBackHTML()}</div>`;
      list.appendChild(card);
    });
  };

  document.getElementById('inp-agenda-search')?.addEventListener('input', renderAgendaList);
  renderAgendaList();


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - FILTROS DA BUSCA - Painel colapsável + chips
  // =========================================================================

  // Toggle de mostrar/ocultar o painel de filtros (botão "tune")
  document.getElementById('btn-toggle-filters')?.addEventListener('click', () => {
    const panel = document.getElementById('panel-agenda-filters');
    const btn   = document.getElementById('btn-toggle-filters');
    const open  = panel?.classList.toggle('u-hidden') === false; // remove = false → hidden; add = true → visible
    // toggle retorna true se a classe FOI adicionada (painel ficou oculto)
    const nowVisible = !panel?.classList.contains('u-hidden');
    btn?.setAttribute('aria-expanded', String(nowVisible));
    if (btn) btn.style.background = nowVisible ? 'var(--info-blue)' : '';
    if (btn) btn.style.color      = nowVisible ? 'var(--t-light)'   : '';
    if (btn) btn.style.borderColor= nowVisible ? 'var(--info-blue)' : '';
  });

  // Chips de filtro: toque seleciona dentro do grupo (mesmo chip-group)
  document.getElementById('panel-agenda-filters')?.addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    const group = chip.closest('.agenda-filters__group');
    group?.querySelectorAll('.chip').forEach(c => c.classList.remove('chip--active'));
    chip.classList.add('chip--active');
  });


  // =========================================================================
  // TELA - PRINCIPAL (FEED) - FEED TABS PÍLULA - Navegação por seção
  // =========================================================================

  document.querySelectorAll('.feed-tabs-pill__tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.feed-tabs-pill__tab').forEach(t => t.classList.remove('feed-tabs-pill__tab--active'));
      tab.classList.add('feed-tabs-pill__tab--active');
      // Futura integração: carregar conteúdo conforme tab ativa
    });
  });


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
