// =========================================================================
// TEMPLATES de HTML do feed — funções puras de string (sem estado mutável).
// =========================================================================
import { icTier, formatPedidoDate, pedidoHoursLeft } from './utils.js';
import { availabilityMeta } from './config.js';
import { getComments } from './repository.js';
import { PEDIDO_STATUS, URGENCY } from '../core/domain.js';

// Índice de Confiança = MOLDURA-ESCUDO (só contorno, SVG) com o número DENTRO —
// versão reduzida do "70" do card de IC do cadastro. Colorido por tier (stroke
// currentColor + número herdam a cor do container .ic-bar--<tier>). O mesmo
// formato de escudo usado no app. Fonte única do SVG:
// Só o path do escudo; sem stroke/fill no markup — preenchimento sólido (tom
// claro do tier) e sombra forte de contorno vêm do CSS (.ic-bar__frame[ path]),
// fonte única que aplica igual aos escudos hardcoded da lista de pedidos.
export const IC_SHIELD_SVG = `<svg class="ic-bar__frame" viewBox="0 0 24 26" aria-hidden="true"><path d="M12 1.6 L21.4 5.4 V12 C21.4 18.1 17.3 23.3 12 24.7 C6.7 23.3 2.6 18.1 2.6 12 V5.4 Z"/></svg>`;

// `size` opcional escala o badge ao contexto (compartilha a linha com outros
// elementos): 'sm' (compacto: comentários, divulgador de vaga, ajudante),
// 'lg' (destaque: cabeçalho do card de profissional). Sem size = padrão (cards
// com avatar grande: lista de pedidos, popup de indicados).
export const icBarHTML = (ic, size) => {
  const tier = icTier(ic);
  const sizeCls = size ? ` ic-bar--${size}` : '';
  return `<span class="ic-bar ic-bar--${tier}${sizeCls}" role="img" aria-label="Índice de confiança ${ic}">${IC_SHIELD_SVG}<span class="ic-bar__value">${ic}</span></span>`;
};

export const qavHTML = (q, a, v) => `
  <div class="qav">
    <div class="qav__item qav__item--quality"><span class="qav__label">Qualidade</span><div class="qav__bar"><div class="qav__fill" style="width:${q * 10}%"></div></div></div>
    <div class="qav__item qav__item--agility"><span class="qav__label">Agilidade</span><div class="qav__bar"><div class="qav__fill" style="width:${a * 10}%"></div></div></div>
    <div class="qav__item qav__item--value"><span class="qav__label">Valor</span><div class="qav__bar"><div class="qav__fill" style="width:${v * 10}%"></div></div></div>
  </div>`;

/** @param {import('../core/models.js').Availability} state */
export const availHTML = (state) => {
  const m = availabilityMeta[state] || availabilityMeta.available;
  return `<span class="avail avail--${m.cls}"><span class="avail__dot" aria-hidden="true"></span>${m.label}</span>`;
};

/** @param {import('../core/models.js').Comment} c */
export const buildCommentHTML = (c) => {
  const MAX = 150;
  const text = c.text.length > MAX ? c.text.slice(0, MAX).trimEnd() + '...' : c.text;
  // IC + autor SEMPRE numa linha nova, DEPOIS do comentário, alinhados à
  // ESQUERDA. IC antes do nome; badge compacto ('sm') casa com o nome do autor.
  return `<div class="comment"><p class="comment__text">"${text}"</p><div class="comment__byline">${icBarHTML(c.ic, 'sm')}<span class="comment__author">${c.author}</span></div></div>`;
};

export const proBackHTML = () => {
  // TODOS os comentários de uma vez: a área rola INTERNAMENTE (altura fixa do card
  // expandido) com o sistema de sombras de borda (.js-scroll-shadows) — sem o antigo
  // "ver mais" que crescia o card. `watchScrollShadows` injeta as shades por card.
  // SEM memoização: relê getComments() a cada chamada — quando o accessor virar
  // consulta async/por-profissional (Firestore), um cache serviria o 1º resultado
  // para sempre. Hoje os comentários são o mesmo mock p/ todos; custo desprezível.
  const commentsHTML = getComments().map(buildCommentHTML).join('');
  return `
    <div class="pro-card__back">
      <div class="pro-card__comments-header">
        <span class="pro-card__comments-title">
          <svg class="icon" aria-hidden="true"><use href="#ic-chat_bubble"></use></svg>
          Comentários
        </span>
        <div class="pro-card__comments-sort" role="group" aria-label="Ordenar comentários">
          <button type="button" class="pro-card__sort-btn is-active" data-sort="recent" aria-pressed="true" aria-label="Ordenar por mais recentes">
            <svg class="icon" aria-hidden="true"><use href="#ic-schedule"></use></svg>
          </button>
          <button type="button" class="pro-card__sort-btn" data-sort="ic" aria-pressed="false" aria-label="Ordenar por índice de confiança">
            <svg class="icon" aria-hidden="true"><use href="#ic-verified_user"></use></svg>
          </button>
        </div>
      </div>
      <div class="pro-card__back-comments js-scroll-shadows">
        <div class="pro-card__comments-list">${commentsHTML}</div>
      </div>
      <div class="pro-card__back-actions">
        <button type="button" class="btn btn--icon pro-card__back-btn pro-card__back-btn--back" aria-label="Voltar">
          <svg class="icon" aria-hidden="true"><use href="#ic-arrow_back"></use></svg>
        </button>
        <button type="button" class="btn pro-card__back-btn pro-card__back-btn--whatsapp">
          <svg class="icon" aria-hidden="true"><use href="#ic-chat"></use></svg>Conversar no WhatsApp
        </button>
        <button type="button" class="btn btn--icon pro-card__back-btn pro-card__back-btn--share" aria-label="Compartilhar">
          <svg class="icon" aria-hidden="true"><use href="#ic-share"></use></svg>
        </button>
        <button type="button" class="btn pro-card__back-btn pro-card__back-btn--cancel-indicate">Cancelar</button>
        <button type="button" class="btn pro-card__back-btn pro-card__back-btn--confirm-indicate">
          <svg class="icon" aria-hidden="true"><use href="#ic-person_add"></use></svg>Indicar
        </button>
      </div>
    </div>
  `;
};

/** @param {import('../core/models.js').Professional} pro */
export const proFooterHTML = (pro) => {
  const hasCash = !!pro.pay?.cash;
  const hasPix  = !!pro.pay?.pix;
  const hasCard = pro.pay?.card === 'debit' || pro.pay?.card > 0;
  const hasNF   = pro.nf === true;
  const cardLabel = pro.pay?.card === 'debit' ? 'Débito'
    : pro.pay?.card === 1 ? 'À vista'
    : hasCard ? `até ${pro.pay.card}x`
    : 'Cartão';
  const cls = active => `pro-card__meta-item${active ? '' : ' pro-card__meta-item--inactive'}`;
  const item = (active, icon, label) =>
    `<span class="${cls(active)}"><svg class="icon" aria-hidden="true"><use href="#ic-${icon}-o"></use></svg><span class="pro-card__meta-item__label">${label}</span></span>`;
  return `<div class="pro-card__meta">
    ${item(hasCash, 'attach_money', 'Dinheiro')}
    ${item(hasPix, 'qr_code_2', 'Pix')}
    ${item(hasCard, 'credit_card', cardLabel)}
    ${item(hasNF, 'receipt_long', 'NF')}
  </div>`;
};

/** @param {import('../core/models.js').Pedido} p */
export function historicoItemHTML(p) {
  const active = p.status === PEDIDO_STATUS.ACTIVE;
  const statusCls = active ? 'historico-item__status--active' : 'historico-item__status--done';
  const statusInner = active
    ? `<svg class="icon" aria-hidden="true"><use href="#ic-bolt"></use></svg>Ativo · ${pedidoHoursLeft(p) > 0 ? pedidoHoursLeft(p) + 'h' : 'Expirado'}`
    : `<svg class="icon" aria-hidden="true"><use href="#ic-check_circle"></use></svg>Concluído`;
  const urgentBadge = p.urgency === URGENCY.URGENT
    ? `<span class="pedido-item__urgent-badge" aria-label="Urgente"><svg class="icon" aria-hidden="true"><use href="#ic-bolt"></use></svg>Urgente</span>`
    : '';
  return `
    <article class="historico-item" data-pedido-id="${p.id}" role="button" tabindex="0">
      <div class="historico-item__top">
        <span class="historico-item__date">${formatPedidoDate(p.createdAt)}</span>
        <button type="button" class="historico-item__delete" data-delete-id="${p.id}" aria-label="Excluir pedido">
          <svg class="icon" aria-hidden="true"><use href="#ic-delete"></use></svg>
        </button>
      </div>
      <p class="historico-item__text">${urgentBadge}${p.text}</p>
      <div class="historico-item__footer">
        <span class="historico-item__status ${statusCls}">${statusInner}</span>
        <span class="historico-item__count">
          <svg class="icon" aria-hidden="true"><use href="#ic-groups"></use></svg>${p.indicated.length}/3 indicações
        </span>
      </div>
    </article>`;
}
