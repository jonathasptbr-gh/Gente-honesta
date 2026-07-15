// =========================================================================
// CONFIG / CONSTANTES do feed (valores congelados, sem dependência de estado).
// Importado por feed.js. Extraído do closure para uma fonte única.
// =========================================================================

export const SEARCH_PLACEHOLDER_PROS      = 'Buscar no Gente Honesta...';
export const SEARCH_PLACEHOLDER_CONTRACTS = 'Buscar contratos...';

// Curva de easing padrão (= token CSS --ease) usada nas transições montadas
// em JS — fonte única para não desincronizar da curva do CSS.
export const EASE_STD = 'cubic-bezier(0.4, 0, 0.2, 1)';

export const availOrder = { available: 0, full: 1, unavailable: 2 };

// Disponibilidade do profissional: ponto colorido + rótulo (mesma filosofia de cor da ic-bar).
// Estados: 'available' (verde), 'full' (amarelo), 'unavailable' (vermelho).
export const availabilityMeta = {
  available:   { cls: 'available',   label: 'Disponível'   },
  full:        { cls: 'full',        label: 'Agenda cheia' },
  unavailable: { cls: 'unavailable', label: 'Indisponível' },
};

export const COMMENTS_PAGE = 5;

// ── Motor genérico de animação flip+expansão ─────────────────────────────
export const VAGA_CARD_CFG = {
  flipMs: 560, expandMs: 450, collMs: 370,
  flippedClass: 'vaga-card--flipped', expandedClass: 'vaga-card--expanded',
  backSel:   '.vaga-card__back',
  footerSel: '.vaga-card__back-footer',
};
export const PRO_CARD_CFG = {
  flipMs: 500, expandMs: 380, collMs: 300,
  flippedClass: 'pro-card--flipped', expandedClass: 'pro-card--expanded',
  backSel:   '.pro-card__back',
  footerSel: '.pro-card__back-actions',
};
// Atraso para rolar o card à vista DEPOIS do flip + expansão terminarem
// (+ buffer). Derivado do cfg para não desincronizar se a animação mudar.
export const PRO_FLIP_SETTLE_MS = PRO_CARD_CFG.flipMs + PRO_CARD_CFG.expandMs + 50; // 930

// Criar vaga:
export const MAX_VAGAS = 20;
export const DAY_ORDER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Serviço de ajudantes:
// Diárias padrão (em reais), iguais para todo usuário; pesado > leve.
export const HELPER_RATES = { light: 100, heavy: 180 };

// Chaves de persistência local (cooldown removido — sem bloqueio de tempo).
export const LS_HELPER_AVAIL    = 'gh_helper_availability'; // { light, heavy }
export const LS_HELPER_DRAW     = 'gh_helper_draw';         // { date, type, helpers[] }

export const TAB_DEFAULTS = {
  vagas:   { icon: 'work',          label: 'Vagas'         },
  home:    { icon: 'person_search', label: 'Profissionais' },
  pedidos: { icon: 'view_agenda',   label: 'Pedidos'       },
};
export const SCROLL_TOP_STATE = { icon: 'arrow_upward', label: 'Voltar ao topo' };
export const SCROLL_THRESHOLD = 80; // px a partir do qual mostra "Voltar ao topo"

// Ordem fixa dos painéis (esq → dir): define o translateX do slider
export const TAB_ORDER = ['vagas', 'home', 'pedidos'];
