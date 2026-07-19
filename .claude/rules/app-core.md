---
description: Núcleo do app — globals por módulo, estado global, diálogos, mobile-only, telas de auth/install/loader, Service Worker e fluxo de atualização do PWA.
paths:
  - "js/core/**"
  - "js/auth/**"
  - "js/install/**"
  - "service-worker.js"
  - "css/auth/**"
  - "css/install/**"
  - "css/components/**"
---

# Núcleo do app (shell)

## Globals exportados por módulo

Cada JS expõe funções/objetos em `window` para acesso cross-module.

**core/app.js** (base): `window.auth` (Firebase Auth), `window.appState` (estado mutável),
`window.showView(viewId)`, `window.navigateTo(stepId)`, `window.openDialog({...})`,
`window.customAlert(msg, title?, icon?)`, `window.customConfirm(msg, title?, icon?)`,
`window.watchScrollShadows(el)`, `window.backNav` (`push`/`remove`/`reset`/`has`/`depth`),
`window.moveMs(distanciaPx, speed?)`, `window.MOVE_SPEED`/`MOVE_SPEED_OPEN`/`MOVE_SPEED_CLOSE`,
`window.MOVE_ACCEL` (multiplicador de velocidade do acelerador; ver moveGate), `window.moveGate`
(trava+fila+acelerador de movimentos — `run`/`busy`/`depth`; ver abaixo),
`window.THEME_COLOR`, `window.icon(nome, classeExtra?)` (HTML de um ícone do sprite SVG),
`window.setIcon(elIcone, nome)` (troca o glifo de um ícone já no DOM — antes `el.textContent = nome`).

**tutorial/tutorial.js:** `window.startTutorial(steps, opts)`, `window.resetTutorialSeen(id)`.

**auth/auth.js:** `window.authTimerInstance`, `window.sendOTP(isResend?)`, `window.verifyOTP()`,
`window.resetAuthFlow()` (limpa auth + OTP + delega a `resetOnboardingForm`).

**onboarding/onboarding.js:** `window.finishRegistration()`, `window.resetOnboardingForm()`,
`window.startOnboardingTutorial()`, `window.enterProfileEdit()` (abre o form em modo edição —
liga o modo, popula, snapshot, `showView`), `window.setOnboardingEditMode(on)`,
`window.populateOnboardingFromState()`, `window.exitOnboardingEdit(restore)`.

**install/install.js:** `window.deferredInstallPrompt`, `window.isStandalone()`,
`window.prepareInstallView()`.

**auth/session.js** e **feed/index.js:** sem exports (tudo em listeners e DOMContentLoaded).

## Estado global (`window.appState`, em `core/app.js`)

- `confirmationResult` — objeto de confirmação SMS do Firebase.
- `photoBlob` — data URL da foto capturada no onboarding.
- `stream` — MediaStream da câmera (parar ao fechar).
- `selectedTags` — array de áreas profissionais.
- `cooldownActive` — rate-limit do SMS ativo.
- `locationConfirmed` — GPS validado.
- `serviceProfile` — `{quality, agility, price}` (0-10) do card de padrão de serviço.
- `paymentMethods` — `{cash, pix, card, nf}`; `card` é `0 | 'debit' | 1 | 6 | 12` (mesmo formato
  de `pro.pay.card`, nunca combinação). **`cash` nasce `true`** (Dinheiro pré-selecionado).
- `profilePublic` — boolean, default `false` (o check pressupõe os dados profissionais
  preenchidos).
- `editingProfile` — boolean; `true` enquanto o formulário do onboarding roda em MODO EDIÇÃO
  (aberto pela gaveta de perfil, não no cadastro inicial). Ver "Modo edição" em `onboarding.md`.

## Roteamento SPA

`showView(viewId)` troca a tela principal (`.screen` → `.screen--active`); `navigateTo(stepId)`
troca sub-passo dentro de `#view-auth` (`u-hidden`). Contrato: telas SÓ por `.screen--active`;
sub-elementos SÓ por `u-hidden`; nunca `display` inline em `.screen`. O `onAuthStateChanged`
(`auth/session.js`) é quem oculta o loader em transições normais.

`showView` também limpa a pilha do `backNav` (abaixo) quando a tela REALMENTE muda — guard
`_activeViewId`, então chamadas repetidas para a MESMA tela (o Firebase reemite
`onAuthStateChanged` com o mesmo usuário → `showView('view-feed')` de novo) NÃO zeram as camadas
abertas do feed.

## Navegação pelo botão "voltar" do sistema (`window.backNav`)

Camada central (`core/app.js`) que faz o botão/gesto "voltar" do Android FECHAR a camada
dispensável aberta (gaveta, diálogo, popup, sub-passo do login, aba do feed, tutorial) em vez de
SAIR do PWA — via History API.

**Modelo: UMA entrada de histórico por camada**, criada na ABERTURA (dentro do gesto do usuário).
N camadas abertas = N entradas empilhadas; cada "voltar" consome UMA entrada e fecha UMA camada,
**sem re-empilhar nada dentro do `popstate`**. (O modelo anterior — uma sentinela única re-armada
no `popstate` — funcionava no Chromium desktop mas era instável no PWA instalado / Samsung Internet:
o 2º "voltar" saía do app em vez de fechar a 2ª camada. Empilhar histórico DURANTE um "voltar" não
é confiável; por isso a entrada de cada camada nasce no toque de ABRIR.)

**Contrato (cross-módulo via `window.backNav`):**
- `push(id, fecharFn)` — ao ABRIR a camada; `id` único; `fecharFn` = o MESMO fechamento da UI.
- `remove(id)` — no início da função de FECHAR pela UI (tap-outside/botão). No-op se o `id` não
  está na pilha (pode ser chamado preventivamente, ex.: `closeFiltersSheet` nas trocas de aba).
- `reset()` — usado só pelo `showView` na troca real de tela (ver acima).
- `has(id)` / `depth()` — consulta.

Quando o "voltar" real fecha uma camada, ele chama a `fecharFn` registrada; o `remove` dentro dela
vira no-op (guarda `handlingPop`) — sem recursão. A sincronização com o histórico é adiada a uma
microtask e coalescida: "fechar A + abrir B" no mesmo toque (troca de gavetas IRMÃS) tem contagem
líquida inalterada → nenhuma entrada nova. Fechamentos pela UI consomem a entrada com
`history.back()` (um por vez, re-agendado pelo `popstate` ignorado — sem depender de quantos
`popstate` um `history.go(-n)` dispara).

**Camadas registradas hoje** (`id`): `dialog-global` (`openDialog` → cancelar), `camera` (câmera do
cadastro), `auth:step-phone`/`auth:step-otp` (passos do login), `feed-tab` (→ aba Profissionais),
`pedido-sheet`, `historico-sheet`, `vaga-sheet`, `vaga-detail-sheet`, `ajudante-sheet`,
`filters-sheet`, `contracts-sheet`, `contracts-filters-sheet`, `indicated-popup`,
`indicate-overlay`, `tutorial` (→ encerra o tour). Colapsáveis inline (Detalhes profissionais,
autocomplete de área) e o flip dos cards NÃO são camadas — fecham sozinhos.

**Ao adicionar uma nova camada dispensável:** `push(id, fecharFn)` no abrir + `remove(id)` no fechar,
com `id` único. Nada mais — o "voltar" passa a fechá-la automaticamente.

## Velocidade de movimento (`window.moveMs`) — direcional (abertura ≠ fechamento)

Todo DESLOCAMENTO do app deriva a DURAÇÃO da distância a percorrer ÷ velocidade (px/ms).
`window.moveMs(distanciaPx, speed?)` (`core/app.js`) é a fonte única — `clamp` entre
`MOVE_MIN_MS`/`MOVE_MAX_MS`. A CURVA de cada transição continua a de sempre; só a duração é derivada.

**TRÊS velocidades** (o 2º arg escolhe; default = neutra):
- `MOVE_SPEED` **1.3** — NEUTRA: navegação lateral que não é abrir/fechar (carrossel de abas,
  `animateConcludeSwap`).
- `MOVE_SPEED_OPEN` **1.1** — ABERTURA (elemento ENTRA na tela): mais lenta/suave, p/ "chegar" calmo.
- `MOVE_SPEED_CLOSE` **1.5** — FECHAMENTO (elemento SAI da tela): mais rápida/ágil, p/ a tela liberar
  logo (reduz a sensação de espera no fim). Ajuste global = mexer nessas 3 constantes.

Aplicação (mede a distância no gesto, seta a duração inline ou via CSS var):
- **Gavetas** (8 sheets, `feed/index.js`): `anchorBelowActionBar` mede a altura do `.__panel` e seta
  DOIS vars — `--sheet-open-dur` (÷1.1) e `--sheet-close-dur` (÷1.5). O CSS aplica por **transição
  assimétrica**: o estado BASE do painel usa `--sheet-close-dur` (saída) e o estado `.--open`
  sobrescreve com `--sheet-open-dur` (entrada) — assim entrada e saída têm durações distintas SEM
  tocar cada função de fechar (`pedido-sheet.css`/`historico.css`).
- **Carrossel de painéis + slider das abas** (UM gesto, NEUTRO): `switchToTab` seta `--panel-slide-dur`
  = `moveMs(nº de painéis × largura da viewport)` (velocidade neutra); os DOIS usam esse var no CSS
  (SINCRONIZADOS; salto de 2 abas dobra). Default do var em `setViewportVars` (`core/app.js`, recalculado
  no resize). **A action bar NÃO desliza mais junto** — a troca de conteúdo dela é um FADE curto (0.22s),
  independente do slide (ver `feed.md`).
- **Modo indicação** (`feed/index.js`): ENTRADA (voo do card + slide da seção) por `MOVE_SPEED_OPEN`;
  SAÍDA por `MOVE_SPEED_CLOSE`. **Bottom sheet de indicados**: `--indicated-sheet-dur` = OPEN na
  abertura, CLOSE no fechamento (o mesmo var alimenta o slide E o atraso de visibilidade da saída).
  **`animateConcludeSwap`**: `moveMs(dx)` (NEUTRO).

FORA do padrão de propósito: FLIP dos cards (rotação 180°, velocidade ANGULAR constante por
natureza — duração fixa), colapsáveis de altura (ease assimétrico deliberado do cadastro) e
micro-interações de toque (press/hover ≤0.2s, mudança de cor 0.3s = feedback, não deslocamento).

## Trava + fila + acelerador de movimentos (`window.moveGate`)

**Regra de segurança:** uma animação de DESLOCAMENTO não pode COMEÇAR enquanto outra não terminou — é o
que elimina os bugs de "camadas atravessadas / elementos sumindo" ao tocar rápido (dois movimentos
reparentando/limpando DOM ao mesmo tempo em cadeias `transitionend`/`setTimeout` que se atropelam).
`window.moveGate` (`core/app.js`) serializa: movimentos disparados durante um em curso entram na **FILA**,
na ordem, e rodam um após o outro. NÃO passam pela trava micro-interações (press/cor/sombra = feedback) nem
estados **parados** (uma gaveta/overlay já aberto e em repouso não bloqueia) — só a JANELA de animação.

**A trava solta na CONCLUSÃO REAL da animação, não num tempo estimado.** `play()` devolve uma **PROMISE**
que resolve quando a animação termina DE VERDADE (o flip resolve no fim da sua timeline; o carrossel no
`transitionend` do `#feed-panels`). Assim a trava NUNCA solta no meio — mesmo que a aceleração não seja
exata no aparelho (foi o bug "a 2ª ação acontece durante a 1ª": a versão antiga estimava a metade do tempo
e soltava cedo). O timer é só **FALLBACK** anti-deadlock (3,5s). Um movimento simples pode devolver um
número (duração) → usa só o timer.

**Acelerador — 2× em TODOS menos o último:**
1. **Item ENFILEIRADO** nasce 2× via `window.MOVE_ACCEL` (que o `moveMs` multiplica na velocidade; os flips
   leem `MOVE_ACCEL` direto) — encolhe a animação real E a duração JUNTAS, síncrono no `play`. O ÚLTIMO roda normal.
2. **Item EM CURSO** é agilizado 2× quando um novo entra na fila, via o callback `accelerate` (3º arg do
   `run`). Como a trava espera a CONCLUSÃO REAL, `accelerate` só precisa fazer a animação ACABAR ANTES —
   a trava segue e solta na hora certa (nunca antes). O flip usa uma **timeline** (`makeFlipTimeline`):
   reprograma os timers de cada fase p/ metade do restante + dobra o `playbackRate` das transições em voo →
   o flip inteiro vai a 2× e a promise resolve antes. O carrossel só dobra o `playbackRate` dos elementos que
   deslizam (o `transitionend` vem antes). Movimento SEM `accelerate` (indicação hoje) roda cheio em curso.

**Contrato:** `window.moveGate.run(id, play, accelerate?)`:
- `play()` — EXECUTA o movimento (síncrono) e devolve uma **PROMISE** (resolve no fim REAL da animação) OU um
  número (duração, p/ o timer fallback quando não há como sinalizar o fim).
- `accelerate?()` — opcional; agiliza 2× TODAS as fases da animação em curso (chamado quando um novo entra
  na fila) → a promise resolve antes. Sem ele, o item em curso roda cheio.
- `moveGate.busy`/`moveGate.depth` consultam o estado.

**Movimentos hoje na trava** (`feed/index.js`): carrossel de abas (`switchToTab`→`doSwitchToTab`, devolve
uma PROMISE que resolve no `transitionend` do `#feed-panels`; `accelerate`=`carouselAccelerate`), modo
indicação (`enter/exitIndicateMode`→`doEnter/doExitIndicate`, devolvem um NÚMERO/`est`; a ENTRADA roda
cheia, a SAÍDA é acelerável — `doExitIndicate` monta uma **timeline não-card** `makeMoveTL([card, prosBox])`
guardada em `indicateTL`, e `exitIndicateMode` passa `() => indicateTL.accelerate()` ao gate; o overlay
recebe `pointerEvents='none'` no fechamento p/ o swipe alcançar o feed atrás), a **reordenação da lista de
pros** (`reorderAgendaListAnimated`, pin/unpin — `moveGate.run('agenda-reorder', …)`, FLIP com duração por
`moveMs` do maior deslocamento, promise resolve no fim; enfileirado nasce 2× via `MOVE_ACCEL`), e os FLIPS
de card (pro e vaga — o toggle inteiro, incl. "fecha os outros" do accordion,
e o FECHAR pelo botão "Voltar"/verso via `gateCloseProCard`/`gateVagaFlip*`; devolvem `tl.promise`;
`accelerate`=`accelerateActiveFlips`). O flip roda numa **timeline** (`makeFlipTimeline`, `tl.promise` resolve
no fim): nasce em `speed`=`MOVE_ACCEL` (2× se enfileirado); a rotação (CSS) casa via duração inline no `flipper`
(`cfg.flipperSel`); as fases usam `tl.after`/`tl.dur` (setTimeout/duração escaláveis); `tl.accelerate()` (chamado
pelo gate) reprograma os timers pendentes p/ metade + dobra o `playbackRate` → o flip vai a 2× e a promise
resolve antes. `flipCardToBack/Front` devolvem a `tl`; os wrappers `pro/vagaCardFlip*` repassam. `flipCardForceReset`
cancela a timeline pendente do card. O **ajuste de scroll pós-flip** (trazer o card expandido à vista) é a
ÚLTIMA fase do ABRIR (`tl.settleScroll`) — antes era um `scrollIntoView({smooth})` num `setTimeout` SOLTO, fora
do movimento, e como o `scrollIntoView` rola TODOS os ancestrais, depois de trocar de aba ele puxava o
carrossel de volta. Agora é o helper único **`animateScrollTo(container, top)`**: rola SÓ o container do card
(nunca ancestrais), na VELOCIDADE ÚNICA (`moveMs`), acelerável (`ctrl.accelerate()`), e sua `promise` faz parte
da `tl.promise` (a trava espera por ele). O **"voltar ao topo"** (tocar a aba ativa; e o tap na busca) também
passa por `moveGate` (`'scroll-top'`) com o mesmo `animateScrollTo`. **Indicação NÃO deixa `MOVE_ACCEL` encurtar seu est** (as durações internas são
medidas em setTimeout, já com accel=1) — o `est` é calculado com accel=1 p/ casar com a animação real.

**Ao criar um movimento de deslocamento novo:** enrole o disparo em `moveGate.run(id, play, accelerate?)`, com
`play` devolvendo uma PROMISE que resolve no FIM REAL da animação (ou um número se não der p/ sinalizar o fim).
Leia o estado (aberto/fechado) DENTRO do `play` (ele roda
desenfileirado — o estado do clique pode estar velho). Movimento que reparenta DOM deve ainda ter um snap
síncrono defensivo (ver `finalizeIndicateNow`) + guarda por token (`indicateGen`) para o caso de callbacks
tardios.

## Diálogos — primitivo único `openDialog`

`window.openDialog({title, message, icon, showCancel, confirmText, cancelText, scrollable})`
(`core/app.js`) monta/popula/desmonta o `#dialog-global` com **teardown ÚNICO** (remove os dois
listeners e limpa sempre `--scrollable`) e **supersede** (um novo diálogo resolve o anterior como
cancelar, sem empilhar handlers). Retorna `Promise<boolean>`. `customAlert`/`customConfirm` e o
diálogo de ajuda do onboarding são wrappers finos dele. **Sempre** usar `await customAlert(...)`/
`await customConfirm(...)` — nunca `alert()`/`confirm()` nativos.

**Visual:** padrão VERDE (como as telas) — fundo `--p-green`, ícone dourado, título `--t-light`,
mensagem `--p-green-light`, confirmar dourado, cancelar branco translúcido (`.btn--outline`).
Escopado ao `#dialog-global`; o diálogo da câmera (`.dialog-box--camera`) tem tratamento próprio.

## Mobile-only e orientação

`window.IS_MOBILE` é definido sincronicamente no `<head>` (antes de qualquer render). Em desktop,
`html.is-desktop` + overlay bloqueiam o app. `auth/session.js` verifica `IS_MOBILE` para abortar o
fluxo; em `core/app.js` só o REGISTRO do SW é condicionado a `IS_MOBILE` (o `firebase.initializeApp`
roda também em desktop — inofensivo, o overlay bloqueia a UI). Paisagem bloqueada em dois níveis:
`manifest.json` (`"orientation": "portrait"`) + overlay CSS em `components/blocks.css`
(`@media (orientation: landscape)`).

## Telas verdes (shell)

Todo o app é verde (`--p-green`), então a `meta[theme-color]` é verde em todas via a constante
única `window.THEME_COLOR = '#184e1b'`.

- **Auth/install:** `#view-auth.screen` tem fundo `--p-green`; `#view-install.screen` usa
  `--bg-canvas`. A classe `.auth-section` (nos dois) já nasce com textos claros
  (`.auth-section__title` → `--t-light`, textos/legal/cooldown → `--p-green-light`, links →
  `--a-gold`). Primários (`Enviar SMS`, `Verificar e Entrar`, `Instalar agora`) viram amarelos
  (`#view-auth .btn--primary, #view-install .btn--primary`), botões de texto → `--a-gold`. Inputs
  e cards de passo têm fundo claro e se destacam sozinhos.
- **Intro (boas-vindas):** 1º slide usa `<img src="icon-intro.svg" class="intro-carousel__icon-img">`
  (recorte justo do operário); slides 2/3 mantêm glifos Material dourados. Título do 1º slide é só
  "Gente Honesta". Os 3 ícones compartilham o mesmo slot de altura fixa
  (`clamp(5.5rem,26vw,8.5rem)`). `#btn-start` usa `btn--accent`. Dots inativos em branco
  translúcido, ativo BRANCO `--t-light` (o azul de seleção sumiria no fundo escuro).
- **Seta "voltar" é ÍCONE, nunca caractere:** `#btn-back-phone` usa o ícone `arrow_back` do sprite
  (`<svg class="icon"><use href="#ic-arrow_back"></use></svg>`) — um caractere
  digitado como texto solto não compartilha a métrica das letras e fica mais baixo.
  `.btn--text .icon` fixa o ícone em `1.1rem`.

## Loader global

`#loader-global` — mostrado/ocultado com `u-hidden`. O `onAuthStateChanged` é o único responsável
por ocultá-lo em transições normais; em erros onde o auth não muda, remover manualmente. **CSS
crítico inline no `<head>`** pinta o `html` de verde e dá ao `.overlay-loader` a cobertura
(`position:fixed; inset:0; background:#184e1b; z-index:9999`) — sem isso havia flash branco no fim
do splash. **Telas não têm animação de entrada** (`.screen` sem `animation`): a transição entre
telas fica por conta do fade-out do loader.

## Service Worker

Incrementar `CACHE_NAME` (`service-worker.js`) a cada deploy com mudanças de cache (atual:
`gentehonesta-v400`). Os CSS/JS são atualizados pelo Network-First; o incremento força limpeza de
caches antigos. **CRÍTICO — o fetch same-origin usa `fetch(request, { cache: 'no-cache' })`:** sem
isso, o `Cache-Control: max-age=600` do GitHub Pages devolvia arquivos VELHOS por até 10 min após
um deploy e o botão "Atualizar" recarregava a versão antiga. `no-cache` = revalida via ETag (304
quando nada mudou). Cross-origin (fontes do Google) segue o cache normal. **NUNCA remover esse
`cache: 'no-cache'`.**

**Selo de versão (`#version-badge`):** vive no loader global
(`class="overlay-loader__version"` no `#loader-global`). O texto (`v###`) DEVE ser bumpado JUNTO
com o `CACHE_NAME` a cada deploy — é a fonte visual de "estou vendo a versão nova?".

## Atualização do PWA (banner "Nova versão disponível")

O SW NÃO chama `self.skipWaiting()` no `install` — o novo worker fica em "waiting" até o usuário
confirmar:
1. `core/app.js` chama `registration.update()` no `window.load` e a cada `visibilitychange → visible`
   (detecção rápida, sem depender da checagem automática do navegador de até 24h).
2. Ao detectar worker novo instalado (`updatefound` → `statechange` → `'installed'`, SÓ quando já
   existe `navigator.serviceWorker.controller`), exibe `#pwa-update-banner`. A página pergunta a
   versão ao novo worker via `MessageChannel` (`{type:'GET_VERSION'}` → SW responde `APP_VERSION`
   derivado do `CACHE_NAME`) e atualiza `#pwa-update-text`.
3. Clique em "Atualizar" → `postMessage({type:'SKIP_WAITING'})` → SW chama `self.skipWaiting()` →
   `clients.claim()` no `activate`.
4. `oncontrollerchange` dispara `location.reload()` — **mas só se** o clique pediu a troca (flag
   `updateRequested`). `clients.claim()` também dispara `controllerchange` sozinho na primeiríssima
   instalação; sem essa guarda, todo primeiro acesso recarregaria sozinho.

Nunca recarrega sem o clique do usuário. O reload só entrega arquivos novos por causa do
`cache: 'no-cache'`. `#pwa-update-banner` usa `u-hidden` exclusivo, `z-index: 10000`.
