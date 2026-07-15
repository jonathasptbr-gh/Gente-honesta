---
description: Motor genérico de tutorial guiado (coach marks) — reutilizável em qualquer tela.
paths:
  - "js/tutorial/**"
  - "css/tutorial/**"
---

# Tutorial Guiado (Coach Marks)

Motor genérico e reutilizável (`js/tutorial/tutorial.js` + `css/tutorial.css`) para tours guiados em cima
de qualquer tela. Hoje usado só no cadastro (`view-onboarding`); a ideia é reaproveitar no feed
sem recriar elementos por tela.

## API pública

```js
window.startTutorial([
  { selector: '#el', title: 'Título', text: 'Explicação.', position: 'bottom'|'top' /* opcional */ },
  // ...
], { id: 'nome-do-tutorial', force: false, onFinish: () => {} });

window.resetTutorialSeen('nome-do-tutorial'); // limpa a flag "já visto"
```

- **Passos** = `{ selector, title, text, position?, padding?, round? }`. Passos cujo elemento não
  existe ou está oculto (`display:none`/`u-hidden`, ex.: dentro de um colapsável fechado) são
  **ignorados automaticamente** — não precisa checar visibilidade antes.
- **Persistência:** cada tutorial aparece automaticamente uma vez por dispositivo, via
  `localStorage['tutorial_seen_' + id]`. `{ force: true }` reexibe.

## Como funciona

**Camada fixa de tela inteira.** Uma única máscara (`#tutorial-mask`) recorta um "buraco" com
cantos arredondados via `clip-path: path(evenodd, …)` gerado em JS (`roundedRectPath()`),
exatamente no retângulo do alvo. A máscara escurece (`--overlay-soft`) + desfoca
(`backdrop-filter: blur(1.5px)`) o resto e **bloqueia toque fora do buraco** (o recorte também é
respeitado pela detecção de clique). Só o elemento em destaque fica nítido e interativo. Anel
dourado pulsante (`--a-gold`) marca o destaque; o balão (`.tutorial-balloon`) traz cabeçalho com
progresso (`N / total`) + link "Pular tutorial", título, texto e Voltar/Próximo. O balão nasce
`visibility: hidden` e só aparece após `positionStep()` calcular o lugar (senão pisca no canto).

**Posicionamento do balão.** Antes de rolar, `decidePlaceBelow()` decide se o balão fica abaixo
(cabe se `altura do alvo + altura do balão + margem < viewport`) ou acima; `step.position` força
um lado. `scrollIntoView` alinha o alvo no lado OPOSTO (`block:'start'` p/ balão embaixo,
`block:'end'` p/ balão em cima), garantindo espaço do lado do balão. `applyScrollPadding()`
reserva folga assimétrica via CSS `scroll-padding`: `SCROLL_PADDING_TOP` (24px, generosa, a
maioria usa `block:'start'`) e `SCROLL_PADDING_BOTTOM` (8px, pequena). O balão se mede antes de
decidir o lado e nunca deixa a seta vazar a viewport; reposiciona no `resize`. Quando nenhum lado
cabe de verdade, faz "melhor esforço": fica do lado com mais espaço (`spaceAbove` vs
`spaceBelow`).

**Scroll NÃO é travado.** `startScrollWatch` reposiciona tudo a cada evento real de scroll —
inclusive scroll MANUAL do usuário (seções que ficam mais altas que a tela ao expandir precisam
que o usuário role à vontade). Ao terminar (concluído ou pulado), o container volta à posição de
scroll de antes (`originalScrollTop`).

**Colapsáveis no alvo atual.** Um `MutationObserver` (no container com scroll da tela, NUNCA no
overlay do tutorial — evita loop) reposiciona quando o DOM muda durante o tour (ex.: o usuário
toca no alvo em destaque e abre um `<details>`/`.collapsible__panel` ao lado). `getExtendedRect()`
estende o retângulo do "buraco" para revelar o irmão recém-aberto — mas SÓ se o irmão nascia
oculto no início do passo (`siblingStartedHidden`), para não incluir por engano um irmão que já
era sempre visível. O cálculo de lado do balão usa sempre o retângulo ORIGINAL do alvo (com teto
`maxExtension` 400px), nunca o estendido.

## Uso atual e reaproveitamento

`window.startOnboardingTutorial()` (`js/onboarding/onboarding.js`) define 4 passos (dados pessoais, região,
detalhes profissionais, Índice de Confiança — este com `position:'top'` explícito, é o último
campo antes do botão de concluir) e é chamado por `auth/session.js` ~600ms após
`showView('view-onboarding')`. Tutorial id: `'onboarding'`.

Para outra tela: defina `startXTutorial()` no módulo daquela tela com sua lista de passos e chame
`window.startTutorial(steps, { id: 'nome-unico' })` quando a tela aparece — sem tocar em
`js/tutorial/tutorial.js` nem `css/tutorial.css`.
