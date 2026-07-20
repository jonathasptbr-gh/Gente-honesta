// =========================================================================
// ESTADO MUTÁVEL do feed — fonte única dos objetos de estado (session-only).
// Importado por feed.js. São objetos MUTADOS (nunca reatribuídos), então o
// binding de import compartilha a mesma instância. Primitivos reatribuídos
// (activeTab, indicateMode, etc.) seguem no closure de feed.js por enquanto.
// =========================================================================

import { SORT, URGENCY, DURATION, CONTRACT_STATUS } from '../core/domain.js';

// --- Profissionais / filtros ---
// IDs dos cards fixados no topo da lista (persistência em memória por sessão)
export const pinnedPros = new Set();

// Filtros inclusivos: sets vazios = sem filtro = mostra todos.
// Clicar num chip adiciona ao set (whitelist); clicar de novo remove.
export const filterState = {
  includeIc:    new Set(),
  includeAvail: new Set(),
  includePay:   new Set(),
  savedOnly:    false,
  sort:         SORT.IC,   // padrão: ordenar por Índice de Confiança (maior→menor)
};

// --- Navegação (scroll das abas) ---
export const scrolledState = { vagas: false, home: false, pedidos: false };
// Enquanto a rolagem PROGRAMÁTICA "Voltar ao topo" acontece, os eventos de
// scroll ainda veem scrollTop > threshold e repunham o ícone de seta — o
// botão piscava (seta → padrão → seta → padrão) até chegar ao topo. Esta flag
// (por aba) faz o handler de scroll IGNORAR o botão durante a subida.
export const scrollToTopPending = { vagas: false, home: false, pedidos: false };

// --- Pedidos ---
export const pedidoHistory = []; // {id, text, urgency, duration, neighbors, createdAt, completedAt, status:'active'|'completed', indicated:[]}
export const myPedido = { text: '', urgency: URGENCY.NORMAL, duration: DURATION.H12, neighbors: false }; // objeto de trabalho do formulário

// --- Contratos ---
// Filtro combinado (texto da busca + chip de status) sobre os cards mockados.
// Acordos pendentes não têm status próprio: aparecem só em "Todos".
export const contractsFilter = { query: '', status: CONTRACT_STATUS.ALL };
