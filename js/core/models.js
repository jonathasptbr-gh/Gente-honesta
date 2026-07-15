// =========================================================================
// MODELO DE DOMÍNIO — typedefs JSDoc (fonte única das FORMAS dos dados).
//
// Arquivo SÓ de documentação: nenhum código de runtime, NÃO é carregado por
// <script> nem entra no service worker. Serve de contrato portável — numa
// migração para TypeScript/framework, estes typedefs viram interfaces quase
// 1:1. Referencie com `@param {import('./models.js').Pedido} p` etc.
//
// As uniões/opcionais abaixo refletem o código ATUAL (são descrição, não
// proposta de mudança). Variações conhecidas de forma estão anotadas.
// =========================================================================

// ---- Value-unions (os enums em runtime vivem em domain.js) ---------------

/** @typedef {'available' | 'full' | 'unavailable'} Availability */
/** @typedef {'ok' | 'warn' | 'alert' | 'bad'} ICTier  Faixas do IC: ≥75 / ≥50 / ≥25 / <25. */
/** @typedef {'active' | 'completed'} PedidoStatus */
/** @typedef {'normal' | 'urgent'} Urgency */
/** @typedef {'12' | '24' | '36' | '48'} Duration  Horas online do pedido — STRING (parseInt no uso). */
/** @typedef {'light' | 'heavy'} HelperType */
/** @typedef {'name' | 'ic' | 'avail' | 'quality' | 'agility' | 'value'} SortKey */
/** @typedef {0 | 'debit' | number} PayCard  0=não aceita; 'debit'=só débito; N=crédito até Nx (1='à vista'). */

// ---- Entidades -----------------------------------------------------------

/** @typedef {{ cash: boolean, pix: boolean, card: PayCard }} Pay */

/**
 * Profissional autônomo.
 * @typedef {Object} Professional
 * @property {string} [id]      'pro-0'… em mockProfessionals; AUSENTE nos indicados e nos semeados em pedido.indicated.
 * @property {string} name
 * @property {string} tags      Ofícios unidos por ' · ' — é STRING, não array.
 * @property {number} ic        Índice de Confiança, 0–100.
 * @property {number} q         Qualidade, 0–10 (barra = q*10%).
 * @property {number} a         Agilidade, 0–10.
 * @property {number} v         Valor, 0–10.
 * @property {Availability} avail
 * @property {Pay} pay
 * @property {boolean} nf       Emite nota fiscal.
 * @property {string} bio
 */

/**
 * Avaliação/comentário exibido no verso do card (5 por vez).
 * @typedef {Object} Comment
 * @property {string} text
 * @property {string} author
 * @property {number} ic
 */

/**
 * Pedido de indicação feito pelo usuário (mock, em memória; futuro Firestore).
 * @typedef {Object} Pedido
 * @property {number} id                Contador (pedidoIdSeq) — NUMBER (diferente dos ids string de pro/vaga).
 * @property {string} text              Mínimo 10 chars.
 * @property {Urgency} urgency
 * @property {Duration} duration
 * @property {boolean} neighbors        Buscar em cidades vizinhas.
 * @property {number} createdAt         Date.now() ms.
 * @property {number|null} completedAt
 * @property {PedidoStatus} status      Só UM 'active' por vez.
 * @property {Professional[]} indicated Pros indicados (sem `id`).
 */

/** @typedef {{ icon: string, label: string }} Benefit  icon = nome do Material Symbol. */

/** @typedef {{ name: string, ic: number }} VagaPoster */

/**
 * Vaga de emprego. UNIÃO de duas variantes: a mock e a criada pelo usuário.
 * @typedef {Object} Vaga
 * @property {string} id              'vaga-0'… (mock) | 'vaga-user-<ts>' (criada).
 * @property {string} empresa         '' em vagas criadas até virem os dados oficiais do CNPJ.
 * @property {string} endereco        idem.
 * @property {string} mapsQuery
 * @property {VagaPoster} poster
 * @property {string} cargo
 * @property {number} vagas           1–20.
 * @property {string[]} requisitos    ≥1.
 * @property {string} cargaHoraria    Ex.: '08:00 às 18:00 · Seg–Sex' (composto).
 * @property {string} salario         Pré-formatado, ex.: 'R$ 1.500/mês'.
 * @property {Benefit[]} beneficios
 * @property {string} [cnpj]          SÓ em vagas criadas.
 * @property {boolean} [exigeCurriculo] SÓ em vagas criadas (mock omite → tratado como true).
 */

/**
 * Ajudante do "Serviço de ajudantes".
 * @typedef {Object} Helper
 * @property {string} id      'help-1'…
 * @property {string} first
 * @property {string} last
 * @property {number} ic
 * @property {string} phone   E.164 sem '+', ex.: '5511990000001'.
 * @property {HelperType} type
 */

// ---- Estado global (window.appState, em app.js) --------------------------

/** @typedef {{ quality: number, agility: number, price: number }} ServiceProfile  Cada 0–10 (default 5). */
/** @typedef {{ cash: boolean, pix: boolean, card: PayCard, nf: boolean }} PaymentMethods */

/**
 * @typedef {Object} AppState
 * @property {*} confirmationResult      Resultado de confirmação SMS do Firebase.
 * @property {string|null} photoBlob     data URL da foto do onboarding.
 * @property {MediaStream|null} stream   Câmera (parar ao fechar).
 * @property {string[]} selectedTags
 * @property {boolean} cooldownActive
 * @property {boolean} locationConfirmed
 * @property {ServiceProfile} serviceProfile
 * @property {PaymentMethods} paymentMethods
 * @property {boolean} profilePublic
 */

// Marca o arquivo como módulo (mesmo sem exports de runtime) — evita que os
// typedefs vazem para o escopo global de tooling.
export {};
