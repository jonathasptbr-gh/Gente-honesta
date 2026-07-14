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
       (exceção: login recém-feito, <15s — flag isNewSignIn em session.js — passa
        pelo onboarding mesmo com displayName, para o usuário revisar os dados)
```

---

## Mapa de Arquivos

```
index.html              — HTML único do SPA (todas as telas)
manifest.json           — PWA manifest (start_url/scope "./"; background_color e theme_color = --p-green #184e1b, igual ao fundo do ícone → splash sem "quadrado" verde no branco)
service-worker.js       — Network-First, cache offline, CACHE_NAME = "gentehonesta-vN"
CNAME                   — "gentehonesta.com.br"
.nojekyll               — Impede o Jekyll do GitHub Pages de processar os arquivos
icon.svg                — Fonte do ícone QUADRADO full-bleed (operário: capacete + óculos + rosto + check); fundo verde --p-green #184e1b (mesmo da tela inicial/loader). Base dos PNGs maskable
icon-rounded.svg        — Mesma arte com CANTOS ARREDONDADOS (clipPath rx=123 ≈ 12%; cantos transparentes fora do round-rect). Base dos PNGs `purpose:"any"`. Gerada a partir de icon.svg (wrap do <g> num clip-path)
icon-transparent.svg    — Mesma arte com FUNDO TRANSPARENTE (check continua verde), viewBox full 1024 (com margem embutida)
icon-intro.svg          — Recorte JUSTO do operário (fundo transparente; viewBox só ao redor da arte, ~pequena margem). Usado no 1º slide da tela de boas-vindas via .intro-carousel__icon-img — preenche mais o slot que o icon-transparent.svg, ficando do tamanho dos glifos dos outros slides
icon-192.png            — Ícone PWA 192px ARREDONDADO (RGBA, cantos transparentes); manifest `purpose:"any"` + favicon. Mostrado "cru" onde o SO não recorta
icon-512.png            — Ícone PWA 512px ARREDONDADO (RGBA); manifest `purpose:"any"`
icon-192-maskable.png   — Ícone PWA 192px QUADRADO full-bleed; manifest `purpose:"maskable"` (launchers adaptativos aplicam a própria máscara: círculo/squircle)
icon-512-maskable.png   — Ícone PWA 512px QUADRADO full-bleed; manifest `purpose:"maskable"` + apple-touch-icon (iOS ignora maskable e arredonda sozinho — precisa da arte quadrada cheia, sem transparência)

css/
  base.css              — Design tokens (:root), roteamento de telas, utilitários, animações
  components.css        — Botões, inputs, ic-bar, diálogos, bloqueio desktop/landscape; `btn--danger` (vermelho)
  tutorial.css           — Motor de tutorial guiado (destaque + balão), reutilizável em qualquer tela
  auth.css              — Fluxo de login: auth-section, OTP (input único + células), carrossel de intro
  onboarding.css        — Formulário de perfil: câmera, tags, localização, cards de
                          padrão de serviço, check de perfil público, ic-card
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
                          máscara de telefone, OTP (input único), carrossel, resetAuthFlow
  onboarding.js         — 6º. Formulário de perfil: finishRegistration, câmera, tags,
                          localização, cards de padrão de serviço, diálogos de ajuda,
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

### ✅ CHECKLIST DE CONFORMIDADE — passe por ela ANTES de criar/alterar QUALQUER elemento de UI

Toda criação ou modificação visual deve buscar o padrão existente. Na ordem:

1. **Classifique pelo PAPEL, nunca pela estética** (ver "Taxonomia" abaixo): contêiner de conteúdo →
   `.card`; ação (faz algo) → `.btn` + variante; item selecionável/filtro/toggle → `.chip`/padrão de
   pílula; entrada de texto → `.input-text`. Reuse a base existente; NUNCA crie uma árvore de classes
   paralela para algo que já tem primitiva.
2. **Cor pela FUNÇÃO, nunca pelo gosto**: AMARELO (`--a-gold`) = só AÇÕES e acentos de marca;
   AZUL (`--info-blue`) = seleção/estado ativo (tint claro + texto azul sobre fundo claro; azul sólido +
   texto branco sobre verde escuro; `--info-blue-bright` para indicadores minúsculos sobre verde);
   VERDE = identidade/fundos/sucesso/foco de input; VERMELHO (`--danger`) = erro/destrutivo.
   (Detalhes e exceções em "SEMÂNTICA DE CORES".)
3. **Zero valores crus**: toda cor/tamanho/raio/sombra/espaçamento/peso/duração vem de token do `:root`
   (`--fs-*`, `--fw-*`, `--space-*`, `--radius-*`, `--shadow-*`, `--on-green-*`, `rgba(var(--*-rgb), α)`,
   `--blur-*`, `--sheet-ease`, `--press-scale*`, `var(--app-height, 100dvh)` no lugar de `dvh` cru).
   Se o valor exato não existe na escala, use o degrau mais próximo — não invente um número.
4. **Sem contorno**: nada de `border` para definir card/pílula/botão/input — definição por contraste do
   fundo + `--shadow-sm` (sobre claro) ou fill claro `--card-on-green` (sobre verde). Única linha de
   borda permitida: o vermelho canônico de erro/obrigatório. Bordas FUNCIONAIS (avatar, checkbox,
   divisor, spinner) são exceção listada.
5. **Estado muda a COR INTERNA do elemento** (fundo/texto), nunca ganha anel/box-shadow/outline.
6. **Visibilidade**: telas SÓ por `.screen--active` (via `showView`); sub-elementos SÓ por `u-hidden`;
   nunca `style.display` inline nem `display` em seletor de `.screen`.
7. **Acessibilidade mínima**: toggle/chip carrega `aria-pressed` sincronizado com a classe ativa;
   botão só-ícone carrega `aria-label`; elemento clicável é `<button>` (nunca `<div>` com listener).
8. **Sheet/dropdown novo?** Reuse o scaffolding `.pedido-sheet*`/`.historico-sheet*` (3 camadas
   container/clip/panel, `--sheet-top` medido em JS, gaveta com `--sheet-ease`, tap-outside, botão-abridor
   vira "Fechar" via `.action-close-mode`) — não recrie do zero.
9. **Rola?** Os 3 feeds escondem a barra; TODO outro container com scroll usa a barra fina sempre
   visível (`::-webkit-scrollbar` 5px + thumb, `scrollbar-width: thin`), na borda do painel.
10. **Diálogo?** Sempre `await customAlert(...)`/`await customConfirm(...)` — nunca `alert()`/`confirm()`.
11. **Fechou a sessão de mudanças?** Bump de `CACHE_NAME` (service-worker.js) + `#version-badge`
    (index.html) juntos, commit e deploy para `main`.

As seções abaixo detalham cada regra, os tokens e as exceções deliberadas documentadas.

Variáveis em `css/base.css :root`:

**Cores:**
- `--p-green`, `--p-green-dark`, `--p-green-light` — verde principal e variações
- `--p-green-rgb: 24, 78, 27` — os MESMOS canais de `--p-green`, para uso em `rgba(var(--p-green-rgb), α)`. Usar sempre este token nos anéis de foco, brilhos radiais e no pulso do pino do IC, em vez de reescrever `rgba(24, 78, 27, …)` à mão
- **Canais `-rgb` para `rgba()`** — além de `--p-green-rgb`, existem `--a-gold-rgb` (224,168,28),
  `--p-green-dark-rgb` (10,31,11), `--overlay-rgb` (3,32,4) e `--on-green-rgb` (255,255,255, branco
  translúcido sobre superfícies verdes). SEMPRE usar `rgba(var(--*-rgb), α)` em vez de reescrever os
  canais à mão (ex.: brilho/anel dourado do tutorial usa `--a-gold-rgb`; véus escuros do feed usam
  `--p-green-dark-rgb`; bordas/fundos brancos sobre verde usam `--on-green-rgb`).
- **Branco-sobre-verde (escala de opacidade):** `--on-green-faint/-soft/-muted/-med/-strong/-solid`
  (.15/.26/.35/.5/.7/.9) — usar o degrau semântico em vez de `rgba(var(--on-green-rgb), α)` solto.
- **Blur / sheets:** `--blur-sm` (5px) e `--blur-lg` (14px) para backdrops (tutorial mantém 1.5px próprio);
  `--sheet-ease` (`cubic-bezier(0.32,0.72,0,1)`) é a curva única dos sheets deslizantes.
- `--a-gold` — amarelo/dourado de destaque; `--a-gold-text` é o ocre mais escuro para TEXTO dourado sobre fundo claro
- `--info-blue` — azul-cobalto escuro: a COR DE SELEÇÃO/estado ativo do app (v262); `--info-blue-light` é o tint claro; `--info-blue-bright` (#7aa3de) é o azul claro para indicadores PEQUENOS sobre verde escuro (dots do carrossel)
- `--danger`, `--success`, `--whatsapp`, `--gold-soft-border`
- `--bg-white`, `--bg-soft` — superfícies claras
- `--bg-canvas: #124014` — verde escuro atrás dos cards de profissional nas listas
- `--surface-company: #555558` — faixa cinza de empresa nos cards de vaga
- `--surface-dark: #1c1c1e` — superfície escura (botão "Candidatar-se")
- `--overlay`, `--overlay-soft` — backdrops de diálogos/sheets/painéis. **Todo backdrop usa um destes** (verde-quase-preto translúcido), nunca `rgba(0,0,0,α)` cru
- `--block-bg` — fundo dos bloqueios de tela cheia (desktop + paisagem): verde escuro com dois brilhos radiais. Token único porque os dois blocos compartilhavam o mesmo gradiente copiado à mão

**Espaçamento:** `--space-xs` (8px) → `--space-xl` (48px)

**Raios:** `--radius-xs` (6px), `--radius-sm` (8px), `--radius-md` (12px), `--radius-lg` (20px), `--radius-pill` (28px).
`--radius-lg` é o raio padrão dos sheets (`indicated-popup__sheet` no topo; `pedido-sheet__panel`/`historico-sheet__panel` nos cantos inferiores) — usar `var(--radius-lg)`, não `20px` cru.

**Sombras e transições:** `--shadow-sm`, `--shadow-lg`, `--transition`. Preferir os tokens de sombra a
recriar `box-shadow` à mão. Os cards em repouso do feed (`.post-card`, `.vaga-card__front`) usam
`--shadow-sm`, igual ao `.contract-card` — as antigas sombras duplas bespoke foram reconciliadas.

**Destaque de estado por COR, NUNCA por sombra:** sombras coloridas de destaque furavam bordas/divs e
viravam linha sólida — foram REMOVIDAS (não há mais `--focus-ring`/`--ring-gold`/`--ring-danger`). O estado
muda o FILL do próprio elemento, não ganha anel.

**SEMÂNTICA DE CORES (v262) — AMARELO = AÇÃO; AZUL = SELEÇÃO:**
- **AMARELO (`--a-gold`) é EXCLUSIVO de AÇÕES**: CTAs (`btn--accent`, primários sobre verde), links/botões
  de texto sobre verde, `.action-conclude-mode`, `.vaga-add-btn` (em `--a-gold-text`), dock de confirmação —
  além dos acentos de marca (IC card, tutorial, ícones de seção) e da faixa 50–74 do IC (cor de tier, não
  seleção). Os botões +/- do stepper do Criar vaga são VERDES (`--p-green` + glifo branco, par do
  `btn--primary` sobre claro) desde a v296: dourado neles competia com o CTA "Publicar vaga".
- **AZUL (`--info-blue`) é a cor de SELEÇÃO/estado ativo em TODOS os formulários e seletores**, em DOIS
  tons conforme o fundo (contraste): sobre superfície CLARA → fundo `--info-blue-light` + texto
  `--info-blue` (tag-pill, chip--payment, `.chip--active` dos contratos, card de serviço ativo, radio/check
  de candidatura, pro-card selecionado, item da busca de área e, desde a reforma clara das gavetas [v295],
  pedido-chip, vaga-day, benefit-pill, helper-toggle, chips do filters-sheet e badge "Ativo" do histórico);
  sobre superfície VERDE ESCURA → fundo `--info-blue` SÓLIDO + texto `--t-light`; controles PEQUENOS de
  marcação usam azul sólido mesmo no claro (caixa do check de currículo, trilho do switch, thumb do
  seg-toggle — como o check de perfil público do cadastro); indicadores minúsculos sobre verde →
  `--info-blue-bright` (dot do carrossel). EXCEÇÃO
  deliberada: o slider da bottom bar (`.feed-tabs-pill__slider`) é DOURADO — é navegação/ação principal,
  não seletor de formulário (pedido explícito do desenvolvedor).
- **FOCO de input** (transitório, não é seleção) segue `--p-green-light`; estados de SUCESSO (GPS
  confirmado, status verde de contrato) seguem verdes; erro segue `--danger`.
Ao criar um estado selecionado novo, use o par azul do contexto — não use `box-shadow` como destaque.

**ÚNICA exceção (linha de borda): alerta de ERRO/OBRIGATÓRIO — mecanismo ÚNICO em todo o app (v261).**
Campo exigido vazio no submit OU erro de operação (falha de GPS) ganha **linha vermelha de borda**
(`.input-text--error`/`.location-check--error-validation`/`.location-check--error`/
`.media-capture__display--error` = `border: 2px solid var(--danger) !important` + fundo `--danger-soft`;
`.vaga-days--error` = só a linha, sem fundo, por estar sobre o sheet verde-escuro). O `!important` vence o
`border:none` do reset e do `.card`. NÃO existem mais os mecanismos alternativos antigos (inset box-shadow
do GPS, anel externo dos dias, outline do padrão de serviço — este era código morto e foi removido). A
validação (`finishRegistration`) marca os quatro obrigatórios juntos e o alerta diz "destacados em vermelho".

**Toque:** `--press-scale` (0.97) é o feedback de `:active` padrão do `.btn` e da maioria dos botões/
pílulas; `--press-scale-subtle` (0.99) é para alvos GRANDES (cards, linhas). Alvos minúsculos/precisos
mantêm scales próprios mais fortes (0.85 do ícone de excluir, 0.9/0.92 de mini-btn/stepper/FAB).

**Pesos de fonte (tokens):** `--fw-regular` (400), `--fw-medium` (600), `--fw-bold` (700), `--fw-heavy`
(800). Usar os tokens em `font-weight`. Nota: a Inter só carrega 400/600/800, então `--fw-bold` (700)
renderiza com a face 800.

**Taxonomia de elementos interativos (4 categorias — classifique SEMPRE por PAPEL, não por estética):**
Regra de ouro: **"card" = SUPERFÍCIE (contêiner de conteúdo); "botão" = AÇÃO.** Pedir "um card" pensando
na estética não muda o papel: se o elemento AGE (compartilhar, candidatar, filtrar), é botão/chip, não card.
1. **Superfície / Card (`.card` + `--soft/--shadow`)** — contêiner visual. Tag: `<div>`/`<article>` se
   estático; `<button class="card …">` se a superfície INTEIRA é um único alvo de toque (ex.:
   `.location-check`, `.service-choice__card` — cards clicáveis, legítimos). Nunca é uma ação com rótulo/ícone.
2. **Botão / Ação (`.btn` + variantes)** — executa uma ação (rótulo e/ou ícone). Tag: `<button>` (ou `<a>`
   se navega, ex.: WhatsApp). **TODO botão de ação herda `.btn`** — fundação única (sem borda, flex-center,
   cursor, transição, `:active`). Estilo: `--primary/--accent/--outline/--white/--danger/--text`.
   Estrutura: `--large/--pill/--close/--icon` (`--icon` = quadrado só-ícone 44px; o antigo `--fab` foi
   REMOVIDO — não havia FAB no HTML). Os botões de ação dos cards de profissional e de vaga já foram
   unificados sob `.btn` (voltar/compartilhar usam `btn btn--icon`; candidatar/publicar usam
   `btn btn--primary`; whatsapp `btn`). Também compõem `.btn`: os "Fechar" do modo indicação/popup de
   indicados (`btn btn--close agenda-indicated__cancel`) e o botão de filtros
   (`btn btn--icon agenda-filters__icon-btn`, 40px da action bar).
3. **Token / Pílula (`.chip` + `--sm/--md`)** — item selecionável/filtro/toggle. Tag: `<button>`. Estado
   ativo SEMPRE AZUL, por contraste: tint claro (`--info-blue-light` + texto `--info-blue`) sobre fundos
   claros; azul sólido (`--info-blue` + texto `--t-light`) sobre os fundos verde-escuros.
4. **Campo (`.input-text`)** — entrada de texto. Tag: `<input>`/`<textarea>`; sem borda, foco por mudança
   de cor do fundo (`--p-green-light`). **Autofill do navegador:** o azul-claro padrão do `:-webkit-autofill`
   é repintado com a cor normal do campo via `-webkit-box-shadow: inset 0 0 0 1000px …` (+ `--shadow-sm`) e
   `transition: background-color 9999s` (senão volta/pisca após o blur). Nome e sobrenome do cadastro são um
   PAR de autofill (`autocomplete="given-name"`/`"family-name"` + `name` correspondentes), para o navegador
   oferecer preencher os dois juntos, não um por vez.

Ao criar um elemento novo, escolha a categoria pelo papel e reuse a base — não crie uma árvore de classe
paralela (foi o que gerava divergências, ex.: dois "compartilhar" com bases diferentes → um com bug de
borda de UA e outro não). Pendência: alguns botões do feed ainda são bespoke (`.pedido-chip`, `.vaga-day`,
`.vaga-benefit-pill`, `.helper-toggle` → candidatos a `.chip`; `.pro-card__pin-btn`, `.pro-card__load-more`,
`.post-card__report`, `.top-bar__action`, `.contract-mini__btn` → candidatos a `.btn`). Migrar ao mexer neles.

**Helpers/padrões reutilizáveis (evitam CSS-in-JS e recortes duplicados):**
- **DESIGN SEM CONTORNO (v226+):** o app NÃO usa mais linha de borda para definir cards, inputs,
  pílulas, botões (fechar/outline), células OTP etc. A definição vem de: (a) **contraste** do fundo do
  elemento com o fundo atrás dele, e (b) **sombra** (`--shadow-sm`) nos elementos sobre fundo claro/verde.
  Sombra escura NÃO aparece sobre o verde escuro, então elementos SOBRE o verde (cards de pedido/histórico)
  usam um **fill claro** (`--card-on-green`, branco translúcido) em vez de sombra. Os efeitos de estado
  (foco/seleção/erro) mudam a **COR INTERNA** do elemento (ver "Destaque de estado por COR"), nunca uma
  sombra/anel — sombras de destaque furavam bordas e viravam linha sólida. O pedido urgente NÃO tem mais
  linha vermelha (só o badge "Urgente"). PRESERVADAS as bordas FUNCIONAIS (não são contorno de card): anéis de avatar,
  o anel do `.notif-badge` (separa o badge da barra verde), divisores internos entre seções, caixa do
  checkbox, checkmark desenhado com borda, anel do spinner e a seta do balão do tutorial. (A moldura de foto NÃO tem mais tracejado — só o fundo claro; a borda vermelha
  aparece só no estado de erro obrigatório.) **Reset obrigatório** (`base.css`):
  `button, input, textarea { border: none }` — sem isso, ao remover a borda explícita de um `<button>`
  reaparece a borda de UA (bevel `outset` BICOLOR em vários mobile). O antigo tracejado do `.vaga-add-btn`
  foi REMOVIDO na v268 (o botão hoje é texto dourado sobre fill `--on-green-faint`, sem borda) e não há
  mais `<select>` nativo no app (os horários da vaga usam stepper próprio).
- **`.card` (primitiva de superfície, `components.css`)** — casco compartilhado das superfícies claras
  (cadastro/feed/install). Invariante: `--radius-md` + fundo claro + `border:none`. Modificadores: `--soft`
  (fundo `--bg-soft`), `--shadow` (`--shadow-sm`, definição sem contorno). Já usada em `.contract-card`
  (`card card--shadow`), `.location-check` (`card`), `.profile-public-check` (`card card--shadow`),
  `.ic-card` (`card card--shadow` + gradiente verde próprio) e nos passos do install (`card card--soft`,
  contraste no verde). Ao criar uma superfície clara nova, componha a partir de `.card` (+ `--shadow`)
  em vez de reescrever fundo/raio/sombra — nunca adicione contorno.
- **`.eyebrow` (rótulo/sobretítulo uppercase, `components.css`)** — receita única de rótulo em caixa alta
  (`--p-green`, `--fs-5`, 700, uppercase), compartilhada com `.form-group__label` num seletor agrupado.
  `.ic-hero__title` a usa no HTML (só mantém extras de layout). Novos rótulos uppercase devem receber a
  classe em vez de reescrever cor/tamanho/peso/caixa-alta.
- **`.btn__spinner`** (`components.css`) — spinner de carregamento dos botões (glifo `autorenew` girando,
  peso 700). Usar `class="material-symbols-rounded btn__spinner"` no `innerHTML`; a variante `--sm`
  (fonte 16px, margem menor) é para o link de reenvio de SMS. Antes o estilo era inline e duplicado em
  `auth.js` (`setButtonLoading` + handler de reenvio).
- **`.chip` + `.chip--md` (casco de pílula)** — `.chip` (`feed.css`) é o casco base (radius-pill,
  inline-flex, transição); `.chip--md` é a métrica das pílulas do cadastro (padding `8px 14px`, `--fs-5`,
  sem borda). As pílulas de pagamento (`chip chip--md chip--payment`) e as `.tag-pill`
  (`chip chip--md tag-pill`, geradas em `onboarding.js`) usam esse casco; `.tag-pill` aplica o tint via
  seletor de 2 classes `.chip.tag-pill` (vence o `.chip` base por especificidade, independente da ordem
  de carga). Isso encerrou a antiga briga de especificidade `.chip.chip--payment`.
- **Pílula "tint preenchido" (azul)** — o estado selecionado de `.tag-pill` e de `.chip--payment.chip--active`
  compartilham a MESMA receita: fundo `--info-blue-light` + texto `--info-blue`, SEM borda (design sem
  contorno; as antigas declarações de borda 1.5px nunca renderizavam — o reset zera o border-style — e
  foram removidas na v261). Desde a v262 é a linguagem de seleção do APP INTEIRO sobre fundos claros
  (contratos, candidatura, card de serviço, busca de área); sobre os fundos verde-escuros a seleção usa o
  par invertido `--info-blue` sólido + `--t-light` (ver "SEMÂNTICA DE CORES"). Qualquer elemento
  selecionável novo deve seguir o par azul do seu contexto.
- **Empty-state de lista sobre verde** — `.list-empty-hint` (+ `--block`, `feed.css`) para avisos de
  "lista vazia" (indicados/agenda), no lugar de cor inline em `feed.js`.
- **Cor da barra de status:** `window.THEME_COLOR` (`app.js`) é a fonte única do verde `#184e1b` da
  `meta[theme-color]`. Todas as telas são verdes, então é uma constante (não mais um mapa view→cor). O
  modo indicação do feed NÃO altera o theme-color (a barra continua verde).

**Altura do viewport:** `--app-height` — definida por JS em `app.js` via `window.innerHeight`,
para corrigir o comportamento inconsistente de `100vh`/`100dvh` em PWAs instalados e webviews.
Consumida em `html/body` (`base.css`, cascata de fallback) e nos `max-height` dos sheets do feed e
do diálogo com scroll — sempre como `var(--app-height, 100dvh)`, nunca `dvh` cru.

**Escala tipográfica:** `--fs-1` (0.6rem) → `--fs-13` (2.2rem). Todo `font-size` de TEXTO usa um token da escala; exceções: os `clamp()` responsivos (auth.css), ícones Material Symbols (dimensionam glifo, não texto), `.qav__label` (0.55rem — abaixo de `--fs-1`, senão trunca na coluna de 48px) e o numeral-hero 70 do IC (1.9rem, entre `--fs-12` e `--fs-13`).

**Pesos de fonte:** títulos de tela/diálogo/painel/seção = 800; nomes de pessoas em cards = 700; labels/botões/chips = 600/700. Nota: a Inter é carregada apenas nos pesos 400/600/800 (`index.html`) — `font-weight: 700` declarado renderiza com a face 800.

**Ícones:** Material Symbols Rounded (Google CDN), carregados no `<head>`.
- Default da classe base (`base.css`): `'FILL' 1, 'wght' 500, 'GRAD' 25, 'opsz' 48`
- Preset filled forte (heros/títulos): `'FILL' 1, 'wght' 700, 'GRAD' 25, 'opsz' 48`
- Preset filled médio (blocos Pro/pílulas): `'FILL' 1, 'wght' 600, 'GRAD' 25, 'opsz' 24`

**Índice de Confiança (IC) — faixas e classes:**
| Faixa | Classe CSS | Ícone Material |
|---|---|---|
| 75–100 | `ic--ok` (verde) | `gpp_good` |
| 50–74 | `ic--warn` (ouro) | `shield_question` |
| 25–49 | `ic--alert` (vermelho) | `gpp_maybe` |
| 0–24 | `ic--bad` (cinza) | `gpp_bad` |

#### Card do IC no cadastro (`.ic-card`, `#view-onboarding`) — o "SELO DE REPUTAÇÃO"

**Visual do card:** CARD VERDE ESCURO EM DEGRADÊ (`linear-gradient(145deg, --p-green, --p-green-dark)`)
com sombra nas bordas (`--shadow-lg`), sobre o fundo `--bg-canvas` do cadastro — é o card ESCURO da dupla.
SEM borda. Textos/elementos CLAROS: ícone do cabeçalho `--a-gold`, título (`.ic-card__eyebrow`) `--t-light`,
nota/rodapé `--p-green-light`, destaque do rodapé `--a-gold`, botão de ajuda `--p-green-light`. O hero
(`.ic-card__intro`) NÃO é mais um card/moldura: os itens (título dourado + subtítulo branco + 70/escudo
dourados) ficam soltos direto sobre o card externo verde escuro (sem fundo, sem inset). No medidor, a zona
morta (<25%) é PRETA (`#000`, escudo + faixa numérica + segmento da barra) por pedido explícito, igual ao
`.ic-meter__seg--bad`; o texto dourado usa `--a-gold` cheio; vermelho/verde das outras faixas seguem.

**Regras de texto (invioláveis):**
- Nunca abreviar "IC" em texto visível ao usuário: sempre "Índice de Confiança". Vale também para
  `helpTexts['btn-ic-info']` em `onboarding.js`, que diz "70%" (nunca "100 pontos") e não abrevia.
- Nos textos visíveis do card NUNCA usar travessão "—" (estranho ao usuário): usar vírgula, ponto e
  vírgula ou dois-pontos.

**Estrutura (de cima p/ baixo; seções irmãs num flex column com `justify-content: space-between` para
distribuir a altura extra):**
1. **Cabeçalho `.ic-card__head`** — no PADRÃO dos TÍTULOS do cadastro ("Detalhes profissionais",
   "Registrar sua região atual"): ícone `verified_user` VERDE 1.5rem + texto "Sua reputação na
   plataforma" (`--fs-7`, 800, `--p-green-dark`, sem uppercase).
2. **Hero `.ic-card__intro`** — NÃO é mais um card/moldura (fundo e inset removidos): os itens ficam soltos
   direto sobre o card externo verde escuro. Contém o `.ic-hero`:
   - **Subtítulo `.ic-hero__title`** "Índice de Confiança" — `.eyebrow` (`--fs-5`, 700, uppercase) mas
     DOURADO (`--a-gold`, sobrepõe o verde do eyebrow) sobre o card verde; + frase de responsabilidade
     `.ic-hero__text` em BRANCO (`--t-light`), em bloco à esquerda com largura contida (`flex: 0 1 62%`).
     O subtítulo vive AQUI, ao lado do número, nunca é escondido.
   - **Número 70** em degradê dourado (`--a-gold`→`--a-gold-text`) via `background-clip: text`, SEM "%",
     DENTRO de uma MOLDURA em forma de escudo `.ic-hero__badge`: SVG inline `.ic-hero__badge-shield`, SÓ
     o contorno (`stroke: --a-gold`, sem preenchimento), no formato dos escudos do app. SVG em vez de
     glifo da fonte de propósito: controle total de tamanho/traço, sem depender do carregamento da fonte.
     O 70 é absoluto, centralizado em `translate(-50%, -55%)` (o centro visual do escudo fica acima do
     centro da caixa). A moldura se centraliza na zona à direita do texto — do fim do texto até a borda de
     conteúdo do card externo (`flex: 1; text-align: center`; hero sem gap; sem o antigo `margin-right`
     negativo, que só existia para anular o padding do card interno agora removido).
3. **Medidor `.ic-meter`:**
   - **Zonas `.ic-meter__zones` ACIMA da barra** — os MESMOS escudos do resto do app
     (`gpp_bad`/`gpp_maybe`/`shield_question`/`gpp_good`) nas cores PADRÃO sobre fundo claro. A faixa
     <25% é PRETA `#000` (escudo + segmento): a "zona morta" do índice. Zonas SEM nomes de faixa (só
     escudo + faixa numérica; os escudos coloridos já comunicam). A zona atual `.ic-zone--current` acende;
     as demais ficam com `opacity: 0.78`.
   - **Barra segmentada** nas 4 faixas.
   - **Pino "CONFIANÇA ATUAL"** pulsante (`icPinPulse`) ABAIXO da barra, em `left: 70%`: linha subindo até
     a barra + etiqueta em linha única (`white-space: nowrap`).
4. **`.ic-factors`** — SÓ a nota `.ic-factors__note`, itálica e centralizada: "Todas as suas ações, boas
   ou ruins, afetam esse índice". A antiga tabela "Faz descer"/"Faz subir" foi REMOVIDA de propósito, não
   recriar. (Resumo do diálogo de ajuda `btn-ic-info`; "Indicações FEITAS", não "recebidas".)
5. **Rodapé `.ic-card__footer`** — lema "O Índice de Confiança é seu bem mais valioso na plataforma, seja
   honesto e responsável e ele lhe recompensará", centralizado, mesma fonte da nota (`--fs-1`); o
   destaque é `--p-green-dark` em linha própria (`display:block`).

**Layout de altura:** `.form-group--ic-fill` = `flex: 1 0 auto` (preenche o vão até o botão de concluir).

**Adaptativo por altura** (`@media (max-height)` em `#view-onboarding`; limiares MEDIDOS por estado:
completo ~819px, sem rodapé ~776px, sem nota ~751px, compacto ~689px):
- ≤823px: esconde o rodapé.
- ≤780px: esconde a nota e aperta o padding.
- ≤755px: compacta (some a frase do hero; encolhem cabeçalho, card interno, moldura-escudo/70 e escudos).

Cabe sem rolagem de ~689px pra cima. **O hero (70) e o medidor com os 4 escudos ficam SEMPRE.**

---

## Tutorial Guiado (Coach Marks)

Motor genérico e reutilizável (`js/tutorial.js` + `css/tutorial.css`) para tours guiados em cima de
qualquer tela — hoje usado no cadastro (`view-onboarding`); a ideia é reaproveitar no feed no futuro
sem recriar elementos por tela.

**Formato:** camada `position:fixed` de tela inteira. Uma única máscara (`#tutorial-mask`) recorta um
"buraco" com cantos arredondados — via `clip-path: path(evenodd, ...)` gerado em JS (`roundedRectPath()`),
com o MESMO raio do anel de destaque — exatamente no retângulo do elemento-alvo. A máscara escurece
(`--overlay-soft`) e desfoca (`backdrop-filter: blur(1.5px)`, sutil de propósito) todo o resto da tela e
**bloqueia toque/clique fora do buraco** (`pointer-events: auto`); como o recorte também é respeitado
pela detecção de clique, a área fora do buraco realmente não responde a toque. Só o elemento em destaque
fica 100% nítido e interativo — dá pra preencher campos, tocar botões etc. "junto com o tutorial", sem
conseguir mexer em nada fora do passo atual. Um anel dourado pulsante (`--a-gold`) marca o destaque
(cantos arredondados iguais aos da máscara), e um balão (`.tutorial-balloon`) mostra um cabeçalho
(`.tutorial-balloon__header`) com o progresso (`N / total`) à esquerda e o link "Pular tutorial" à
direita — mesma posição de canto que um antigo ícone "X" de fechar ocupava, antes de ser substituído
por esse link de texto — seguido por título, texto e botões Voltar/Próximo. O balão nasce com
`visibility: hidden` por padrão (CSS) e só fica visível depois que `positionStep()` calcula o lugar
certo — sem isso ele "pisca" por um instante no canto padrão da tela antes de saltar pra posição
correta, mais perceptível no primeiro passo.

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
- **Auto-scroll + acompanhamento em tempo real (scroll NÃO é travado):** ao entrar em cada passo, o motor
  decide ANTES de rolar se o balão vai ficar abaixo ou acima do alvo (`decidePlaceBelow()` — cabe embaixo
  se `altura do alvo + altura do balão + margem` for menor que a viewport; senão vai por cima; `step.position`
  força um lado específico) e rola (`scrollIntoView`) alinhando o alvo no lado OPOSTO da tela
  (`block:'start'` quando o balão fica embaixo, `block:'end'` quando fica em cima) — isso garante espaço
  de sobra do lado do balão, em vez de só centralizar o alvo (`block:'center'`), que podia deixar alvos
  grandes "presos" no meio da tela sem espaço suficiente nem acima nem abaixo (era o caso do Índice de
  Confiança). `applyScrollPadding()` reserva uma folga extra no topo/base do container via CSS
  `scroll-padding` (respeitada nativamente por `scrollIntoView`) — assimétrica de propósito:
  `SCROLL_PADDING_TOP` (24px, soma-se à margem de `decidePlaceBelow()`) é generosa porque a maioria dos
  passos usa `block:'start'`; `SCROLL_PADDING_BOTTOM` (8px) fica pequena porque `block:'end'` normalmente
  é usado por alvos grandes/perto do fim da página (já um caso apertado), e não pode consumir o pouco
  espaço que sobra para o balão acima. Sem essa folga, `block:'start'` alinhava o alvo bem rente à borda
  da tela, cortando visualmente o início da seção. Em vez de "adivinhar" quando a rolagem suave termina
  com um temporizador fixo, um listener de `scroll` persistente (`startScrollWatch`) reposiciona tudo a
  cada evento real de scroll — inclusive scroll MANUAL do usuário, já que o container não fica com
  `overflow:hidden` durante o tour: seções que ficam mais altas que a tela ao expandir (ex.: "Detalhes
  profissionais") precisam que o usuário role à vontade para ver tudo, e esse listener mantém o destaque
  e o balão acompanhando esse scroll também. Ao terminar (concluído ou pulado), o container volta pra
  posição de scroll de antes do tour começar (`originalScrollTop`) — sem isso a tela ficava "parada" onde
  o último passo tinha rolado (ex.: cabeçalho cortado no topo) em vez de voltar ao estado normal.
- **Reposicionamento:** o balão mede a si mesmo antes de decidir o lado (função acima) e nunca deixa a
  seta ou o card vazarem da viewport; reposiciona também no `resize`. O cálculo de acima/abaixo do balão
  usa sempre o retângulo ORIGINAL do alvo (nunca o estendido por conteúdo colapsável — ver abaixo): se um
  colapsável abrir maior que a tela inteira, não existe posição sem alguma sobreposição, então a base do
  cálculo fica no alvo em si (que quase sempre cabe), com um teto de extensão (`maxExtension`, 400px) para
  não tentar perseguir um fundo real inalcançável. Quando NENHUM dos dois lados cabe de verdade (alvo
  grande demais pro espaço disponível, ex.: perto do fim da página — `block:'start'` não consegue "puxar"
  o alvo até o topo por falta de conteúdo abaixo dele no documento), o motor faz um "melhor esforço":
  fica do lado com mais espaço livre (`spaceAbove` vs `spaceBelow`), minimizando a sobreposição em vez de
  manter cegamente o lado decidido originalmente.
- **Elementos colapsáveis/expansíveis no alvo atual:** um `MutationObserver` (classe/estilo/filhos, no
  container com scroll da tela — nunca no próprio overlay do tutorial, para não entrar em loop reagindo
  às suas próprias mudanças de posição) reposiciona tudo automaticamente sempre que o DOM muda enquanto
  o tour está ativo — ex.: o usuário toca no próprio alvo em destaque (permitido, é a única área
  clicável) e isso abre um `<details>` ou um `.collapsible__panel` bem ao lado. `getExtendedRect()`
  verifica se o irmão logo abaixo do alvo (mesmo pai, colado, ex.: o painel de um colapsável) está
  visível e, se estiver, estende o retângulo considerado — usado SÓ no "buraco" do destaque/máscara,
  pra revelar esse conteúdo recém-aberto (nítido e tocável) em vez de deixá-lo escurecido/bloqueado. Só
  estende se o irmão já nascia OCULTO no início do passo (`siblingStartedHidden`) — um irmão que já é
  SEMPRE visível (ex.: a seção de localização logo abaixo dos dados pessoais) nunca é incluído por
  engano só por estar colado e visível, mesmo sem ter sido "revelado" por nenhuma interação do passo.

**Uso atual (cadastro):** `window.startOnboardingTutorial()` em `js/onboarding.js` define 4 passos
(dados pessoais — foto+nome+sobrenome juntos, região, detalhes profissionais, Índice de Confiança — este
último com `position:'top'` explícito, pois é o último campo antes do botão de concluir e não há
conteúdo suficiente abaixo dele na página) e é chamado por `session.js` ~600ms depois de
`showView('view-onboarding')` (tempo da animação de entrada + fade do loader). Tutorial id: `'onboarding'`.

**Para reaproveitar em outra tela (ex.: feed, futuramente):** defina uma nova função
`startXTutorial()` no módulo daquela tela com sua própria lista de passos e chame
`window.startTutorial(steps, { id: 'nome-unico' })` no ponto em que a tela aparece pela primeira vez —
não é necessário tocar em `js/tutorial.js` nem em `css/tutorial.css`.

---

## Padrões Importantes

**Mobile-only:** `window.IS_MOBILE` é definido sincronicamente no `<head>` do HTML (antes de qualquer render). Em desktop, `html.is-desktop` é adicionado ao `<html>` e um overlay bloqueia o app. `session.js` verifica `IS_MOBILE` para abortar o fluxo; em `app.js` só o REGISTRO do Service Worker é condicionado a `IS_MOBILE` (o `firebase.initializeApp` roda também em desktop — inofensivo, o overlay bloqueia a UI).

**Orientation lock:** modo paisagem bloqueado em dois níveis — `manifest.json` (`"orientation": "portrait"`) e overlay CSS em `components.css` via `@media (orientation: landscape)`.

**Fundo verde em TODO o app:** todas as telas têm fundo verde (`--p-green`) hoje — auth (intro +
telefone + OTP), onboarding, install e feed. Por isso a `meta[name="theme-color"]` é verde em todas:
a constante única `window.THEME_COLOR = '#184e1b'` em `app.js` (não existe mais mapa view→cor).

**Fluxo de auth (`#view-auth`) + instalação (`#view-install`) verdes:** `#view-auth.screen` tem fundo
`--p-green`; `#view-install.screen` usa o verde escuro **`--bg-canvas`** (o MESMO do cadastro e do feed;
os cards de passos `--bg-soft` contrastam sozinhos sobre ele). A classe `.auth-section` é usada nos dois
containers (ambos verdes), então seus textos base já nascem claros: `.auth-section__title` → `--t-light`,
`.auth-section__text`/`.auth-section__legal`/`.auth-section__cooldown` → `--p-green-light`, links do legal
→ `--a-gold`. Botões primários (`Enviar SMS`, `Verificar e Entrar`, `Instalar agora`) viram amarelos via
`#view-auth .btn--primary, #view-install .btn--primary { background:--a-gold; color:--p-green-dark }` —
verde sumiria no fundo. Botões de texto (Alterar número, Reenviar SMS, Continuar no navegador, retry) →
`--a-gold` (dourado, denotando ação clicável — o verde-claro se camuflava no texto comum). Os inputs
(telefone `--bg-white`, OTP `--bg-soft`) e os cards de passos da instalação (`.install-guide__step`,
`.install-progress__note` em `--bg-soft`) têm fundo claro e **se destacam sozinhos** sobre o verde,
mantendo as cores escuras internas. O ícone hero da instalação (`.auth-section__icon-hero`) segue dourado.

**Tela de boas-vindas (intro), específicos:** o 1º slide usa
`<img src="icon-intro.svg" class="intro-carousel__icon-img">` (recorte justo do operário, fundo
transparente) no lugar do antigo glifo `verified_user` — os slides 2 e 3 mantêm os ícones Material
dourados. Título do 1º slide é só "Gente Honesta" (sem "Bem-vindo ao"). Os 3 ícones (glifos e logo)
compartilham o MESMO slot de altura fixa (`clamp(5.5rem,26vw,8.5rem)` + centralização flex em
`.intro-carousel__icon`/`.intro-carousel__icon-img`), então título e texto ficam alinhados ao
deslizar; o logo usa o recorte `icon-intro.svg` (em vez do `icon-transparent.svg`, de margem larga)
para preencher esse slot e não ficar menor que os glifos. Botão `#btn-start` usa `btn--accent`
(amarelo). Dots (`.intro-carousel__dot`) inativos em branco translúcido, ativo em `--info-blue-bright`
(seleção = azul; o `--info-blue` cheio e o verde padrão sumiriam no fundo escuro).

**Loader global:** `#loader-global` — mostrado/ocultado com `u-hidden`. O `onAuthStateChanged` é o único responsável por ocultá-lo em transições normais. Em erros onde o estado de auth não muda, remover manualmente. Visual: fundo `--p-green` e spinner branco (trilho em branco translúcido, topo `--t-light`) — coerente com os ambientes verdes; a `meta[name="theme-color"]` inicial também é verde (`#184e1b`) para a barra de status combinar durante o carregamento, antes de `showView` assumir. **CSS crítico inline no `<head>`** pinta o `html` de verde e já dá ao `.overlay-loader` os estilos de cobertura (`position:fixed; inset:0; background:#184e1b; z-index:9999`) — sem isso, entre o `base.css` (que pinta html/body de branco) e o `components.css` (que só então estiliza o loader) havia um flash branco no fim do splash; `.u-hidden` (base.css) ainda vence e esconde o loader normalmente. **Telas não têm animação de entrada** (`.screen` sem `animation`): um `translateY` de entrada deixava uma tira do body branco no topo por um instante, e um fade de opacidade deixava o body vazar durante o fade-out do loader — a transição entre telas fica por conta do fade-out do loader.

**Diálogos:** sempre usar `await customAlert(...)` e `await customConfirm(...)` — nunca `alert()` ou `confirm()` nativos.
Os popups de alerta/decisão/ajuda (`#dialog-global`) seguem o **padrão VERDE** (como as telas): fundo
`--p-green`, ícone dourado, título `--t-light`, mensagem `--p-green-light`, botão confirmar dourado
(`#dialog-global .btn--primary`) e cancelar branco translúcido (`.btn--outline`). Escopado ao
`#dialog-global` — o diálogo da câmera (`.dialog-box--camera`) tem tratamento próprio.

**Tela de cadastro com fundo verde escuro (`#view-onboarding`):** o fundo é `--bg-canvas` (verde
escuro canvas, o MESMO das listas de profissional/pedido do feed; escopado em `#view-onboarding.screen`
— telefone/OTP/feed não são afetados). A estratégia é que quase todos os campos já têm fundo claro/branco
(foto `--bg-input`, inputs/localização `--bg-white`) — então eles **se destacam
sozinhos** sobre o verde escuro e todo o conteúdo DENTRO deles segue com as cores escuras normais. A
ÚNICA exceção é o card do Índice de Confiança (`.ic-card`): ele é um **card verde escuro em degradê**
(`linear-gradient` --p-green→--p-green-dark, com sombra); o hero interno (título/subtítulo/70) fica solto
sobre ele, sem card/moldura, com textos claros/dourados (ver seção "Card do IC no cadastro"). A seção "Detalhes profissionais" (colapsável) tem **topo (gatilho)
BRANCO e corpo (painel) CINZA CLARO** (`--bg-soft`): os elementos internos (inputs, cards de serviço,
`.service-choice-display`, pílulas de pagamento em repouso) ficam BRANCOS e se destacam como cards no
corpo cinza. Só mudam os
elementos que ficam DIRETAMENTE sobre o verde: cabeçalho (título → `--t-light`, subtítulo → `--p-green-light`,
`#btn-onboarding-cancel` → `--a-gold` dourado, denotando ação clicável) e o botão final
`#btn-finish-onboarding`, que passou de `btn--primary` (verde, sumiria
no fundo) para `btn--accent` (amarelo). Ao mexer no cadastro, lembre: adicionar um elemento novo direto no
verde (fora de um card claro) exige dar a ele cor clara; dentro de um card claro, as cores normais valem.

**Onboarding preenche a tela sem sobra (`.onboarding-form`):** `<header class="screen__header">` e
`<form class="onboarding-form">` são IRMÃOS dentro de `#view-onboarding.screen` (que é `display:flex;
flex-direction:column`). O form usa `flex: 1; min-height: 0` — NUNCA `min-height: 100%`. Como os dois são
itens flex na mesma coluna, `min-height:100%` no form referenciaria a altura TOTAL do `.screen`, ignorando
que o `<header>` já ocupa espaço antes dele, e estouraria a tela; `flex:1` ocupa exatamente o espaço que
sobra depois do cabeçalho. `#btn-finish-onboarding` usa `margin-top: auto` para ser empurrado até a base,
absorvendo sozinho a folga quando o conteúdo é mais curto que a tela (ex.: "Detalhes profissionais"
fechado); quando o colapsável abre e o conteúdo fica mais alto que a tela, a margem automática zera e o
`.screen` (`overflow-y: auto`) assume o scroll normalmente — nada trava a expansão do colapsável.
`.screen__header-nav` (`.screen__title` + botão Cancelar) é `display:flex`; o título usa `flex:1;
text-align:left`, ocupando o espaço restante à esquerda, enquanto o botão fica à direita (`flex-shrink:0`),
respeitando a margem direita via o padding do próprio `.screen` — o título usa `--fs-11` (não `--fs-12`)
porque, dividindo a linha com o botão, o tamanho padrão de título de tela quebraria "Complete seu Perfil"
em duas linhas e estouraria a altura da tela sem scroll.

**Botão de saída do onboarding é "Cancelar", não "Voltar":** `#btn-onboarding-cancel` (à direita do
título, dentro de `.screen__header-nav`) é texto puro, sem ícone — porque ele não navega para um passo
anterior, apenas encerra a sessão e devolve para `view-auth` (mesma função de sempre: `customConfirm` →
`auth.signOut()` → `onAuthStateChanged` cuida do reset via `resetAuthFlow`). O título usa `flex:1;
text-align:left`, o que já empurra o botão para o extremo direito da linha e mantém a maior distância
possível entre os dois.

**Setas de "voltar" como ícone, nunca caractere de texto:** `#btn-back-phone` usa
`<span class="material-symbols-rounded">arrow_back</span>` em vez do caractere `←` solto no texto, pois
ele volta ao passo anterior (telefone) dentro do fluxo de auth. Um glifo digitado como caractere de texto
solto nunca deve substituir o ícone: não compartilha a métrica vertical das letras ao redor e fica
visivelmente mais baixo que o rótulo; dentro do `.btn` (que já é `display:flex; align-items:center`),
o ícone fica automaticamente centralizado com o texto. `.btn--text .material-symbols-rounded` fixa o
ícone em `1.1rem` para não ficar grande demais perto do texto do link.

**TDZ em DOMContentLoaded:** dentro do callback de `DOMContentLoaded` em `feed.js`, todas as variáveis declaradas com `const`/`let` ficam na temporal dead zone até sua linha de declaração. Chamar uma função `const` antes de ela ser declarada lança `ReferenceError` silencioso que interrompe TODO o callback — os event listeners abaixo do ponto de erro nunca são registrados. Sempre declare `const` helpers/funções ANTES da linha que os chama, ou mova a chamada para depois da declaração.

**function declarations vs const em feed.js:** helpers que precisam ser chamados antes de sua posição textual no DOMContentLoaded DEVEM ser `function` declarations (são hoistadas). São `function` declarations: `renderFlippableProCards`, `bindProCardFlip`, `handleLoadMoreComments`, `resetProCardBack`, `proCardFlipToBack`, `proCardFlipToFront`, `flipCardToBack`, `flipCardToFront`, `icTier`, `icShieldIcon` (usadas por `applyFilters`, definido antes delas), `openFiltersSheet`, `closeFiltersSheet`, `historicoItemHTML`. Nunca converter para `const` arrow functions sem mover a declaração para antes de todas as chamadas.

**`text-decoration` não propaga de forma confiável para filhos de um flex container:** `.pro-card__meta-item--inactive` (rodapé do card de profissional, `proFooterHTML()` em `feed.js`) risca só o texto do método de pagamento indisponível, nunca o ícone — mas o `text-decoration: line-through` está no span do RÓTULO (`.pro-card__meta-item__label`), não em `.pro-card__meta-item--inactive` diretamente. Colocar o risco no item (que é `display: inline-flex`) e tentar excluir o ícone com `text-decoration: none` nele NÃO funciona no Chrome: como `.pro-card__meta-item` é um flex container, o ícone (item flex) é "blockificado" e o navegador ignora esse `none`, riscando o ícone mesmo assim. A solução é aplicar o risco direto no span do texto, nunca herdado de um ancestral flex.

**Service Worker:** incrementar `CACHE_NAME` em `service-worker.js` a cada deploy com mudanças de cache. Versão atual: `gentehonesta-v279`. Os arquivos CSS e JS são atualizados automaticamente pelo Network-First; o incremento serve para forçar limpeza de caches antigos. **CRÍTICO (v264): o fetch same-origin usa `fetch(request, { cache: 'no-cache' })`** — sem isso, o `Cache-Control: max-age=600` do GitHub Pages fazia o `fetch()` do SW devolver arquivos VELHOS do cache HTTP do navegador por até 10 minutos após um deploy, e o botão "Atualizar" do banner recarregava a página recebendo a versão antiga de novo (a atualização parecia não fazer nada). `no-cache` = revalida no servidor via ETag (304 quando nada mudou, custo mínimo). Cross-origin (fontes do Google) segue o cache normal. NUNCA remover esse `cache: 'no-cache'`.

**Selo de versão (`#version-badge`):** desde a v279 vive DENTRO da top bar do feed, ao lado da marca
"Gente Honesta" (`.top-bar__version` em `feed.css`: sobrescrito dourado pequeno `--fs-1`) — não é mais um
marcador flutuante fixo. É um irmão de `.top-bar__brand-text` (o texto da marca), então `setTopBarTitle`
troca só o TEXTO da marca e ESCONDE o selo (`u-hidden`) enquanto o título de uma gaveta ocupa a top bar,
restaurando-o ao fechar. Mostra a versão do deploy servido (os arquivos são Network-First, então reflete
o que o usuário está vendo, ao contrário do SW que pode estar defasado). Só aparece no feed (não nas telas
de auth/onboarding/install). **O texto de `#version-badge` em `index.html` (`v###`) DEVE ser bumpado JUNTO
com o `CACHE_NAME`** a cada deploy — é a fonte visual de "estou vendo a versão nova?".

**Seção "Detalhes profissionais" — abertura ANIMADA + obrigatoriedade condicional:** o painel
`#panel-prodetails` abre/fecha com animação de altura (`setProDetailsOpen(open, animate)` em
`onboarding.js`, função declaration hoistada): mede `scrollHeight` em runtime e anima `height` 0↔conteúdo
(abre em 1s, fecha em 0.5s; SÓ altura — sem fade de opacidade, que deixava o verde vazar no fechamento; abre com easeOut e fecha com easeIn, curvas ESPELHADAS: usar easeOut no fechamento arrastava o último naco/título antes de sumir); `u-hidden` continua o estado fechado final (a animação só ocorre na transição). Usada pelo
gatilho, pelo `resetOnboardingForm` (`false`, instantâneo) e pelo `finishRegistration`. O cap reto do gatilho
(cantos inferiores retos + borda inferior transparente) vem de `collapsible--connected` (distinta de
`collapsible--open`, que só gira o chevron): `connected` vive do início da abertura ao FIM do fechamento e o
raio/borda do gatilho NÃO têm transição — assim o gatilho fica reto sobre o painel durante toda a animação, sem
o "rasgo" verde de quando o canto arredondava sobre o topo reto do painel. **Obrigatoriedade
condicional:** a seção é opcional, mas se o usuário preencher QUALQUER item que digita — área/profissão
(tags) OU habilidades (bio) — os dois passam a ser exigidos para o perfil profissional ficar público.
**Padrão de Serviço e Pagamento são ISENTOS** (têm defaults: card "Padrão" e "Dinheiro"), então não
disparam a seção sozinhos. Se ficou pela metade, `finishRegistration` mostra um `customConfirm`
("Dados profissionais incompletos") oferecendo concluir só o básico (segue) OU completar (`!proceed` →
`setProDetailsOpen(true)` + `highlightMissingProFields` marca em vermelho os campos vazios — `input-text--error`
em área/bio — e rola até o primeiro). Os destaques limpam ao
preencher (seleção de tag, input do bio) e no reset. `#btn-finish-onboarding` ganha
margem inferior confiável na rolagem via um ELEMENTO espaçador (`.onboarding-form__bottom-spacer`) logo
após o botão: com o `.screen` como container de scroll, o form (`flex:1`) TRANSBORDA para baixo e passa por
cima de qualquer `padding-bottom` (do form ou do `.screen`), colando o botão na base. A caixa de um elemento
sempre entra na área rolável, então o espaçador garante o respiro no fim da rolagem; quando o conteúdo é
curto, o `margin-top:auto` do botão empurra botão + espaçador juntos para a base. `#view-onboarding.screen`
zera seu `padding-bottom` para o respiro vir só do espaçador (não somar no caso curto).

Todas as subseções seguem o mesmo padrão visual
(sem cards/fundos individuais) — "O que você faz?", "Suas Habilidades" e "Padrão de Serviços" são
`.form-group` simples; a última usa `.form-group__header` (label + `#btn-service-help`, sem fundo) em vez
de um card cinza dedicado. O rótulo `(opcional)` (`.form-group__optional`) aparece só uma vez, no gatilho
do colapsável (`#btn-toggle-prodetails`, "Detalhes profissionais") — as subseções internas não repetem o
aviso, já que ele já foi dado no título da seção como um todo.

**"Padrão de Serviços" é SELEÇÃO por card + display único de barras** (`#container-service-choice`, GRADE
2×2 em `.service-choice` `grid-template-columns:1fr 1fr`), não mais barras com +/−. São 4 cards COMPACTOS
(`data-service` = `padrao`/`premium`/`rapido`/`economico`) só com ícone + título + subtítulo (check no canto);
cada um traz `data-q`/`data-a`/`data-v` (escala 0-10). As barras ficam num ÚNICO `.service-choice-display`
abaixo da grade, no MESMO componente `.qav` dos cards de profissional do feed (estilos em `feed.css`; largura
= valor×10%), com `#svc-fill-quality/agility/value` atualizados em `onboarding.js` (`updateServiceDisplay`) a
cada seleção — a largura ANIMA via `transition: width` escopada em `.service-choice-display .qav__fill` (as
barras do feed seguem sem transição). Combinações: Padrão 5/5/5, Premium 8/5/7, Rápido 5/8/6,
Custo-benefício 4/4/3 — o **máximo de qualquer barra é 8 (80%)**, nenhuma chega a 100%. Seleção ÚNICA
estilo RÁDIO (`applyServiceCard`/`setServiceCardActive` em `onboarding.js`): **sempre há um card ativo** —
"Padrão" já vem selecionado como base (`--active`/`aria-pressed`/`check_circle` no HTML + default
`serviceProfile {5,5,5}` em `app.js`); tocar em outro troca a seleção, tocar no já ativo não faz nada (sem
estado vazio). O `resetOnboardingForm` volta ao card "Padrão". Como Serviço (sempre um card) e Pagamento
(Dinheiro por default) têm valores base, NENHUM dos dois "inicia" a seção — a obrigatoriedade condicional é
disparada só por **área/profissão (tags) OU habilidades (bio)**; se um deles for preenchido, os dois passam
a ser exigidos (`allProFilled = tags && bio`).

Logo após, "Métodos de pagamento aceitos" reproduz as mesmas opções do rodapé do card de
profissional no feed (`proFooterHTML()` em `feed.js`), como pílulas `.chip.chip--payment` (mesma classe
`.chip` dos filtros do feed; `.payment-methods` só define o wrap do grupo) — o contexto "aceito" fica só
no título da seção (`.form-group__label`), então as pílulas trazem apenas o nome do método ("Dinheiro",
"Pix"). Cartão é um **grupo à parte** (`#container-payment-card`, com o subtítulo
`.payment-methods__subgroup-label` "Cartão"), de **seleção única** — não multi-seleção como o restante —
porque `pro.pay.card` no mock é sempre um valor único (`0` = nenhum, `'debit'`, ou o número máximo de
parcelas do crédito), nunca uma combinação: tocar em "Débito", "Crédito à vista", "Crédito até 6x" ou
"Crédito até 12x" desativa qualquer outra pílula do grupo antes de ativar a escolhida, e tocar na pílula
já ativa desmarca (volta a `card: 0`). "Emito nota fiscal" (`#container-payment-nf`) fica num
`.form-group` **separado, logo depois** — de propósito fora do bloco "aceitos", já que emitir NF não é um
método de pagamento e misturar as duas coisas confundiria o usuário. Cada pílula, dos três grupos,
sinaliza a seleção com um ícone `.chip__check` **à direita do texto** que alterna entre
`radio_button_unchecked` e `check_circle` (função `setPaymentChipActive()` em `onboarding.js`).
**Padrão visual unificado com as pílulas de profissão (`.tag-pill`)** para o cadastro ter uma linguagem
única: `.chip.chip--payment` iguala fonte (`--fs-5`) e padding (`8px 14px`) às `.tag-pill`, e o estado
ativo (`.chip--payment.chip--active`) usa o mesmo esquema "tint preenchido" delas — fundo tint + texto no
mesmo matiz, SEM borda (design sem contorno). Ambas usam o **azul** `--info-blue` + `--info-blue-light`
(as `.tag-pill` também foram trocadas de verde para azul, então os dois grupos compartilham exatamente a
mesma paleta) — cor herdada dos ícones de pagamento no rodapé do card de profissional
(`.pro-card__meta-item`). O seletor `.chip.chip--payment` (2 classes) é necessário
para vencer `.chip` sozinho de `feed.css`, carregado depois de `onboarding.css` com a mesma especificidade
de uma classe. Estado gravado em
`window.appState.paymentMethods = {cash, pix, card, nf}`, resetado junto com o resto do formulário em
`resetOnboardingForm`. Ao final do painel (depois de todos os campos), um **check simples de perfil
público** (`#chk-profile-public`, `.profile-public-check`, botão-card branco `card card--shadow` com
caixa de check que marca em AZUL — substituiu o antigo card-convite do Plano Pro na v265): "Tornar meu
perfil público para buscas e indicações na minha região". **Vem DESMARCADO por padrão** (o usuário
básico não tem cadastro profissional; tornar o perfil público pressupõe os dados profissionais
preenchidos — a seção é opcional). Estado em `window.appState.profilePublic` (boolean, default `false`),
togglado por `aria-pressed` e resetado para `false` no `resetOnboardingForm`. **AMARRADO aos dados
profissionais completos** no `finishRegistration`: marcado sem área+habilidades → `customConfirm`
("Perfil público incompleto") oferece completar agora (abre a seção + `highlightMissingProFields`) ou
concluir SEM perfil público (o check é desmarcado automaticamente e o cadastro segue). Essa checagem
roda ANTES do aviso de "dados profissionais incompletos" (regra mais específica primeiro).

**Atualização do PWA (banner "Nova versão disponível"):** o Service Worker NÃO chama `self.skipWaiting()`
no `install` — o novo worker fica parado em "waiting" até o usuário confirmar. Fluxo completo:
1. `js/app.js` chama `registration.update()` assim que o app abre (`window.load`) e sempre que volta ao
   primeiro plano (`visibilitychange` → `visible`) — não depende só da checagem automática do navegador
   (que pode demorar até 24h), garantindo detecção rápida de uma versão nova.
2. Ao detectar um worker novo instalado (`updatefound` → `statechange` → `'installed'`, só quando já
   existe `navigator.serviceWorker.controller`, ou seja, não é a primeiríssima instalação), exibe
   `#pwa-update-banner` (`u-hidden` → visível) com o botão "Atualizar". Ao exibir, a página pergunta a
   versão ao NOVO worker via `MessageChannel` (`{type:'GET_VERSION'}` → SW responde `APP_VERSION`,
   derivado do `CACHE_NAME`, ex.: `v174`) e atualiza `#pwa-update-text` para "Nova versão disponível
   (vN).". Se o worker novo for de uma versão antiga sem o handler, o texto padrão permanece.
3. Clique em "Atualizar" → `worker.postMessage({ type: 'SKIP_WAITING' })` → o SW recebe no listener
   `message` e só ENTÃO chama `self.skipWaiting()` → `clients.claim()` no `activate` assume a página.
4. `navigator.serviceWorker.oncontrollerchange` na página dispara `window.location.reload()` — mas só
   se o clique em "Atualizar" pediu a troca (flag `updateRequested`). **Cuidado:** `clients.claim()`
   também dispara `controllerchange` sozinho na primeiríssima instalação de um visitante novo (quando
   ainda não existe nenhum controller anterior) — sem essa guarda, todo primeiro acesso recarregaria a
   página sozinho sem nenhum update real ter acontecido.
- Nunca recarrega sozinho sem o clique do usuário — evita trocar a versão no meio de uma ação em andamento.
- **O reload do passo 4 só entrega arquivos NOVOS por causa do `cache: 'no-cache'` no fetch do SW** (ver
  seção "Service Worker"): antes da v264, o cache HTTP de 10 min do GitHub Pages devolvia os arquivos
  antigos no reload e o "Atualizar" parecia não funcionar (verificado com teste E2E simulando o
  `max-age=600` do Pages).
- `#pwa-update-banner` (HTML no fim do `<body>`, estilos em `components.css`) segue o mesmo contrato de
  visibilidade das camadas globais: `u-hidden` exclusivamente, `z-index: 10000` (acima até do tutorial).

**Estado global:** `window.appState` em `app.js`:
- `confirmationResult` — objeto de confirmação SMS do Firebase
- `photoBlob` — data URL da foto capturada pelo onboarding
- `stream` — MediaStream da câmera (deve ser stopado ao fechar)
- `selectedTags` — array de áreas profissionais escolhidas
- `cooldownActive` — rate-limit do SMS ativo
- `locationConfirmed` — GPS validado no onboarding
- `serviceProfile` — `{quality, agility, price}` (0-10) do card de padrão de serviço escolhido
- `paymentMethods` — `{cash, pix, card, nf}` métodos de pagamento aceitos (pílulas); `card` é
  `0 | 'debit' | 1 | 6 | 12` (mesmo formato de `pro.pay.card` no mock — nunca uma combinação).
  **`cash` já nasce `true`** (Dinheiro pré-selecionado): a seção de pagamento NÃO é obrigatória e
  vem com dinheiro marcado por padrão (HTML com `chip--active`/`aria-pressed="true"`, e o
  `resetOnboardingForm` reativa só a pílula Dinheiro)
- `profilePublic` — boolean, check "Tornar meu perfil público…" do cadastro (default `false`: o
  usuário básico não tem cadastro profissional; o check pressupõe a seção preenchida)

---

## Arquitetura do Feed (`#view-feed`)

### Bottom bar — 3 abas (`.feed-tabs-pill`)

Pílula verde flutuante (`.feed-tabs-pill`, com slider DOURADO `.feed-tabs-pill__slider` deslizando sob a
aba ativa, texto ativo `--p-green-dark`) dentro da `.bottom-bar` transparente (faixa de vidro fosco via
`::before`). O dourado aqui é EXCEÇÃO DELIBERADA à regra "seleção = azul" (pedido explícito): a bottom
bar é a barra de NAVEGAÇÃO/AÇÃO principal do app, não um seletor de formulário.

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
  └─ .agenda-filters__action-row       ← viewport (overflow:hidden) que recorta o trilho
       └─ .agenda-filters__track       ← trilho width:300%, desliza por translateX
            ├─ #bar-vagas-state        ← "Serviço de ajudantes" + "Criar vaga" (aba Vagas, ESQUERDA)
            ├─ #bar-search-state       ← campo de busca + botão de filtros (aba Profissionais, CENTRO)
            └─ #bar-pedidos-state      ← "Histórico" + "Fazer pedido/Pedido atual" (aba Pedidos, DIREITA)
```
O painel de filtros NÃO vive mais dentro da barra: virou o dropdown top-level `#filters-sheet` (ver
"Submenus dropdown" abaixo).

A barra é um **CARROSSEL sincronizado com o feed** (não mais fade): as três linhas ficam LADO A LADO no
`.agenda-filters__track` (cada uma `flex: 0 0 33.3333%`), na MESMA ordem das abas (vagas | busca | pedidos),
e o trilho desliza por `translateX` com a MESMA curva/duração do `.feed-panels`
(`transform 0.4s cubic-bezier(0.4,0,0.2,1)`). Default = busca no centro (`translateX(-33.3333%)`); as classes
`.agenda-filters--vagas` (→ `translateX(0)`) e `.agenda-filters--pedidos` (→ `translateX(-66.6667%)`) no
`#feed-action-bar` (alternadas em `showVagasPanel`/`showProsPanel`/`showPedidosPanel`, junto com o feed)
controlam a posição. Como as duas coisas trocam no mesmo clique/swipe, a barra "acompanha" a aba deslizando
junto. Não usar `opacity`/`display:none` para alternar as linhas — quem esconde é o `overflow:hidden` do
viewport + o `translateX` do trilho.

### Submenus dropdown + botão-abridor que vira "Fechar"

Os quatro submenus que descem da base da action bar — **Histórico** (`#historico-sheet`), **Fazer pedido /
Pedido atual** (`#pedido-sheet`), **Criar vaga** (`#vaga-sheet`), **Serviço de ajudantes**
(`#ajudante-sheet`) — e também os **Filtros** (`#filters-sheet`) e os **Contratos**
(`#contracts-sheet` + `#contracts-filters-sheet`, ver nota abaixo) compartilham o MESMO padrão de
dropdown: container `position:fixed; inset:0; z-index:300`, painel no **PADRÃO CLARO do cadastro** (v295):
corpo `--bg-soft` com elementos internos BRANCOS + `--shadow-sm` (mesma linguagem da seção "Detalhes
profissionais"), labels verdes (`--p-green`), seleção pelo tint azul claro, ancorado em `--sheet-top`
(base da barra, medido em runtime), **card MENOS LARGO que a tela** (recua `--space-md` de cada lado,
alinhado ao conteúdo da action bar) com cantos inferiores arredondados, slide-down "GAVETA", backdrop
que dim SÓ o feed abaixo da barra. `#filters-sheet` e
`#vaga-sheet`/`#ajudante-sheet` **reusam classes existentes** (`.historico-sheet*` e `.pedido-sheet*`
respectivamente) em vez de recriar o scaffolding.

**CONTRATOS = gaveta com a BARRA VIVA (variante `--bar-clear`).** O antigo painel tela-cheia
(`.contracts-panel`) foi substituído pela gaveta `#contracts-sheet` (reusa `.historico-sheet*`) com a
variante `.historico-sheet--bar-clear`: o CONTAINER começa em `--sheet-top` (não cobre a action bar),
então a barra segue interativa — sem roteamento por `tapHitsButton`. Enquanto aberta: a busca de
profissionais vira **"Buscar contratos..."** (placeholder trocado em `openContractsSheet`; o texto filtra
os cards mockados via `applyContractsFilters`), o `#btn-toggle-filters` abre o **`#contracts-filters-sheet`**
(chips de status Todos/Ativo/Concluído/Cancelado + valor mín/máx + mês/ano — herdados da antiga busca
interna, que foi REMOVIDA; status e texto filtram de verdade, valor/mês são visuais), e o abridor
`#btn-open-contracts` vira X verde (`.agenda-filters__icon-btn--active`). O `#contracts-filters-sheet`
vem DEPOIS do `#contracts-sheet` no DOM para renderizar por cima (mesmo z-index). O CTA "Criar
minicontrato" fica fixo no topo do painel (fora do `.historico-sheet__scroll`); a lista segue em ordem
normal (pendentes → ativos → concluído → cancelado — o antigo `column-reverse` morreu com o painel
tela-cheia). `closeContractsSheet` tem guarda de early-return (evita TDZ de `renderAgendaList` no setup)
e é chamado por `showVagasPanel`/`showPedidosPanel` nas trocas de aba.

**NÃO há mais header/título INTERNO nos submenus (v268).** O título da gaveta vai para a TOP BAR: a
função hoistada `setTopBarTitle(titulo)` (`feed.js`) troca o texto "Gente Honesta" (`.top-bar__brand`)
pelo título da seção enquanto ela está aberta, e `setTopBarTitle(null)` restaura a marca ao fechar.
Cada `open*` seta seu título ("Criar vaga", "Serviço de ajudantes", "Histórico de pedidos", "Filtros",
"Fazer pedido"/"Pedido atual"/"Pedido concluído"); nos EMPILHAMENTOS (detalhe sobre histórico), o close
restaura o título da gaveta que continua aberta atrás (mesma lógica dos botões Fechar), e o
`closeFiltersSheet` (chamado preventivamente nas trocas de aba) só restaura se o sheet estava aberto.

**NÃO há mais botão de fechar dedicado dentro do header do submenu.** No lugar, o **próprio botão-abridor**
da action bar vira um **botão de fechar padrão** (ícone `close` + "Fechar") enquanto seu submenu está
aberto, via a classe `.action-close-mode` (`feed.css`: fundo `--on-green-soft` translúcido + texto/ícone
`--t-light`, com `!important` para vencer o fundo dourado/branco de cada botão). Helpers em `feed.js`:
`setMyPedidoButton(mode)` (btn-my-pedido, 3 estados: `'natural'`/`'close'`/`'conclude'`), `setHistoricoButton(mode)` (btn-historico, 3 estados:
`'natural'`/`'close'`/`'conclude'`), `setCriarVagaClose`/`setAjudanteClose`
(nos IIFEs de vaga/ajudante, via `innerHTML`), e o `#btn-toggle-filters` (ícone `tune`↔`close` + a mesma
`.action-close-mode` dos demais — os 5 abridores seguem o padrão).
Cada `open*` chama o setter com `true`, cada `close*` com `false` (restaurando rótulo/ícone). Como o
container do submenu (z-300) cobre a barra quando aberto, **tocar no botão "Fechar" (visível sob a área
transparente do container) dispara o handler de tap-outside** do container → fecha. Por isso todos os
sheets têm um handler de tap-outside no container (`if (!closest('.…__panel')) close…`), inclusive vaga e
ajudante, que antes só fechavam pelo backdrop.

**TROCA DIRETA entre gavetas IRMÃS num único toque (v270):** com uma gaveta aberta, tocar no abridor da
gaveta IRMÃ (que continua VISÍVEL na barra, em rótulo natural) fecha esta e abre aquela de uma vez — as
duas animam juntas (uma sobe, a outra desce). Antes exigia dois toques (um para fechar, outro para abrir).
Roteamento pelo retângulo do botão via a função hoistada `tapHitsButton(e, btn)` (topo do
DOMContentLoaded, compartilhada por todos os handlers): no tap-outside de cada gaveta, se o toque acerta o
botão irmão, `close…()` + `botaoIrmao.click()` (o próprio listener do abridor faz o resto). Pares: **Criar
vaga ↔ Serviço de ajudantes** (aba Vagas) e **Histórico ↔ Fazer pedido/Pedido atual** (aba Pedidos). O
switch só dispara quando o botão irmão está em rótulo NATURAL (guarda: sem `action-close-mode`/
`action-conclude-mode`), para não conflitar com os modos "Fechar"/"Concluir" do detalhe de pedido. Filtros
(aba Profissionais) não tem irmã, então não troca.

**`#filters-sheet`** (novo): dropdown top-level que reusa `.historico-sheet*`; o conteúdo interno
(`#panel-agenda-filters.filters-panel`, grupos de ordenação/confiança/disponibilidade/pagamento + botão
"Adicionar contatos") foi movido para DENTRO dele. `openFiltersSheet`/`closeFiltersSheet` (function
declarations hoistadas — usadas por `showVagasPanel`/`showPedidosPanel`/reset ao trocar de aba) abrem/fecham
via `historico-sheet--open` e alternam o ícone tune↔close junto com a `.action-close-mode`. A delegação
de clique dos chips continua em `#panel-agenda-filters` (id preservado).

**Animação de GAVETA (drawer slide-down) — todos os dropdowns da action bar:** os cinco submenus
(`#pedido-sheet`, `#vaga-sheet`, `#ajudante-sheet`, `#historico-sheet`, `#filters-sheet`) deslizam de
verdade a partir da fronteira superior, como uma gaveta — não é mais fade + leve deslocamento. Receita
(em `.pedido-sheet`/`.historico-sheet` + `__clip` + `__panel`): a estrutura tem TRÊS camadas —
1. **Container** (`.pedido-sheet`/`.historico-sheet`, `inset:0`, `z-300`) = só CAPTADOR de toques
   edge-to-edge; cobre a barra para rotear o botão "Fechar"/"Concluir" (`tapHitsButton`). NÃO recorta nada.
2. **Clip** (`.pedido-sheet__clip`/`.historico-sheet__clip`, `top:--sheet-top; bottom:0; overflow:hidden;
   pointer-events:none`) = wrapper que RECORTA a gaveta; `pointer-events:none` deixa os toques atravessarem
   até o container.
3. **Painel** (`__panel`, `top:0` relativo ao clip, `pointer-events:auto`) = nasce em
   `transform: translateY(-100%)` (acima da linha, escondido pelo `overflow:hidden` do clip) e vai a
   `translateY(0)` ao abrir (`transition: transform 0.5s var(--sheet-ease)` — calma), emergindo pra baixo
   da fronteira. SEM fade (deslize puro).

**Por que `overflow:hidden` num wrapper, e NÃO `mask`/`clip-path` no container:** `clip-path` remove os
toques da área recortada (quebra o hit-test do "Fechar" sobre a barra); `mask` preserva o hit-test mas
deixava um FLASH de 1 quadro do conteúdo do painel sobre o cabeçalho no FIM do fechamento (ao terminar a
transição, o layer do painel des-compositava e a máscara não era aplicada por um quadro). Um wrapper real
com `overflow:hidden` recorta sem esse artefato e o container separado mantém o hit-test. O `--sheet-top`
é o rodapé da action bar, medido em JS e setado no container (o clip herda). A abertura do detalhe pelo
histórico (`.pedido-sheet--morph`) desliga o slide (`transform: none !important`) e mantém a animação
FLIP do card — o clip não interfere (o card fica abaixo da fronteira).

**Scroll RENTE às bordas no "Criar vaga" (`#vaga-sheet`):** o body rola rente ao topo do painel e à
faixa branca do rodapé, sem "margem estranha". Regras (escopadas em `#vaga-sheet .pedido-sheet__body`):
`margin-top: -var(--space-md)` puxa o body até a borda superior do painel e `padding-top: var(--space-md)`
devolve o respiro como padding ROLÁVEL (some ao rolar) → o conteúdo chega rente ao topo; `padding-bottom: 0`
tira o safe-area daqui (a faixa do rodapé o carrega). O rodapé `.pedido-sheet__actions--footer` (só a vaga o
usa) ganha `margin-top: -var(--space-sm)` para anular o `gap` do painel (a faixa encosta na base do
body → conteúdo rola rente a ela) e `padding-bottom: calc(var(--space-md) + env(safe-area-inset-bottom))`
para o botão "Publicar vaga" limpar a barra de gestos. O `.pedido-sheet__body` base MANTÉM o
`padding-bottom: env(safe-area-inset-bottom)` (útil para o pedido/detalhe, que não têm rodapé fixo).

### Lista de Pedidos

Estilo flat list com dividers (`.pedido-item`), sem cards. Fundo `--bg-canvas` (verde escuro), texto puro branco (`--t-light`). Avatar discreto (28px). "Denunciar" como chip-botão. "Indicar alguém" como `btn--accent` (amarelo sobre verde).

### Action bar de pedidos — DOIS botões sempre visíveis

A `#bar-pedidos-state` tem SEMPRE dois botões lado a lado (o antigo badge `#my-pedido-info` de "ver indicados" foi REMOVIDO — sua função foi absorvida pelo detalhe unificado):
- `#btn-historico-pedidos` (`btn--white`) — **Histórico**, sempre visível (antes sumia quando havia pedido ativo).
- `#btn-my-pedido` (`btn--accent`) — alterna via `renderMyPedidoButton()`: **"Fazer pedido"** (ícone `add`) quando NÃO há pedido ativo → abre o formulário; **"Pedido atual"** (ícone `receipt_long`) quando há um pedido ativo → abre o detalhe unificado desse pedido.

### Sheet "Fazer pedido" / detalhe unificado (`#pedido-sheet`)

Painel CLARO (corpo `--bg-soft`, padrão do cadastro — v295) com backdrop. **Ambos os estados agora são o MESMO DROPDOWN**
slide-down (a antiga tela cheia `--full` do detalhe foi REMOVIDA), alternados por `u-hidden`:
- `#pedido-form-state` — **criação**: DROPDOWN que desce da base da action bar (mesmo slide-down do histórico), ancorado em `--sheet-top` (medido em JS via `anchorBelowActionBar`), card recuado `--space-md` de cada lado com cantos inferiores arredondados. textarea do pedido (contador 0/280), chips de urgência (Normal/Urgente), chips de tempo online (12/24/36/48h), toggle "buscar em cidades vizinhas", botão Publicar (`#btn-pedido-publish`; o antigo botão Cancelar foi REMOVIDO — o fechamento é pelo botão-abridor virando "Fechar" + tap-outside). O backdrop dim SÓ o feed abaixo da barra (`top: var(--sheet-top)`), mantendo a barra acesa para o painel parecer a base dela se estendendo.
- `#pedido-details-state` — **detalhe unificado** (somente leitura): abre no MESMO dropdown slide-down do formulário; o corpo (`.pedido-sheet__body`) rola internamente quando a lista de indicados cresce. Traz o **card de referência no topo** (`#pedido-detail-card-container`, via `renderPedidoDetails(pedido)`) e, logo abaixo, a seção **"Indicações recebidas"** (`.pedido-detail-indicated` com fração `#pedido-detail-fraction` e lista `#pedido-detail-indicated-list`). Fecha ao tocar fora do painel (handler no container que checa `closest('.pedido-sheet__panel')`).

**Card de referência = MESMO modelo do histórico.** `renderPedidoDetails(pedido)` monta o card do topo com `historicoItemHTML(pedido)` — o MESMO markup do item da lista do histórico (`.historico-item`: data, lixeira, texto com badge Urgente, badge de status "Ativo · Nh"/"Concluído", badge "N/3 indicações"). A lixeira do card do detalhe é funcional (delegação em `#pedido-detail-card-container` → `deletePedido`). `historicoItemHTML` é function declaration hoistada, compartilhada por `renderHistoricoList` e `renderPedidoDetails`.

**Animação FLIP ao abrir pelo histórico.** `openPedidoDetail(id, sourceEl)` — quando `sourceEl` é o item do histórico tocado, a abertura ANIMA para parecer que continua no histórico vendo mais detalhes: o painel aparece INSTANTÂNEO (`.pedido-sheet--morph` desliga o slide; mesmo fundo claro `--bg-soft` do histórico, sem flash), o **card sobe** da posição do item (`translateY(sourceRect.top - lastRect.top)` → `0`, curva `--sheet-ease`) e **só então as indicações deslizam** (opacity+translateY, disparado no `transitionend` do card, com fallback por timer). Sem `sourceEl` (ex.: aberto pelo botão "Pedido atual") → slide-down padrão. Estilos inline são limpos após a animação.

**Botões do topo no detalhe (evita dois "Fechar").** `pedidoDetailMode` (`'active'`/`'old'`/`null`) define a config; o botão **Concluir pedido** fica no lado **"Pedido atual"** (btnMyPedido) e o **Fechar** no lado **Histórico** (btnHistorico). O antigo botão Concluir do rodapé (`#pedido-detail-actions`) fica sempre `u-hidden`.
  - **Pedido ATIVO** (mesmo aberto pelo próprio botão "Pedido atual"): Histórico → **"Fechar"** (`setHistoricoButton('close')`); Pedido atual → **"Concluir pedido"** (`setMyPedidoButton('conclude')`, dourado via `.action-conclude-mode`).
  - **Pedido ANTIGO** (concluído): Histórico → **"Fechar"**; Pedido atual/Fazer pedido fica **natural** (`setMyPedidoButton('natural')`) — permite pular de um pedido antigo direto para ver o pedido atual / fazer um novo.
  Como o container do sheet (z-300) cobre a barra, o handler de tap-outside roteia o toque pelo RETÂNGULO do botão (`tapHitsButton`, sem subir z-index): ativo+PedidoAtual → `concluirDetailPedido`; antigo+PedidoAtual → `myPedidoNavigate`; qualquer outro toque fora do painel (incl. o Histórico "Fechar") → `closePedidoSheet`. Ao fechar, restaura o Histórico para `'close'` (se o histórico segue aberto atrás) ou `'natural'`. `setMyPedidoButton(mode)` tem 3 estados (`'natural'`/`'close'`/`'conclude'`), espelhando `setHistoricoButton`.

### Histórico de pedidos (`#historico-sheet`)

**Dropdown que DESCE da base da action bar** (não é bottom sheet), acionado por `#btn-historico-pedidos`, com o MESMO slide-down do formulário "Fazer pedido". O painel (`.historico-sheet__panel`) ancora em `top: var(--sheet-top)` — o rodapé da barra, MEDIDO em JS (`anchorBelowActionBar` → `bar.getBoundingClientRect().bottom`), porque a barra tem altura variável com a safe-area — card recuado `--space-md` de cada lado com cantos INFERIORES arredondados, e entra descendo como GAVETA (ver "Animação de gaveta" abaixo). O backdrop dim SÓ o feed abaixo da barra (`top: var(--sheet-top)`), então a barra fica acesa e o painel parece a base do módulo dos botões se estendendo (cobrindo o feed). Fecha ao tocar fora do painel. Lista `#historico-list` com **todos** os pedidos, inclusive o ativo, ordenados por data (mais recente no topo) via `renderHistoricoList()`. Cada `.historico-item` é um **card BRANCO com `--shadow-sm`** (padrão claro do cadastro — v295) com raio de "balão", mas com o canto inferior DIREITO reto (`border-radius: 18px 18px 4px 18px`, espelho do feed que tem o inferior esquerdo reto). Estrutura:
- `.historico-item__top` — data curta (`formatPedidoDate` → "12 jul, 14:30") à esquerda e botão excluir (`.historico-item__delete`) à direita: **sem moldura circular**, só o glifo `delete` em **vermelho** (`--danger`) para destaque; `customConfirm` e remove do histórico (se era o pedido em exibição, fecha o detalhe).
- texto do pedido (clamp 2 linhas, com badge "Urgente" inline quando urgente).
- `.historico-item__footer` — DOIS badges de **largura igual** (`flex: 1`) na base: à esquerda `.historico-item__status` (**"Ativo · Nh"** no tint azul claro `--info-blue-light` + texto `--info-blue`, incluindo o tempo restante via `pedidoHoursLeft()`; ou **"Concluído"** cinza) e à direita `.historico-item__count` (**"N/3 indicações"**, fundo `--bg-soft`).
- Tocar no item (fora do botão excluir) abre o **mesmo** detalhe unificado (`openPedidoDetail(id)`). A delegação em `historicoList` dá prioridade ao `.historico-item__delete` (com `stopPropagation`) antes de abrir o detalhe.

Ao concluir um pedido a partir de um item do histórico, o detalhe fecha e o sheet de histórico (que fica aberto por baixo) se atualiza sozinho (`renderHistoricoList()` roda no handler de concluir).

Lógica em `feed.js` (bloco "PEDIDOS - Botões..."):
- `pedidoHistory` — array `{id, text, urgency, duration, neighbors, createdAt, completedAt, status:'active'|'completed', indicated:[]}` (mock, em memória, SEM persistência no Firestore). Só pode haver **um** pedido `active` por vez.
- `myPedido` — `{text, urgency, duration, neighbors}` (objeto de trabalho do formulário; `resetPedidoForm()` volta aos defaults).
- `getActivePedido()` / `getPedidoById(id)` / `detailPedidoId` (pedido em exibição no detalhe).
- `openPedidoForm()` / `openPedidoDetail(id)` — abrem o sheet no estado certo.
- Publicar cria o pedido como `active` e **semeia** 3 indicações mock em `pedido.indicated`; Concluir muda `status` para `completed` (permanece no histórico).
- Chips de seleção única via `wirePedidoChipGroup(groupId, dataKey, onPick)`; toggle via `aria-pressed`.

### Popup de Profissionais Indicados (`#agenda-indicated-popup`)

Bottom sheet acionado ao clicar nos badges de fração dos pedidos de TERCEIROS na lista (ex: `2/3`). As indicações do PRÓPRIO pedido não usam mais este popup — vão para o detalhe unificado (`#pedido-details-state`, ver acima).

Estrutura HTML obrigatória (qualquer mudança deve manter esta hierarquia):
```
.indicated-popup__sheet (overflow: hidden, flex-direction: column)
  ├─ .indicated-popup__header (flex-shrink: 0) — título + botão Fechar
  └─ .indicated-popup__scroll (flex: 1, overflow-y: auto) — SCROLL AQUI, não no sheet
       └─ #agenda-indicated-list .indicated-popup__list — cards de pro
```

**Crítico:** o header fica FORA do container com scroll (são siblings). Nunca usar `position: sticky` no header — isso causou cards expandidos passarem por baixo do header. A solução estrutural é o wrapper `.indicated-popup__scroll`.

- Título: "Profissionais indicados" (padrão)
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
  sort:         string — 'name'|'ic'|'avail'|'quality'|'agility'|'value' (DEFAULT 'ic')
}
```

- **Ordenação padrão = `'ic'`** (Índice de Confiança, maior→menor): default de `filterState.sort` e do
  reset, e o chip "Confiança" nasce `chip--active` no HTML (`#panel-agenda-filters`).
- `applyFilters(pros)` — aplica `filterState` sobre um array de profissionais
- `sortPros(pros)` — ordena conforme `filterState.sort`
- `reorderAgendaListAnimated()` — reordena cards já renderizados com animação FLIP
- Pros salvos (`pinnedPros`) aparecem sempre no topo, agrupados separadamente dos demais
- **Indicador de filtros ativos + limpar** (`#btn-clear-filters`, `.agenda-filters__clear`): pílula DENTRO
  do campo de busca, à esquerda (`position:absolute; left:5px`), no "tint preenchido" azul-claro
  (`--info-blue-light` + texto `--info-blue`, o par de seleção sobre superfície clara). Ordem: `close`
  (VERMELHO `--danger`, sem moldura) + `filter_alt` + contagem (`#filter-count`). Aparece só quando há
  filtro ativo e, ao tocar, ZERA os 4 grupos de filtro (mantém a ordenação e os pins) e desmarca os chips
  do painel. Com a pílula visível, o wrap ganha `--filtered` (esconde a lupa) e o `padding-left` do input
  é ajustado em JS pela LARGURA REAL da pílula (`updateFilterIndicator`). A contagem = `activeFilterCount()`
  (`includeIc`+`includeAvail`+`includePay`+`savedOnly`; a ORDENAÇÃO não conta, pois não esconde ninguém).
  `updateFilterIndicator()` roda dentro de `renderAgendaList` — o indicador some sozinho ao chegar a 0.

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

**Cards de vaga — observações por requisito (`<details>` `.candid-req-obs`) ABREM/FECHAM ANIMADO (v272):**
o `<details>` nativo saltava a altura. O clique no resumo é interceptado (`preventDefault`) e a ALTURA DO
PRÓPRIO PAINEL do details é animada (`animateReqDetails(det, summary)`): de só o resumo (`summary.offsetHeight`)
até resumo+campo (`det.scrollHeight`) ao abrir, e o contrário ao fechar, com `overflow:hidden` recortando.
Como o card de candidatura fica em `height:auto` quando expandido, ele ACOMPANHA o crescimento do painel
frame a frame (o campo abre suave e o card se estende junto). No FECHAR o `open` só sai no `transitionend`
(campo visível durante o encolhimento); fallback por timer. O textarea revelado ainda usa `commentFadeIn`.

**Helper reutilizável:**
- `renderFlippableProCards(listEl, pros)` — function declaration; renderiza pro-cards flipáveis em qualquer container
- Usado em: `#agenda-list` (lista principal), `#agenda-indicated-list` (popup de indicados), `#pedido-detail-indicated-list` (detalhes do pedido)

### Cards de vaga (flip 3D — já implementado)

`.vaga-card__3d > .vaga-card__flipper`:
- **Frente:** empresa, endereço, cargo, requisitos, benefícios, "Me candidatar"
- **Verso:** formulário de candidatura com `<details>` por requisito + textarea de observação

Candidatura mockada: sem persistência no Firestore. O flip usa o mesmo motor genérico de animação 3D dos cards de profissional.

### Sheet "Criar vaga" (`#vaga-sheet`)

Bottom sheet de criação de vaga, acionado pelo `#btn-criar-vaga` da action bar (estado vagas).
**Rodapé fixo:** o botão "Publicar vaga" fica FORA do `.pedido-sheet__body` (que rola), num
`.pedido-sheet__actions--footer` — sempre visível na base. Essa faixa tem fundo BRANCO `--bg-white`
(contrasta com o corpo `--bg-soft` do painel; o CTA dourado se destaca), edge-to-edge (margem negativa
anula o padding do painel) e cantos inferiores `--radius-lg`. **Sem título interno** (como todos os
dropdowns desde a v268: o título vive na top bar via `setTopBarTitle`).
**Reaproveita o scaffolding do `pedido-sheet`** (mesmas classes `.pedido-sheet*`, `.pedido-field*`,
`.pedido-chip*` — o bottom-sheet-formulário padrão do app), com estilos próprios só para as listas
dinâmicas (`css/feed.css`, bloco "Sheet Criar vaga"): `.vaga-dyn-list` / `.vaga-dyn-row` (input +
botão remover `.vaga-dyn-remove`), `.vaga-add-btn` (botão "Adicionar…" em ocre `--a-gold-text` sobre
pílula branca, sem borda) e `.vaga-card--highlight` (destaque dourado temporário ao tocar "Ver vaga").

Campos:
- **CNPJ da empresa** (`#inp-vaga-cnpj`) — substitui nome+endereço. Máscara `00.000.000/0000-00`
  (`formatCnpj`, exige 14 dígitos). Nome e endereço reais serão buscados no sistema oficial pelo CNPJ
  (ainda não implementado); por isso a vaga é criada com `empresa: ''` e `endereco: ''`, guardando só
  `cnpj`. No card, `renderVagasList` mostra `CNPJ <número>` no lugar do nome e uma nota não-clicável
  "Dados da empresa em verificação" (`.vaga-card__company-address--pending`) no lugar do endereço.
- **Cargo / função** — texto obrigatório.
- **Número de vagas** — stepper **+/-** (`.vaga-stepper`, `#vaga-count-value`), 1–20, `dec` desabilita em 1.
- **Requisitos** — lista dinâmica (`.vaga-dyn-list`), ≥1 preenchido.
- **Carga horária** — dois **STEPPERS de hora** (`.vaga-stepper--time`, reusam o `.vaga-stepper` do
  número de vagas — substituíram os `<select>` nativos na v268): passo de 30min com giro 23:30→00:00
  (`timeState` + `wireTimeStepper` em `feed.js`; padrão 08:00→18:00) + toggles de **dias** (`.vaga-day`,
  multi-seleção; padrão Seg–Sex). `formatDays` compacta uma sequência contígua em "Seg–Sex", senão junta por vírgula. String
  final: `"08:00 às 18:00 · Seg–Sex"`.
- **Salário** — campo numérico (só dígitos, separador de milhar automático via `toLocaleString('pt-BR')`),
  com `R$` e `/mês` **externos** ao input (`.vaga-salary__prefix`/`__suffix`). Gera `"R$ 1.500/mês"`.
- **Benefícios** — **pílulas de seleção múltipla** (`.vaga-benefit-pill`, ícone + texto, ativo AZUL
  em `aria-pressed`): Alimentação, Vale alimentação, Transporte, Vale transporte, Plano de saúde,
  Moradia, Comissão e **Outros**. Cada pílula carrega `data-icon`/`data-label` para renderizar no card
  no mesmo padrão do feed (`.vaga-card__benefit`). "Outros" (`#vaga-benefit-outros`) revela a lista de
  texto livre `#vaga-benefit-list` (`setOutrosOpen`) para benefícios extras, cujo ícone é inferido por
  palavra-chave (`benefitIcon()`; fallback `redeem`). Opcional.
- **Exigir currículo (PDF/foto)** — check (`#chk-vaga-curriculo`, `.vaga-check`, estado em `aria-pressed`),
  com o subtexto "(opcional)" (`.vaga-field__optional`) no rótulo e aviso de que pedir currículo
  individual extra pode fazer perder candidatos. Grava `exigeCurriculo`
  na vaga; a seção de upload de currículo no verso de candidatura só é renderizada quando
  `vaga.exigeCurriculo !== false` (vagas legadas sem o campo continuam exibindo).

Lógica em `feed.js` (bloco "Sheet Criar vaga", IIFE após `renderVagasList`):
- `addDynRow(listEl, placeholder, value, keepLast)` — cria uma linha de input dinâmico com botão
  remover. `keepLast=true` (requisitos, que exigem ≥1): remover a ÚLTIMA linha apenas LIMPA o campo,
  mantendo sempre uma linha. O handler do remover faz `e.stopPropagation()` — sem isso o clique
  borbulhava até o tap-outside da gaveta (cujo `e.target.closest()` falha porque a linha já saiu do
  DOM) e FECHAVA a gaveta inteira de criar vaga
- `renderCount()` — atualiza o valor e o estado disabled do stepper
- `resetVagaForm()` — zera tudo (1 requisito vazio, sem benefícios, contagem 1, horas 08–18, Seg–Sex,
  currículo off)
- `openVagaSheet()` / `closeVagaSheet()` — alternam `.pedido-sheet--open`
- Publicar: valida obrigatórios (CNPJ 14 dígitos, cargo, salário, ≥1 requisito, ≥1 dia; destaca com
  `input-text--error` / `.vaga-days--error` + rola até o 1º), faz `mockVagas.unshift(novaVaga)`
  (poster = usuário atual, IC mock 100) + `renderVagasList()`, e **transforma o `#btn-criar-vaga` em
  "Ver vaga"** (ícone `visibility`)
- Com vaga publicada, `#btn-criar-vaga` chama `scrollToMyVaga()` (rola até o card + `--highlight`)
  em vez de reabrir o formulário. `myVagaId` guarda o id da vaga do usuário.

MOCK: sem persistência no Firestore. `renderVagasList` só renderiza a seção "Benefícios" se a vaga
tiver algum (vagas do usuário podem não ter benefícios, evitando cabeçalho vazio).

### Sheet "Serviço de ajudantes" (`#ajudante-sheet`)

Dropdown acionado pelo `#btn-chamar-ajudante` (estado vagas da action bar), MESMO scaffolding/gaveta do
`pedido-sheet` (reusa `.pedido-sheet*`). **Duas funções SEMPRE visíveis** (uma acima da outra, separadas
por `.ajudante-divider`), lógica em `feed.js` (bloco "SERVIÇO DE AJUDANTES"). SEM persistência no Firestore
(estado em `localStorage`).

**Função 1 — "Disponibilizar-me como ajudante":** dois `.helper-toggle` (leve/pesado) de seleção
independente (não é rádio), cada um com nome, descrição e a diária padrão. As diárias vêm da fonte única
`HELPER_RATES = { light: 100, heavy: 180 }` (pesado > leve, iguais para todo usuário) e são injetadas nos
`[data-rate]`. Estado em `localStorage['gh_helper_availability'] = { light, heavy }` (booleans);
`renderHelperAvailability` reflete o check (`check_box`/`check_box_outline_blank`) e `aria-pressed`.

**Função 2 — "Chamar um ajudante":** escolhe o tipo num **seletor SLIDE `.seg-toggle`** (`#helper-type`,
thumb AZUL que desliza de "Serviço leve" p/ "Serviço pesado" via `.seg-toggle--heavy`; `.seg-toggle__opt`
alternam `--active`/`aria-pressed`) e toca em "Chamar ajudante" (`#btn-call-helper`). `drawHelpers(type, 2)`
sorteia 2 ajudantes distintos do `mockHelpers` (Fisher-Yates placeholder), fixados até a meia-noite em
`localStorage['gh_helper_draw'] = { date, type, helpers[] }`. **SEM bloqueio de tempo/cooldown** (removido
de propósito para facilitar teste/reteste): `renderHelperCall` mostra o formulário (sem sorteio hoje) OU os
contatos + botão Cancelar (`#btn-cancel-helper`, `.ajudante-cancel-btn`, que remove o sorteio e libera o
formulário na HORA). Um reset à meia-noite (`scheduleHelperMidnightReset`) e `visibilitychange` re-renderizam.

**Card de contato (`helperPersonHTML`, reusa `.pro-card__*`):** foto à ESQUERDA (`.pro-card__col-left`,
48×64) e, à direita dela (`.pro-card__col-right`, flex column), uma LINHA com nome+sobrenome
(`.pro-card__head-text`) e o índice de confiança (`icBarHTML` em `.pro-card__head-right`) e, ABAIXO dessa
linha (ainda ao lado da foto), o **botão "Conversar no WhatsApp"** (`a.helper-wa`, verde, `width:100%`).
`.pro-card__front--helper` usa `align-items: flex-start` (foto alinha ao topo da linha do nome). `mockHelpers`
= pool `{id, first, last, ic, phone, type:'light'|'heavy'}` (placeholder do backend).

O botão-abridor "Serviço de ajudantes" vira "Fechar" (`.action-close-mode`) enquanto o sheet está aberto
(`setAjudanteClose`); fecha por tap-outside (`if(!closest('.pedido-sheet__panel')) closeAjudanteSheet()`).

### Classes CSS notáveis em feed.css

| Classe | Descrição |
|---|---|
| `.pedido-item__urgent-badge` | Pílula vermelha "bolt Urgente" inline no texto (única marca de urgência; não há borda nem timer no card) |
| `.pro-card__load-more` | Botão "ver mais comentários" — cor `var(--info-blue)` |
| `.comment--entering` | Animação `commentFadeIn` fade+slide-up 0.22s nos comentários novos |
| `.indicated-popup__scroll` | Wrapper de scroll no popup de indicados (fora do header) |

**Classes em components.css:**
- `btn--danger` — `background: var(--danger); color: #fff` (vermelho; usado em Cancelar)
- `btn--accent` — `background: var(--a-gold); color: var(--p-green-dark)` (amarelo; usado em Concluir pedido)

### Regras de scrollbar

**Os 3 FEEDS principais** (`#agenda-list`, `.vagas-scroll`, `.feed-panel--pedidos .scroll-area`) escondem
a barra: `scrollbar-width: none` + `::-webkit-scrollbar { display: none }`. Nunca adicionar scrollbar
visível nesses três.

**Todo o resto que rola** (formulários criar pedido/vaga = `.pedido-sheet__body`; histórico/filtros =
`.historico-sheet__scroll`; popup de indicados = `.indicated-popup__scroll`; contratos e seus filtros =
`.historico-sheet__scroll` (gaveta, reusa o scaffolding); diálogo de ajuda = `.dialog-box--scrollable .dialog-box__message`; versos
expandidos de card = `.pro-card__back-comments` e `.vaga-card__back-form`) usa uma barra **SEMPRE
VISÍVEL** (não overlay): um
`::-webkit-scrollbar` ESTILIZADO (com `width: 5px` + `-thumb`) no Chromium vira uma barra clássica
persistente e DISCRETA, que não some sozinha. Thumb claro (`--on-green-muted`) sobre os sheets
verde-escuros; thumb escuro (`rgba(--p-green-dark-rgb, .28)`) sobre os versos de card claros.
`scrollbar-width: thin` + `scrollbar-color` para o Firefox.

**Barra na BORDA (não colada ao conteúdo):** os três containers de scroll dos sheets
(`.pedido-sheet__body`, `.historico-sheet__scroll`, `.indicated-popup__scroll`) ficam dentro de painéis
com `padding: var(--space-md)`, então a barra caía sobre o canto direito dos cards/inputs. Cada um
estende-se até a borda do painel com `margin-right: calc(-1 * var(--space-md))` e devolve o respiro como
`padding-right: var(--space-md)` (conteúdo não desloca) → a barra fica no gutter/borda da tela e o
conteúdo passa longe dela. (Os versos de card mantêm o `padding-right: 4px` próprio.)

---

## O que ainda é mock (dados de exemplo)

Dentro de `DOMContentLoaded` em `js/feed.js`:
- `mockProfessionals[]` — 5 profissionais com `{id, name, tags, ic, q, a, v, avail, pay: {cash, pix, card}, nf, bio}`
  - `pay.card`: `0` = não aceita, `'debit'` = só débito, número = crédito parcelado em até Nx
  - `nf`: boolean — emite nota fiscal
- `mockComments[]` — **15** avaliações de exemplo `{author, text, ic}` (mesmo bloco para todos os profissionais); exibidas 5 por vez via paginação
- `mockIndicatedByPost{}` — post ID → profissionais já indicados (pedidos de TERCEIROS):
  - `'0'`: 2 pros (posts na lista de pedidos)
  - `'1'`: 2 pros
  - (o próprio pedido NÃO usa mais este objeto: suas indicações vivem em `pedido.indicated` dentro de `pedidoHistory` — ver "Histórico de pedidos")
- `mockVagas[]` — 3 vagas de emprego com estrutura detalhada `{id, empresa, endereco, mapsQuery, poster, cargo, vagas, requisitos, cargaHoraria, salario, beneficios}`

Comportamentos placeholder:
- Botões "Contratar", "WhatsApp", "Compartilhar" exibem alertas placeholder
- Sheet de pedido (`#pedido-sheet`) + histórico (`#historico-sheet`): criação, detalhe unificado (pedido + indicações) e histórico (ativo + concluídos) já existem, mas sem persistência no Firestore. `pedidoHistory` vive em memória; as 3 indicações do próprio pedido (`pedido.indicated`) são semeadas na publicação só para o fluxo ficar demonstrável. Excluir/concluir operam só sobre esse array em memória.
- Lista de pedidos (`#list-feed`) com 2 pedidos mockados hardcoded no HTML; badges mostram `2/3` para ambos
- Cards de vaga já têm flip 3D com formulário de candidatura, mas sem persistência no Firestore

---

## Dívidas técnicas conhecidas (consolidações adiadas)

Duplicações reais mapeadas numa revisão de código, deixadas de fora por serem refatorações maiores/mais
arriscadas que o ganho imediato. Ao mexer nessas áreas, prefira consolidar em vez de copiar de novo:

- **Scaffolding de flip 3D duplicado:** `.pro-card__*` e `.vaga-card__*` (`feed.css`) repetem quase
  idêntico o maquinário de flip (`preserve-3d`, `rotateY(180deg)` no verso, pares `backface-visibility`,
  colapso `--expanded height:0`). Candidato a uma base `.flip-card*` compartilhada parametrizada.
- **Construção de card de profissional em dois caminhos:** `renderFlippableProCards` (usado no popup de
  indicados e nos detalhes do pedido) vs. a construção inline em `renderAgendaList`; e a delegação de
  clique do flip existe duas vezes (`bindProCardFlip` e o handler de `#agenda-list`). Unificar num único
  builder + uma única delegação parametrizada por modo (com/sem pin).
- **Diálogos hand-rolled:** `customAlert`, `customConfirm` (`app.js`) e o diálogo de ajuda do onboarding
  (`onboarding.js`) montam/populam/desmontam `#dialog-global` de formas quase iguais, e cada um adiciona
  um `click` novo ao `#btn-dialog-confirm` a cada chamada (handlers empilham em reentrância). Extrair um
  primitivo `openDialog({title, message, icon, showCancel, scrollable})` com teardown consistente.
- **Avatar SVG inline duplicado:** o mesmo `data:image/svg+xml` de avatar-placeholder aparece 8× em
  `index.html` (6 cinzas + 2 brancos, só muda o `fill`); dentro de `feed.js` já foi consolidado numa
  const única (`avatarSvg`). Fatorar o lado do HTML num helper/constante única.
- **Mock:** `mockIndicatedByPost` redeclara objetos de profissional que já existem em `mockProfessionals`
  (com `ic`/bio ligeiramente diferentes), e as indicações semeadas na publicação do pedido (`feed.js`,
  bloco do publish) redeclaram os MESMOS objetos uma 3ª vez. Uma fonte única keyed por id evitaria
  divergência. (O item antigo "applyFilters recalcula a faixa de IC" foi RESOLVIDO na v261: `icTier`/
  `icShieldIcon` viraram function declarations hoistadas e `applyFilters` reusa `icTier` — limiares
  75/50/25 têm fonte única.)

### Padronização de estilo — pendências (auditoria de consistência)
Consolidações de estilo ainda ABERTAS após a auditoria (as fases 1–6 e a reconciliação de sombras já
foram feitas). Estas mudam pixel/interação e precisam de conferência no aparelho:
- **Opacidades do branco-sobre-verde — RESOLVIDO (v224):** os ~80 alphas soltos (.08–.92) foram
  harmonizados numa escala de 6 degraus semânticos: `--on-green-faint` (.1), `--on-green-soft` (.2),
  `--on-green-muted` (.35), `--on-green-med` (.5), `--on-green-strong` (.7), `--on-green-solid` (.9), em
  `base.css`. Cada uso antigo foi snapado ao degrau mais próximo (drift ≤ .1). Usar os tokens semânticos
  em vez de `rgba(var(--on-green-rgb), α)` solto daqui pra frente.
- **`:active scale` — RESOLVIDO (v224):** o cluster médio (0.94–0.97) virou `--press-scale` (0.97) e
  0.99 virou `--press-scale-subtle` (alvos grandes). Extremos deliberados MANTIDOS: 0.85
  (`historico-item__delete`, ícone minúsculo), 0.9 (`contract-mini__btn`), 0.92 (stepper e FAB).
- **Blur de backdrop — RESOLVIDO (v224):** `--blur-sm` (5px, backdrops de diálogos/sheets/painel) e
  `--blur-lg` (14px, faixa da bottom-bar). O `blur(1.5px)` sutil do tutorial foi preservado.
- **Sheets — RESOLVIDO (v224):** `--sheet-ease` (`cubic-bezier(0.32,0.72,0,1)`) é a curva única dos
  sheets; `agenda-sheet` (que usava outra curva/duração) foi alinhado, e o backdrop do `indicated-popup`
  ganhou o mesmo `--blur-sm` do `agenda-backdrop`. Cor do título preservada (ouro vs branco).
- **Botões de ação PRINCIPAIS unificados sob `.btn.btn--accent` (mesmo padrão, `--radius-md`):**
  "Publicar pedido", "Publicar vaga", "Chamar ajudante" (`.ajudante-call-btn` só ajusta largura/margem, SEM
  `--radius-pill`) e "Adicionar contatos como favoritos" (`#btn-sync-contacts`, antes pílula bespoke
  `.agenda-filters__add-contacts-btn`, agora `btn btn--accent` + só a margem). Ao criar um botão de ação
  amarelo novo, use `.btn.btn--accent`, não uma pílula própria. **Altura:** o padding base de 16px do
  `.btn` deixava esses quatro CTAs altos demais (~51px); um seletor agrupado
  (`#btn-pedido-publish, #btn-vaga-publish, #btn-call-helper, #btn-sync-contacts`) reduz para
  `padding: 11px var(--space-md)` → altura 40px, igual aos botões da action bar (Criar vaga/Histórico/
  Fazer pedido).
- **Botões do feed reimplementam `.btn` (parcial):** já migrados — `.vaga-card__btn-submit`
  (`btn btn--primary …`) e `.vaga-card__btn-apply` (`btn …`), mantendo o `:active` por opacidade via
  `transform:none` (suprime o scale do `.btn`); `.pro-card__back-btn` (todas as variantes compõem `.btn`
  no markup gerado em `feed.js` — o CSS só mantém gap/fonte próprios); `.agenda-indicated__cancel`
  (`btn btn--close` + cores sobre verde); `#btn-toggle-filters` (`btn btn--icon` + 40px). Os que seguem
  bespoke DE PROPÓSITO por serem estruturalmente distintos de um `.btn`:
  `.agenda-filters__vagas-btn` (par de altura fixa 40px) e `.ajudante-cancel-btn` (pílula danger).
  (`.bottom-bar__pedidos` era CSS morto da bottom bar antiga e foi REMOVIDO na v261 — a bottom bar real
  é a `.feed-tabs-pill` com 3 abas.) Rotear os bespoke restantes pelo `.btn` exigiria mais override do
  que reuso e arriscaria a interação própria de cada um.

## Próximas Features Previstas

- Edição de perfil (reaproveitar formulário do onboarding)
- Persistência de profissionais no Firestore
- Firebase Cloud Messaging para notificações push
- Persistência do pedido no Firestore (formulário e detalhes já existem — falta backend)
- Candidatura em vagas com persistência no Firestore (flip de candidatura já existe — falta backend)
- Estender o Tutorial Guiado (`js/tutorial.js`) para o feed: passos explicando abas, action bar, cards de profissional/vaga e sheets de pedido
