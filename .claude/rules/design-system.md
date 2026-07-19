---
description: Design system — tokens, semântica de cores, taxonomia, design sem contorno, primitivos e faixas do IC. Ler ANTES de criar/alterar qualquer elemento visual.
paths:
  - "css/**"
  - "index.html"
---

# Design System

> O **checklist de conformidade** (11 regras) vive no `CLAUDE.md` raiz. Este arquivo é o
> detalhe: tokens, semântica e primitivos. Regra de ouro: **reuse a base existente, nunca
> crie uma árvore de classes paralela** para algo que já tem primitiva.

Todos os tokens ficam em `css/base.css :root`. **Zero valores crus:** cor/tamanho/raio/
sombra/espaçamento/peso/duração sempre vêm de token. Se o valor exato não existe na escala,
use o degrau mais próximo — não invente um número.

## Tokens

**Cores principais:** `--p-green`, `--p-green-dark`, `--p-green-light` (verde e variações);
`--bg-white`, `--bg-soft` (superfícies claras); `--bg-input`; `--bg-canvas` (#124014, verde
escuro atrás dos cards nas listas); `--surface-company` (#555558, faixa de empresa nos cards
de vaga); `--surface-dark` (#1c1c1e, botão "Candidatar-se").

**Destaque/seleção:** `--a-gold` (dourado de ação) + `--a-gold-text` (ocre p/ TEXTO dourado
sobre claro); `--info-blue` (azul de SELEÇÃO) + `--info-blue-light` (tint claro) +
`--info-blue-bright` #7aa3de (indicadores minúsculos sobre verde, ex.: dots do carrossel).

**Estados:** `--danger`, `--danger-soft` (fundo de erro), `--success`, `--whatsapp`.

**Canais `-rgb` para `rgba()`** — SEMPRE `rgba(var(--*-rgb), α)`, nunca reescrever os canais à
mão: `--p-green-rgb`, `--a-gold-rgb`, `--p-green-dark-rgb`, `--overlay-rgb`, `--on-green-rgb`.

**Branco-sobre-verde (escala de opacidade, 6 degraus semânticos):** `--on-green-faint` (.15),
`-soft` (.26), `-muted` (.35), `-med` (.5), `-strong` (.7), `-solid` (.9). Usar o degrau
semântico, nunca `rgba(var(--on-green-rgb), α)` solto.

**Overlays (backdrops):** `--overlay` / `--overlay-soft` (verde-quase-preto translúcido). TODO
backdrop usa um destes — nunca `rgba(0,0,0,α)` cru. `--block-bg` = fundo dos bloqueios de tela
cheia (desktop + paisagem). `--card-on-green` = fill claro translúcido dos cards SOBRE o verde
(sombra escura não aparece sobre verde, então a definição vem deste fill).

**Espaçamento:** `--space-xs` (8) → `--space-sm` (12) → `--space-md` (20) → `--space-lg` (24)
→ `--space-xl` (48).

**Raios:** `--radius-xs` (6), `--radius-sm` (8), `--radius-md` (12), `--radius-lg` (20,
padrão dos sheets), `--radius-pill` (28).

**Sombras/transições:** `--shadow-sm`, `--shadow-lg`. `--transition` é `all 0.3s …`; para
transicionar UMA propriedade específica NÃO componha `transition: color var(--transition)`
(vira `color all 0.3s`, lista inválida, descartada) — use `--ease` (a mesma curva, sem
propriedade/duração): `transition: color 0.3s var(--ease)`. Em JS, a const `EASE_STD`
(`feed/index.js`) espelha essa curva. `--sheet-ease` (`cubic-bezier(0.3,0.9,0.7,1)`, freio firme —
cauda curta p/ o elemento assentar rápido e ficar interativo, não "rastejar" o último 1%) é a curva única
dos sheets deslizantes. **DURAÇÃO dos movimentos ≠ fixa:** todo DESLOCAMENTO (gavetas, painéis, abas,
modo indicação, etc.) deriva a duração da DISTÂNCIA percorrida ÷ velocidade
(`window.moveMs`, em `core/app.js`) — só a duração; a curva segue a de cada transição. A velocidade é
DIRECIONAL: `MOVE_SPEED_OPEN` (1.1, abertura suave) ≠ `MOVE_SPEED_CLOSE` (1.5, fechamento ágil) ≠
`MOVE_SPEED` (1.3, neutra p/ navegação lateral). Detalhe em `.claude/rules/app-core.md`. `--scroll-thumb-dark` = thumb da barra fina sobre superfícies CLARAS
(sobre verde usa-se `--on-green-muted`).

**Blur:** `--blur-sm` (5px, backdrops), `--blur-lg` (14px, faixa da bottom-bar). O tutorial
mantém `blur(1.5px)` próprio.

**Toque (`:active`):** `--press-scale` (0.97, padrão do `.btn` e maioria); `--press-scale-subtle`
(0.99, alvos GRANDES: cards/linhas). Alvos minúsculos mantêm scales próprios (0.85 do ícone de
excluir, 0.9/0.92 de mini-btn/stepper).

**Pesos de fonte:** `--fw-regular` (400), `--fw-medium` (600), `--fw-bold` (700), `--fw-heavy`
(800). A Inter carrega só 400/600/800, então `--fw-bold` (700) renderiza com a face 800. Uso:
títulos de tela/diálogo/painel/seção = 800; nomes de pessoas em cards = 700; labels/botões/chips
= 600/700.

**Escala tipográfica:** `--fs-1` (0.6rem) → `--fs-13` (2.2rem). Todo `font-size` de TEXTO usa
um token; exceções: `clamp()` responsivos (auth.css), os ícones do sprite SVG (`font-size`
dimensiona o `<svg>` 1em), `.qav__label` (0.55rem, senão trunca na coluna de 48px) e o numeral-hero 70 do IC
(1.9rem).

**Altura do viewport:** `--app-height` — definida em `core/app.js` via `window.innerHeight` (corrige
`100vh`/`100dvh` inconsistentes em PWA instalado/webview). Consumida em `html/body` e nos
`max-height` dos sheets — sempre `var(--app-height, 100dvh)`, nunca `dvh` cru.

**Ícones:** SPRITE SVG INLINE (não é mais fonte). O sprite `<svg class="icon-sprite">` com os
símbolos `#ic-*` fica no topo do `<body>` (index.html) e cada uso é
`<svg class="icon"><use href="#ic-NOME"></use></svg>`. Desenham no 1º paint,
sem esperar download e SEM rede (offline-safe — a fonte cross-origin nunca era cacheada pelo SW).
A classe é `.icon` (num `<svg>`): a base em `base.css` a faz medir `1em×1em` e usar
`fill: currentColor`, então as regras seguem dimensionando por `font-size` e colorindo por `color`.
NÃO use `font-variation-settings` (SVG ignora) — peso/preenchimento já vêm assados no símbolo (wght
**700**, FILL 1, via `@material-symbols/svg-700`). **Traço "bold":** a fonte antiga usava `wght 500 +
GRAD 25` (grade), e o SVG não tem o eixo GRAD; o wght sozinho quase não muda o traço em 16–24px. Então
o gerador ASSA um `stroke` da MESMA cor sob o `fill` (`paint-order`) em cada símbolo (`thicken()` em
`gen-icon-sprite.mjs`), engrossando o glifo de forma visível e uniforme. A largura do stroke é
PROPORCIONAL ao viewBox de cada fonte (960 p/ Material Symbols, 24 p/ o set `ic` — por isso um valor
único não serve p/ os dois). Variante CONTORNO: símbolos `#ic-NOME-o` (meta-items dos cards Pro/vaga e
botões `?`).
- **Gerar HTML de ícone em JS:** `window.icon(nome, classeExtra?)`. **Trocar ícone em runtime:**
  `window.setIcon(elIcone, nome)` (era `elemento.textContent = nome`).
- **Adicionar um ícone novo = só USAR** (via `#ic-NOME`, `window.icon`, `setIcon`, `customAlert`/
  `customConfirm`/`comingSoon(…, 'nome')`, `data-icon`, `icon:`). Depois `npm install` (1ª vez) +
  **`npm run icons:gen`** — o gerador DERIVA a lista do uso (`scripts/icon-usage.mjs`) e reescreve o
  sprite direto no `index.html`. **`npm run icons:check`** (e o CI em `deploy.yml`) FALHAM se algum
  ícone referenciado não tiver símbolo (um `<use>` órfão renderiza EM BRANCO). Só mexa no `OUTLINE`
  (precisa de contorno) ou `IC_ROUND` (nome falta no pacote Google) do gerador. NUNCA edite o sprite
  à mão. Em dev, `window.icon`/`setIcon` dão `console.warn` para símbolo ausente.

## Semântica de cores — AMARELO = AÇÃO; AZUL = SELEÇÃO

- **AMARELO (`--a-gold`) é EXCLUSIVO de AÇÕES:** CTAs (`btn--accent`, primários sobre verde),
  links/botões de texto sobre verde, `.action-conclude-mode` — além dos acentos de marca (IC card,
  tutorial, ícones de seção) e da faixa 50–74 do IC (cor de tier, não seleção). **Exceção
  deliberada** (texto AZUL `--info-blue`, não dourado): `.vaga-add-btn` ("Adicionar requisito/
  benefício"), para casar com o azul de seleção da própria gaveta. **Exceção deliberada:** o slider da bottom bar
  (`.feed-tabs-pill__slider`) é dourado — é navegação/ação principal, não seletor. Os steppers
  +/- do Criar vaga têm glifo AZUL (`--info-blue`, wght 600) sobre o trilho branco (padrão do
  botão interativo sobre fundo branco), e o botão "Adicionar requisito/benefício" (`.vaga-add-btn`)
  usa o MESMO `--info-blue` — nenhum dourado na gaveta, para não competir com o CTA "Publicar vaga".
- **AZUL (`--info-blue`) é a cor de SELEÇÃO/estado ativo em TODOS os formulários e seletores**,
  em dois tons por contraste: sobre superfície CLARA → fundo `--info-blue-light` + texto
  `--info-blue` (tag-pill, chip--payment, chips de contrato/candidatura/serviço/busca de área,
  pedido-chip, vaga-day, benefit-pill, helper-toggle, chips do filters-sheet, badge "Ativo" do
  histórico); sobre superfície VERDE ESCURA → fundo `--info-blue` SÓLIDO + texto `--t-light`.
  Controles PEQUENOS de marcação usam azul sólido mesmo no claro (caixa do check, trilho do
  switch, thumb do seg-toggle). Indicadores minúsculos sobre verde → `--info-blue-bright`.
- **FOCO de input** (transitório, não é seleção) → `--p-green-light`. **SUCESSO** (GPS
  confirmado, status verde de contrato) → verdes. **ERRO** → `--danger`.

**Destaque de estado por COR, NUNCA por sombra/anel:** o estado muda o FILL do próprio elemento
(fundo/texto), nunca ganha `box-shadow`/`outline`/anel. Não existem tokens de anel.

## Design sem contorno

O app NÃO usa linha de borda para definir cards, inputs, pílulas ou botões. A definição vem de
(a) **contraste** do fundo do elemento com o fundo atrás, e (b) **sombra** `--shadow-sm` sobre
claro; sobre verde escuro, um **fill claro** (`--card-on-green`) no lugar da sombra.

**Reset obrigatório** (`base.css`): `button, input, textarea { border: none }` — sem isto, ao
remover a borda explícita de um `<button>` reaparece a borda de UA (bevel `outset` bicolor em
vários mobile).

**Bordas FUNCIONAIS preservadas** (não são contorno de card): anéis de avatar, divisores
internos entre seções, caixa do checkbox, checkmark desenhado com borda, anel do spinner e a
seta do balão do tutorial.

**ÚNICA exceção de linha de borda — ERRO/OBRIGATÓRIO (mecanismo ÚNICO):** campo exigido vazio no
submit OU erro de operação (falha de GPS) ganha **linha vermelha** + fundo `--danger-soft`
(`.input-text--error`, `.location-check--error`/`--error-validation`, `.media-capture__display--error`
= `border: 2px solid var(--danger) !important`; `.vaga-days--error` = só a linha, sem fundo, por
estar sobre o sheet verde-escuro). O `!important` vence o `border:none` do reset. A validação
(`finishRegistration`) marca os obrigatórios juntos e o alerta diz "destacados em vermelho".

## Taxonomia de elementos interativos (classifique por PAPEL, não por estética)

Regra de ouro: **"card" = SUPERFÍCIE (contêiner); "botão" = AÇÃO.** Se o elemento AGE
(compartilhar, candidatar, filtrar), é botão/chip, não card.

1. **Superfície / Card (`.card` + `--soft`/`--shadow`)** — contêiner. `<div>`/`<article>` se
   estático; `<button class="card …">` se a superfície INTEIRA é um alvo de toque (ex.:
   `.location-check`, `.service-choice__card`).
2. **Botão / Ação (`.btn` + variantes)** — executa uma ação. `<button>` (ou `<a>` se navega).
   TODO botão de ação herda `.btn` (sem borda, flex-center, cursor, transição, `:active`).
   Estilo: `--primary/--accent/--outline/--white/--danger/--text`. Estrutura:
   `--large/--pill/--close/--icon` (`--icon` = quadrado só-ícone 44px).
3. **Token / Pílula (`.chip` + `--sm/--md`)** — item selecionável/filtro/toggle. `<button>`.
   Estado ativo SEMPRE azul (par de contraste do contexto).
4. **Campo (`.input-text`)** — entrada de texto. `<input>`/`<textarea>`; sem borda, foco por
   mudança de cor do fundo (`--p-green-light`). O autofill do navegador é repintado com a cor
   normal do campo via `-webkit-box-shadow: inset 0 0 0 1000px …` + `transition: background-color
   9999s`. Nome/sobrenome do cadastro são um PAR de autofill (`autocomplete="given-name"`/
   `"family-name"` + `name`), p/ o navegador preencher os dois juntos.

**Ainda bespoke (migrar ao mexer):** `.pedido-chip`, `.vaga-day`, `.vaga-benefit-pill`,
`.helper-toggle` → candidatos a `.chip`; `.pro-card__load-more`, `.contract-mini__btn` →
candidatos a `.btn`. (Salvar profissional e denunciar pedido deixaram de ser botões — agora são
pressionar-longo do card, `attachLongPress`.) Bespoke DE PROPÓSITO
(estruturalmente distintos): `.agenda-filters__vagas-btn` (par de altura fixa 40px),
`.ajudante-cancel-btn` (pílula danger).

## Primitivos / helpers reutilizáveis

- **`.card` (`components/surfaces.css`)** — casco das superfícies claras. Invariante: `--radius-md` +
  fundo claro + `border:none`. Modificadores `--soft` (`--bg-soft`) e `--shadow` (`--shadow-sm`).
  Já em `.contract-card`, `.location-check`, `.profile-public-check`, `.ic-card`, passos do
  install. Compor a partir dele para qualquer superfície clara nova.
- **`.check-box` (`components/surfaces.css`)** — caixa de marcação 24×24 (radius-xs, borda `--border-mid`,
  glifo `--t-light`). O estado marcado lê o **`aria-pressed` do BOTÃO-pai**
  (`[aria-pressed="true"] .check-box` → fill/borda `--info-blue`). Serve a qualquer toggle novo.
  Usada no check "perfil público" (cadastro) e "exigir currículo" (criar vaga).
- **`.eyebrow` (`components/forms.css`)** — rótulo uppercase (`--p-green`, `--fs-5`, 700), agrupada com
  `.form-group__label`. TODOS os labels das gavetas compõem a classe no HTML. Sub-rótulos
  discretos seguem `.payment-methods__subgroup-label` (fs-3, bold, `--t-sub`, uppercase). (Ícone
  dentro de rótulo uppercase não é mais problema: o ícone é `<svg>`, não texto — `text-transform`
  não o afeta.)
- **`.btn__spinner` (`components/buttons.css`)** — spinner de loading dos botões (ícone `autorenew`
  girando). `class="icon btn__spinner"` (num `<svg><use href="#ic-autorenew">`);
  variante `--sm` p/ o link de reenvio de SMS.
- **`.chip` + `.chip--md` (`feed/historico.css`)** — `.chip` é o casco base (radius-pill, inline-flex,
  transição); `.chip--md` é a métrica das pílulas do cadastro (padding `8px 14px`, `--fs-5`).
  Pílulas de pagamento (`chip chip--md chip--payment`) e `.tag-pill` (`chip chip--md tag-pill`,
  geradas em `onboarding/onboarding.js`) usam esse casco; `.tag-pill` aplica o tint via seletor de 2 classes
  `.chip.tag-pill` (vence o `.chip` base por especificidade).
- **Pílula "tint preenchido" (azul)** — estado selecionado de `.tag-pill` e
  `.chip--payment.chip--active`: fundo `--info-blue-light` + texto `--info-blue`, SEM borda. É a
  linguagem de seleção do app inteiro sobre fundos claros; sobre verde-escuro usa o par invertido
  `--info-blue` sólido + `--t-light`.
- **`.list-empty-hint` (+ `--block`, `feed/historico.css`)** — empty-state de lista sobre verde
  (indicados/agenda), no lugar de cor inline em `feed/index.js`.
- **Sombras de fronteira de scroll (`.js-scroll-shadows`)** — mecânica única em `core/app.js`
  (`window.watchScrollShadows`): todo container com a classe ganha um par de "shades" sticky
  (topo/base) que acendem quando há conteúdo continuando sob a borda (classes
  `has-scroll-above`/`has-scroll-below`). Aplicada no `#view-onboarding` e nos scrolls das gavetas
  do feed. Container novo que rola sob uma borda recebe a classe no HTML (ou
  `watchScrollShadows(el)` em runtime). A action bar do feed usa a variante própria
  `agenda-filters--elevated` (js: `updateBarElevation`).
- **Cor da barra de status:** `window.THEME_COLOR` (`core/app.js`) é a fonte única do verde `#184e1b`
  da `meta[theme-color]`. Todas as telas são verdes → constante. O modo indicação do feed NÃO
  altera o theme-color.

## Índice de Confiança (IC) — faixas e classes

| Faixa | Classe CSS | Ícone Material |
|---|---|---|
| 75–100 | `ic--ok` (verde) | `gpp_good` |
| 50–74 | `ic--warn` (ouro) | `shield_question` |
| 25–49 | `ic--alert` (vermelho) | `gpp_maybe` |
| 0–24 | `ic--bad` (cinza) | `gpp_bad` |

O badge de IC do feed é o **escudo com o número dentro** (`icBarHTML(ic, size)` em
`feed/templates.js`, `.ic-bar` em `components/surfaces.css`). O `size` escala ao contexto (o badge
deve ficar condizente com os vizinhos da linha): **padrão** (sem modificador) p/ cards com avatar
grande (lista de pedidos, popup de indicados); **`--sm`** (1.3rem) p/ linhas compactas (comentários,
divulgador de vaga, card de ajudante); **`--lg`** (2.15rem, nº um degrau maior) só no cabeçalho do
card de profissional (canto superior direito). Ao criar um novo uso, escolha o `size` pelo tamanho
dos vizinhos — não deixe o padrão em linha compacta. O **fundo semitransparente** do escudo (cor do
tier a 14%) vem do CSS (`.ic-bar__frame path { fill: currentColor; fill-opacity: 0.14 }`) — fonte
única que vence o `fill="none"` do markup, então todo `.ic-bar` (inclusive os escudos hardcoded da
lista de pedidos) fica no padrão. Na assinatura de comentário o **IC vem ANTES do nome** (à
esquerda); nos demais contextos (pedido, vaga, ajudante) o IC segue DEPOIS do nome.

> O **card do IC** no cadastro (`.ic-card`) tem detalhamento próprio em
> `.claude/rules/onboarding.md`.

## Regras de scrollbar

- **Os 3 FEEDS** (`#agenda-list`, `.vagas-scroll`, `.feed-panel--pedidos .scroll-area`)
  ESCONDEM a barra (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`).
- **Todo o resto que rola** usa barra fina SEMPRE visível: `::-webkit-scrollbar { width: 5px }`
  + `-thumb` (thumb `--scroll-thumb-dark` sobre claro, `--on-green-muted` sobre verde) +
  `scrollbar-width: thin`. Nas gavetas, a área de scroll é edge-to-edge (margem lateral negativa
  devolvida como padding) p/ a barra ficar na borda e as shades cobrirem a largura toda.
