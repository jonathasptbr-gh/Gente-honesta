# Auditoria de Design — Gente Honesta (v260)

**Data:** 13/07/2026 · **Escopo:** todos os CSS (7 arquivos), `index.html`, todos os JS (7 módulos), `service-worker.js`, `manifest.json`, comparados contra as convenções do `CLAUDE.md`.
**Método:** 4 varreduras independentes (tokens · taxonomia/contorno · estados/interações · higiene JS/doc), com verificação manual dos achados de maior severidade. Achados apontados por mais de uma varredura independente estão marcados com ✓✓.

---

## 1. Bugs visuais reais (corrigir primeiro)

| # | Achado | Local | Detalhe |
|---|--------|-------|---------|
| 1.1 ✓✓ | **Foco do textarea de observação da candidatura fica BRANCO** (sem indicação nenhuma de foco, já que o container `<details>` aberto também é branco) | `css/feed.css:3675-3678` | O par duplicado `background: var(--p-green-light); background: var(--bg-white);` está com a ordem **invertida** — a última declaração vence. Nos outros 3 campos com o mesmo par (`feed.css:386-389`, `432-435`, `2627-2630`) a ordem é a oposta e o tint verde vence. Correção: remover a linha `--bg-white` (e aproveitar para limpar as linhas mortas dos outros 3 pares). |
| 1.2 ✓✓ | **As bordas de 1,5px das pílulas tint NUNCA renderizam** | `css/feed.css:2744` (`.chip--md`), `2750` (`.chip--active`), `css/onboarding.css:169` (`.tag-pill`), `237-241` (`.chip--payment.chip--active`), `430-433`/`473` (`.collapsible__trigger--gold`) | O reset `button { border: none }` (`base.css:225-227`) zera o `border-style`; depois só se declaram `border-width`/`border-color`, e **não existe um único `border-style: solid` em nenhum CSS do projeto**. Resultado: borda computa largura 0. O CLAUDE.md descreve o trio "fundo tint + borda + texto" — na prática só fundo+texto existem. Decidir: (a) adicionar `border-style: solid` para cumprir a doc, ou (b) assumir que o visual sem borda é o desejado (mais fiel ao design sem contorno v226), remover as ~8 declarações mortas e corrigir a doc. |
| 1.3 | **Segundo azul-claro paralelo não tokenizado** no status "Concluído" do contrato | `css/feed.css:519` | `background: #eef2ff` — o tint azul oficial é `--info-blue-light` (#dee5f2). O texto do par já usa `var(--info-blue)`. Viola a regra do tint azul único. |
| 1.4 | **`font-weight: 500` — face que não existe** | `css/feed.css:2779` (`.agenda-list__region-label`) | A Inter só carrega 400/600/800; 500 é sintetizado/aproximado pelo navegador. Única ocorrência numérica em todo o CSS — trocar por `--fw-medium`. |
| 1.5 | **Número "70" do hero do IC com font-size cru** | `css/onboarding.css:766` (1.9rem) e `953` (1.2rem no media query) | 1.2rem é exatamente `--fs-10` (token existe e não foi usado). O 1.9rem fica entre `--fs-12` e `--fs-13` — tokenizar ou snapar. |

---

## 2. Padronização — elementos que deveriam ser iguais e divergem

### 2.1 Erro de campo: QUATRO mecanismos convivendo (deveria ser um)
O padrão canônico documentado é **linha de borda 2px `--danger` + fundo `--danger-soft`** (`components.css:260-273`). Mas hoje:
- `.location-check--error` (falha de GPS, vivo em `onboarding.js:577/615`) usa **`box-shadow: inset 0 0 0 2px`** (`onboarding.css:360-364`) — e o MESMO elemento tem `.location-check--error-validation` com o padrão de borda. Dois visuais de erro distintos no mesmo card. ✓✓
- `.vaga-days--error` usa **anel externo** `box-shadow: 0 0 0 2px` (`feed.css:2036`) — o mecanismo que a regra "destaque por cor, nunca sombra" baniu justamente porque fura vizinhos. ✓✓
- `.service-choice--error` usa **`outline: 2px`** (`onboarding.css:84-88`) — e é **código morto**: o JS só faz `classList.remove` (`onboarding.js:355`), nunca `add`.

**Recomendação:** consolidar tudo no padrão de borda; deletar `.service-choice--error`.

### 2.2 Botões que reimplementam bases existentes (bespoke não documentados — novos achados)
- **`.agenda-indicated__cancel`** (`index.html:699/714`, `feed.css:1421-1431`) — 2 botões "Fechar" que reescrevem à mão a receita do `.btn--close`. Candidato direto a `btn btn--close`.
- **`.agenda-filters__icon-btn`** (`#btn-toggle-filters`, `feed.css:2633-2645`) — quadrado só-ícone 40px, quase-duplicata do `.btn--icon` (44px).
- `.section-help-btn`, `.ic-card__info-btn`, `.contracts-create__collapse`, `.area-search__clear` — só-ícone bespoke menores (baixa prioridade).
- As 9 pendências já documentadas no CLAUDE.md (`.pedido-chip`, `.vaga-day`, etc.) **seguem todas existindo** como descrito.

### 2.3 Divergências pontuais entre "irmãos"
- **`#btn-toggle-filters` é o único abridor (1 de 5) que não vira botão "Fechar"** com `.action-close-mode` quando seu sheet abre — só troca o ícone tune↔close. Documentado assim, mas é quebra real de padrão entre os cinco dropdowns.
- **`color: #000`** em `.btn--white` (`components.css:48`) e `.agenda-filters__vagas-btn--criar` (`feed.css:743`) — preto puro não existe na paleta de texto (`--t-main`/`--p-green-dark`).
- **`.helper-toggle--on`** (`feed.css:4143-4149`) usa dourado translúcido 16% + texto claro, mas o CLAUDE.md o lista no grupo "preenchimento `--a-gold` cheio + texto `--p-green-dark`" (como pedido-chip/vaga-day fazem).
- **`.pro-cta`** usa `#f7e4a6` hardcoded (`onboarding.css:575`) — doc diz `--gold-soft`. Cor deliberada (comentário no código), mas deveria virar token.
- **Backdrops dos dropdowns com 4 durações de fade diferentes** (0.28/0.3/0.4/0.45s — `feed.css:1321/1467/1580/2298/2493`) para o mesmo papel.
- **`.contracts-panel`** com curva (`0.38s cubic-bezier` próprio) e sombra (`rgba(0,0,0,0.22)`) bespoke em vez de `--sheet-ease`/`--shadow-lg` (`feed.css:144-145`).
- **Rótulos uppercase:** 7 receitas reescritas caso a caso em vez de compor `.eyebrow` (ou uma variante clara-sobre-verde): `.pro-card__comments-header` e `.candid-section-label` são idênticas entre si (`feed.css:2890/3519`), + `.vaga-card__section-label`, `.contracts-recent__label`, `.contracts-filters__field-label`, `.agenda-filters__group-label`, `.payment-methods__subgroup-label`.

### 2.4 Scrollbar — regra "todo o resto que rola tem barra visível estilizada" violada em 2 lugares ✓✓
- **`.contracts-panel__scroll`** (`feed.css:184-194`) — painel de tela cheia com lista longa, `overflow-y: auto` sem nenhum tratamento.
- `.dialog-box--scrollable .dialog-box__message` (`components.css:470-477`) e o dropdown `.area-search__results` (`onboarding.css:257`) — idem, menores.

---

## 3. Acessibilidade e interação

| # | Achado | Severidade |
|---|--------|-----------|
| 3.1 | **~10 alvos de toque abaixo de 44px**, incluindo ações destrutivas/frequentes: `.historico-item__delete` (~22px, lixeira), `.tag-pill__remove` (~16px), `.intro-carousel__dot` (8px), `.area-search__clear` (~22px), `.section-help-btn` (~19px), `.ic-card__info-btn` (~23px), `.post-card__report` (~24px alt.), `.btn--close` (~31px alt.), `.pro-card__pin-btn` (~35px), `.tutorial-balloon__skip-text` (~16px alt.). Correção barata: hit-area expandida (padding + margin negativa) sem mudar o visual. | **Alta** |
| 3.2 | **Badge "2/3" dos pedidos é `<div>` clicável** (`.post-card__indicate-info`, `index.html:1451/1466` + delegação `feed.js:526`) — abre o popup de indicados mas não é focável e o `aria-label` numa div não é anunciado como ação. Deveria ser `<button>`. | Alta |
| 3.3 | **`aria-pressed` faltando em exatamente 3 grupos** de pílulas: `.pedido-chip` (urgência/duração), `.vaga-day` (dias) e chips de status de contratos — todos os DEMAIS grupos do app o mantêm corretamente. Inconsistência interna, correção mecânica. | Média |
| 3.4 | Abas do feed: `role="tab"` sem `aria-selected`/`aria-controls`; o `aria-label` estático não acompanha a mutação para "Voltar ao topo" (a ação real muda sem aviso ao leitor de tela). | Média |
| 3.5 | `#helper-type` é `role="radiogroup"` com filhos `aria-pressed` (deveriam ser `role="radio"` + `aria-checked`). | Baixa |
| 3.6 | Bloqueios desktop/paisagem têm `aria-hidden="true"` fixo — quando ativos, são o único conteúdo visível e a página fica "vazia" para leitores de tela. | Média |
| 3.7 | Zero `:focus-visible` no projeto (botões dependem do outline default do UA) e zero `prefers-reduced-motion`. Os pulsos infinitos (`tutorialPulse`, `icPinPulse`) animam `box-shadow` (paint caro) — o do tutorial em cima de um `backdrop-filter`. Trocar por `transform/opacity` em pseudo-elemento + um bloco único de reduced-motion. | Média |
| 3.8 | Diálogos com `aria-modal="true"` sem gestão de foco (não move, não trapa, sem Esc). | Baixa |

---

## 4. Robustez PWA (o motivo de existir o `--app-height`)

- **Sheets do feed usam `dvh` cru:** `calc(100dvh - var(--sheet-top) - 12px)` (`feed.css:1604`, `2309`), `92dvh` (`1329`, `1483`), `70dvh` (`1346`). O token `--app-height` foi criado exatamente porque `dvh` falha em PWA instalado/webview — nesses ambientes os dropdowns podem estourar a área visível. Trocar por `calc(var(--app-height, 100dvh) - ...)`.
- **`env(safe-area-inset-top)` ausente na `.top-bar` do feed e nas `.screen`** (só somam bottom), enquanto `.contracts-panel__header` e `.agenda-indicated` somam o top. Com `viewport-fit=cover` em iOS standalone, a top-bar pode entrar sob o notch. Inconsistência interna do próprio app.

---

## 5. Código morto (limpeza segura, ~100+ linhas)

| Item | Local |
|------|-------|
| `.agenda-sheet` + `.agenda-backdrop` (z-100/110) + `.pedidos-head` — o antigo bottom-sheet de pedidos; zero referências em HTML/JS ✓ | `feed.css:937-968`, `1313-1372` |
| `.bottom-bar__pedidos` — a bottom bar antiga; hoje o componente real é `.feed-tabs-pill` | `feed.css:810-843` |
| `.btn--fab` — nenhum FAB no HTML | `components.css:129-148` |
| **Timer do pedido inteiro:** `pedidoTimerInterval`/`stopPedidoTimer` (limpa um interval que ninguém cria), `updatePedidoTimer` (nunca chamada, mira `#pedido-detail-timer-text` que **não existe** no HTML) + CSS órfão `.pedido-detail-timer`/`.pedido-item__timer` | `feed.js:2068, 2140-2142, 2178-2186`; `feed.css:1114, 2206` |
| `.service-choice--error` (só `classList.remove`, nunca `add`) | `onboarding.css:84-88`, `onboarding.js:355` |
| `.btn--loading` — classe adicionada em JS sem CSS correspondente | `auth.js:55/61` |
| `.pedido-item--urgent { }` — ruleset vazio (resíduo da remoção da borda) | `feed.css:1027-1028` |
| Pares duplicados de `background` nos 4 focos (1 linha morta cada — e a origem do bug 1.1) | `feed.css:386-389, 432-435, 2627-2630, 3675-3678` |
| `box-shadow: var(--shadow-sm)` declarada 2× no mesmo bloco | `feed.css:2863-2864`, `3424+3428` |
| `border-color`/`border-width` no-ops (consequência do item 1.2) + `border: 1px solid transparent` (2×) + `transition` citando border-color em elementos sem borda | `feed.css:180, 2619, 2640, 2658, 2750`; `onboarding.css:431, 473, 1019, 1025` |

---

## 6. UX / textos e comportamento

- **Texto de ajuda mente para o usuário:** o diálogo do Padrão de Serviço diz "toque de novo para desmarcar" (`onboarding.js:876`), mas a seleção é rádio sem estado vazio — tocar no ativo não faz nada (comportamento correto e documentado; o texto é que está errado). ✓✓
- **Vídeo da câmera com dois mecanismos de visibilidade concorrentes:** `style.display` E `u-hidden` misturados (`onboarding.js:447, 490, 505, 546`) — a linha 546 seta `display:none` sem `u-hidden`. Único ponto do app fora do contrato "u-hidden exclusivo". Fragilidade real se um caminho limpar só um dos dois.
- `backgroundSize/Position` estáticos setados inline (`onboarding.js:557-558`) — pertencem à classe `.media-capture__display--captured` (só o `backgroundImage` é dado).
- **Reentrância de diálogos** (dívida já documentada, confirmada ainda real): se um 2º diálogo abrir sobre um 1º pendente, os handlers do 1º continuam no `#btn-dialog-confirm` e um clique resolve os dois.

---

## 7. CLAUDE.md desatualizado (drift doc ↔ código)

O código está certo nestes casos — é a doc que precisa de correção:

1. **`THEME_COLOR_BY_VIEW` não existe** (CLAUDE.md, seção "Padrões Importantes"). O real é `const THEME_COLOR` + `window.THEME_COLOR` (`app.js:195-196`) — a seção "Design System → Cor da barra de status" está certa; o CLAUDE.md se contradiz internamente.
2. **`.pedido-item--urgent` "borda vermelha 2px"** (tabela de classes notáveis) e **`.historico-item` "borda branca"** (seção Histórico) — ambas removidas no design sem contorno v226; a própria seção v226 diz isso. Duas seções contradizem a terceira.
3. **`.pro-card__back-btn` listado como "mantido bespoke de propósito"** — já foi migrado para `btn btn--icon` (`feed.js:389-399`); a seção Taxonomia diz o contrário da seção Pendências. (O CSS ainda re-declara a fundação que o `.btn` já dá — limpeza pendente em `feed.css:3018-3026`.)
4. **`.bottom-bar__pedidos` documentado como bespoke intencional** — é CSS morto; a bottom bar real é `.feed-tabs-pill`, que **não está documentada**.
5. **Avatar SVG:** doc diz "4× no index.html e 2× em feed.js"; real: **8× no index.html + 1 const** em `feed.js:643` (dentro do JS já foi consolidado). E há uma **3ª cópia não mapeada** dos profissionais mock nas indicações semeadas (`feed.js:2392-2396`), com `ic` divergente do `mockProfessionals`.
6. **`--on-green-faint/soft` reais são 0.15/0.26** (`base.css:117-118`), doc diz .1/.2. **Ícone padrão real é `'wght' 500`** (`base.css:237`), doc diz 700.
7. Doc afirma que o grid do feed usa `height: var(--app-height)` — não usa (herda pela cadeia flex; funciona, mas a doc descreve outra coisa).
8. Menores: fluxo de sessão omite a regra `isNewSignIn` (`session.js:31-34`); comentário `index.html:33-34` ainda fala em "branco na verificação/onboarding"; exemplo "v188" no comentário do SW; "app.js aborta Firebase em desktop" (só o SW é gateado — `firebase.initializeApp` roda em desktop também).

---

## 8. Inventário menor de tokens (oportunidades, não bugs)

- **Escala de espaçamento paralela de fato:** {4, 10, 14, 16}px aparecem repetidamente sem token — inclusive **o próprio `.btn` base usa `padding: 16px` e `gap: 10px`** (`components.css:15-16`), valores fora da escala oficial (12→20). Ou snap, ou admitir `--space-*` novos. Além disso ~20 usos de 8/12/20/24px crus onde o token exato existe (`feed.css:1013-1014, 3500...`; `auth.css:199`; `tutorial.css:131`; `components.css:115, 281`).
- **Tier de micro-transições 0.15/0.2s** (~30 ocorrências consistentes entre si) — candidato a `--transition-fast`; `--transition` (all 0.3s) é pesado demais para feedback de toque.
- **Raios de balão 18/4px** dos pedidos/histórico (intencionais, documentados) — candidatos a `--radius-balloon`; raio 4px dos thumbs de scrollbar (5×); `99px` do dot do carrossel (→ `50%` ou `--radius-pill`).
- `.qav__label` 0.55rem — exceção justificada em comentário no código, mas não listada nas exceções do CLAUDE.md (documentar ou criar `--fs-0`).
- `.avatar-img` com anel `rgba(0,0,0,0.2)` e `.vaga-card__poster` com `rgba(0,0,0,0.03)` — canais crus onde a regra manda `rgba(var(--*-rgb), α)`.
- `.notif-badge` com `border: 1.5px solid var(--p-green)` — papel de anel-de-avatar, mas não está na lista de bordas funcionais permitidas (documentar).
- Backdrops dos dropdowns da action bar sem `--blur-sm` (indicated-popup e diálogos têm) — se for intencional por performance no slide, documentar.

---

## ✅ O que está conforme (verificado e aprovado)

- **Backdrops:** 100% em `--overlay`/`--overlay-soft`, zero `rgba(0,0,0)` cru como véu.
- **Branco-sobre-verde:** zero alphas soltos — todos nos degraus semânticos.
- **Blur:** só a exceção documentada do tutorial (1.5px).
- **Press-scales:** só tokens + exceções documentadas (única fuga: um `scale(0.99)` cru em `onboarding.css:506` onde `--press-scale-subtle` existe).
- **Raio dos sheets:** zero `20px 20px 0 0` cru — todos em `var(--radius-lg)`.
- **5 dropdowns da action bar:** mesmo scaffolding de 3 camadas, tap-outside nos 5, `--sheet-ease` aplicado.
- **CTAs amarelos:** os 4 com o padding 11px unificado.
- **tag-pill vs chip--payment:** consistentes entre si (mesmos tokens azuis).
- **Zero `alert()`/`confirm()` nativos; zero `display` inline em `.screen`; zero "IC" abreviado ou travessão nos textos do card do IC.**
- **SW/manifest/versões:** `CACHE_NAME` v260 = badge v260; manifest integral conforme doc; Network-First e fluxo de update do PWA exatamente como documentado.
- **Sem leaks:** câmera, cooldown/interval e listeners de re-render todos limpos corretamente; todas as function declarations hoistadas conferem.

---

## Plano de ação sugerido (por ordem de retorno)

1. **Correções de 1 linha:** bug do foco branco (1.1), `#eef2ff` → token (1.3), `font-weight: 500` → token (1.4), texto "toque de novo para desmarcar" (item 6), `scale(0.99)` → token.
2. **Decisão de design + execução:** bordas fantasma das pílulas (1.2 — restaurar ou assumir sem borda) e consolidação dos 4 mecanismos de erro num só (2.1).
3. **Limpeza de código morto** (item 5) — sem risco visual, reduz `feed.css` e elimina armadilhas (ex.: timer fantasma).
4. **Acessibilidade mecânica:** `aria-pressed` nos 3 grupos, badge 2/3 → `<button>`, hit-areas expandidas nos alvos <44px.
5. **Robustez PWA:** `--app-height` nos sheets + `safe-area-inset-top` na top-bar.
6. **Atualizar o CLAUDE.md** (item 7) — barato e evita que as contradições internas induzam erro em sessões futuras.
7. **Backlog de tokens** (item 8) e migração incremental dos bespoke novos (2.2) ao mexer neles, como a doc já prescreve.
