# Gente Honesta — Contexto do Projeto

## O que é

PWA mobile-only para conectar profissionais autônomos a clientes por indicação.
Fase atual: **testes fechados** com whitelist de números autorizados no Firestore.

URL de produção: https://gentehonesta.com.br
Repositório: jonathasptbr-gh/gente-honesta

---

## Deploy

- Branch de trabalho: `claude/pwa-github-setup-4vhgdo`
- Branch de produção: `main` (GitHub Actions → GitHub Pages → domínio customizado)
- Para publicar: `git push origin HEAD:main`
- CI: `.github/workflows/deploy.yml` — dispara no push para `main`

> Nunca há build step: todos os arquivos são estáticos, o deploy publica o repo direto.

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

---

## Mapa de Arquivos

```
index.html              — HTML único do SPA (todas as telas)
manifest.json           — PWA manifest (start_url e scope usam "./" para GitHub Pages)
service-worker.js       — Network-First, cache offline, CACHE_NAME = "gentehonesta-vN"
CNAME                   — "gentehonesta.com.br"

css/
  base.css              — Design tokens (:root), screen routing, utilitários, animações
  components.css        — Botões, inputs, ic-bar, diálogos, bloqueio desktop
  auth.css              — Fluxo de login: auth-section, OTP grid, carrossel de intro
  onboarding.css        — Formulário de perfil: câmera, tags, localização, barras de
                          serviço, pro-note/pro-compare, ic-card
  install.css           — Tela-guia de instalação do PWA (view-install)
  feed.css              — Feed, top/bottom bar, notificações, agenda sheet, cards de pro

js/   (a ordem de carga no index.html importa: app.js primeiro)
  app.js                — NÚCLEO: Firebase init, showView/navigateTo, customAlert/
                          customConfirm, estado global (window.appState), registro do SW
  install.js            — Instalação do PWA: captura do beforeinstallprompt,
                          isStandalone, prepareInstallView, tela view-install
  session.js            — Monitor de sessão (onAuthStateChanged): decide a tela
                          inicial em login/logout, chama resetAuthFlow no logout
  auth.js               — Login: sendOTP (com whitelist), verifyOTP, cooldown,
                          máscara de telefone, OTP grid, carrossel, resetAuthFlow,
                          helpers: clearOTPFields, setButtonLoading, restoreButton
  onboarding.js         — Formulário de perfil: finishRegistration, câmera, tags,
                          localização, barras de serviço, diálogos de ajuda,
                          resetOnboardingForm (chamado pelo resetAuthFlow)
  feed.js               — Comportamentos do feed: notificações, agenda sheet, modo
                          indicação, cards de profissional (dados mock), filtros, logout
```

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
- Cores: `--p-green`, `--p-green-dark`, `--p-green-light`, `--a-gold`, `--info-blue`, `--danger`
- Espaçamento: `--space-xs` (8px) → `--space-xl` (48px)
- `--radius-md` (12px), `--radius-pill` (99px)
- `--shadow-sm`, `--shadow-lg`
- `--transition` (padrão para todos os `transition:`)

Ícones: Material Symbols Rounded (Google CDN), carregados no `<head>`.
Font-variation padrão filled: `'FILL' 1, 'wght' 700, 'GRAD' 25, 'opsz' 48`
Font-variation filled médio (blocos Pro): `'FILL' 1, 'wght' 600, 'GRAD' 25, 'opsz' 24`

---

## Padrões Importantes

**Mobile-only:** `window.IS_MOBILE` é definido no `<head>` do HTML. Em desktop, `html.is-desktop` é adicionado ao `<html>` e um overlay bloqueia o app.

**Loader global:** `#loader-global` — mostrado/ocultado com `u-hidden`. O `onAuthStateChanged` é o único responsável por ocultá-lo em transições normais. Em erros onde o estado de auth não muda, remover manualmente.

**Diálogos:** sempre usar `await customAlert(...)` e `await customConfirm(...)` — nunca `alert()` ou `confirm()` nativos.

**Service Worker:** incrementar `CACHE_NAME` em `service-worker.js` a cada deploy com mudanças de cache (ex: `gentehonesta-v49`). Os arquivos CSS e JS são atualizados automaticamente pelo Network-First.

**Estado global:** `window.appState` em `app.js` — `confirmationResult`, `photoBlob`, `stream`, `selectedTags`, `cooldownActive`, `locationConfirmed`, `serviceProfile`.

---

## O que ainda é mock (dados de exemplo)

- Lista de profissionais em `js/feed.js → mockProfessionals[]`
- Indicações por post em `js/feed.js → mockIndicatedByPost{}`
- Botões "Contratar", "WhatsApp", "Compartilhar" exibem alertas placeholder
- Botão "Fazer um pedido" simula criação sem persistência

---

## Próximas Features Previstas

- Edição de perfil (reaproveitar formulário do onboarding)
- Persistência de profissionais no Firestore
- Firebase Cloud Messaging para notificações push
- Tela de criação de pedido real
