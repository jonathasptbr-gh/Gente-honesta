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
                          padrão de serviço, pro-cta, ic-card
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

O card do Índice de Confiança no cadastro (`.ic-card`, `#view-onboarding`) é o "SELO DE REPUTAÇÃO":
o ÚNICO card ESCURO do formulário, de propósito (degradê verde profundo `#12380f → --p-green-dark` +
brilho dourado radial + borda dourada translúcida + marca d'água `.ic-card__watermark`, um escudo gigante
quase transparente no canto). Nunca abreviar "IC" em texto visível ao usuário — sempre "Índice de
Confiança". Conteúdo (de cima p/ baixo, seções irmãs num flex column com `justify-content: space-between`
para distribuir a altura extra): cabeçalho SÓ com o eyebrow dourado "SUA REPUTAÇÃO NA PLATAFORMA";
`.ic-hero` (o número 70 GIGANTE em degradê dourado via `background-clip: text` — SEM o símbolo "%",
decisão de design — + o TÍTULO do card `.ic-hero__title` "Índice de Confiança" — o título vive AQUI, ao
lado do número, nunca é escondido — + frase de responsabilidade: o índice começa em 70 e mantê-lo depende
do usuário); `.ic-meter` (as zonas `.ic-meter__zones` ficam ACIMA da barra — os MESMOS escudos do resto do
app `gpp_bad`/`gpp_maybe`/`shield_question`/`gpp_good` em versões de cor legíveis no fundo escuro, sendo a
faixa <25% PRETA `#000`, escudo e segmento, a "zona morta" do índice; zonas SEM nomes de faixa — só escudo
+ faixa numérica, os escudos coloridos já comunicam; a zona atual `.ic-zone--current` acende, as demais
ficam com `opacity: 0.78` — depois a barra segmentada nas 4 faixas, e o pino "VOCÊ" pulsante — `icPinPulse`
— ABAIXO da barra, posicionado em `left: 70%`, linha subindo até a barra + etiqueta); `.ic-factors` (duas
colunas "Faz subir"/"Faz cair" — itens são EXEMPLOS, com a nota `.ic-factors__note` em itálico ocupando as
duas colunas do grid: "todas as suas ações na plataforma, boas ou ruins, afetam esse índice"; "Indicações
FEITAS", não "recebidas" — resumo do diálogo de ajuda `btn-ic-info`); e `.ic-card__footer` (lema
"confiança se constrói devagar, e se perde rápido"). Nos textos visíveis do card NUNCA usar travessão
"—" (visualmente estranho para o usuário — usar vírgula, ponto e vírgula ou dois-pontos).
`.form-group--ic-fill` = `flex: 1 0 auto` (preenche o vão até o botão de concluir). **Adaptativo por
altura** (`@media (max-height)` em `#view-onboarding`, limiares MEDIDOS por estado: completo ~891px, sem
rodapé ~827px, sem colunas ~715px, compacto ~673px): ≤894px esconde o rodapé; ≤830px esconde as colunas
(e a nota) e aperta o padding; ≤718px compacta (some a frase do hero, encolhem o 70 e os escudos) — cabe
sem rolagem de ~673px pra cima.
O hero 70% + o medidor com os 4 escudos ficam SEMPRE. O texto de ajuda (`helpTexts['btn-ic-info']` em
onboarding.js) diz "70%" (nunca "100 pontos") e também não usa a abreviação.

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

**Mobile-only:** `window.IS_MOBILE` é definido sincronicamente no `<head>` do HTML (antes de qualquer render). Em desktop, `html.is-desktop` é adicionado ao `<html>` e um overlay bloqueia o app. `session.js` e `app.js` também verificam `IS_MOBILE` para abortar a inicialização do Firebase/SW.

**Orientation lock:** modo paisagem bloqueado em dois níveis — `manifest.json` (`"orientation": "portrait"`) e overlay CSS em `components.css` via `@media (orientation: landscape)`.

**Fundo verde em TODO o app:** todas as telas têm fundo verde (`--p-green`) hoje — auth (intro +
telefone + OTP), onboarding, install e feed. Por isso a `meta[name="theme-color"]` é verde em todas
(`THEME_COLOR_BY_VIEW` em `app.js` lista `view-auth/onboarding/install/feed` = `#184e1b`).

**Fluxo de auth (`#view-auth`) + instalação (`#view-install`) verdes:** `#view-auth.screen` e
`#view-install.screen` têm fundo `--p-green` (auth.css). A classe `.auth-section` só é usada nesses dois
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
(amarelo). Dots (`.intro-carousel__dot`) inativos em branco translúcido, ativo em `--a-gold` (o verde
padrão sumiria no fundo).

**Loader global:** `#loader-global` — mostrado/ocultado com `u-hidden`. O `onAuthStateChanged` é o único responsável por ocultá-lo em transições normais. Em erros onde o estado de auth não muda, remover manualmente. Visual: fundo `--p-green` e spinner branco (trilho em branco translúcido, topo `--t-light`) — coerente com os ambientes verdes; a `meta[name="theme-color"]` inicial também é verde (`#184e1b`) para a barra de status combinar durante o carregamento, antes de `showView` assumir. **CSS crítico inline no `<head>`** pinta o `html` de verde e já dá ao `.overlay-loader` os estilos de cobertura (`position:fixed; inset:0; background:#184e1b; z-index:9999`) — sem isso, entre o `base.css` (que pinta html/body de branco) e o `components.css` (que só então estiliza o loader) havia um flash branco no fim do splash; `.u-hidden` (base.css) ainda vence e esconde o loader normalmente. **Telas não têm animação de entrada** (`.screen` sem `animation`): um `translateY` de entrada deixava uma tira do body branco no topo por um instante, e um fade de opacidade deixava o body vazar durante o fade-out do loader — a transição entre telas fica por conta do fade-out do loader.

**Diálogos:** sempre usar `await customAlert(...)` e `await customConfirm(...)` — nunca `alert()` ou `confirm()` nativos.

**Tela de cadastro com fundo verde (`#view-onboarding`):** o fundo é `--p-green` (escopado em
`#view-onboarding.screen` — telefone/OTP/feed não são afetados). A estratégia é que quase todos os campos
já têm fundo claro/branco (foto `--bg-input`, inputs/localização `--bg-white`, gatilho colapsável e IC
card `--bg-soft`, painel colapsável `--bg-white`, pro-cta `--gold-soft`) — então eles **se destacam
sozinhos** sobre o verde e todo o conteúdo DENTRO deles segue com as cores escuras normais. Só mudam os
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

**function declarations vs const em feed.js:** helpers que precisam ser chamados antes de sua posição textual no DOMContentLoaded DEVEM ser `function` declarations (são hoistadas). São `function` declarations: `renderFlippableProCards`, `bindProCardFlip`, `handleLoadMoreComments`, `resetProCardBack`, `proCardFlipToBack`, `proCardFlipToFront`, `flipCardToBack`, `flipCardToFront`. Nunca converter para `const` arrow functions sem mover a declaração para antes de todas as chamadas.

**`text-decoration` não propaga de forma confiável para filhos de um flex container:** `.pro-card__meta-item--inactive` (rodapé do card de profissional, `proFooterHTML()` em `feed.js`) risca só o texto do método de pagamento indisponível, nunca o ícone — mas o `text-decoration: line-through` está no span do RÓTULO (`.pro-card__meta-item__label`), não em `.pro-card__meta-item--inactive` diretamente. Colocar o risco no item (que é `display: inline-flex`) e tentar excluir o ícone com `text-decoration: none` nele NÃO funciona no Chrome: como `.pro-card__meta-item` é um flex container, o ícone (item flex) é "blockificado" e o navegador ignora esse `none`, riscando o ícone mesmo assim. A solução é aplicar o risco direto no span do texto, nunca herdado de um ancestral flex.

**Service Worker:** incrementar `CACHE_NAME` em `service-worker.js` a cada deploy com mudanças de cache. Versão atual: `gentehonesta-v191`. Os arquivos CSS e JS são atualizados automaticamente pelo Network-First; o incremento serve para forçar limpeza de caches antigos.

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
única: `.chip.chip--payment` iguala fonte (`--fs-5`), padding (`8px 14px`) e borda (`1.5px`) às
`.tag-pill`, e o estado ativo (`.chip--payment.chip--active`) usa o mesmo esquema "tint preenchido" delas
— fundo tint + borda + texto no mesmo matiz. Ambas usam o **azul** `--info-blue` + `--info-blue-light`
(as `.tag-pill` também foram trocadas de verde para azul, então os dois grupos compartilham exatamente a
mesma paleta) — cor herdada dos ícones de pagamento no rodapé do card de profissional
(`.pro-card__meta-item`). A borda de `1.5px` nasce igual nos dois estados (só a COR muda ao selecionar)
para não deslocar as vizinhas na mesma linha; o seletor `.chip.chip--payment` (2 classes) é necessário
para vencer `.chip` sozinho de `feed.css`, carregado depois de `onboarding.css` com a mesma especificidade
de uma classe. Estado gravado em
`window.appState.paymentMethods = {cash, pix, card, nf}`, resetado junto com o resto do formulário em
`resetOnboardingForm`. Ao final do painel (depois de todos os
campos), um card ilustrativo `.pro-cta` (fundo `--gold-soft`, ícone + título + texto curto + chips de
benefício + preço + botão `#btn-subscribe-pro`) convida à assinatura do Plano Pro — fica por último de
propósito, já que os dados da seção só ficam visíveis/divulgados com o Pro ativo.

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
