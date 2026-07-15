// =========================================================================
// ENUMS DE DOMÍNIO — valores congelados (Object.freeze).
//
// Fonte única dos VALORES de domínio (as FORMAS estão em models.js). Na lógica
// JS, comparar/atribuir sempre pelo enum (`status === PEDIDO_STATUS.ACTIVE`),
// nunca por string crua. Os `data-*` no HTML são a exceção (não alcançam o JS),
// mas DEVEM casar exatamente com estes valores.
// =========================================================================

/** Status de um pedido (Pedido.status). */
export const PEDIDO_STATUS = Object.freeze({ ACTIVE: 'active', COMPLETED: 'completed' });

/** Modo do topo enquanto um DETALHE de pedido está aberto (pedidoDetailMode). */
export const PEDIDO_DETAIL_MODE = Object.freeze({ ACTIVE: 'active', OLD: 'old' });

/** Urgência de um pedido. */
export const URGENCY = Object.freeze({ NORMAL: 'normal', URGENT: 'urgent' });

/** Tempo online do pedido, em horas (STRING — Pedido.duration). */
export const DURATION = Object.freeze({ H12: '12', H24: '24', H36: '36', H48: '48' });

/** Faixa do Índice de Confiança (ICTier). Limiares 75/50/25 em feed/utils icTier(). */
export const IC_TIER = Object.freeze({ OK: 'ok', WARN: 'warn', ALERT: 'alert', BAD: 'bad' });

/** Disponibilidade do profissional (Professional.avail). */
export const AVAILABILITY = Object.freeze({ AVAILABLE: 'available', FULL: 'full', UNAVAILABLE: 'unavailable' });

/** Tipo de ajudante (Helper.type). */
export const HELPER_TYPE = Object.freeze({ LIGHT: 'light', HEAVY: 'heavy' });

/** Abas do feed (data-tab). */
export const TAB = Object.freeze({ HOME: 'home', VAGAS: 'vagas', PEDIDOS: 'pedidos' });

/** Chave de ordenação (filterState.sort). */
export const SORT = Object.freeze({ NAME: 'name', IC: 'ic', AVAIL: 'avail', QUALITY: 'quality', AGILITY: 'agility', VALUE: 'value' });

/** Métodos de pagamento (filterState.includePay / appState.paymentMethods). */
export const PAY_METHOD = Object.freeze({ CASH: 'cash', PIX: 'pix', CARD: 'card', NF: 'nf' });
