---
description: Arquitetura do feed (#view-feed) — abas, painéis, action bar, gavetas/sheets, cards flip, filtros, pedidos, ajudantes, mock e dívidas do feed.
paths:
  - "js/feed/**"
  - "css/feed/**"
---

# Arquitetura do Feed (`#view-feed`)

## Gotchas de `feed/index.js` (LER PRIMEIRO)

- **TDZ em DOMContentLoaded:** `const`/`let` ficam na temporal dead zone até sua linha. Chamar um
  helper `const` antes de declará-lo lança `ReferenceError` silencioso que interrompe TODO o
  callback — os listeners abaixo do erro nunca registram. Declare helpers ANTES de chamá-los, ou
  mova a chamada para depois.
- **function declarations (hoistadas) vs `const`:** helpers chamados antes de sua posição textual
  DEVEM ser `function`: `renderFlippableProCards`, `buildProCard`, `bindProCardFlip`,
  `resetProCardBack`, `proCardFlipToBack/Front`, `flipCardToBack/Front`,
  `icTier`, `icShieldIcon`, `openFiltersSheet`, `closeFiltersSheet`, `closeContractsSheet`,
  `historicoItemHTML`, `updateBarElevation`, `anchorBelowActionBar`, `comparePros`, `tapHitsButton`.
  Nunca converter para arrow sem mover a declaração para antes de todas as chamadas.
- **`text-decoration` não propaga p/ filhos de flex container:** em `.pro-card__meta-item--inactive`
  (risco no método de pagamento indisponível), o `line-through` fica no span do RÓTULO
  (`.pro-card__meta-item__label`), NÃO no item — o item é `inline-flex`, o ícone (item flex) é
  "blockificado" e o Chrome ignora `text-decoration:none` nele. Aplicar o risco direto no span do
  texto.

## Bottom bar — 3 abas (`.feed-tabs-pill`)

Pílula verde flutuante com slider DOURADO (`.feed-tabs-pill__slider`) sob a aba ativa (texto ativo
`--p-green-dark`), dentro da `.bottom-bar` (vidro fosco via `::before`). O dourado é **exceção
deliberada** à regra "seleção = azul": é a barra de NAVEGAÇÃO principal, não seletor de formulário.

| `data-tab` | Ícone | Label |
|---|---|---|
| `vagas` | `work` | Vagas |
| `home` | `person_search` | Profissionais |
| `pedidos` | `view_agenda` | Pedidos |

Navegação por clique ou swipe horizontal.

## Painéis deslizantes

3 painéis lado a lado; `#feed-panels` tem `width: 300%` e desliza via `transform: translateX`:
`.feed-panel--vagas` (0%) | `.feed-panel--pros` → `#agenda-list` (-33.3%) | `.feed-panel--pedidos`
(-66.6%). `showVagasPanel()`/`showProsPanel()`/`showPedidosPanel()` alternam classes + o estado da
action bar.

**Velocidade única:** painel + trilho da action bar + slider das abas são UM gesto — `switchToTab`
seta `--panel-slide-dur` = `moveMs(nº de painéis atravessados × largura da viewport)`, e os três usam
esse var no CSS (ficam SINCRONIZADOS; salto de 2 abas dura o dobro). Ver `app-core.md`.

## Action bar (perfil/contratos fixos + carrossel no meio)

`#feed-action-bar` (`.agenda-filters`) é uma LINHA `[perfil] [zona do meio] [contratos]`: o
**avatar de perfil** (`#btn-open-profile`, esq.) e o **botão de contratos** (`#btn-open-contracts`,
dir.) ficam SEMPRE visíveis, em QUALQUER aba (`flex-shrink:0` nas pontas). Só a **zona do meio**
(`.agenda-filters__action-row`, `flex:1; overflow:hidden`) muda de estado conforme a aba: dentro dela,
as 3 linhas ficam LADO A LADO num trilho `.agenda-filters__track` (width 300%, cada `flex: 0 0 33.3333%`)
e deslizam por `translateX` com a MESMA curva/duração do `.feed-panels`. Estados (só a zona do meio):
`#bar-vagas-state` (**Criar vaga** + **Diárias**), `#bar-search-state` (busca + filtros, default centro),
`#bar-pedidos-state` (Histórico + Fazer pedido/Pedido atual). Classes `.agenda-filters--vagas`/`--pedidos`
no `#feed-action-bar` controlam a posição. Não usar `opacity`/`display:none` p/ alternar linhas — quem
esconde é o `overflow:hidden` + `translateX`.

> **Overlay de perfil:** com a gaveta de perfil aberta (`.agenda-filters--profile` no bar), o
> `#bar-profile-actions` (Sair/Editar) vira um OVERLAY `position:absolute; inset:0` sobre a zona do
> meio (fundo `--p-green` que mascara o conteúdo da aba) — assim funciona em qualquer aba. O avatar
> vira o Fechar (X) e os contratos seguem visíveis à direita.

> **Estado vagas — ordem/cor dos botões:** ESQUERDA = **Criar vaga** (`#btn-criar-vaga`, DOURADO
> `--a-gold`, AÇÃO principal); DIREITA = **Diárias** (`#btn-chamar-ajudante`, pílula BRANCA,
> secundário; novo nome da seção antes chamada "Serviço de ajudantes" — só o rótulo mudou, o sheet
> `#ajudante-sheet` e a lógica seguem "ajudante"). Classes função-nomeadas `--criar` (dourado) /
> `--ajudante` (branco).

## Submenus dropdown (gavetas) + botão-abridor que vira "Fechar"

Os submenus que descem da base da action bar — **Histórico** (`#historico-sheet`), **Fazer pedido/
Pedido atual** (`#pedido-sheet`), **Criar vaga** (`#vaga-sheet`), **Serviço de ajudantes**
(`#ajudante-sheet`), **Filtros** (`#filters-sheet`), **Contratos** (`#contracts-sheet` +
`#contracts-filters-sheet`) — compartilham o mesmo padrão: container `position:fixed; inset:0;
z-index:300`, painel no **padrão claro** (corpo `--bg-soft` + elementos internos brancos +
`--shadow-sm`, labels verdes, seleção tint azul), ancorado em `--sheet-top` (base da barra, medido em
runtime por `anchorBelowActionBar`), card recuado `--space-md` de cada lado, cantos inferiores
arredondados, slide-down "gaveta", backdrop que dim SÓ o feed abaixo da barra. `#filters-sheet` reusa
`.historico-sheet*`; `#vaga-sheet`/`#ajudante-sheet` reusam `.pedido-sheet*`.

**Animação de gaveta (3 camadas):**
1. **Container** (`.pedido-sheet`/`.historico-sheet`, `inset:0`, z-300) = só CAPTADOR de toques;
   cobre a barra p/ rotear o botão "Fechar"/"Concluir" (`tapHitsButton`). NÃO recorta.
2. **Clip** (`__clip`, `top:--sheet-top; bottom:0; overflow:hidden; pointer-events:none`) = recorta a
   gaveta; deixa os toques atravessarem até o container.
3. **Painel** (`__panel`, `pointer-events:auto`) = nasce em `translateY(-100%)` e vai a
   `translateY(0)` (`transition: transform var(--sheet-ease)`), emergindo pra baixo. SEM fade. A
   **DURAÇÃO** do slide é derivada da ALTURA do painel via `window.moveMs`, com velocidade DIRECIONAL:
   `anchorBelowActionBar` mede a altura e seta DOIS vars — `--sheet-open-dur` (abertura, ÷1.1) e
   `--sheet-close-dur` (fechamento, ÷1.5); o CSS aplica por transição assimétrica (estado base = saída
   usa close-dur; `.--open` sobrescreve com open-dur). Ver "Velocidade de movimento" em `app-core.md`.
   Toda gaveta também se registra no `backNav` (`push`/`remove`) para o "voltar" do celular fechá-la.

> Por que `overflow:hidden` num wrapper e não `clip-path`/`mask` no container: `clip-path` remove os
> toques da área recortada (quebra o hit-test do "Fechar"); `mask` deixava um flash de 1 quadro no
> fim do fechamento. O wrapper com `overflow:hidden` recorta sem artefato e o container separado
> mantém o hit-test. A abertura do detalhe pelo histórico (`.pedido-sheet--morph`) desliga o slide
> (`transform: none !important`) e mantém o FLIP do card.

**Botão-abridor vira "Fechar".** Não há botão de fechar dedicado nem título interno na gaveta. O
próprio abridor da action bar vira botão de fechar (ícone `close` + "Fechar") via `.action-close-mode`
(`feed/navigation.css`: fundo `--on-green-soft` + texto/ícone `--t-light`, `!important` para vencer o fundo de
cada botão). Setters em `feed/index.js`: `setMyPedidoButton(mode)` e `setHistoricoButton(mode)` (3 estados
`'natural'`/`'close'`/`'conclude'`), `setCriarVagaClose`/`setAjudanteClose` (via `innerHTML`), e o
`#btn-toggle-filters` (ícone `tune`↔`close`). Como o container (z-300) cobre a barra, tocar no
"Fechar" dispara o tap-outside do container → fecha. Todos os sheets têm tap-outside
(`if (!closest('.…__panel')) close…`).

**Troca direta entre gavetas IRMÃS num toque:** com uma gaveta aberta, tocar no abridor da irmã
(visível na barra em rótulo natural) fecha esta e abre aquela (animam juntas). Roteamento pelo
retângulo do botão via `tapHitsButton(e, btn)` (hoistada): no tap-outside, se o toque acerta o botão
irmão em rótulo NATURAL, `close…()` + `botaoIrmao.click()`. Pares: Criar vaga ↔ Ajudantes; Histórico
↔ Fazer pedido/Pedido atual. Filtros não tem irmã.

**Scroll rente às bordas no Criar vaga:** `margin-top: -var(--space-md)` no body puxa até a borda
superior do painel; o respiro do topo vem como `padding-top` DO CONTEÚDO (`.pedido-sheet__state`),
rolável — NUNCA padding-top do body (a shade sticky do `.js-scroll-shadows` não sobe acima da caixa
de conteúdo do pai). `padding-bottom: 0` no body (a faixa do rodapé carrega a safe-area). O rodapé
`.pedido-sheet__actions--footer` (só a vaga usa) ganha `margin-top: -var(--space-sm)` e
`padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom))`.

## Contratos — gaveta com a BARRA VIVA (`--bar-clear`)

`#contracts-sheet` (reusa `.historico-sheet*`) com a variante `.historico-sheet--bar-clear`: o
container começa em `--sheet-top` e NÃO cobre a action bar → a barra segue interativa (sem
`tapHitsButton`). Aberta: a busca vira "Buscar contratos..." (`openContractsSheet`; o texto filtra os
cards via `applyContractsFilters`), o `#btn-toggle-filters` abre `#contracts-filters-sheet` (chips de
status Todos/Ativo/Concluído/Cancelado + valor mín/máx + mês/ano — status e texto filtram de verdade;
valor/mês são visuais), e `#btn-open-contracts` vira "Fechar" (`.agenda-filters__icon-btn--active`,
receita do `.action-close-mode`). O `#contracts-filters-sheet` vem DEPOIS no DOM (renderiza por cima,
mesmo z-index). O CTA "Criar minicontrato" fica fixo na BASE do painel; lista em ordem normal
(pendentes → ativos → concluído → cancelado). `closeContractsSheet` tem guarda de early-return
(evita TDZ de `renderAgendaList`) e é chamado por `showVagasPanel`/`showPedidosPanel`.

## Lista de Pedidos

Flat list com dividers (`.pedido-item`), sem cards. Fundo `--bg-canvas`, texto `--t-light`. Avatar
28px. **Denunciar** migrou de chip-botão para **pressionar longamente** o card do pedido
(`attachLongPress` em `#list-feed` → `reportPedido`). "Indicar alguém" como `btn--accent`.

## Action bar de pedidos — DOIS botões sempre visíveis

- `#btn-historico-pedidos` (`btn--white`) — **Histórico**, sempre visível.
- `#btn-my-pedido` (`btn--accent`) — via `renderMyPedidoButton()`: **"Fazer pedido"** (`add`) sem
  pedido ativo → abre o formulário; **"Pedido atual"** (`receipt_long`) com pedido ativo → abre o
  detalhe unificado.

## Sheet "Fazer pedido" / detalhe unificado (`#pedido-sheet`)

Painel claro com backdrop. Os dois estados são o MESMO dropdown slide-down, alternados por `u-hidden`:
- `#pedido-form-state` — **criação**: textarea (contador 0/280), chips de urgência (Normal/Urgente),
  chips de tempo (12/24/36/48h), toggle "cidades vizinhas". **"Publicar pedido"
  (`#btn-pedido-publish`) vive num RODAPÉ FIXO** (`#pedido-publish-footer`, `.pedido-sheet__actions--footer`)
  fora do body que rola — sibling do `.pedido-sheet__body` no painel, como o "Criar vaga" — para
  ficar sempre visível na base (o teclado encolhe o body, não cobre o botão). O rodapé só aparece na
  criação: `openPedidoForm` tira o `u-hidden`, `openPedidoDetail`/`closePedidoSheet` recolocam. Quando
  visível, `#pedido-sheet .pedido-sheet__panel:has(> #pedido-publish-footer:not(.u-hidden))` zera a
  safe-area do body (o rodapé a carrega) e dá respiro ao form. O fechamento é pelo abridor virando
  "Fechar" + tap-outside.
- `#pedido-details-state` — **detalhe unificado** (leitura): card de referência no topo
  (`#pedido-detail-card-container`, via `renderPedidoDetails(pedido)`) + seção "Indicações recebidas"
  (`.pedido-detail-indicated`, fração `#pedido-detail-fraction`, lista `#pedido-detail-indicated-list`).

**Card de referência = mesmo modelo do histórico:** `renderPedidoDetails(pedido)` monta o card com
`historicoItemHTML(pedido)` (function hoistada, compartilhada com `renderHistoricoList`). A lixeira é
funcional (delegação em `#pedido-detail-card-container` → `deletePedido`).

**Animação FLIP ao abrir pelo histórico:** `openPedidoDetail(id, sourceEl)` — com `sourceEl`, o
painel aparece instantâneo (`.pedido-sheet--morph`), o card SOBE da posição do item
(`translateY(sourceRect.top - lastRect.top)` → `0`) e só então as indicações deslizam (no
`transitionend` do card, com fallback por timer). Sem `sourceEl` → slide-down padrão.

**Botões do topo (evita dois "Fechar"):** `pedidoDetailMode` (`'active'`/`'old'`/`null`). Ativo →
Histórico "Concluir pedido" (`.action-conclude-mode`) + Pedido atual "Fechar". Antigo → Histórico
"Fechar" + Pedido atual natural. Tap-outside roteia por `tapHitsButton`: ativo+**Histórico** →
`concluirDetailPedido` (Pedido atual "Fechar" cai no fechar padrão); antigo+PedidoAtual →
`myPedidoNavigate`; resto → `closePedidoSheet`.

**Animação de abertura (dourado "desliza"):** `animateConcludeSwap(concludeBtn, closeBtn)` (helper
único, também usado pela vaga). Ao abrir o detalhe ATIVO, o botão dourado parece deslizar do lugar do
ABRIDOR para a posição do VIZINHO virando "Concluir", enquanto o "Fechar" surge no lugar original: o
botão que vira Concluir (o vizinho) entra por `translateX` medido por rect a partir da posição do
abridor, e o abridor (agora "Fechar", sob o dourado) faz fade-in. `resetConcludeSwap(...)` limpa os
estilos inline no fechar (o detalhe volta ao natural instantâneo). Pedido: `animateConcludeSwap(btnHistorico,
btnMyPedido)`; vaga: `animateConcludeSwap(btnAjudanteBar, btnCriarVaga)`.

## Histórico de pedidos (`#historico-sheet`)

Dropdown (`#btn-historico-pedidos`) com o mesmo slide-down. Lista `#historico-list` com TODOS os
pedidos (inclusive o ativo), por data (mais recente no topo) via `renderHistoricoList()`. Cada
`.historico-item` é card branco `--shadow-sm`, raio de balão com o canto inferior direito reto
(`border-radius: 18px 18px 4px 18px`):
- `.historico-item__top` — data curta (`formatPedidoDate`) + botão excluir (`.historico-item__delete`,
  só o glifo `delete` em `--danger`; `customConfirm` e remove).
- texto (clamp 2 linhas, badge "Urgente" inline).
- `.historico-item__footer` — 2 badges `flex:1`: `.historico-item__status` ("Ativo · Nh" no tint azul
  via `pedidoHoursLeft()`, ou "Concluído" cinza) + `.historico-item__count` ("N/3 indicações").
- Tocar no item (fora do excluir) abre `openPedidoDetail(id)`. A delegação dá prioridade ao
  `.historico-item__delete` (`stopPropagation`) antes de abrir.

**Estado (`feed/index.js`, bloco "PEDIDOS"):** `pedidoHistory[]` (`{id, text, urgency, duration, neighbors,
createdAt, completedAt, status:'active'|'completed', indicated:[]}`, mock em memória; só UM `active`
por vez), `myPedido` (objeto de trabalho do form; `resetPedidoForm()` volta aos defaults casando por
`data-*`, não por posição no DOM), `getActivePedido()`/`getPedidoById(id)`/`detailPedidoId`. Publicar
cria o pedido `active` e semeia 3 indicações mock em `pedido.indicated`; Concluir muda `status`.
Chips via `wirePedidoChipGroup(groupId, dataKey, onPick)` (toggle por `aria-pressed`).

## Popup de Profissionais Indicados (`#agenda-indicated-popup`)

Bottom sheet acionado nos badges de fração dos pedidos de TERCEIROS (ex.: `2/3`). Estrutura HTML
obrigatória:
```
.indicated-popup__sheet (overflow:hidden, flex-direction:column)
  ├─ .indicated-popup__header (flex-shrink:0) — título + Fechar
  └─ .indicated-popup__scroll (flex:1, overflow-y:auto) — SCROLL AQUI
       └─ #agenda-indicated-list .indicated-popup__list
```
**Crítico:** o header fica FORA do container com scroll (siblings). Nunca `position:sticky` no header
(cards expandidos passavam por baixo dele). `openIndicatedPopup(postId)` renderiza via
`renderFlippableProCards` + `bindProCardFlip` (delegação registrada UMA vez por container). É um
bottom sheet: sobe `translateY(100%)→0` com duração pela altura (`--indicated-sheet-dur`, `moveMs`,
que também alimenta o atraso de visibilidade no fechamento). Registrado no `backNav` (`indicated-popup`).

## Modo indicação (overlay `#indicate-overlay`)

Acionado por "Indicar alguém" num pedido (`enterIndicateMode(postId)`); fechado por `exitIndicateMode`
(registrado no `backNav`, id `indicate-overlay`). Overlay fixo SOBRE o feed de pedidos (não troca de
painel): blur escuro (`.indicate-overlay__backdrop`, mesma receita das gavetas) + o card REAL do
pedido (MOVIDO, não clonado) flutuando ao topo (`#indicate-post-ref`) + a seção de profissionais
(`#indicate-pros`) = a `#agenda-list` REAL reparentada (reusa render/seleção/flip/pin). Um placeholder
(`indicate-card-placeholder`) guarda o lugar do card na lista.

**Empilhamento (z-index):** a **bottom bar das abas é MOVIDA para dentro do overlay** durante a
indicação (volta para a casa `barHomeParent`/`barHomeNext` ANTES de esconder o overlay). Ordem:

```
feed (atrás) < backdrop blur (0) < card do pedido (1) < bottom bar (2, com backdrop-filter) < seção pros (3)
```

Assim o card sobe/desce ATRÁS da barra (sem "pular" para frente) e a lista desliza por cima dela.

**Coreografia (DOIS TEMPOS, simétrica e invertida):**
- **Entrada:** o card SOBE ao topo (FLIP por `transform` inline) + a seção sobe de baixo
  (`translateY(100%)→0`, slide LIMPO SEM fade). SÓ ao chegar ao topo (transitionend + respiro de
  ~70ms) o botão "Indicar alguém" vira a frase "Quem você quer indicar?" (`morphSourceToPrompt`).
- **Saída:** INVERSO — o botão VOLTA primeiro (`restoreSourceCard`, un-morph) e, após um respiro
  (`UNMORPH_MS`), o card DESCE de volta ao slot do placeholder + a seção desce.

**Velocidade:** o voo do card e o slide da seção derivam a duração da distância/altura via
`window.moveMs`, com velocidade DIRECIONAL — ENTRADA por `MOVE_SPEED_OPEN` (1.1, suave), SAÍDA por
`MOVE_SPEED_CLOSE` (1.5, ágil); ver `app-core.md`. A curva é `INDICATE_SHEET_EASE` (espelha
`--sheet-ease`).

**Serialização de movimentos — trava+fila+acelerador (`window.moveGate`) + snap síncrono.** A entrada e a
saída reparentam DOM (`#agenda-list`, busca, bottom bar, card) e o devolvem "pra casa" em cadeias
`transitionend`/`setTimeout` de ~1s. Se dois movimentos rodam juntos (sai e reentra antes de assentar;
trocar de aba no meio; flip + outra coisa), o cleanup TARDIO de um clobbava o outro (camadas
"atravessadas"/elementos sumindo). Blindagem: TODO movimento de deslocamento passa pela trava/fila do
`window.moveGate` (`core/app.js`, ver `app-core.md`) — carrossel (`switchToTab`→`doSwitchToTab`), indicação
(`enter/exitIndicateMode`→`doEnter/doExitIndicate`) e os FLIPS (pro e vaga, abrir E fechar — incl. os botões
"Voltar"/verso via `gateCloseProCard`/`gateVagaFlip*`). Um movimento novo com outro em curso entra na FILA
(não sobrepõe); os itens da FILA rodam 2× (`MOVE_ACCEL`), MENOS o último; e o EM CURSO também é agilizado 2×
via `accelerate` (flip: `makeFlipTimeline`/`accelerateActiveFlips`; carrossel: `carouselAccelerate`). A trava
solta na CONCLUSÃO REAL da animação — `play` devolve uma PROMISE (flip: `tl.promise`; carrossel: `transitionend`
do `#feed-panels`), então acelerar só faz resolver ANTES e a trava nunca solta no meio (nem no aparelho, onde
uma versão que estimava a metade do tempo atropelava). Ver `app-core.md`.
- **Indicação:** a ENTRADA devolve número/`est` e roda cheia em curso; a SAÍDA é ACELERÁVEL — `doExitIndicate`
  monta uma timeline não-card `makeMoveTL([morphedSourceCard, indicateProsBox])` (mesma API do flip: `after`/
  `dur`/`finish`/`accelerate`/`promise`) guardada em `indicateTL`, e `exitIndicateMode` passa
  `() => indicateTL.accelerate()` ao gate. **Swipe passa através no fechamento:** o `#indicate-overlay`
  (`position:fixed inset:0`) cobria o `#feed-panels` e engolia o gesto de arrastar p/ a aba Profissionais;
  `doExitIndicate` seta `indicateOverlay.style.pointerEvents='none'` durante a saída (limpo no
  `finalizeIndicateNow`) p/ o swipe alcançar o feed atrás.
- `doSwitchToTab`: se `indicateMode`, faz snap síncrono da indicação (`backNav.remove` + `finalizeIndicateNow`)
  ANTES de deslizar — senão o carrossel passaria por cima do `#agenda-list` reparentado e a aba Profissionais
  ficaria vazia. Devolve `--panel-slide-dur`.
- `doEnter/doExitIndicate`: guardam em TEMPO DE EXECUÇÃO (`if (indicateMode) return 0` / `if (!indicateMode)
  return 0` — o estado do clique é velho, o play roda desenfileirado). Além do gate, mantêm o token
  `indicateGen` (finalize o bumpa) para abortar callbacks tardios (o morph órfão). O `est` devolvido usa
  accel=1 (a subida/descida interna é medida em setTimeout, sem `MOVE_ACCEL`), senão a fila abriria cedo.
- Flips: o toggle inteiro (incl. "fecha os outros" do accordion) é UM `moveGate.run('flip', …, [card])`; o
  estado (`isFlipped`) é lido DENTRO do play.

**Armadilha:** as guardas de "voltar pra casa" em `finalizeIndicateNow` usam **parent DIRETO**
(`el.parentElement !== casa`), NÃO `casa.contains(el)` — a casa da bottom bar (`#view-feed`) contém o próprio
`#indicate-overlay`, então `.contains` daria true com a barra ainda presa dentro do overlay e pulava o restore.

> **Verificador de invariantes (dev):** `window.checkInvariants('rótulo')` (`feed/index.js`, topo do
> DOMContentLoaded) devolve a lista de violações de estado em repouso — exatamente 1 `.screen--active`;
> `indicateMode` ↔ visibilidade do `#indicate-overlay`; `#agenda-list` na casa certa (feed vs overlay);
> busca/bottom bar/placeholder/`#indicate-post-ref` sem sobra fora da indicação. Roda sozinho ~450ms
> após a última `transitionend` e no retorno ao app (`console.warn` se inconsistente; custo desprezível,
> zero efeito no render). É a rede que reproduz corridas de camada como repro exato — rode-o ao mexer
> em qualquer reparent/animação de camada.

## Scroll-to-top nas abas

Rolar um painel além de 80px muda o ícone/label da aba ativa para `arrow_upward` / "Voltar ao topo".
Tocar na aba ativa scrollada faz `scrollTo({top:0, behavior:'smooth'})` e restaura o botão.
**Guarda anti-piscada (`scrollToTopPending`):** durante a subida programática (smooth), os eventos de
scroll ainda veem `scrollTop > threshold` e repunham a seta (o botão piscava). A flag
`scrollToTopPending[tab]` (setada no clique) faz o handler IGNORAR o botão durante a subida; é limpa
ao chegar ao topo (`scrollTop <= threshold`) ou num `touchstart` na lista (usuário interrompeu).
Estado: `scrolledState`, `scrollToTopPending`, `activeTab`, `setTabButton(tab, scrolled)`,
`switchToTab(tab)` (ponto único de troca, também usado pelo swipe).

## Filtros e pins (aba Profissionais)

```
pinnedPros (Set<id>) — salvos pelo usuário (session-only)
filterState {
  includeIc:   Set  ('ok'|'warn'|'alert'|'bad')
  includeAvail:Set  ('available'|'full'|'unavailable')
  includePay:  Set  ('cash'|'pix'|'card'|'nf')
  savedOnly:   bool
  sort: 'name'|'ic'|'avail'|'quality'|'agility'|'value'  (DEFAULT 'ic')
}
```
- Ordenação padrão `'ic'` (maior→menor); o chip "Confiança" nasce `chip--active`.
- `applyFilters(pros)` aplica o filterState; `sortPros(pros)` ordena via `comparePros` (comparador
  único, compartilhado com `sortCards`); `reorderAgendaListAnimated()` reordena com FLIP. Pros salvos
  sempre no topo, agrupados.
- **Indicador de filtros ativos = a própria pílula `#btn-toggle-filters`** (branco puro `--bg-white`):
  com filtro ativo → tint azul + `filter_alt` + contagem (`#filter-count`); com o sheet aberto → tint
  verde + `keyboard_arrow_up`; repouso → branca com `tune`. O glifo é decidido em `syncFilterPillIcon`.
  Contagem = `activeFilterCount()` (a ORDENAÇÃO não conta). **Limpar filtros** = `#btn-clear-filters`
  (`.agenda-clear-fab`, pílula de vidro flutuante dentro do `.feed-panel--pros`): zera os 4 grupos
  (mantém ordenação e pins). `updateFilterIndicator()` roda dentro de `renderAgendaList`.

## Fim/vazio da lista de profissionais — CTA "Fazer pedido" (`.agenda-cta-pedido`)

`renderAgendaList` NÃO usa mais a linha `.feed-end-cap` (essa segue só em Pedidos/Vagas): tanto ao
chegar ao fim da lista quanto com a lista vazia (busca sem resultado, filtros) insere o card
`.agenda-cta-pedido` (`AGENDA_CTA_PEDIDO_HTML`) — "Não está conseguindo achar o profissional que
procura? Faça um pedido público por indicações" + botão `#btn-agenda-cta-pedido` (`btn--accent`).
Delegação em `#agenda-list` (o botão é recriado a cada render). O clique roda em **DOIS TEMPOS**:
(1) `switchToTab(TAB.PEDIDOS)` desliza o carrossel; (2) no `transitionend` de `transform` do
`#feed-panels` (fallback por timer = duração do painel `--panel-slide-dur` + 200ms, já que o slide
tem duração derivada da distância pela velocidade NEUTRA), com um respiro de 180ms, `myPedidoNavigate()` abre a
gaveta de fazer pedido. `reorderAgendaListAnimated` move `.agenda-cta-pedido` (não mais `.feed-end-cap`)
para o fim.

**Variante no MODO INDICAÇÃO** (`indicateMode` true — procurando quem indicar): o CTA de fim/vazio
vira `AGENDA_CTA_SHARE_HTML` (`.agenda-cta-pedido--share`, botão `#btn-agenda-cta-share`) — em vez de
"fazer pedido", convida a **compartilhar o pedido fora da plataforma** (levar a um conhecido não
cadastrado). `sharePedidoExternal(activePostId)` usa o texto do pedido em indicação + convite ao app
via **Web Share API** (`navigator.share`) no celular; no desktop copia p/ a área de transferência
(fallback `customAlert`/`comingSoon`). A escolha do CTA em `renderAgendaList` é
`indicateMode ? AGENDA_CTA_SHARE_HTML : AGENDA_CTA_PEDIDO_HTML`.

## Cards de profissional (flip 3D)

`.pro-card__3d > .pro-card__flipper`: frente = dados (IC, tags, disponibilidade, IC-bar) + fita de
"salvo" (`.pro-card__saved-ribbon`, canto sup. esq. sobre a foto, via `.pro-card--pinned`); verso
= `proBackHTML()` (TODOS os comentários + botões de ação). **Salvar
contato = pressionar longamente** o card (`attachLongPress` em `#agenda-list` → `togglePinPro`; não
há mais botão de fixar).
**Builder único:** `buildProCard(pro, {showPin, withId})` (function hoistada) é a fonte única do
scaffolding, usada por `renderFlippableProCards` (popup/detalhe, `showPin:false`) E por
`renderAgendaList` (`showPin:true, withId:true`). Flip via `proCardFlipToBack/Front` (motor genérico
`flipCardToBack/Front`, config separada pro-card vs vaga-card).
**Comentários = SCROLL INTERNO (não mais "ver mais"):** o verso lista TODOS os comentários numa área
de ALTURA MÁXIMA fixa (`.pro-card--expanded .pro-card__back-comments`: `max-height: clamp(220px,42vh,340px)`;
`overflow-y:auto`) que ROLA por dentro — o card expandido NÃO cresce. A área é `.js-scroll-shadows`;
`buildProCard` chama `window.watchScrollShadows(...)` nela para injetar as shades de borda (topo/base),
o MESMO sistema de sombras do resto do app (ver `app-core.md`). A caixa de scroll é de LADO A LADO do
card (quebra o padding lateral do `.pro-card__back` por margem negativa, respiro só por dentro) e usa
`overscroll-behavior: contain`. **Cabeçalho** (`.pro-card__comments-header`, space-between): título
`.pro-card__comments-title` à esquerda + **ordenação** `.pro-card__comments-sort` à direita — par de
botões-ícone (`schedule` = mais recentes / `verified_user` = maior IC) com seleção em tint AZUL
(`.is-active`). `sortProComments(btn)` (hoisted) reescreve SÓ a lista do card tocado
(`getComments()` na ordem natural, ou `sort((a,b)=>b.ic-a.ic)`) e volta o scroll ao topo; é
interceptado ANTES do catch-all `.pro-card__back` (que fecha) nos DOIS handlers de flip (`bindProCardFlip`
e o de `#agenda-list`). `resetProCardBack(card)` só volta o `scrollTop` ao topo;
`proCardFlipToFront` o chama no `onComplete` (verso já oculto, sem flash).
**Overscroll do topo NÃO rouba o scroll dos comentários:** `attachTopOverscroll` (estique elástico no
topo dos 3 feeds) tem um `touchmove` `passive:false` que dá `preventDefault` quando a lista está no
topo (`scrollTop<=0`) e o dedo arrasta p/ baixo. Como os comentários ficam DENTRO de `#agenda-list`, o
touchmove deles borbulhava até esse handler e — com a lista no topo — o `preventDefault` MATAVA o
scroll nativo dos comentários (o overscroll disparava antes de rolar os comentários; só depois de rolar
e voltar é que passava). Guarda: `attachTopOverscroll` dá `return` cedo se `e.target.closest('.pro-card__back-comments')`
— deixa o scroller aninhado rolar nativo; o estique da lista só age quando o toque começa FORA de um
card. (Travar o scroll ancestral foi tentado e descartado: impede comparar rolando a lista com um card
aberto.)
**Delegação de flip é DUPLICADA (dívida aberta):** `bindProCardFlip` (popup/detalhe) e o handler de
`#agenda-list` (com pin + modo indicação). Stubs de WhatsApp/Compartilhar centralizados em
`comingSoon(label, title, icon)`.

## Cards de vaga (flip 3D)

`.vaga-card__3d > .vaga-card__flipper`: frente = empresa/endereço/cargo/requisitos/benefícios/"Me
candidatar"; verso = formulário com `<details>` por requisito + textarea. Candidatura mockada.
**Observações por requisito (`<details>` `.candid-req-obs`) abrem/fecham ANIMADO:** o clique no resumo
é interceptado (`preventDefault`) e a altura do PAINEL do details é animada (`animateReqDetails`) — o
card em `height:auto` acompanha frame a frame. No fechar, `open` só sai no `transitionend` (fallback
por timer).

## Sheet "Criar vaga" (`#vaga-sheet`)

Acionado por `#btn-criar-vaga`. Rodapé fixo: "Publicar vaga" fora do `.pedido-sheet__body` (que rola),
num `.pedido-sheet__actions--footer` (fundo `--bg-white`, edge-to-edge, cantos inferiores
`--radius-lg`). Reaproveita `.pedido-sheet*`/`.pedido-field*`/`.pedido-chip*`; estilos próprios só p/
listas dinâmicas (`.vaga-dyn-list`/`.vaga-dyn-row`/`.vaga-dyn-remove`, `.vaga-add-btn`).
Campos: **CNPJ** (`#inp-vaga-cnpj`, máscara `00.000.000/0000-00`, `formatCnpj`, 14 dígitos; a vaga
guarda só `cnpj`, com `empresa/endereco` vazios → o card mostra "CNPJ N" + nota "Dados da empresa em
verificação"); **Cargo** (obrigatório); **Número de vagas** (stepper `.vaga-stepper`, 1–20);
**Requisitos** (`.vaga-dyn-list`, ≥1); **Carga horária** (dois steppers de hora `.vaga-stepper--time`,
passo 30min com giro 23:30→00:00, `timeState`+`wireTimeStepper`, padrão 08:00→18:00 + toggles de dias
`.vaga-day`, padrão Seg–Sex; `formatDays` compacta contíguos em "Seg–Sex"); **Salário** (numérico,
milhar via `toLocaleString('pt-BR')`, `R$`/`/mês` externos); **Benefícios** (pílulas multi
`.vaga-benefit-pill` com `data-icon`/`data-label`; "Outros" revela `#vaga-benefit-list`, ícone por
`benefitIcon()`); **Exigir currículo** (`#chk-vaga-curriculo`, grava `exigeCurriculo`; o upload no
verso só renderiza se `vaga.exigeCurriculo !== false`).
Lógica (IIFE após `renderVagasList`): `addDynRow(listEl, placeholder, value, keepLast)` (com
`keepLast=true` a última linha só LIMPA; o remover faz `e.stopPropagation()` — senão fecharia a
gaveta), `resetVagaForm()`, `openVagaSheet()`/`closeVagaSheet()`. Publicar valida obrigatórios,
`mockVagas.unshift(nova)` + `renderVagasList()`, e transforma `#btn-criar-vaga` em "Ver vaga"
(`myVagaId` setado; o abridor passa a abrir a gaveta de detalhe abaixo). O rótulo natural do abridor
é decidido por `naturalVagaHTML()` (`Criar vaga` antes de publicar, `Ver vaga` depois) via
`setVagaOpenerClose()`.

## Sheet "Ver vaga" — detalhe da vaga do dono (`#vaga-detail-sheet`)

Gaveta de detalhe da vaga que o usuário publicou (visão do DONO, não candidatura). Acionada pelo
mesmo `#btn-criar-vaga` em modo "Ver vaga". Reusa `.pedido-sheet*` (gaveta clara). Renderizada por
`renderVagaDetail()`: o MESMO visual do card via **`vagaContentHTML(vaga, bodyTail)`** (fonte ÚNICA,
hoistada, compartilhada com a FRENTE do card em `renderVagasList` — faixa da empresa +
corpo com requisitos/detalhes/benefícios), **sem o casco do card e SEM "Me candidatar"**. No rodapé,
`.vaga-detail__actions`: CTA **"Analisar candidatos"** (`.btn.btn--accent`) + badge de fração
`.vaga-detail__count` (`taken/MAX_CANDIDATOS`, MAX_CANDIDATOS=20 em config.js), mesmo desenho
fração+ícone do `.post-card__indicate-info` dos pedidos. Ambos são placeholders (`comingSoon`) —
sem backend de candidatura. `openVagaDetailSheet()`/`closeVagaDetailSheet()` seguem o padrão dos
sheets (abridor "Ver vaga" à esquerda vira "Fechar" via `setVagaOpenerClose`, tap-outside). CSS em
`feed/vagas.css` (a faixa da empresa sangra até as bordas do painel; o corpo perde o
padding lateral do card para alinhar).

**Concluir vaga (mesmo sistema dos pedidos):** enquanto o detalhe está aberto, o botão IRMÃO à
direita (Serviço de ajudantes) vira **"Concluir vaga"** (`setAjudanteConcludeVaga` → `.action-conclude-mode`
dourado + ícone `check_circle`), espelhando "Concluir pedido" no lado "Pedido atual". Como o container
(z-300) cobre a barra, tocar nele cai no handler da gaveta → `concluirVaga()` (confirma via
`customConfirm`, `removeVaga(myVagaId)`, `myVagaId=null`, re-render, fecha e restaura os dois botões —
abridor volta a "Criar vaga"). Não há histórico de vagas: concluir REMOVE a vaga do feed.

## Sheet "Serviço de ajudantes" (`#ajudante-sheet`)

Reusa `.pedido-sheet*`. Duas funções sempre visíveis (`.ajudante-divider`). Estado em `localStorage`.
- **Disponibilizar-me:** dois `.helper-toggle` (leve/pesado, seleção independente). Diárias da fonte
  única `HELPER_RATES = { light: 100, heavy: 180 }` (injetadas nos `[data-rate]`). Estado em
  `localStorage['gh_helper_availability']`; `renderHelperAvailability` reflete check + `aria-pressed`.
- **Chamar ajudante:** tipo num seletor slide `.seg-toggle` (`#helper-type`, thumb azul), botão
  `#btn-call-helper`. `drawHelpers(type, 2)` sorteia 2 ajudantes de `mockHelpers`, fixados até
  meia-noite em `localStorage['gh_helper_draw']`. SEM cooldown (removido p/ teste). `renderHelperCall`
  mostra o form OU os contatos + Cancelar (`#btn-cancel-helper`, libera na hora). Reset à meia-noite
  (`scheduleHelperMidnightReset`) + `visibilitychange`.
- **Card de contato** (`helperPersonHTML`, reusa `.pro-card__*`): foto à esquerda, à direita uma linha
  nome + `icBarHTML`, e abaixo o botão "Conversar no WhatsApp" (`a.helper-wa`). `mockHelpers` =
  `{id, first, last, ic, phone, type}`.
Abridor vira "Fechar" (`setAjudanteClose`); fecha por tap-outside.

## Classes CSS notáveis

| Classe | Descrição |
|---|---|
| `.pedido-item__urgent-badge` | Pílula vermelha "bolt Urgente" inline (única marca de urgência) |
| `.pro-card__back-comments` | Área de comentários do verso: rola INTERNAMENTE (max-height fixa) com `.js-scroll-shadows` |
| `.indicated-popup__scroll` | Wrapper de scroll do popup (fora do header) |

Em `components/buttons.css`: `btn--accent` (`--a-gold` + `--p-green-dark`, Concluir pedido/CTAs).
(Ações destrutivas usam o `--danger` direto no elemento — não há mais `btn--danger`, que estava sem uso.)

> Scrollbar: os 3 feeds ESCONDEM a barra; todo o resto usa barra fina sempre visível — detalhe
> completo em `.claude/rules/design-system.md`.

## O que ainda é mock

`feed/index.js` é um **ES module** (`type="module"`) que lê os dados via os **accessors** do repositório
**`js/feed/repository.js`** (`getProfessionals`/`getComments`/`getVagas`/`getHelpers`/`getIndicatedByPost`/
`getPublishSeedIndicated` + `addVaga`; `avatarSvg` é export direto). Os arrays mock são module-private — a view NUNCA os toca
direto — então é ali, no repositório, que a persistência no Firestore substitui os exemplos (os
accessors viram queries async sem mexer nos chamadores). Detalhe dos dados: `mockProfessionals[]` (5 pros
`{id, name, tags, ic, q, a, v, avail, pay:{cash,pix,card}, nf, bio}`; `pay.card`: `0`/`'debit'`/número
= parcelas), `mockComments[]` (15, exibidos 5 por vez), `mockIndicatedByPost{}` (post de TERCEIROS →
pros; o próprio pedido usa `pedido.indicated`), `mockVagas[]` (3), `mockHelpers`. Placeholders:
Contratar/WhatsApp/Compartilhar dão alerta; pedido/histórico/candidatura sem persistência no Firestore
(tudo em memória/localStorage). Lista de pedidos = 5 itens hardcoded no HTML (`#list-feed`,
`#post-card-0..4`, badges de fração tipo `2/3`).

## Dívidas técnicas (feed) — consolidar ao mexer

- **Scaffolding de flip 3D duplicado:** `.pro-card__*` e `.vaga-card__*` (`feed/historico.css` e `feed/vagas.css`) repetem quase
  idêntico o maquinário de flip (`preserve-3d`, `rotateY(180deg)`, `backface-visibility`, colapso
  `--expanded height:0`). Candidato a uma base `.flip-card*` compartilhada.
- **Delegação de clique do flip PENDENTE:** o builder já é único (`buildProCard`), mas a delegação
  existe 2× (`bindProCardFlip` p/ popup/detalhe e o handler de `#agenda-list` com pin + modo
  indicação). Unificá-la exige parametrizar pin/indicação.
- **Avatar SVG inline:** o mesmo data-URI aparece 7× em `index.html` (5 cinza + 2 branco); em
  `feed/index.js` já é a const `avatarSvg`. Dedup do HTML exigiria converter `<img>`→background (perde o
  swap de `src` do `#top-bar-avatar`) → dívida deliberada.
- **Mock keyed por id:** `mockIndicatedByPost` redeclara objetos que já existem em `mockProfessionals`
  (com `ic`/`bio` divergentes). Uma fonte única por id evitaria divergência — mas os valores
  divergentes são conteúdo de demo, cuidado ao unificar. (A outra metade — as indicações semeadas no
  publish — já saiu do `feed/index.js` para o repositório: `getPublishSeedIndicated()` sobre
  `mockPublishIndicated`, a mesma dívida de divergência de dados, mas agora atrás do accessor.)
