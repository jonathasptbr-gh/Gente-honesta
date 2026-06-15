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
  components.css        — Botões, inputs, ic-bar, diálogos, bloqueio desktop/landscape
  auth.css              — Fluxo de login: auth-section, OTP grid, carrossel de intro
  onboarding.css        — Formulário de perfil: câmera, tags, localização, barras de
                          serviço, pro-note/pro-compare, ic-card
  install.css           — Tela-guia de instalação do PWA (view-install)
  feed.css              — Feed, top/bottom bar, painéis deslizantes, pedidos, cards de pro

js/   (a ordem de carga no index.html importa)
  app.js                — 1º CARREGADO. NÚCLEO: Firebase init, showView/navigateTo,
                          customAlert/customConfirm, window.appState, registro do SW
  install.js            — 2º. PWA: captura beforeinstallprompt, isStandalone,
                          prepareInstallView, tela view-install
  session.js            — 3º. Monitor de sessão (onAuthStateChanged): decide a tela
                          inicial em login/logout, chama resetAuthFlow no logout
  auth.js               — 4º. Login: sendOTP (com whitelist), verifyOTP, cooldown,
                          máscara de telefone, OTP grid, carrossel, resetAuthFlow
  onboarding.js         — 5º. Formulário de perfil: finishRegistration, câmera, tags,
                          localização, barras de serviço, diálogos de ajuda,
                          resetOnboardingForm (chamado pelo resetAuthFlow)
  feed.js               — 6º. Feed: notificações, painéis deslizantes, modo indicação,
                          cards de profissional (mock), filtros, pedidos, scroll-to-top, logout

tools/
  preview.js            — Ferramenta de screenshot headless (Playwright) para decisões estéticas
  package.json          — Dependências: playwright 1.56.1

.claude/
  settings.json         — Hook SessionStart → session-start.sh
  hooks/
    session-start.sh    — Git config + Playwright setup (roda a cada sessão web)

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

**auth.js**:
- `window.authTimerInstance` — referência ao setInterval do cooldown (para limpeza externa)
- `window.sendOTP(isResend?)` — envia SMS; valida whitelist; inicializa reCAPTCHA
- `window.verifyOTP()` — confirma código OTP de 6 dígitos
- `window.resetAuthFlow()` — limpa todo o estado de auth + OTP + delega a `resetOnboardingForm`

**onboarding.js**:
- `window.finishRegistration()` — valida formulário e chama `updateProfile`
- `window.resetOnboardingForm()` — zera formulário (chamado por `resetAuthFlow`)

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

## Padrões Importantes

**Mobile-only:** `window.IS_MOBILE` é definido sincronicamente no `<head>` do HTML (antes de qualquer render). Em desktop, `html.is-desktop` é adicionado ao `<html>` e um overlay bloqueia o app. `session.js` e `app.js` também verificam `IS_MOBILE` para abortar a inicialização do Firebase/SW.

**Orientation lock:** modo paisagem bloqueado em dois níveis — `manifest.json` (`"orientation": "portrait"`) e overlay CSS em `components.css` via `@media (orientation: landscape)`.

**Loader global:** `#loader-global` — mostrado/ocultado com `u-hidden`. O `onAuthStateChanged` é o único responsável por ocultá-lo em transições normais. Em erros onde o estado de auth não muda, remover manualmente.

**Diálogos:** sempre usar `await customAlert(...)` e `await customConfirm(...)` — nunca `alert()` ou `confirm()` nativos.

**Service Worker:** incrementar `CACHE_NAME` em `service-worker.js` a cada deploy com mudanças de cache. Versão atual: `gentehonesta-v105`. Os arquivos CSS e JS são atualizados automaticamente pelo Network-First; o incremento serve para forçar limpeza de caches antigos.

**Estado global:** `window.appState` em `app.js`:
- `confirmationResult` — objeto de confirmação SMS do Firebase
- `photoBlob` — data URL da foto capturada pelo onboarding
- `stream` — MediaStream da câmera (deve ser stopado ao fechar)
- `selectedTags` — array de áreas profissionais escolhidas
- `cooldownActive` — rate-limit do SMS ativo
- `locationConfirmed` — GPS validado no onboarding
- `serviceProfile` — `{quality, agility, price}` barras de serviço

---

## Preview Visual — fluxo padrão para decisões estéticas

O desenvolvedor trabalha exclusivamente pelo smartphone. **Experimentos puramente
estéticos (cores, tipografia, espaçamento, variações de design) são decididos por
screenshot ANTES de qualquer deploy:** gerar as variantes com `tools/preview.js`,
enviar os PNGs no chat (SendUserFile), iterar até a aprovação, e fazer **um único
deploy** com a versão escolhida. Não usar produção como bancada de testes visuais.

**Setup (uma vez por sessão web):**
```bash
cd tools && npm install --no-audit --no-fund && npx playwright install chromium
```
> `.claude/hooks/session-start.sh` já faz isso automaticamente (registrado em
> `.claude/settings.json` como hook de SessionStart).

**Uso:**
```bash
node tools/preview.js '{"view":"view-feed","shots":[
  {"file":"/tmp/v1.png","css":":root{--bg-canvas:#124014 !important}","label":"1 · verde escuro"},
  {"file":"/tmp/v2.png","css":":root{--bg-canvas:#e8eae9 !important}","label":"2 · cinza claro"}
]}'
```
- `view`: qualquer tela (`view-feed`, `view-auth`, `view-onboarding`, `view-install`).
- `tab`: aba do feed a ativar (`vagas`, `home`, `pedidos`). **OBRIGATÓRIO quando a mudança é numa aba específica** — o SPA começa sempre na aba `home`, então sem `tab` o screenshot mostra a tela errada.
- `css`: qualquer override (tokens do `:root` são o caso típico, com `!important`).
- O script sobe servidor próprio na porta 8077, emula um Galaxy (412×915 @2x), trata as
  particularidades do ambiente (proxy/CA, service worker, stub do Firebase,
  carregamento explícito de webfonts) — tudo comentado no próprio arquivo.
- Se o stdout mostrar `AVISO ... ícones não renderizaram`, o screenshot é
  inválido (fontes não carregaram) — repetir a captura.
- Ressalva ao usuário quando relevante: a renderização headless não é o AMOLED
  do aparelho; a conferência final de cor é no S24 após o deploy aprovado.

**Regra obrigatória de navegação no preview:**
O app é um SPA — cada tela e sub-estado só existe após interação JS. O script
simula essas interações via `showView()` e clique na aba (`shot.tab`). Antes de
gerar qualquer screenshot, identificar EXATAMENTE qual tela e qual estado precisa
estar visível para refletir a mudança feita, e passar os parâmetros corretos:
- Mudança na aba Vagas → `"view":"view-feed", "tab":"vagas"`
- Mudança na aba Pedidos → `"view":"view-feed", "tab":"pedidos"`
- Mudança na aba Profissionais → `"view":"view-feed", "tab":"home"`
- Mudança no onboarding → `"view":"view-onboarding"`
- Mudança no auth → `"view":"view-auth"`
Screenshot na tela errada é inválido — não enviar ao usuário.

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

### Scroll-to-top nas abas

Quando o usuário rola para baixo em qualquer painel (threshold: 80px), o ícone e label da aba ativa mudam para `arrow_upward` / "Voltar ao topo". Tocar na aba ativa enquanto scrollada executa `scrollTo({ top:0, behavior:'smooth' })` e restaura o botão imediatamente.

Estado relevante em `feed.js`:
- `scrolledState` — `{ vagas, home, pedidos }` (booleans, persistem ao trocar de aba)
- `activeTab` — string com a aba corrente
- `setTabButton(tabName, scrolled)` — atualiza ícone/label do botão
- `switchToTab(tabName)` — ponto único de troca de aba; reseta botão anterior, restaura estado do novo; também usado pelo swipe

### Regras de scrollbar

Todos os elementos scrolláveis do feed usam `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. Nunca adicionar scrollbar colorida ou visível em componentes do feed.

---

## O que ainda é mock (dados de exemplo)

Dentro de `DOMContentLoaded` em `js/feed.js`:
- `mockProfessionals[]` — 5 profissionais com `{id, name, tags, ic, q, a, v, avail, pay, bio}`
- `mockComments[]` — 5 avaliações de exemplo `{author, text, ic}` (mesmo bloco para todos os profissionais)
- `mockIndicatedByPost{}` — post ID → profissionais já indicados
- `mockVagas[]` — 3 vagas de emprego de exemplo

Comportamentos placeholder:
- Botões "Contratar", "WhatsApp", "Compartilhar" exibem alertas placeholder
- Botão "Fazer um pedido" simula criação sem persistência no Firestore
- Lista de pedidos (`#list-feed`) com 2 pedidos mockados hardcoded no HTML

---

## Próximas Features Previstas

- Edição de perfil (reaproveitar formulário do onboarding)
- Persistência de profissionais no Firestore
- Firebase Cloud Messaging para notificações push
- Tela de criação de pedido real (substituir o mock atual)
- Aba "Vagas" implementada com cards flip (candidatura) — dados ainda mockados, sem persistência
