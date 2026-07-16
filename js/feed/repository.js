// =========================================================================
// REPOSITÓRIO DO FEED — ponto ÚNICO de troca pro Firestore.
//
// Hoje é a fonte mock (placeholder do backend): os arrays abaixo são
// module-private e só saem daqui pelos ACCESSORS no fim do arquivo
// (getProfessionals/getComments/getVagas/getHelpers/getIndicatedByPost +
// addVaga). Os chamadores (feed.js, feed-templates.js) NUNCA tocam os arrays
// crus — falam só com os accessors. Quando a persistência no Firestore entrar,
// é SÓ aqui que os accessors viram consultas async, sem mexer nos chamadores.
// =========================================================================

// TELA - PRINCIPAL (FEED) - AGENDA SHEET - Dados mockados de indicações por post
const mockIndicatedByPost = {
  '0': [
    { name: 'Carlos Almeida', tags: 'Eletricista · Encanador',  ic: 78, q: 7, a: 5, v: 6, avail: 'available',   pay: { cash: true,  pix: true,  card: 6  }, nf: true,  bio: 'Atende serviços elétricos e hidráulicos residenciais. Não faz obras de grande porte nem trabalha em altura.' },
    { name: 'Roberto Nunes',  tags: 'Pintor · Gesseiro',        ic: 38, q: 6, a: 5, v: 5, avail: 'unavailable', pay: { cash: true,  pix: false, card: 0  }, nf: false, bio: 'Pintura e pequenos reparos em gesso. Estou no início de carreira, então os prazos podem variar.' },
  ],
  '1': [
    { name: 'Paula Ramos',    tags: 'Diarista · Cozinheira',    ic: 64, q: 7, a: 7, v: 7, avail: 'full',        pay: { cash: true,  pix: true,  card: 0  }, nf: false, bio: 'Faço limpeza e cozinha do dia a dia. Não atendo aos finais de semana e não cuido de crianças.' },
    { name: 'Fernanda Lima',  tags: 'Costureira · Designer',    ic: 91, q: 9, a: 5, v: 7, avail: 'available',   pay: { cash: false, pix: true,  card: 12 }, nf: true,  bio: 'Costura sob medida e ajustes de roupas. Não trabalha com couro nem com grandes lotes.' },
  ],
};

// Indicações semeadas no PRÓPRIO pedido ao publicar (MOCK — mantém o fluxo
// "ver indicados" demonstrável). Valores propositalmente divergentes de
// mockProfessionals: são conteúdo de demo, não a mesma fonte por id.
const mockPublishIndicated = [
  { name: 'Carlos Almeida', tags: 'Eletricista · Encanador',  ic: 78, q: 7, a: 5, v: 6, avail: 'available',   pay: { cash: true,  pix: true,  card: 6  }, nf: true,  bio: 'Atende serviços elétricos e hidráulicos residenciais. Não faz obras de grande porte nem trabalha em altura.' },
  { name: 'Fernanda Lima',  tags: 'Costureira · Designer',    ic: 91, q: 9, a: 5, v: 7, avail: 'available',   pay: { cash: false, pix: true,  card: 12 }, nf: true,  bio: 'Costura sob medida e ajustes de roupas. Não trabalha com couro nem com grandes lotes.' },
  { name: 'Marcos Freitas', tags: 'Marceneiro',               ic: 19, q: 8, a: 4, v: 6, avail: 'full',        pay: { cash: true,  pix: true,  card: 'debit' }, nf: true, bio: 'Móveis sob medida em madeira. Tenho alta demanda, combine o prazo com antecedência.' },
];

// Avaliações de exemplo (mesmo bloco p/ todos os profissionais; 5 por vez).
const mockComments = [
  { text: 'Chegou na hora marcada e resolveu tudo sem complicação. Recomendo sem hesitar.', author: 'Ana Souza', ic: 88 },
  { text: 'Profissional competente e comunicativo. Explicou cada etapa antes de executar, sem surpresas no valor final.', author: 'Marcos Lima', ic: 71 },
  { text: 'Trabalho limpo e rápido. Excelente custo-benefício.', author: 'Júlia Ferreira', ic: 95 },
  { text: 'Contratei para um conserto urgente e não me decepcionou. Além de resolver, deu dicas para evitar o problema no futuro.', author: 'Pedro Alves', ic: 62 },
  { text: 'Segunda vez que contrato e o padrão continua o mesmo. Pode contratar sem medo, profissional exemplar.', author: 'Carla Ramos', ic: 91 },
  { text: 'Pontual, educado e deixou tudo organizado ao terminar. Já indiquei para três vizinhos.', author: 'Beatriz Costa', ic: 83 },
  { text: 'Fez um orçamento justo e cumpriu o prazo combinado. Sem surpresas desagradáveis.', author: 'Lucas Menezes', ic: 77 },
  { text: 'Atendimento excelente, serviço impecável. A melhor contratação que fiz esse ano.', author: 'Simone Oliveira', ic: 96 },
  { text: 'Resolveu um problema que outros profissionais não conseguiram. Vale cada centavo.', author: 'Rafael Cunha', ic: 69 },
  { text: 'Muito cuidadoso com o material e com o espaço. Deixou tudo limpo após o serviço.', author: 'Amanda Borges', ic: 85 },
  { text: 'Comunicação clara durante todo o processo. Atualizou sobre cada etapa sem eu precisar perguntar.', author: 'Thiago Silveira', ic: 73 },
  { text: 'Preço honesto e serviço de primeira. Difícil encontrar esse nível de profissionalismo.', author: 'Isabela Martins', ic: 90 },
  { text: 'Terceira contratação, nunca decepcionou. Profissional de confiança de verdade.', author: 'Eduardo Pinto', ic: 82 },
  { text: 'Chegou equipado, trabalhou de forma eficiente e entregou antes do prazo.', author: 'Natalia Rocha', ic: 79 },
  { text: 'Indicaria de olhos fechados. Honestidade e qualidade raramente andam juntas assim.', author: 'Rodrigo Faria', ic: 93 },
];

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

export const avatarSvg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555555'><path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/></svg>`;

// Vagas de exemplo.
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

// Pool mock de ajudantes (placeholder do backend).
const mockHelpers = [
  { id: 'help-1',  first: 'Lucas',    last: 'Andrade',  ic: 84, phone: '5511990000001', type: 'heavy' },
  { id: 'help-2',  first: 'Bruna',    last: 'Carvalho', ic: 71, phone: '5511990000002', type: 'light' },
  { id: 'help-3',  first: 'Diego',    last: 'Moraes',   ic: 63, phone: '5511990000003', type: 'heavy' },
  { id: 'help-4',  first: 'Patrícia', last: 'Nogueira', ic: 90, phone: '5511990000004', type: 'light' },
  { id: 'help-5',  first: 'Rafael',   last: 'Teixeira', ic: 55, phone: '5511990000005', type: 'heavy' },
  { id: 'help-6',  first: 'Camila',   last: 'Barros',   ic: 78, phone: '5511990000006', type: 'light' },
  { id: 'help-7',  first: 'Anderson', last: 'Pires',    ic: 47, phone: '5511990000007', type: 'heavy' },
  { id: 'help-8',  first: 'Juliana',  last: 'Fonseca',  ic: 82, phone: '5511990000008', type: 'light' },
  { id: 'help-9',  first: 'Marcelo',  last: 'Duarte',   ic: 68, phone: '5511990000009', type: 'heavy' },
  { id: 'help-10', first: 'Tatiane',  last: 'Ribeiro',  ic: 59, phone: '5511990000010', type: 'light' },
];

// -------------------------------------------------------------------------
// ACCESSORS (a interface do repositório). Devolvem a REFERÊNCIA VIVA do mock
// em memória — as mutações in-place dos chamadores seguem válidas. No futuro,
// viram consultas async ao Firestore SEM mudar a assinatura vista aqui fora.
// -------------------------------------------------------------------------
export const getProfessionals = () => mockProfessionals;
export const getComments = () => mockComments;
export const getVagas = () => mockVagas;
export const getHelpers = () => mockHelpers;
// Indicações de um post de TERCEIROS (o próprio pedido usa pedido.indicated).
export const getIndicatedByPost = (postId) => mockIndicatedByPost[postId] || [];
// Semente de indicações do PRÓPRIO pedido no publish — cópia nova por chamada
// (cada pedido carrega seu array independente, como no literal inline anterior).
export const getPublishSeedIndicated = () => mockPublishIndicated.map(p => ({ ...p }));
// Única escrita hoje: publica uma vaga nova no topo da lista.
export const addVaga = (vaga) => { mockVagas.unshift(vaga); };
// Remove uma vaga (o dono concluiu/encerrou — sai do ar do feed).
export const removeVaga = (id) => {
  const i = mockVagas.findIndex(v => v.id === id);
  if (i !== -1) mockVagas.splice(i, 1);
};
