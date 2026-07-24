# Gente Honesta — Contexto do Projeto

## O que é

PWA mobile-only para conectar profissionais autônomos a clientes por indicação.
Fase atual: **testes fechados** com whitelist de números autorizados no Firestore.

URL de produção: https://gentehonesta.com.br
Repositório: jonathasptbr-gh/gente-honesta

> **Documentação detalhada:** este arquivo é o índice + o essencial sempre carregado. O detalhe de
> cada área vive em `.claude/rules/*.md` (ver o índice no fim). **Ao mexer numa área, leia a rule
> correspondente antes de alterar** — ela tem as convenções específicas que evitam divergência.
>
> **Convenções de nomenclatura/estrutura/teoria** (para portabilidade): ver **`CONVENTIONS.md`** na
> raiz. Modelo de domínio em `js/core/models.js` (typedefs); enums em `js/core/domain.js`; dados via
> repository.

---

## Deploy

- Branch de produção: `main` (GitHub Actions → GitHub Pages → domínio customizado).
- Para publicar: `git push origin HEAD:main`. CI: `.github/workflows/deploy.yml` (dispara no push
  para `main`; **sem build step** — os arquivos são estáticos, o deploy publica o repo direto). O CI
  roda UM guardrail antes de publicar: `node scripts/check-icons.mjs` (falha o deploy se algum ícone
  referenciado não tiver símbolo no sprite). O `package.json` é só ferramenta de DEV (gerador/checker
  de ícones) — não é build do site.
- **A cada sessão com mudanças no APP:** bump de `CACHE_NAME` (`service-worker.js`) + `#version-badge`
  (`index.html`) JUNTOS, commit e deploy para `main`. (Mudanças só de documentação não precisam de
  bump.) Versão atual: **v452**.

O desenvolvedor usa https://gentehonesta.com.br diretamente como preview num Samsung S24 Ultra — não
há staging. **Faça deploy ao final de cada sessão de alterações do app.**

### Manutenção da documentação (OBRIGATÓRIA a cada merge/deploy)

**Ao subir uma mudança para `main`, ATUALIZE a documentação junto — no MESMO conjunto de
alterações — e REVISE para não deixar conteúdo morto nos registros estruturais.** Ou seja:

1. **Registrar o novo:** toda mudança de estrutura/arquitetura/comportamento (arquivos, IDs, classes,
   fluxos, nomes de UI, tokens, mecânicas) deve ser refletida em `CLAUDE.md` e/ou na `.claude/rules/*.md`
   da área (o Mapa de Arquivos, as tabelas de telas, e as seções de detalhe são a fonte de verdade).
2. **Podar o morto:** ao alterar/renomear/remover algo, RELEIA a doc da área e apague ou corrija o que
   descrevia o estado antigo — rótulos de UI renomeados (ex.: um botão que mudou de nome), posições que
   mudaram (ex.: "à esquerda/direita"), mecânicas substituídas (ex.: slide → fade), IDs/classes que não
   existem mais. Descrição que contradiz o código é pior que ausência de descrição.
3. **Bump = checkpoint de doc:** o bump de versão marca "sessão de app fechada"; use-o como gatilho para
   passar os olhos nas rules tocadas e conferir que nada ficou divergente antes do deploy.

### Configuração obrigatória antes do primeiro commit de cada sessão

```bash
git config user.email noreply@anthropic.com && git config user.name Claude && git config commit.gpgsign false
```

Sem isso o stop-hook detecta commits "Unverified" e exige `git commit --amend`, que reescreve o hash;
se o commit já foi para `main`, os branches divergem e o `push` falha com non-fast-forward.
O hook `.claude/hooks/session-start.sh` (registrado em `.claude/settings.json`) já roda esses três
comandos em sessões web; em execuções locais, rodar manualmente.

---

## Arquitetura

**SPA com roteamento por CSS.** Sem framework; navegação exclusivamente por:

```js
showView('view-auth')       // troca a tela principal (.screen → .screen--active)
navigateTo('form-otp')      // troca sub-passo dentro de #view-auth (u-hidden)
```

`display` nunca é declarado inline em `.screen` — o CSS controla tudo via `.screen--active`.

**Telas principais** (IDs no index.html):
| ID | Quando aparece |
|---|---|
| `#view-auth` | usuário não autenticado |
| `#view-onboarding` | autenticado, sem `displayName` |
| `#view-install` | pós-cadastro, fora do modo standalone |
| `#view-feed` | autenticado com perfil completo |

Perfil do próprio usuário = **gaveta** `#profile-sheet` (não é `.screen`): slide-down aberto pelo avatar
da action bar (que vira o Fechar, no mesmo lugar) — reusa `.historico-sheet*` + `--bar-clear`. Dentro
dela, **Editar** reabre o `#view-onboarding` em MODO EDIÇÃO (`window.enterProfileEdit`, pré-preenchido;
Cancelar/Salvar voltam para a gaveta) — detalhe em `.claude/rules/onboarding.md` ("Modo edição").

**Sub-passos de auth** (dentro de `#view-auth`): `step-intro` → `form-phone` → `form-otp`.

**Fluxo de estado:**
```
Carregamento → detecção mobile (head) → onAuthStateChanged →
  Sem usuário?     → view-auth (phone → OTP → login)
  Com usuário?
    Sem displayName? → view-onboarding → finishRegistration → updateProfile
       → onAuthStateChanged de novo → Standalone? view-feed : view-install → view-feed
    Com displayName? → view-feed direto
       (exceção: login recém-feito, <15s — flag isNewSignIn em auth/session.js — passa pelo
        onboarding mesmo com displayName, para o usuário revisar os dados)
```

---

## Mapa de Arquivos

```
index.html          — HTML único do SPA (todas as telas)
manifest.json       — PWA manifest (start_url/scope "./"; background/theme_color = --p-green #184e1b)
service-worker.js   — Network-First, cache offline, CACHE_NAME = "gentehonesta-vN"
CNAME               — "gentehonesta.com.br"
.nojekyll           — impede o Jekyll do GitHub Pages de processar os arquivos
.gitignore          — arquivos ignorados pelo git (node_modules/ = só dev; site é estático)
package.json        — ferramenta de DEV (não é build do site): `npm run icons:gen` / `icons:check`
CONVENTIONS.md      — convenções portáveis (nomenclatura/estrutura/teoria); ver prosa acima
AUDITORIA-DESIGN-v260.md — snapshot histórico de auditoria de design (v260); referência, não é código ativo
icon*.svg / *.png   — arte do ícone/PWA (quadrado full-bleed p/ maskable; arredondado p/ "any";
                      transparente e "intro" p/ usos internos). Fundo verde --p-green. PNGs em
                      192/512/1024 (o 1024 = splash nítida em telas de DPI alto; rasterizados dos
                      SVGs-mestre icon.svg[maskable]/icon-rounded.svg[any])
fonts/              — Inter (woff2, subset latin+latin-ext) SELF-HOSTED — sem Google Fonts online;
                      @font-face em css/base/fonts.css. Ícones = sprite SVG inline (NÃO é fonte).
scripts/            — tooling de ícones: icon-usage.mjs (deriva a lista do uso), gen-icon-sprite.mjs
                      (reescreve o sprite no index.html; ASSA um stroke por rampa de cobertura p/
                      engrossar os ícones de linha sem inchar os sólidos), check-icons.mjs (guardrail,
                      roda no CI), icon-coverage.json (cobertura de tinta % por ícone; alimenta a rampa)

css/   (PASTAS POR FEATURE; ordem dos <link> no index.html = ordem da cascata; NÃO reordenar)
  base/base.css            — design tokens (:root), roteamento de telas, utilitários, animações
  components/buttons.css   — sistema de botões (.btn + variantes)
  components/forms.css     — inputs/campos
  components/surfaces.css  — .card, .check-box, ic-bar
  components/dialogs.css   — diálogos + banner de atualização do PWA
  components/blocks.css    — bloqueios desktop/paisagem + sombras de scroll (.js-scroll-shadows)
  tutorial/tutorial.css    — motor de tutorial guiado (destaque + balão)
  auth/auth.css            — login: auth-section, OTP, carrossel de intro
  onboarding/form.css      — cadastro: campos, tags, serviço, pagamento, perfil público
  onboarding/ic-card.css   — card do Índice de Confiança (+ adaptativo por altura)
  onboarding/camera.css    — diálogo da câmera
  install/install.css      — tela-guia de instalação do PWA
  feed/shell.css           — interface do feed + gaveta de contratos + painéis
  feed/navigation.css      — action bar (perfil/contratos fixos nas pontas + crossfade da zona do meio;
                             botões de vagas/pedidos) + bottom bar + feed tabs
  feed/pedidos.css         — lista de pedidos + cards de post
  feed/pedido-sheet.css    — sheet "Fazer pedido" / detalhe unificado
  feed/historico.css       — histórico de pedidos
  feed/cards-pro.css       — flip + cards de profissional
  feed/vagas.css           — painel + card de vaga
  feed/ajudantes.css       — sheet de "Diárias" (#ajudante-sheet; ex-"Serviço de ajudantes" — só o
                             rótulo do botão mudou, a lógica/IDs internos seguem "ajudante"/"helper")
  profile/profile.css      — gaveta de perfil do próprio usuário (#profile-sheet); carregada por último.
                             Reusa .historico-sheet* + --bar-clear (o avatar vira o Fechar); painel
                             TRANSPARENTE com o card de profissional real (buildProCard) flutuante + o
                             card de Avaliações (QR + compartilhar). Sair/Editar vivem na ACTION BAR
                             (OVERLAY sobre a zona do meio via classe .agenda-filters--profile), não no
                             painel; CSS próprio: backdrop-blur, painel sem-card, overlay de ações e avatar-fecha
js/   (PASTAS POR FEATURE; a ordem de carga no index.html importa)
  core/app.js       — 1º. NÚCLEO: Firebase init, showView/navigateTo, openDialog, appState, SW,
                          backNav (botão "voltar" do sistema)
  tutorial/tutorial.js — 2º. Motor genérico de tour (window.startTutorial)
  install/install.js   — 3º. PWA: beforeinstallprompt, isStandalone, view-install
  auth/session.js   — 4º. onAuthStateChanged: decide a tela inicial (cold start esconde o SPINNER de
                          entrada; login/logout escondem o BLOQUEIO interno), resetAuthFlow, tutorial
  auth/auth.js      — 5º. Login: sendOTP (whitelist), verifyOTP, cooldown, OTP, resetAuthFlow
  onboarding/onboarding.js — 6º. Cadastro: finishRegistration, câmera, tags, serviço, resetOnboardingForm
  core/models.js    — MODELO DE DOMÍNIO: @typedef JSDoc de todas as entidades (Professional/Pedido/
                          Vaga/Helper/Comment/AppState). SÓ doc — não é carregado por <script>.
                          Contrato portável (vira interface TS numa migração).
  core/domain.js    — ENUMS de domínio (Object.freeze): PEDIDO_STATUS, PEDIDO_DETAIL_MODE, URGENCY,
                          DURATION, IC_TIER, AVAILABILITY, HELPER_TYPE, TAB, SORT, PAY_METHOD,
                          CONTRACT_STATUS. Fonte única dos VALORES; comparar/atribuir sempre pelo
                          enum, nunca string crua.
  feed/index.js     — 7º. Feed (ES MODULE): núcleo de event-wiring + render. Importa os módulos de
                          js/feed/ abaixo + core/domain.js. É o único <script type="module">; os
                          outros 6 (core/app, tutorial, install, auth/session, auth/auth, onboarding)
                          seguem <script defer> clássicos — cross-arquivo via window.* (module-safe).
  feed/repository.js — REPOSITÓRIO (ponto único de troca pro Firestore): arrays mock module-private +
                          accessors getProfessionals/getComments/getVagas/getHelpers/getIndicatedByPost/
                          getPublishSeedIndicated + addVaga/removeVaga. avatarSvg (export direto). Os
                          chamadores só falam com accessors.
  feed/config.js    — constantes congeladas: EASE_STD, *_CARD_CFG, TAB_*, SCROLL_*, HELPER_RATES,
                          placeholders, availOrder/availabilityMeta, MAX_VAGAS/DAY_ORDER/DEFAULT_WORK_DAYS.
  feed/utils.js     — funções puras: icTier/icShieldIcon, formatPedidoDate, pedidoHoursLeft, comingSoon,
                          shareOrCopy (Web Share + fallback de clipboard).
  feed/templates.js — templates de HTML puros: qavHTML, icBarHTML, availHTML, buildCommentHTML,
                          proBackHTML, proFooterHTML, historicoItemHTML, proCardHTML, vagaContentHTML,
                          helperPersonHTML.
  feed/state.js     — estado mutável compartilhado (objetos, nunca reatribuídos): filterState,
                          pinnedPros, pedidoHistory, myPedido, scrolledState, scrollToTopPending,
                          contractsFilter. (Primitivos reatribuídos — activeTab, indicateMode etc. —
                          seguem no closure de feed/index.js: mover exige accessors + teste no aparelho.)

.claude/
  settings.json     — hook SessionStart → session-start.sh
  hooks/session-start.sh  — git config (roda a cada sessão web)
  rules/*.md        — documentação detalhada por área (ver índice no fim)
.github/workflows/deploy.yml  — CI/CD: push para main → GitHub Pages
```

---

## Firebase

Projeto: `gente-honesta`. **Config pública** em `js/core/app.js` (normal p/ Firebase web — segurança via
Firestore Rules).

| Serviço | Uso |
|---|---|
| Auth (SMS) | `signInWithPhoneNumber` + reCAPTCHA invisível |
| Firestore | Coleção `testers` (whitelist de números) |
| Storage | (previsto para fotos de perfil) |

**Firestore Rules:** `testers` = `allow read: if true` (leitura antes do login p/ verificar
whitelist); demais coleções exigem autenticação. **Whitelist** em `js/auth/auth.js → sendOTP()` (bloco
`// WHITELIST DE TESTERS`; doc na coleção `testers` com ID = `+5551XXXXXXXXX`). Remover esse bloco ao
abrir ao público.

---

## Design System — CHECKLIST DE CONFORMIDADE

> **Passe por esta lista ANTES de criar/alterar QUALQUER elemento de UI.** O detalhe completo (tokens,
> semântica de cores, taxonomia, primitivos, IC) está em **`.claude/rules/design-system.md`** — leia
> antes de mexer em CSS/HTML.

1. **Classifique pelo PAPEL, nunca pela estética:** contêiner de conteúdo → `.card`; ação (faz algo)
   → `.btn` + variante; item selecionável/filtro/toggle → `.chip`; entrada de texto → `.input-text`.
   Reuse a base existente; NUNCA crie uma árvore de classes paralela para algo que já tem primitiva.
2. **Cor pela FUNÇÃO:** AMARELO (`--a-gold`) = só AÇÕES e acentos de marca; AZUL (`--info-blue`) =
   seleção/estado ativo; VERDE = identidade/fundos/sucesso/foco de input; VERMELHO (`--danger`) =
   erro/destrutivo.
3. **Zero valores crus:** cor/tamanho/raio/sombra/espaçamento/peso/duração vêm de token do `:root`.
   Se o valor exato não existe na escala, use o degrau mais próximo — não invente um número.
4. **Sem contorno:** nada de `border` para definir card/pílula/botão/input — definição por contraste
   do fundo + `--shadow-sm` (sobre claro) ou fill claro `--card-on-green` (sobre verde). Única linha
   de borda permitida: o vermelho canônico de erro/obrigatório. Bordas FUNCIONAIS (avatar, checkbox,
   divisor, spinner) são exceção.
5. **Estado muda a COR INTERNA do elemento** (fundo/texto), nunca ganha anel/box-shadow/outline.
6. **Visibilidade:** telas SÓ por `.screen--active` (via `showView`); sub-elementos SÓ por `u-hidden`;
   nunca `style.display` inline nem `display` em seletor de `.screen`.
7. **Acessibilidade mínima:** toggle/chip carrega `aria-pressed` sincronizado com a classe ativa;
   botão só-ícone carrega `aria-label`; elemento clicável é `<button>` (nunca `<div>` com listener).
8. **Sheet/dropdown novo?** Reuse o scaffolding `.pedido-sheet*`/`.historico-sheet*` (3 camadas
   container/clip/panel, `--sheet-top` medido em JS, gaveta com `--sheet-ease`, tap-outside, abridor
   vira "Fechar" via `.action-close-mode`) — não recrie do zero. **E registre a camada no `backNav`**
   (`window.backNav.push(id, fecharFn)` ao abrir, `window.backNav.remove(id)` ao fechar) **e no
   `layerFocus`** (`window.layerFocus.enter(el, panelSel)` ao abrir, `leave(el)` ao fechar) — o botão
   "voltar" do celular a fecha e o foco entra/sai da camada — detalhe em `.claude/rules/app-core.md`.
9. **Rola?** Os 3 feeds escondem a barra; TODO outro container com scroll usa a barra fina sempre
   visível (`::-webkit-scrollbar` 5px + thumb, `scrollbar-width: thin`), na borda do painel.
10. **Diálogo?** Sempre `await customAlert(...)`/`await customConfirm(...)` — nunca `alert()`/`confirm()`.
11. **Fechou a sessão de mudanças no app?** Bump de `CACHE_NAME` + `#version-badge` juntos, commit e
    deploy para `main` — e **atualize/pode a documentação** junto (ver "Manutenção da documentação"
    na seção Deploy): registrar o novo e remover o conteúdo morto das rules/CLAUDE.md.

---

## Próximas Features Previstas

- Persistência de profissionais no Firestore.
- Firebase Cloud Messaging (notificações push).
- Persistência do pedido e da candidatura em vagas no Firestore (UI já existe — falta backend).
- Estender o Tutorial Guiado ao feed (abas, action bar, cards, sheets).

---

## Índice da documentação detalhada (`.claude/rules/`)

Cada arquivo carrega automaticamente ao editar os caminhos indicados (path-scoped). **Se for mexer
numa área, leia a rule correspondente primeiro:**

| Arquivo | Quando ler / paths | Conteúdo |
|---|---|---|
| `design-system.md` | CSS ou `index.html` (`css/**`, `index.html`) | Tokens, semântica de cores, taxonomia, design sem contorno, primitivos (`.card`/`.check-box`/`.chip`/`.eyebrow`), scrollbar, faixas do IC. |
| `feed.md` | feed (`js/feed/**`, `css/feed/**`) | Abas, painéis, action bar, gavetas/sheets, cards flip, filtros, pedidos, ajudantes, mock e dívidas. Gotchas de `feed/index.js` (TDZ, hoisting). |
| `onboarding.md` | cadastro (`js/onboarding/**`, `css/onboarding/**`) | Barras fixas + scroll, Detalhes profissionais, serviço, pagamento, perfil público, card do IC. |
| `app-core.md` | shell (`js/core/**`, `js/auth/**`, `js/install/**`, `service-worker.js`) | Globals, `appState`, `openDialog`, mobile-only, telas verdes, loader, Service Worker, atualização do PWA. |
| `tutorial.md` | tutorial (`js/tutorial/**`, `css/tutorial/**`) | Motor genérico de coach marks e API. |
