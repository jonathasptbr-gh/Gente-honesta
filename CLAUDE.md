# Gente Honesta — Contexto do Projeto

## O que é

PWA mobile-only para conectar profissionais autônomos a clientes por indicação.
Fase atual: **testes fechados** com whitelist de números autorizados no Firestore.

URL de produção: https://gentehonesta.com.br
Repositório: jonathasptbr-gh/gente-honesta

---

## Deploy

- Branch de produção: `main` (GitHub Actions → GitHub Pages → domínio customizado)
- Para publicar: `git push origin HEAD:main`
- CI: `.github/workflows/deploy.yml` — dispara no push para `main`

> Nunca há build step: todos os arquivos são estáticos, o deploy publica o repo direto.

**Sempre fazer deploy ao final de cada sessão de alterações.** O desenvolvedor usa https://gentehonesta.com.br diretamente como preview de testes, num Samsung S24 Ultra. Não há ambiente de staging separado.

### Configuração obrigatória antes do primeiro commit de cada sessão

```bash
git config user.email noreply@anthropic.com && git config user.name Claude && git config commit.gpgsign false
```

Sem isso o stop-hook detecta commits "Unverified" e exige `git commit --amend`, que reescreve o hash. Se o commit já foi para `main`, os branches divergem e o próximo `git push origin HEAD:main` falha com non-fast-forward. Configurando antes do primeiro commit esse problema nunca ocorre.

> O hook `.claude/hooks/session-start.sh` (registrado em `.claude/settings.json`) já executa esses três comandos automaticamente em sessões web. Em execuções locais, configurar manualmente.

---

## Arquitetura

**SPA com roteamento por CSS.** Não há framework; a navegação é feita exclusivamente por:

```js
showView('view-auth')       // troca a tela principal (.screen → .screen--active)
navigateTo('form-otp')      // troca sub-passo dentro de #view-auth
```

`display` nunca deve ser declarado inline em elementos `.screen` — o CSS controla tudo via `.screen--active`.

**Telas principais** (IDs no index.html):
| ID | Quando aparece |
|---|---|
| `#view-auth` | usuário não autenticado |
| `#view-onboarding` | autenticado, sem `displayName` |
| `#view-install` | pós-cadastro, fora do modo standalone |
| `#view-feed` | autenticado com perfil completo |

**Sub-passos de auth** (dentro de `#view-auth`):
`step-intro` → `form-phone` → `form-otp`

**Fluxo de estado completo:**
```
Carregamento → detecção mobile (head) → onAuthStateChanged →
  Sem usuário?     → view-auth (phone → OTP → login)
  Com usuário?
    Sem displayName? → view-onboarding → finishRegistration → updateProfile
       → onAuthStateChanged dispara novamente →
          Standalone? → view-feed
          Não?        → view-install → "Continuar" → view-feed
    Com displayName? → view-feed direto
```

---

## Mapa de Arquivos

```
index.html              — HTML único do SPA (todas as telas)
manifest.json           — PWA manifest (start_url e scope usam "./" para GitHub Pages)
service-worker.js       — Network-First, cache offline, CACHE_NAME = "gentehonesta-vN"
CNAME                   — "gentehonesta.com.br"
.nojekyll               — Impede o Jekyll do GitHub Pages de processar os arquivos

css/
  base.css              — Design tokens (:root), roteamento de telas, utilitários, animações
  components.css        — Botões, inputs, ic-bar, diálogos, bloqueio desktop/landscape; `btn--danger` (vermelho)
  tutorial.css           — Motor de tutorial guiado (destaque + balão), reutilizável em qualquer tela
  auth.css              — Fluxo de login: auth-section, OTP grid, carrossel de intro
  onboarding.css        — Formulário de perfil: câmera, tags, localização, barras de
                          serviço, pro-note/pro-compare, ic-card
  install.css           — Tela-guia de instalação do PWA (view-install)
  feed.css              — Feed, top/bottom bar, painéis deslizantes, pedidos, cards de pro

js/   (a ordem de carga no index.html importa)
  app.js                — 1º CARREGADO. NÚCLEO: Firebase init, showView/navigateTo,
                          customAlert/customConfirm, window.appState, registro do SW
  tutorial.js           — 2º. Motor genérico de tour guiado (window.startTutorial) — ver seção própria
  install.js            — 3º. PWA: captura beforeinstallprompt, isStandalone,
                          prepareInstallView, tela view-install
  session.js            — 4º. Monitor de sessão (onAuthStateChanged): decide a tela
                          inicial em login/logout, chama resetAuthFlow no logout, dispara
                          o tutorial do onboarding
  auth.js               — 5º. Login: sendOTP (com whitelist), verifyOTP, cooldown,
                          máscara de telefone, OTP grid, carrossel, resetAuthFlow
  onboarding.js         — 6º. Formulário de perfil: finishRegistration, câmera, tags,
                          localização, barras de serviço, diálogos de ajuda,
                          resetOnboardingForm (chamado pelo resetAuthFlow),
                          startOnboardingTutorial (passos do tutorial de cadastro)
  feed.js               — 7º. Feed: notificações, painéis deslizantes, modo indicação,
                          cards de profissional (mock), filtros, pedidos, scroll-to-top, logout

.claude/
  settings.json         — Hook SessionStart → session-start.sh
  hooks/
    session-start.sh    — Git config (roda a cada sessão web)

.github/workflows/
  deploy.yml            — CI/CD: push para main → GitHub Pages (sem build step)
```

---

## Globals Exportados por Módulo

Cada arquivo JS expõe funções/objetos em `window` para acesso cross-module.

**app.js** (base — disponível para todos):
- `window.auth` — instância Firebase Auth
- `window.appState` — estado global mutable: `{confirmationResult, photoBlob, stream, selectedTags, cooldownActive, locationConfirmed, serviceProfile}`
- `window.showView(viewId)` — troca de tela principal
- `window.navigateTo(stepId)` — troca sub-passo dentro de `#view-auth`
- `window.customAlert(msg, title?, icon?)` — Promise-based alert (nunca usar `alert()` nativo)
- `window.customConfirm(msg, title?, icon?)` — Promise-based confirm (nunca usar `confirm()` nativo)

**tutorial.js** (motor genérico — ver seção "Tutorial Guiado" abaixo):
- `window.startTutorial(steps, opts)` — inicia um tour em cima de qualquer tela
- `window.resetTutorialSeen(id)` — limpa a flag "já visto" de um tutorial no localStorage

**auth.js**:
- `window.authTimerInstance` — referência ao setInterval do cooldown (para limpeza externa)
- `window.sendOTP(isResend?)` — envia SMS; valida whitelist; inicializa reCAPTCHA
- `window.verifyOTP()` — confirma código OTP de 6 dígitos
- `window.resetAuthFlow()` — limpa todo o estado de auth + OTP + delega a `resetOnboardingForm`

**onboarding.js**:
- `window.finishRegistration()` — valida formulário e chama `updateProfile`
- `window.resetOnboardingForm()` — zera formulário (chamado por `resetAuthFlow`)
- `window.startOnboardingTutorial()` — dispara o tutorial guiado do cadastro (chamado por `session.js`)

**install.js**:
- `window.deferredInstallPrompt` — evento `beforeinstallprompt` capturado globalmente
- `window.isStandalone()` — retorna `true` se rodando como PWA instalado
- `window.prepareInstallView()` — exibe bloco de instalação correto (Android/iOS/genérico)

**session.js** e **feed.js**: sem exports (todo o código é encapsulado em listeners e DOMContentLoaded).

---

## Firebase

Projeto: `gente-honesta` (console.firebase.google.com)

| Serviço | Uso |
|---|---|
| Auth (SMS) | `signInWithPhoneNumber` + reCAPTCHA invisível |
| Firestore | Coleção `testers` (whitelist de números) |
| Storage | (previsto para fotos de perfil) |

**Config pública** em `js/app.js` — normal para Firebase web apps (segurança via Firestore Rules).

**Firestore Rules importantes:**
- `testers`: `allow read: if true` — leitura antes do login para verificar whitelist
- Demais coleções: autenticado obrigatório

**Whitelist de testers** em `js/auth.js → sendOTP()` (bloco `// WHITELIST DE TESTERS`):
Documento na coleção `testers` com ID = número no formato `+5551XXXXXXXXX`.
Remover o bloco marcado `// WHITELIST DE TESTERS` quando abrir ao público.

---

## Design System

Variáveis em `css/base.css :root`:

**Cores:**
- `--p-green`, `--p-green-dark`, `--p-green-light` — verde principal e variações
- `--a-gold` — amarelo/dourado de destaque
- `--info-blue`, `--danger`, `--success`, `--whatsapp`, `--gold-soft-border`
- `--bg-white`, `--bg-soft` — superfícies claras
- `--bg-canvas: #124014` — verde escuro atrás dos cards de profissional nas listas
- `--surface-company: #555558` — faixa cinza de empresa nos cards de vaga
- `--surface-dark: #1c1c1e` — superfície escura (botão "Candidatar-se")
- `--overlay`, `--overlay-soft` — backdrops de diálogos/sheets/painéis

**Espaçamento:** `--space-xs` (8px) → `--space-xl` (48px)

**Raios:** `--radius-xs` (6px), `--radius-sm` (8px), `--radius-md` (12px), `--radius-pill` (28px)

**Sombras e transições:** `--shadow-sm`, `--shadow-lg`, `--transition`

**Altura do viewport:** `--app-height` — definida por JS em `app.js` via `window.innerHeight`.
Usada no grid do feed (`height: var(--app-height, 100dvh)`) para corrigir o comportamento
inconsistente de `100vh`/`100dvh` em PWAs instalados e webviews.

**Escala tipográfica:** `--fs-1` (0.6rem) → `--fs-13` (2.2rem). Todo `font-size` de TEXTO usa um token da escala; exceções: os `clamp()` responsivos (auth.css) e ícones Material Symbols (dimensionam glifo, não texto).

**Pesos de fonte:** títulos de tela/diálogo/painel/seção = 800; nomes de pessoas em cards = 700; labels/botões/chips = 600/700. Nota: a Inter é carregada apenas nos pesos 400/600/800 (`index.html`) — `font-weight: 700` declarado renderiza com a face 800.

**Ícones:** Material Symbols Rounded (Google CDN), carregados no `<head>`.
- Font-variation padrão filled: `'FILL' 1, 'wght' 700, 'GRAD' 25, 'opsz' 48`
- Font-variation filled médio (blocos Pro): `'FILL' 1, 'wght' 600, 'GRAD' 25, 'opsz' 24`

**Índice de Confiança (IC) — faixas e classes:**
| Faixa | Classe CSS | Ícone Material |
|---|---|---|
| 75–100 | `ic--ok` (verde) | `gpp_good` |
| 50–74 | `ic--warn` (ouro) | `shield_question` |
| 25–49 | `ic--alert` (vermelho) | `gpp_maybe` |
| 0–24 | `ic--bad` (cinza) | `gpp_bad` |

---

## Tutorial Guiado (Coach Marks)

Motor genérico e reutilizável (`js/tutorial.js` + `css/tutorial.css`) para tours guiados em cima de
qualquer tela — hoje usado no cadastro (`view-onboarding`); a ideia é reaproveitar no feed no futuro
sem recriar elementos por tela.

**Formato:** camada `position:fixed` de tela inteira. 4 painéis (topo/base/esquerda/direita,
`.tutorial-mask`) recortam um "buraco" exatamente no retângulo do elemento-alvo — juntos escurecem
(`--overlay-soft`) e desfocam (`backdrop-filter: blur(3px)`) todo o resto da tela e **bloqueiam
toque/clique fora do buraco** (`pointer-events: auto` nos painéis). Só o elemento em destaque fica
100% nítido e interativo — dá pra preencher campos, tocar botões etc. "junto com o tutorial", sem
conseguir mexer em nada fora do passo atual. Um anel dourado pulsante (`--a-gold`) marca o destaque, e
um balão (`.tutorial-balloon`) mostra título, texto, progresso (`N / total`) e botões Voltar/Próximo/Pular.

**API pública (`js/tutorial.js`):**
```js
window.startTutorial([
  { selector: '#meu-elemento', title: 'Título', text: 'Explicação.' , position: 'bottom'|'top' /* opcional */ },
  // ...
], { id: 'nome-do-tutorial', force: false, onFinish: () => {} });

window.resetTutorialSeen('nome-do-tutorial'); // limpa a flag "já visto" (ex.: botão "Rever tutorial")
```

- **Passos** são objetos `{ selector, title, text, position?, padding?, round? }`. Passos cujo elemento
  não existe ou está oculto (`display:none`/`u-hidden`, ex.: dentro de um `.collapsible__panel` fechado)
  são **ignorados automaticamente** — não expande nada, nem precisa checar visibilidade manualmente
  antes de chamar `startTutorial`.
- **Persistência:** cada tutorial só aparece automaticamente uma vez por dispositivo, via
  `localStorage['tutorial_seen_' + id]`. Passe `{ force: true }` para reexibir mesmo já visto.
- **Auto-scroll + trava de scroll:** ao entrar em cada passo, o motor rola (`scrollIntoView`) o container
  scrollável mais próximo do alvo até centralizá-lo, e trava o scroll desse container
  (`.tutorial-scroll-lock`) enquanto o tour está ativo — evita o balão "descolar" do alvo se o usuário
  arrastar a tela por baixo. `.screen` (onboarding, auth, install) já é o próprio container com scroll.
- **Reposicionamento:** o balão mede a si mesmo antes de decidir se fica acima ou abaixo do alvo
  (conforme espaço disponível) e nunca deixa a seta ou o card vazarem da viewport; reposiciona também
  no `resize`.
- **Elementos colapsáveis/expansíveis no alvo atual:** um `MutationObserver` (classe/estilo/filhos, no
  container com scroll da tela — nunca no próprio overlay do tutorial, para não entrar em loop reagindo
  às suas próprias mudanças de posição) reposiciona tudo automaticamente sempre que o DOM muda enquanto
  o tour está ativo — ex.: o usuário toca no próprio alvo em destaque (permitido, é a única área
  clicável) e isso abre um `<details>` ou um `.collapsible__panel` bem ao lado. Para decidir se o balão
  cabe acima ou abaixo, `getExtendedBottom()` verifica se o irmão logo abaixo do alvo (mesmo pai, colado, ex.: o painel de um
  colapsável) está visível e soma sua altura ao cálculo — sem isso o balão ficaria por cima do conteúdo
  recém-revelado, pensando que aquele espaço ainda estava livre.

**Uso atual (cadastro):** `window.startOnboardingTutorial()` em `js/onboarding.js` define os passos do
tour (foto, nome/sobrenome, localização, detalhes profissionais, IC, Plano Pro, botão concluir) e é
chamado por `session.js` ~600ms depois de `showView('view-onboarding')` (tempo da animação de entrada +
fade do loader). Tutorial id: `'onboarding'`.

**Para reaproveitar em outra tela (ex.: feed, futuramente):** defina uma nova função
`startXTutorial()` no módulo daquela tela com sua própria lista de passos e chame
`window.startTutorial(steps, { id: 'nome-unico' })` no ponto em que a tela aparece pela primeira vez —
não é necessário tocar em `js/tutorial.js` nem em `css/tutorial.css`.

---

## Padrões Importantes

**Mobile-only:** `window.IS_MOBILE` é definido sincronicamente no `<head>` do HTML (antes de qualquer render). Em desktop, `html.is-desktop` é adicionado ao `<html>` e um overlay bloqueia o app. `session.js` e `app.js` também verificam `IS_MOBILE` para abortar a inicialização do Firebase/SW.

**Orientation lock:** modo paisagem bloqueado em dois níveis — `manifest.json` (`"orientation": "portrait"`) e overlay CSS em `components.css` via `@media (orientation: landscape)`.

**Loader global:** `#loader-global` — mostrado/ocultado com `u-hidden`. O `onAuthStateChanged` é o único responsável por ocultá-lo em transições normais. Em erros onde o estado de auth não muda, remover manualmente.

**Diálogos:** sempre usar `await customAlert(...)` e `await customConfirm(...)` — nunca `alert()` ou `confirm()` nativos.

**TDZ em DOMContentLoaded:** dentro do callback de `DOMContentLoaded` em `feed.js`, todas as variáveis declaradas com `const`/`let` ficam na temporal dead zone até sua linha de declaração. Chamar uma função `const` antes de ela ser declarada lança `ReferenceError` silencioso que interrompe TODO o callback — os event listeners abaixo do ponto de erro nunca são registrados. Sempre declare `const` helpers/funções ANTES da linha que os chama, ou mova a chamada para depois da declaração.

**function declarations vs const em feed.js:** helpers que precisam ser chamados antes de sua posição textual no DOMContentLoaded DEVEM ser `function` declarations (são hoistadas). São `function` declarations: `renderFlippableProCards`, `bindProCardFlip`, `handleLoadMoreComments`, `resetProCardBack`, `proCardFlipToBack`, `proCardFlipToFront`, `flipCardToBack`, `flipCardToFront`. Nunca converter para `const` arrow functions sem mover a declaração para antes de todas as chamadas.

**Service Worker:** incrementar `CACHE_NAME` em `service-worker.js` a cada deploy com mudanças de cache. Versão atual: `gentehonesta-v125`. Os arquivos CSS e JS são atualizados automaticamente pelo Network-First; o incremento serve para forçar limpeza de caches antigos.

**Estado global:** `window.appState` em `app.js`:
- `confirmationResult` — objeto de confirmação SMS do Firebase
- `photoBlob` — data URL da foto capturada pelo onboarding
- `stream` — MediaStream da câmera (deve ser stopado ao fechar)
- `selectedTags` — array de áreas profissionais escolhidas
- `cooldownActive` — rate-limit do SMS ativo
- `locationConfirmed` — GPS validado no onboarding
- `serviceProfile` — `{quality, agility, price}` barras de serviço

---

## Arquitetura do Feed (`#view-feed`)

### Bottom bar — 3 abas

| `data-tab` | Ícone | Label |
|---|---|---|
| `vagas` | `work` | Vagas |
| `home` | `person_search` | Profissionais |
| `pedidos` | `view_agenda` | Pedidos |

Navegação por clique ou swipe horizontal. A aba ativa pode exibir `arrow_upward` / "Voltar ao topo" quando o painel está scrollado (ver abaixo).

### Painéis deslizantes

O feed tem **3 painéis** lado a lado; o container tem `width: 300%` e desliza via `transform: translateX`.

```
#feed-panels (.feed-panels, width:300%, flex, transition transform)
  ├─ .feed-panel.feed-panel--vagas   (33.3%)  → #vagas-scroll / #vagas-list (cards de vaga)
  ├─ .feed-panel.feed-panel--pros    (33.3%)  → #agenda-list (scroll de profissionais)
  └─ .feed-panel.feed-panel--pedidos (33.3%)  → #pedidos-scroll (scroll de pedidos)
```

- Painel vagas: `.feed-panels--vagas` (translateX 0%)
- Painel pros: ausência de classes modificadoras (translateX -33.3%)
- Painel pedidos: `.feed-panels--pedidos` (translateX -66.6%)
- `showVagasPanel()` / `showProsPanel()` / `showPedidosPanel()` em `feed.js` — alternam classes e o estado da action bar

### Action bar (barra de busca / ação)

Fica abaixo da top-bar verde, muda de estado conforme a aba ativa. Possui **3 estados**:

```
#feed-action-bar (.agenda-filters)
  └─ .agenda-filters__action-row  ← slot de altura fixa, position:relative
       ├─ #bar-search-state        ← campo de busca + botão de filtros (aba Profissionais)
       ├─ #bar-vagas-state         ← botões "Serviço de ajudantes" e "Criar vaga" (aba Vagas)
       └─ #bar-pedidos-state       ← botão "Fazer um pedido" (aba Pedidos)
  └─ #panel-agenda-filters         ← painel colapsável de filtros (position:absolute)
```

As três linhas são `position: absolute; inset: 0` sobrepostas no slot. A alternância é feita **exclusivamente por CSS** via `opacity + pointer-events + transition: 0.25s ease` — as classes `.agenda-filters--vagas` e `.agenda-filters--pedidos` no `#feed-action-bar` controlam qual linha é visível. **Nunca usar `u-hidden` / `display: none`** nessas linhas, pois quebraria a animação de fade.

### Lista de Pedidos

Estilo flat list com dividers (`.pedido-item`), sem cards. Fundo `--bg-canvas` (verde escuro), texto puro branco (`--t-light`). Avatar discreto (28px). "Denunciar" como chip-botão. "Indicar alguém" como `btn--accent` (amarelo sobre verde).

### Sheet "Fazer um pedido" / "Detalhes do meu pedido" (`#pedido-sheet`)

Bottom sheet verde (mesmo padrão slide-up + backdrop do `indicated-popup`), acionado pelo `#btn-my-pedido` da action bar (estado pedidos). Dois estados internos alternados por `u-hidden`:
- `#pedido-form-state` — **criação**: textarea do pedido (contador 0/280), chips de urgência (Normal/Urgente), chips de tempo online (12/24/36/48h), toggle "buscar em cidades vizinhas", botões Cancelar (`btn btn--danger`, vermelho) / Publicar.
- `#pedido-details-state` — **somente leitura** (pós-publicação): card do pedido gerado dinamicamente por `renderPedidoDetails()` + lista de pros indicados (`#pedido-detail-indicated-list`) + botões Cancelar pedido (`btn btn--danger`) / Concluir pedido (`btn btn--accent`, amarelo).

O card gerado por `renderPedidoDetails()` contém: avatar, nome, IC-bar (mock 100%), timer de expiração na meta row (no lugar do botão Denunciar). Urgência aparece como badge vermelho inline no texto. **Sem pílulas de tags** (urgência/duração/alcance removidas — as informações estão implícitas no card). O card tem `pointer-events: none`; os pro-cards dentro da lista de indicados têm `pointer-events: auto` via seletor específico.

Lógica em `feed.js` (bloco "POPUP DE PEDIDOS"):
- `myPedido` — `{text, urgency, duration, neighbors}` (mock, sem persistência no Firestore)
- `hasPedido` / `pedidoIndications` — estado do pedido atual e nº de indicações
- `openPedidoSheet('form'|'details')` — abre o sheet no estado certo; `renderPedidoDetails()` preenche a leitura
- `#btn-my-pedido` → form (sem pedido) ou details (com pedido); badge `#my-pedido-info` ao lado → abre profissionais indicados com título "Indicações recebidas" (`openIndicatedPopup('my')`)
- Chips de seleção única via `wirePedidoChipGroup(groupId, dataKey, onPick)`; toggle via `aria-pressed`

### Popup de Profissionais Indicados (`#agenda-indicated-popup`)

Bottom sheet acionado ao clicar nos badges de fração dos pedidos (ex: `2/3`) ou no badge `#my-pedido-info`.

Estrutura HTML obrigatória (qualquer mudança deve manter esta hierarquia):
```
.indicated-popup__sheet (overflow: hidden, flex-direction: column)
  ├─ .indicated-popup__header (flex-shrink: 0) — título + botão Fechar
  └─ .indicated-popup__scroll (flex: 1, overflow-y: auto) — SCROLL AQUI, não no sheet
       └─ #agenda-indicated-list .indicated-popup__list — cards de pro
```

**Crítico:** o header fica FORA do container com scroll (são siblings). Nunca usar `position: sticky` no header — isso causou cards expandidos passarem por baixo do header. A solução estrutural é o wrapper `.indicated-popup__scroll`.

- Título: "Profissionais indicados" (padrão) ou "Indicações recebidas" (quando `postId === 'my'`)
- `openIndicatedPopup(postId)` — renderiza pros via `renderFlippableProCards`, chama `bindProCardFlip` no container
- `bindProCardFlip(containerEl)` — registra delegação de clique UMA VEZ por container; verifica `handleLoadMoreComments` primeiro; scroll automático para o topo do card a 930ms do flip

### Scroll-to-top nas abas

Quando o usuário rola para baixo em qualquer painel (threshold: 80px), o ícone e label da aba ativa mudam para `arrow_upward` / "Voltar ao topo". Tocar na aba ativa enquanto scrollada executa `scrollTo({ top:0, behavior:'smooth' })` e restaura o botão imediatamente.

Estado relevante em `feed.js`:
- `scrolledState` — `{ vagas, home, pedidos }` (booleans, persistem ao trocar de aba)
- `activeTab` — string com a aba corrente
- `setTabButton(tabName, scrolled)` — atualiza ícone/label do botão
- `switchToTab(tabName)` — ponto único de troca de aba; reseta botão anterior, restaura estado do novo; também usado pelo swipe

### Sistema de filtros e pins (aba Profissionais)

```
pinnedPros (Set<id>)   — profissionais salvos/pinados pelo usuário (session-only)
filterState {
  includeIc:    Set   — faixas de IC selecionadas ('ok'|'warn'|'alert'|'bad')
  includeAvail: Set   — disponibilidades ('available'|'full'|'unavailable')
  includePay:   Set   — formas de pagamento ('cash'|'pix'|'card'|'nf')
  savedOnly:    bool  — mostrar apenas salvos
  sort:         string — 'name'|'ic'|'avail'|'quality'|'agility'|'value'
}
```

- `applyFilters(pros)` — aplica `filterState` sobre um array de profissionais
- `sortPros(pros)` — ordena conforme `filterState.sort`
- `reorderAgendaListAnimated()` — reordena cards já renderizados com animação FLIP
- Pros salvos (`pinnedPros`) aparecem sempre no topo, agrupados separadamente dos demais

### Cards de profissional (flip 3D)

`.pro-card__3d > .pro-card__flipper`:
- **Frente:** dados do profissional (IC, tags, disponibilidade, IC-bar, pin)
- **Verso:** `proBackHTML()` — primeiros `COMMENTS_PAGE` (5) comentários + botão "ver mais" + botões de ação

`proCardFlipToBack(card)` / `proCardFlipToFront(card, onComplete)` em `feed.js` — motor genérico `flipCardToBack/Front` com configurações separadas para pro-card vs vaga-card.

**Paginação de comentários:**
- `COMMENTS_PAGE = 5` — constante global dentro de DOMContentLoaded
- `proBackHTML()` — renderiza apenas os primeiros 5; botão `.pro-card__load-more` com `data-offset` indica próximo batch
- `handleLoadMoreComments(e)` — function declaration; appenda próximo batch com animação `comment--entering` (fade+slide-up, stagger 45ms); anima expansão do card (`height` de `currentH` para novo valor, 0.3s cubic-bezier); retorna `true` se tratou o evento
- `resetProCardBack(card)` — function declaration; restaura para os primeiros 5 comentários e repõe o botão "ver mais" com `data-offset="${COMMENTS_PAGE}"`
- `proCardFlipToFront` sempre chama `resetProCardBack` no `onComplete` (depois da animação de flip, ~840ms) — o reset ocorre enquanto o verso já está oculto, sem flash visual

**Cards de vaga** (`<details>` internos): ao abrir um `<details>`, o conteúdo aparece com a mesma animação `commentFadeIn`.

**Helper reutilizável:**
- `renderFlippableProCards(listEl, pros)` — function declaration; renderiza pro-cards flipáveis em qualquer container
- Usado em: `#agenda-list` (lista principal), `#agenda-indicated-list` (popup de indicados), `#pedido-detail-indicated-list` (detalhes do pedido)

### Cards de vaga (flip 3D — já implementado)

`.vaga-card__3d > .vaga-card__flipper`:
- **Frente:** empresa, endereço, cargo, requisitos, benefícios, "Me candidatar"
- **Verso:** formulário de candidatura com `<details>` por requisito + textarea de observação

Candidatura mockada: sem persistência no Firestore. O flip usa o mesmo motor genérico de animação 3D dos cards de profissional.

### Classes CSS notáveis em feed.css

| Classe | Descrição |
|---|---|
| `.pedido-item__timer` | Timer de expiração na meta row do pedido (cor dourada, inline-flex) |
| `.pedido-item--urgent` | Card de pedido urgente (borda vermelha 2px) |
| `.pedido-item__urgent-badge` | Pílula vermelha "bolt Urgente" inline no texto |
| `.pedido-detail-preview` | Card gerado em `renderPedidoDetails()` — `pointer-events: none` |
| `.pro-card__load-more` | Botão "ver mais comentários" — cor `var(--info-blue)` |
| `.comment--entering` | Animação `commentFadeIn` fade+slide-up 0.22s nos comentários novos |
| `.indicated-popup__scroll` | Wrapper de scroll no popup de indicados (fora do header) |

**Classes em components.css:**
- `btn--danger` — `background: var(--danger); color: #fff` (vermelho; usado em Cancelar)
- `btn--accent` — `background: var(--a-gold); color: #000` (amarelo; usado em Concluir pedido)

### Regras de scrollbar

Todos os elementos scrolláveis do feed usam `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. Nunca adicionar scrollbar colorida ou visível em componentes do feed.

---

## O que ainda é mock (dados de exemplo)

Dentro de `DOMContentLoaded` em `js/feed.js`:
- `mockProfessionals[]` — 5 profissionais com `{id, name, tags, ic, q, a, v, avail, pay: {cash, pix, card}, nf, bio}`
  - `pay.card`: `0` = não aceita, `'debit'` = só débito, número = crédito parcelado em até Nx
  - `nf`: boolean — emite nota fiscal
- `mockComments[]` — **15** avaliações de exemplo `{author, text, ic}` (mesmo bloco para todos os profissionais); exibidas 5 por vez via paginação
- `mockIndicatedByPost{}` — post ID → profissionais já indicados:
  - `'0'`: 2 pros (posts na lista de pedidos)
  - `'1'`: 2 pros
  - `'my'`: 3 pros (semeados ao publicar o pedido)
- `mockVagas[]` — 3 vagas de emprego com estrutura detalhada `{id, empresa, endereco, mapsQuery, poster, cargo, vagas, requisitos, cargaHoraria, salario, beneficios}`

Comportamentos placeholder:
- Botões "Contratar", "WhatsApp", "Compartilhar" exibem alertas placeholder
- Sheet "Fazer um pedido" (`#pedido-sheet`): formulário de criação e tela de detalhes (leitura) já existem, mas sem persistência no Firestore. As indicações do próprio pedido (`mockIndicatedByPost['my']`) são semeadas na publicação só para o fluxo ficar demonstrável.
- Lista de pedidos (`#list-feed`) com 2 pedidos mockados hardcoded no HTML; badges mostram `2/3` para ambos
- Cards de vaga já têm flip 3D com formulário de candidatura, mas sem persistência no Firestore

---

## Próximas Features Previstas

- Edição de perfil (reaproveitar formulário do onboarding)
- Persistência de profissionais no Firestore
- Firebase Cloud Messaging para notificações push
- Persistência do pedido no Firestore (formulário e detalhes já existem — falta backend)
- Candidatura em vagas com persistência no Firestore (flip de candidatura já existe — falta backend)
- Estender o Tutorial Guiado (`js/tutorial.js`) para o feed: passos explicando abas, action bar, cards de profissional/vaga e sheets de pedido
