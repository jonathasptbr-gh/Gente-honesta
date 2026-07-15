// =========================================================================
// TEMPLATES de HTML do feed — funções puras de string (sem estado mutável).
// =========================================================================
import { icTier, icShieldIcon, formatPedidoDate, pedidoHoursLeft } from './feed-utils.js';
import { availabilityMeta, COMMENTS_PAGE } from './feed-config.js';
import { getComments } from './feed-data.js';
import { PEDIDO_STATUS, URGENCY } from './domain.js';

export const icBarHTML = (ic, vertical = false) => {
  const tier = icTier(ic);
  const shield = icShieldIcon(ic);
  return `<div class="ic-bar ic-bar--${tier}${vertical ? ' ic-bar--vertical' : ''}"><span class="material-symbols-rounded ic-bar__shield" aria-hidden="true">${shield}</span><span class="ic-bar__value">${ic}%</span><span class="ic-bar__label">Confiável</span></div>`;
};

export const qavHTML = (q, a, v) => `
  <div class="qav">
    <div class="qav__item qav__item--quality"><span class="qav__label">Qualidade</span><div class="qav__bar"><div class="qav__fill" style="width:${q * 10}%"></div></div></div>
    <div class="qav__item qav__item--agility"><span class="qav__label">Agilidade</span><div class="qav__bar"><div class="qav__fill" style="width:${a * 10}%"></div></div></div>
    <div class="qav__item qav__item--value"><span class="qav__label">Valor</span><div class="qav__bar"><div class="qav__fill" style="width:${v * 10}%"></div></div></div>
  </div>`;

/** @param {import('./models.js').Availability} state */
export const availHTML = (state) => {
  const m = availabilityMeta[state] || availabilityMeta.available;
  return `<span class="avail avail--${m.cls}"><span class="avail__dot" aria-hidden="true"></span>${m.label}</span>`;
};

/** @param {import('./models.js').Comment} c */
export const buildCommentHTML = (c) => {
  const MAX = 150;
  const tier = icTier(c.ic);
  const shield = icShieldIcon(c.ic);
  const text = c.text.length > MAX ? c.text.slice(0, MAX).trimEnd() + '...' : c.text;
  return `<div class="comment"><p class="comment__text">"${text}" <span class="comment__author">${c.author}</span> <span class="comment__ic ic-bar--${tier}"><span class="material-symbols-rounded" aria-hidden="true">${shield}</span>${c.ic}%</span></p></div>`;
};

let _proBackHTML = null;
export const proBackHTML = () => {
  if (_proBackHTML) return _proBackHTML;
  const initial = getComments().slice(0, COMMENTS_PAGE);
  const commentsHTML = initial.map(buildCommentHTML).join('');
  const hasMore = getComments().length > COMMENTS_PAGE;
  const loadMoreBtn = hasMore
    ? `<button type="button" class="pro-card__load-more" data-offset="${COMMENTS_PAGE}"><span class="material-symbols-rounded" aria-hidden="true">expand_more</span>ver mais comentários</button>`
    : '';
  _proBackHTML = `
    <div class="pro-card__back">
      <div class="pro-card__comments-header">
        <span class="material-symbols-rounded" aria-hidden="true">chat_bubble</span>
        Comentários
      </div>
      <div class="pro-card__back-comments">
        <div class="pro-card__comments-list">${commentsHTML}</div>
        ${loadMoreBtn}
      </div>
      <div class="pro-card__back-actions">
        <button type="button" class="btn btn--icon pro-card__back-btn pro-card__back-btn--back" aria-label="Voltar">
          <span class="material-symbols-rounded" aria-hidden="true">arrow_back</span>
        </button>
        <button type="button" class="btn pro-card__back-btn pro-card__back-btn--whatsapp">
          <span class="material-symbols-rounded" aria-hidden="true">chat</span>Conversar no WhatsApp
        </button>
        <button type="button" class="btn btn--icon pro-card__back-btn pro-card__back-btn--share" aria-label="Compartilhar">
          <span class="material-symbols-rounded" aria-hidden="true">share</span>
        </button>
        <button type="button" class="btn pro-card__back-btn pro-card__back-btn--cancel-indicate">Cancelar</button>
        <button type="button" class="btn pro-card__back-btn pro-card__back-btn--confirm-indicate">
          <span class="material-symbols-rounded" aria-hidden="true">person_add</span>Indicar
        </button>
      </div>
    </div>
  `;
  return _proBackHTML;
};

/** @param {import('./models.js').Professional} pro */
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
    `<span class="${cls(active)}"><span class="material-symbols-rounded">${icon}</span><span class="pro-card__meta-item__label">${label}</span></span>`;
  return `<div class="pro-card__meta">
    ${item(hasCash, 'attach_money', 'Dinheiro')}
    ${item(hasPix, 'qr_code_2', 'Pix')}
    ${item(hasCard, 'credit_card', cardLabel)}
    ${item(hasNF, 'receipt_long', 'NF')}
  </div>`;
};

/** @param {import('./models.js').Pedido} p */
export function historicoItemHTML(p) {
  const active = p.status === PEDIDO_STATUS.ACTIVE;
  const statusCls = active ? 'historico-item__status--active' : 'historico-item__status--done';
  const statusInner = active
    ? `<span class="material-symbols-rounded" aria-hidden="true">bolt</span>Ativo · ${pedidoHoursLeft(p) > 0 ? pedidoHoursLeft(p) + 'h' : 'Expirado'}`
    : `<span class="material-symbols-rounded" aria-hidden="true">check_circle</span>Concluído`;
  const urgentBadge = p.urgency === URGENCY.URGENT
    ? `<span class="pedido-item__urgent-badge" aria-label="Urgente"><span class="material-symbols-rounded" aria-hidden="true">bolt</span>Urgente</span>`
    : '';
  return `
    <article class="historico-item" data-pedido-id="${p.id}" role="button" tabindex="0">
      <div class="historico-item__top">
        <span class="historico-item__date">${formatPedidoDate(p.createdAt)}</span>
        <button type="button" class="historico-item__delete" data-delete-id="${p.id}" aria-label="Excluir pedido">
          <span class="material-symbols-rounded" aria-hidden="true">delete</span>
        </button>
      </div>
      <p class="historico-item__text">${urgentBadge}${p.text}</p>
      <div class="historico-item__footer">
        <span class="historico-item__status ${statusCls}">${statusInner}</span>
        <span class="historico-item__count">
          <span class="material-symbols-rounded" aria-hidden="true">groups</span>${p.indicated.length}/3 indicações
        </span>
      </div>
    </article>`;
}
