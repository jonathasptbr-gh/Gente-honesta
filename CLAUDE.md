# Gente Honesta — Contexto do Projeto

## O que é

PWA mobile-only para conectar profissionais autônomos a clientes por indicação.
Fase atual: **testes fechados** com whitelist de números autorizados no Firestore.

URL de produção: https://gentehonesta.com.br
Repositório: jonathasptbr-gh/gente-honesta

> **Documentação detalhada:** este arquivo é o índice + o essencial sempre carregado. O detalhe de
> cada área vive em `.claude/rules/*.md` (ver o índice no fim). **Ao mexer numa área, leia a rule
> correspondente antes de alterar** — ela tem as convenções específicas que evitam divergência.

---

## Deploy

- Branch de produção: `main` (GitHub Actions → GitHub Pages → domínio customizado).
- Para publicar: `git push origin HEAD:main`. CI: `.github/workflows/deploy.yml` (dispara no push
  para `main`; **sem build step** — os arquivos são estáticos, o deploy publica o repo direto).
- **A cada sessão com mudanças no APP:** bump de `CACHE_NAME` (`service-worker.js`) + `#version-badge`
  (`index.html`) JUNTOS, commit e deploy para `main`. (Mudanças só de documentação não precisam de
  bump.) Versão atual: **v322**.

O desenvolvedor usa https://gentehonesta.com.br diretamente como preview num Samsung S24 Ultra — não
há staging. **Faça deploy ao final de cada sessão de alterações do app.**

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

**Sub-passos de auth** (dentro de `#view-auth`): `step-intro` → `form-phone` → `form-otp`.

**Fluxo de estado:**
```
Carregamento → detecção mobile (head) → onAuthStateChanged →
  Sem usuário?     → view-auth (phone → OTP → login)
  Com usuário?
    Sem displayName? → view-onboarding → finishRegistration → updateProfile
       → onAuthStateChanged de novo → Standalone? view-feed : view-install → view-feed
    Com displayName? → view-feed direto
       (exceção: login recém-feito, <15s — flag isNewSignIn em session.js — passa pelo
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
icon*.svg / *.png   — arte do ícone/PWA (quadrado full-bleed p/ maskable; arredondado p/ "any";
                      transparente e "intro" p/ usos internos). Fundo verde --p-green

css/   (ordem dos <link> no index.html = ordem da cascata; NÃO reordenar)
  base.css               — design tokens (:root), roteamento de telas, utilitários, animações
  components-buttons.css — sistema de botões (.btn + variantes)
  components-forms.css   — inputs/campos
  components-surfaces.css— .card, .check-box, ic-bar
  components-dialogs.css — diálogos + banner de atualização do PWA
  components-blocks.css  — bloqueios desktop/paisagem + sombras de scroll (.js-scroll-shadows)
  tutorial.css           — motor de tutorial guiado (destaque + balão)
  auth.css               — login: auth-section, OTP, carrossel de intro
  onboarding-form.css    — cadastro: campos, tags, serviço, pagamento, perfil público
  onboarding-ic-card.css — card do Índice de Confiança (+ adaptativo por altura)
  onboarding-camera.css  — diálogo da câmera
  install.css            — tela-guia de instalação do PWA
  feed-shell.css         — interface do feed + gaveta de contratos + painéis
  feed-navigation.css    — action bar (pedidos) + bottom bar + feed tabs
  feed-pedidos.css       — lista de pedidos + cards de post
  feed-pedido-sheet.css  — sheet "Fazer pedido" / detalhe unificado
  feed-historico.css     — histórico de pedidos
  feed-cards-pro.css     — flip + cards de profissional
  feed-vagas.css         — painel + card de vaga
  feed-ajudantes.css     — sheet "Serviço de ajudantes"
  (feed.css / components.css / onboarding.css foram divididos — a cascata é idêntica pela ordem)

js/   (a ordem de carga no index.html importa)
  app.js            — 1º. NÚCLEO: Firebase init, showView/navigateTo, openDialog, appState, SW
  tutorial.js       — 2º. Motor genérico de tour (window.startTutorial)
  install.js        — 3º. PWA: beforeinstallprompt, isStandalone, view-install
  session.js        — 4º. onAuthStateChanged: decide a tela inicial, resetAuthFlow, tutorial
  auth.js           — 5º. Login: sendOTP (whitelist), verifyOTP, cooldown, OTP, resetAuthFlow
  onboarding.js     — 6º. Cadastro: finishRegistration, câmera, tags, serviço, resetOnboardingForm
  feed.js           — 7º. Feed: painéis, modo indicação, cards, filtros, pedidos, scroll-to-top

.claude/
  settings.json     — hook SessionStart → session-start.sh
  hooks/session-start.sh  — git config (roda a cada sessão web)
  rules/*.md        — documentação detalhada por área (ver índice no fim)
.github/workflows/deploy.yml  — CI/CD: push para main → GitHub Pages
```

---

## Firebase

Projeto: `gente-honesta`. **Config pública** em `js/app.js` (normal p/ Firebase web — segurança via
Firestore Rules).

| Serviço | Uso |
|---|---|
| Auth (SMS) | `signInWithPhoneNumber` + reCAPTCHA invisível |
| Firestore | Coleção `testers` (whitelist de números) |
| Storage | (previsto para fotos de perfil) |

**Firestore Rules:** `testers` = `allow read: if true` (leitura antes do login p/ verificar
whitelist); demais coleções exigem autenticação. **Whitelist** em `js/auth.js → sendOTP()` (bloco
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
   vira "Fechar" via `.action-close-mode`) — não recrie do zero.
9. **Rola?** Os 3 feeds escondem a barra; TODO outro container com scroll usa a barra fina sempre
   visível (`::-webkit-scrollbar` 5px + thumb, `scrollbar-width: thin`), na borda do painel.
10. **Diálogo?** Sempre `await customAlert(...)`/`await customConfirm(...)` — nunca `alert()`/`confirm()`.
11. **Fechou a sessão de mudanças no app?** Bump de `CACHE_NAME` + `#version-badge` juntos, commit e
    deploy para `main`.

---

## Próximas Features Previstas

- Edição de perfil (reaproveitar formulário do onboarding).
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
| `feed.md` | feed (`js/feed.js`, `css/feed.css`) | Abas, painéis, action bar, gavetas/sheets, cards flip, filtros, pedidos, ajudantes, mock e dívidas. Gotchas de `feed.js` (TDZ, hoisting). |
| `onboarding.md` | cadastro (`js/onboarding.js`, `css/onboarding.css`) | Barras fixas + scroll, Detalhes profissionais, serviço, pagamento, perfil público, card do IC. |
| `app-core.md` | shell (`js/app.js`, `auth`, `session`, `install`, `service-worker.js`, css do shell) | Globals, `appState`, `openDialog`, mobile-only, telas verdes, loader, Service Worker, atualização do PWA. |
| `tutorial.md` | tutorial (`js/tutorial.js`, `css/tutorial.css`) | Motor genérico de coach marks e API. |
