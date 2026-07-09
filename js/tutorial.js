"use strict";

// =========================================================================
// TUTORIAL — motor genérico de tour guiado (coach marks)
// Camada global reutilizável em QUALQUER tela do app: recebe uma lista de
// passos (seletor + título + texto) e desenha, por cima da tela normal, um
// destaque no elemento-alvo (o resto da tela fica escurecido/desfocado) e
// um balão com a explicação. Não depende de nenhuma tela específica — quem
// usa (onboarding, futuramente feed) só precisa fornecer os passos.
//
// Uso:
//   window.startTutorial([
//     { selector: '#meu-botao', title: 'Título', text: 'Explicação.' },
//     ...
//   ], { id: 'nome-do-tutorial' });
//
// - "id" identifica o tutorial no localStorage: uma vez visto (concluído ou
//   pulado), não é exibido de novo automaticamente. Passe { force: true }
//   para reexibir mesmo já tendo sido visto (ex.: botão "Rever tutorial").
// - Passos cujo elemento não existe ou está oculto (display:none / u-hidden)
//   no momento são ignorados automaticamente.
// - Só o elemento em destaque fica clicável/tocável: uma máscara única
//   recorta (via clip-path, com os mesmos cantos arredondados do destaque)
//   um "buraco" exatamente no retângulo do alvo, escurecendo+desfocando e
//   bloqueando o toque em todo o resto da tela.
// =========================================================================

(function () {
  // Folga reservada no topo/base do container ao rolar (ver applyScrollPadding).
  // Assimétrica de propósito: o topo (usado quando o balão fica abaixo, a
  // maioria dos passos) pode ser generoso; a base (usada quando o balão fica
  // acima — normalmente alvos grandes/perto do fim da página, já um caso
  // apertado por natureza, ex.: o Índice de Confiança) fica minimamente
  // pequena, pra não consumir o pouco espaço que sobra para o balão acima.
  // SCROLL_PADDING_TOP soma-se à margem de decidePlaceBelow() pros passos que
  // decidem o lado automaticamente (position explícito não passa por essa conta).
  const SCROLL_PADDING_TOP = 24;
  const SCROLL_PADDING_BOTTOM = 8;

  let steps = [];
  let currentIndex = 0;
  let tutorialId = null;
  let onFinishCb = null;
  let mutationObserver = null;
  let scrollWatchEl = null;
  let currentPlaceBelow = true;
  let siblingStartedHidden = false;
  let paddedScrollEl = null;
  let scrollElToRestore = null;
  let originalScrollTop = 0;

  let overlayEl, maskEl, highlightEl, balloonEl, skipBtn, progressEl, titleEl, textEl, prevBtn, nextBtn;
  let repositionTimer = null;
  let mutationRaf = null;
  let scrollRaf = null;

  function buildDOM() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'tutorial-overlay';
    overlayEl.className = 'tutorial-overlay u-hidden';
    overlayEl.innerHTML = `
      <div id="tutorial-mask" class="tutorial-mask"></div>
      <div id="tutorial-highlight" class="tutorial-highlight"></div>
      <div id="tutorial-balloon" class="tutorial-balloon" role="dialog" aria-live="polite">
        <div class="tutorial-balloon__header">
          <p id="tutorial-progress" class="tutorial-balloon__progress"></p>
          <button type="button" id="tutorial-skip-text" class="tutorial-balloon__skip-text">Pular tutorial</button>
        </div>
        <strong id="tutorial-title" class="tutorial-balloon__title"></strong>
        <p id="tutorial-text" class="tutorial-balloon__text"></p>
        <div class="tutorial-balloon__actions">
          <button type="button" id="tutorial-prev" class="btn btn--text tutorial-balloon__prev">Voltar</button>
          <button type="button" id="tutorial-next" class="btn btn--primary btn--pill tutorial-balloon__next">Próximo</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    maskEl = document.getElementById('tutorial-mask');
    highlightEl = document.getElementById('tutorial-highlight');
    balloonEl = document.getElementById('tutorial-balloon');
    skipBtn = document.getElementById('tutorial-skip-text');
    progressEl = document.getElementById('tutorial-progress');
    titleEl = document.getElementById('tutorial-title');
    textEl = document.getElementById('tutorial-text');
    prevBtn = document.getElementById('tutorial-prev');
    nextBtn = document.getElementById('tutorial-next');

    skipBtn.addEventListener('click', finish);
    nextBtn.addEventListener('click', () => goTo(currentIndex + 1));
    prevBtn.addEventListener('click', () => goTo(currentIndex - 1));

    window.addEventListener('resize', () => { if (isActive()) positionStep(); });
  }

  function isActive() {
    return !!overlayEl && !overlayEl.classList.contains('u-hidden');
  }

  function isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function hasSeen(id) {
    try { return localStorage.getItem('tutorial_seen_' + id) === '1'; } catch (e) { return false; }
  }

  function markSeen(id) {
    try { localStorage.setItem('tutorial_seen_' + id, '1'); } catch (e) { /* Firefox privado etc. */ }
  }

  function findScrollParent(el) {
    let node = el && el.parentElement;
    while (node && node !== document.body) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Dá uma folga extra no topo/base do container ao rolar (scroll-padding é
  // respeitado nativamente por scrollIntoView) — sem isso, block:'start'
  // alinhava o alvo bem rente à borda da tela, cortando visualmente elementos
  // no início da seção (ex.: o topo da foto de perfil) contra a borda/entalhe
  // do aparelho, sem nenhum respiro.
  function applyScrollPadding(el) {
    paddedScrollEl = el;
    if (!paddedScrollEl) return;
    paddedScrollEl.style.scrollPaddingTop = `${SCROLL_PADDING_TOP}px`;
    paddedScrollEl.style.scrollPaddingBottom = `${SCROLL_PADDING_BOTTOM}px`;
  }

  function clearScrollPadding() {
    if (paddedScrollEl) {
      paddedScrollEl.style.scrollPaddingTop = '';
      paddedScrollEl.style.scrollPaddingBottom = '';
    }
    paddedScrollEl = null;
  }

  // Acompanha o scroll do container em tempo real (em vez de "adivinhar" com um
  // temporizador fixo) enquanto o tour está ativo — o scrollIntoView() é uma
  // animação suave cuja duração varia com a distância (alvos mais abaixo na
  // tela, ex.: Índice de Confiança, demoram mais); um atraso fixo podia
  // disparar positionStep() ainda no meio do movimento, "congelando" o
  // destaque num ponto que não é o final. Reagir a cada evento de scroll real
  // elimina esse desalinhamento. O scroll NÃO é travado (sem overflow:hidden):
  // seções como "Detalhes profissionais", mais altas que a tela quando
  // abertas, precisam que o usuário role manualmente para ver tudo — este
  // listener mantém o destaque e o balão acompanhando também esse scroll
  // manual, além de qualquer outro (ex.: o teclado abrindo ao focar um campo).
  function startScrollWatch(el) {
    stopScrollWatch();
    scrollWatchEl = el || window;
    scrollWatchEl.addEventListener('scroll', onScrollTick, { passive: true });
  }

  function stopScrollWatch() {
    if (scrollWatchEl) scrollWatchEl.removeEventListener('scroll', onScrollTick);
    scrollWatchEl = null;
    cancelAnimationFrame(scrollRaf);
  }

  function onScrollTick() {
    if (!isActive()) return;
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(positionStep);
  }

  // Observa mudanças no DOM (ex.: um colapsável abrindo bem ao lado do alvo
  // em destaque) enquanto o tour está ativo, e reposiciona tudo — sem isso o
  // balão pode ficar parado por cima de um conteúdo que acabou de aparecer.
  // IMPORTANTE: nunca observar o próprio overlay do tutorial — o motor muda
  // style/class das suas máscaras/destaque/balão a cada reposicionamento, e
  // observar essas mudanças criaria um loop infinito (o balão "pisca" sem
  // parar, reagindo à própria atualização de posição indefinidamente).
  function startMutationWatch(rootEl) {
    stopMutationWatch();
    const root = (rootEl && rootEl !== document.body) ? rootEl : document.documentElement;
    mutationObserver = new MutationObserver((mutations) => {
      if (!isActive()) return;
      const relevant = mutations.some(m => !overlayEl.contains(m.target));
      if (!relevant) return;
      cancelAnimationFrame(mutationRaf);
      mutationRaf = requestAnimationFrame(positionStep);
    });
    mutationObserver.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  function stopMutationWatch() {
    if (mutationObserver) { mutationObserver.disconnect(); mutationObserver = null; }
    cancelAnimationFrame(mutationRaf);
  }

  // TUTORIAL - Ponto de Entrada Público
  window.startTutorial = function (newSteps, opts) {
    opts = opts || {};
    if (opts.id && !opts.force && hasSeen(opts.id)) return;

    const validSteps = (newSteps || []).filter(s => isVisible(document.querySelector(s.selector)));
    if (!validSteps.length) return;

    buildDOM();
    steps = validSteps;
    tutorialId = opts.id || null;
    onFinishCb = typeof opts.onFinish === 'function' ? opts.onFinish : null;

    const scrollParent = findScrollParent(document.querySelector(validSteps[0].selector));
    scrollElToRestore = scrollParent;
    originalScrollTop = scrollParent ? scrollParent.scrollTop : 0;
    applyScrollPadding(scrollParent);
    startMutationWatch(scrollParent);
    startScrollWatch(scrollParent);

    overlayEl.classList.remove('u-hidden');
    currentIndex = 0;
    renderStep();
  };

  // TUTORIAL - Reset manual (ex.: botão "Rever tutorial" numa tela de ajuda futura)
  window.resetTutorialSeen = function (id) {
    try { localStorage.removeItem('tutorial_seen_' + id); } catch (e) { /* noop */ }
  };

  function goTo(index) {
    if (index < 0) return;
    if (index >= steps.length) { finish(); return; }
    currentIndex = index;
    renderStep();
  }

  function renderStep() {
    const step = steps[currentIndex];
    const targetEl = document.querySelector(step.selector);

    // Elemento sumiu ou ficou oculto entre um passo e outro (ex.: colapsável fechado)
    if (!isVisible(targetEl)) {
      steps.splice(currentIndex, 1);
      if (!steps.length) { finish(); return; }
      if (currentIndex >= steps.length) currentIndex = steps.length - 1;
      renderStep();
      return;
    }

    titleEl.textContent = step.title || '';
    textEl.textContent = step.text || '';
    progressEl.textContent = `${currentIndex + 1} / ${steps.length}`;
    prevBtn.classList.toggle('u-hidden', currentIndex === 0);
    nextBtn.textContent = currentIndex === steps.length - 1 ? 'Concluir' : 'Próximo';

    // Registra se o irmão do alvo já nasce oculto neste passo — só nesse caso
    // a extensão do "buraco" (getExtendedRect) pode valer depois. Sem essa
    // checagem, um irmão que já é SEMPRE visível (ex.: a seção de localização
    // logo abaixo dos dados pessoais) seria incluído no destaque por engano,
    // só por estar colado e visível — mesmo nunca tendo sido "revelado" por
    // nenhuma interação deste passo.
    const sibling = targetEl.nextElementSibling;
    siblingStartedHidden = !!sibling && !isVisible(sibling);

    // Esconde já-já: evita o balão "piscar" no canto padrão da tela por um
    // instante antes de positionStep() calcular o lugar certo (mais notável
    // no primeiro passo do tour, quando o balão acabou de ser criado).
    balloonEl.style.visibility = 'hidden';
    balloonEl.classList.remove('tutorial-balloon--above', 'tutorial-balloon--below');

    // Decide ANTES de rolar se o balão vai ficar abaixo ou acima do alvo — com
    // base só no tamanho do PRÓPRIO alvo (não do conteúdo colapsável que ele
    // possa revelar depois: se um colapsável abrir maior que a tela inteira,
    // não existe posição sem sobreposição, então a base fica no alvo em si,
    // que quase sempre cabe). Rola alinhando o alvo no lado OPOSTO da tela —
    // isso garante espaço de sobra pro balão, em vez de só centralizar o alvo
    // (que podia deixar o conteúdo "preso" no meio da tela, sem espaço
    // suficiente nem acima nem abaixo, como acontecia no Índice de Confiança).
    const preRect = targetEl.getBoundingClientRect();
    const bHeight = balloonEl.getBoundingClientRect().height || 200;
    currentPlaceBelow = decidePlaceBelow(step, preRect.height, bHeight);

    targetEl.scrollIntoView({ behavior: 'smooth', block: currentPlaceBelow ? 'start' : 'end' });

    // Posiciona já com o retângulo atual (cobre o caso do alvo já estar
    // visível, quando scrollIntoView não dispara nenhum evento de scroll) —
    // o listener de scroll (startScrollWatch) assume dali em diante e mantém
    // tudo alinhado em tempo real enquanto a rolagem suave estiver em curso.
    requestAnimationFrame(positionStep);

    // Rede de segurança: garante uma correção final mesmo se, por algum
    // motivo, o scroll parar de disparar eventos antes do fim da animação.
    clearTimeout(repositionTimer);
    repositionTimer = setTimeout(positionStep, 700);
  }

  // Decide de que lado o balão fica (calculado uma vez ao entrar no passo,
  // usado também para escolher o alinhamento do scrollIntoView) — respeita
  // step.position quando definido; por padrão, prioriza deixar o alvo perto
  // do topo (balão abaixo) e só inverte quando o próprio alvo não deixaria
  // espaço suficiente pro balão daquele lado.
  function decidePlaceBelow(step, targetHeight, balloonHeight) {
    if (step.position === 'top') return false;
    if (step.position === 'bottom') return true;
    const margin = 40 + SCROLL_PADDING_TOP;
    return (targetHeight + balloonHeight + margin) <= window.innerHeight;
  }

  // Caminho SVG de um retângulo arredondado (sentido horário) — usado para
  // recortar o "buraco" da máscara com os mesmos cantos do destaque, em vez
  // de um buraco quadrado que deixaria os cantos do anel dourado evidentes.
  function roundedRectPath(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} ` +
      `V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} ` +
      `A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
  }

  // Uma máscara só, cobrindo a tela inteira: escurece+desfoca tudo, exceto o
  // "buraco" recortado via clip-path — que, por ser um path SVG, acompanha os
  // mesmos cantos arredondados do anel de destaque (e some da detecção de
  // toque/clique também, então o alvo permanece 100% interativo).
  function positionMask(holeTop, holeLeft, holeRight, holeBottom, radius) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const outer = `M0,0 H${vw} V${vh} H0 Z`;
    const hole = roundedRectPath(holeLeft, holeTop, holeRight - holeLeft, holeBottom - holeTop, radius);
    maskEl.style.clipPath = `path(evenodd, "${outer} ${hole}")`;
  }

  // Se logo abaixo do alvo existe um irmão visível colado a ele (ex.: o painel
  // de um colapsável que acabou de abrir), estende o retângulo considerado
  // para incluir esse conteúdo — usado tanto no "buraco" da máscara/destaque
  // (pra revelar o conteúdo recém-aberto, e não deixá-lo escurecido/bloqueado)
  // quanto no cálculo de posição do balão (pra não ficar por cima dele).
  // Também devolve o próprio elemento-irmão (`extraEl`) — é nele que
  // scrollIntoView({block:'end'}) precisa rolar quando o balão vai para cima,
  // já que rolar o alvo original não moveria esse conteúdo extra para dentro
  // da tela.
  function getExtendedRect(targetEl, rect) {
    if (!siblingStartedHidden) return rect;
    const sibling = targetEl.nextElementSibling;
    if (!sibling || !isVisible(sibling)) return rect;
    const sRect = sibling.getBoundingClientRect();
    const horizontallyAligned = sRect.left < rect.right && sRect.right > rect.left;
    const directlyBelow = sRect.top >= rect.top - 1 && (sRect.top - rect.bottom) < 24;
    if (!horizontallyAligned || !directlyBelow) return rect;
    const left = Math.min(rect.left, sRect.left);
    const right = Math.max(rect.right, sRect.right);
    const bottom = Math.max(rect.bottom, sRect.bottom);
    return { top: rect.top, left, right, bottom, width: right - left, height: bottom - rect.top, extraEl: sibling };
  }

  function positionStep() {
    const step = steps[currentIndex];
    if (!step) return;
    const targetEl = document.querySelector(step.selector);
    if (!isVisible(targetEl)) return;

    const rect = targetEl.getBoundingClientRect();
    const pad = step.padding != null ? step.padding : 8;
    const extRect = getExtendedRect(targetEl, rect);

    const holeTop = extRect.top - pad;
    const holeLeft = extRect.left - pad;
    const holeRight = extRect.right + pad;
    const holeBottom = extRect.bottom + pad;

    highlightEl.style.top = `${holeTop}px`;
    highlightEl.style.left = `${holeLeft}px`;
    highlightEl.style.width = `${holeRight - holeLeft}px`;
    highlightEl.style.height = `${holeBottom - holeTop}px`;
    highlightEl.style.borderRadius = step.round ? '999px' : 'var(--radius-md)';

    // Mesmo raio do destaque, em px reais, pra o "buraco" da máscara acompanhar
    // exatamente a curva do anel (999 é só um teto — roundedRectPath() já
    // limita ao mínimo entre largura/altura, formando a mesma "pílula").
    const radiusPx = step.round ? 999 : parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--radius-md')) || 12;
    positionMask(holeTop, holeLeft, holeRight, holeBottom, radiusPx);

    // Mede o balão "invisível" antes de decidir o lado, pra não vazar da tela
    // nem ficar por cima de algo que acabou de aparecer (ex.: colapsável aberto).
    balloonEl.classList.remove('tutorial-balloon--above', 'tutorial-balloon--below');
    balloonEl.style.visibility = 'hidden';

    requestAnimationFrame(() => {
      const bRect = balloonEl.getBoundingClientRect();

      // Considera o conteúdo estendido (ex.: colapsável aberto) pra não ficar
      // por cima dele — mas com um teto: se ele for maior que a tela inteira,
      // perseguir o fundo real não cabe em lugar nenhum (nem embaixo, nem
      // invertendo pra cima, já que o próprio alvo foi alinhado no topo da
      // tela). Nesses casos extremos é melhor um posicionamento previsível
      // (a uma distância fixa do alvo) do que "grudar" numa borda da tela.
      const maxExtension = 400;
      const belowBottom = Math.min(extRect.bottom, rect.bottom + maxExtension);
      const belowTop = belowBottom + pad + 16;
      const aboveTop = rect.top - pad - 16 - bRect.height;

      const belowFits = belowTop + bRect.height <= window.innerHeight - 12;
      const aboveFits = aboveTop >= 12;

      // O lado já foi decidido em renderStep() (decidePlaceBelow), antes de
      // rolar — aqui só corrige se algo mudou depois (ex.: o usuário abriu o
      // colapsável, que só existe/expande DEPOIS da decisão inicial) e o lado
      // escolhido não cabe mais de verdade, desde que o outro caiba.
      let preferBelow = currentPlaceBelow;
      if (preferBelow && !belowFits && aboveFits) preferBelow = false;
      else if (!preferBelow && !aboveFits && belowFits) preferBelow = true;
      else if (!belowFits && !aboveFits) {
        // Nenhum dos dois cabe de verdade (alvo grande demais pro espaço
        // disponível, ex.: perto do fim da página, onde block:'start' não
        // consegue "puxar" o alvo até o topo por falta de conteúdo abaixo) —
        // melhor esforço: fica do lado com mais espaço livre, minimizando a
        // sobreposição em vez de manter o lado original às cegas.
        const spaceAbove = rect.top - pad;
        const spaceBelow = window.innerHeight - extRect.bottom - pad;
        preferBelow = spaceBelow > spaceAbove;
      }

      let top;
      if (preferBelow) {
        top = belowTop;
        balloonEl.classList.add('tutorial-balloon--below');
      } else {
        top = aboveTop;
        balloonEl.classList.add('tutorial-balloon--above');
      }
      top = Math.max(12, Math.min(top, window.innerHeight - bRect.height - 12));

      const left = Math.max(12, Math.min(
        rect.left + rect.width / 2 - bRect.width / 2,
        window.innerWidth - bRect.width - 12
      ));

      // Seta do balão sempre aponta pro centro do alvo, mesmo com o balão deslocado
      const arrowLeft = Math.max(20, Math.min(rect.left + rect.width / 2 - left, bRect.width - 20));
      balloonEl.style.setProperty('--tutorial-arrow-left', `${arrowLeft}px`);

      balloonEl.style.top = `${top}px`;
      balloonEl.style.left = `${left}px`;
      balloonEl.style.visibility = 'visible';
    });
  }

  function finish() {
    if (!overlayEl) return;
    overlayEl.classList.add('u-hidden');
    stopMutationWatch();
    stopScrollWatch();
    clearScrollPadding();
    // Devolve o container pra posição de scroll de antes do tour começar —
    // sem isso a tela ficava "parada" onde o último passo tinha rolado
    // (ex.: cabeçalho cortado no topo) em vez de voltar ao estado normal.
    if (scrollElToRestore) scrollElToRestore.scrollTo({ top: originalScrollTop, behavior: 'auto' });
    scrollElToRestore = null;
    if (tutorialId) markSeen(tutorialId);
    const cb = onFinishCb;
    onFinishCb = null;
    if (cb) cb();
  }
})();
