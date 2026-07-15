# Convenções do Projeto — Gente Honesta

Convenções de nomenclatura, estrutura e teoria. O objetivo é que o código seja **portável**: uma
migração futura para um ambiente profissional (framework/TypeScript/bundler) deve ser *adaptação*,
não *reescrita*. O método de dev/preview/deploy (buildless, arquivos estáticos → GitHub Pages) é
próprio e **não** faz parte destas convenções — aqui só falamos do artefato.

## Nomenclatura

- **Substantivos de domínio em PORTUGUÊS** (a "linguagem ubíqua" do produto): `pedido`, `vaga`,
  `ajudante`, `indicação`, `IC` (Índice de Confiança), `contrato`. Nunca traduzir esses termos.
- **Verbos técnicos em INGLÊS**: `get*`, `render*`, `build*`, `open*`/`close*`, `wire*`, `format*`,
  `handle*`. Ex.: `renderAgendaList`, `getProfessionals`, `buildProCard`, `openPedidoDetail`.
- **CSS = BEM**: `bloco__elemento--modificador` (ex.: `.pro-card__back-btn--whatsapp`). Sem exceção.
- **Constantes/enums** em `SCREAMING_SNAKE_CASE`; funções/variáveis em `camelCase`; classes/typedefs
  em `PascalCase`.

## Modelo de domínio

- As FORMAS dos dados vivem em **`js/core/models.js`** como `@typedef` JSDoc (fonte única). Ao criar ou
  alterar uma entidade, atualize o typedef e referencie-o nas funções que a consomem
  (`@param {import('./models.js').Pedido} p`). Numa migração, os typedefs viram interfaces TS 1:1.
- Os VALORES de domínio (enums) vivem em **`js/core/domain.js`** como objetos congelados
  (`Object.freeze`): `PEDIDO_STATUS`, `IC_TIER`, `AVAILABILITY`, `HELPER_TYPE`, `URGENCY`,
  `DURATION`, `TAB`, `SORT`, `PAY_METHOD`. Na lógica JS, comparar/atribuir SEMPRE pelo enum
  (`status === PEDIDO_STATUS.ACTIVE`), nunca por string crua. Os `data-*` no HTML são a única exceção
  (não alcançam o JS), mas DEVEM casar com os valores do enum.

## Camada de dados (repository)

- O acesso aos dados passa por uma **camada de repositório** (`js/feed/repository.js` — hoje mock,
  amanhã Firestore): `getProfessionals()`, `getComments()`, `getVagas()`, `getHelpers()`,
  `getIndicatedByPost(id)`, `addVaga(v)`. A view NUNCA importa os arrays de dados direto nem os muta
  in-place — sempre pelos accessors. É o ponto único de troca quando o backend entrar.

## Estrutura de arquivos (por feature)

```
js/
  core/        app.js (Firebase/roteamento/diálogos/appState), models.js, domain.js
  auth/        auth.js, session.js
  onboarding/  onboarding.js
  install/     install.js
  tutorial/    tutorial.js
  feed/        index.js (núcleo), config.js, utils.js, templates.js, state.js, repository.js
css/
  base/ components/ feed/ onboarding/ auth/ install/ tutorial/
```

- **Um arquivo por concern** dentro da feature: `config` (constantes), `utils` (funções puras),
  `templates` (HTML puro), `state` (estado mutável), `repository` (dados), o resto = wiring/render.
- A ordem de `<link>`/`<script>` no `index.html` define a cascata CSS e a ordem de execução JS — não
  reordenar sem intenção.

## Teoria (mapa mental)

- **SPA com roteamento por CSS** (`showView`/`navigateTo`) — conceitualmente um router.
- **Design system** por tokens (`:root`) + primitivos (`.card`/`.btn`/`.chip`/`.check-box`/`.eyebrow`)
  — ver `.claude/rules/design-system.md`.
- **Estado** num módulo compartilhado (`feed/state.js`) — conceitualmente um store.
- **View** por funções de template puras (`templates.js`) — são o *spec* dos componentes equivalentes
  numa migração para framework (transcrição, não redesenho).
- Comunicação cross-feature via `window.*` (module-safe); dentro da feature, via `import`.
