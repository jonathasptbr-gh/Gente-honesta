// =========================================================================
// UTILS do feed — funções PURAS (dependem só de argumentos + globais).
// =========================================================================

// Faixa do IC e escudo (fonte única dos limiares 75/50/25).
export function icTier(ic) { return ic >= 75 ? 'ok' : ic >= 50 ? 'warn' : ic >= 25 ? 'alert' : 'bad'; }
export function icShieldIcon(ic) { return ic >= 75 ? 'gpp_good' : ic >= 50 ? 'shield_question' : ic >= 25 ? 'gpp_maybe' : 'gpp_bad'; }

// Stub de "funcionalidade em breve" (WhatsApp/Compartilhar).
export const comingSoon = (label, title, icon) =>
  customAlert(`${label} — funcionalidade em breve.`, title, icon);

// Data curta legível: "12 jul, 14:30".
export const formatPedidoDate = (ts) => new Date(ts).toLocaleString('pt-BR', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
}).replace('.', '');

// Horas restantes de um pedido ativo (0 = expirado).
export const pedidoHoursLeft = (pedido) => {
  const totalMs = parseInt(pedido.duration, 10) * 3600 * 1000;
  const remainingMs = Math.max(0, totalMs - (Date.now() - pedido.createdAt));
  return Math.ceil(remainingMs / (3600 * 1000));
};
