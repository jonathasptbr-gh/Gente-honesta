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
// - Só o elemento em destaque fica clicável/tocável: 4 painéis (topo, base,
//   esquerda, direita) recortam um "buraco" exatamente no retângulo do alvo,
//   escurecendo+desfocando e bloqueando o toque em todo o resto da tela.
// =========================================================================

(function () {
  let steps = [];
  let currentIndex = 0;
  let tutorialId = null;
  let onFinishCb = null;
  let lockedScrollEl = null;
  let mutationObserver = null;

  let overlayEl, highlightEl, balloonEl, skipBtn, progressEl, titleEl, textEl, prevBtn, nextBtn;
  let maskTop, maskBottom, maskLeft, maskRight;
  let repositionTimer = null;
  let mutationRaf = null;

  function buildDOM() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'tutorial-overlay';
    overlayEl.className = 'tutorial-overlay u-hidden';
    overlayEl.innerHTML = `
      <div id="tutorial-mask-top" class="tutorial-mask"></div>
      <div id="tutorial-mask-bottom" class="tutorial-mask"></div>
      <div id="tutorial-mask-left" class="tutorial-mask"></div>
      <div id="tutorial-mask-right" class="tutorial-mask"></div>
      <div id="tutorial-highlight" class="tutorial-highlight"></div>
      <div id="tutorial-balloon" class="tutorial-balloon" role="dialog" aria-live="polite">
        <button type="button" id="tutorial-skip" class="tutorial-balloon__skip" aria-label="Pular tutorial">
          <span class="material-symbols-rounded" aria-hidden="true">close</span>
        </button>
        <p id="tutorial-progress" class="tutorial-balloon__progress"></p>
        <strong id="tutorial-title" class="tutorial-balloon__title"></strong>
        <p id="tutorial-text" class="tutorial-balloon__text"></p>
        <div class="tutorial-balloon__actions">
          <button type="button" id="tutorial-prev" class="btn btn--text tutorial-balloon__prev">Voltar</button>
          <button type="button" id="tutorial-next" class="btn btn--primary btn--pill tutorial-balloon__next">Próximo</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlayEl);

    maskTop = document.getElementById('tutorial-mask-top');
    maskBottom = document.getElementById('tutorial-mask-bottom');
    maskLeft = document.getElementById('tutorial-mask-left');
    maskRight = document.getElementById('tutorial-mask-right');
    highlightEl = document.getElementById('tutorial-highlight');
    balloonEl = document.getElementById('tutorial-balloon');
    skipBtn = document.getElementById('tutorial-skip');
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

  function lockScroll(el) {
    lockedScrollEl = el || null;
    if (lockedScrollEl) lockedScrollEl.classList.add('tutorial-scroll-lock');
  }

  function unlockScroll() {
    if (lockedScrollEl) lockedScrollEl.classList.remove('tutorial-scroll-lock');
    lockedScrollEl = null;
  }

  // Observa mudanças no DOM (ex.: um colapsável abrindo bem ao lado do alvo
  // em destaque) enquanto o tour está ativo, e reposiciona tudo — sem isso o
  // balão pode ficar parado por cima de um conteúdo que acabou de aparecer.
  function startMutationWatch() {
    stopMutationWatch();
    mutationObserver = new MutationObserver(() => {
      if (!isActive()) return;
      cancelAnimationFrame(mutationRaf);
      mutationRaf = requestAnimationFrame(positionStep);
    });
    mutationObserver.observe(document.body, {
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

    lockScroll(findScrollParent(document.querySelector(validSteps[0].selector)));
    startMutationWatch();

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

    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    clearTimeout(repositionTimer);
    repositionTimer = setTimeout(positionStep, 350);
  }

  // Os 4 painéis (topo/base/esquerda/direita) formam uma moldura ao redor do
  // retângulo em destaque: juntos escurecem+desfocam e bloqueiam o toque em
  // tudo, exceto no "buraco" onde fica o elemento-alvo (que permanece 100%
  // interativo, sem nenhuma camada por cima dele).
  function positionMask(holeTop, holeLeft, holeRight, holeBottom) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    maskTop.style.top = '0px';
    maskTop.style.left = '0px';
    maskTop.style.width = `${vw}px`;
    maskTop.style.height = `${Math.max(0, holeTop)}px`;

    maskBottom.style.top = `${holeBottom}px`;
    maskBottom.style.left = '0px';
    maskBottom.style.width = `${vw}px`;
    maskBottom.style.height = `${Math.max(0, vh - holeBottom)}px`;

    const bandHeight = Math.max(0, holeBottom - holeTop);
    maskLeft.style.top = `${holeTop}px`;
    maskLeft.style.left = '0px';
    maskLeft.style.width = `${Math.max(0, holeLeft)}px`;
    maskLeft.style.height = `${bandHeight}px`;

    maskRight.style.top = `${holeTop}px`;
    maskRight.style.left = `${holeRight}px`;
    maskRight.style.width = `${Math.max(0, vw - holeRight)}px`;
    maskRight.style.height = `${bandHeight}px`;
  }

  // Se logo abaixo do alvo existe um irmão visível colado a ele (ex.: o painel
  // de um colapsável que acabou de abrir), estende o "fundo" considerado para
  // o cálculo de posição — sem isso o balão pode ficar por cima desse
  // conteúdo recém-revelado, pensando que o espaço abaixo do alvo está livre.
  function getExtendedBottom(targetEl, rect) {
    const sibling = targetEl.nextElementSibling;
    if (!sibling || !isVisible(sibling)) return rect.bottom;
    const sRect = sibling.getBoundingClientRect();
    const horizontallyAligned = sRect.left < rect.right && sRect.right > rect.left;
    const directlyBelow = sRect.top >= rect.top - 1 && (sRect.top - rect.bottom) < 24;
    return (horizontallyAligned && directlyBelow) ? Math.max(rect.bottom, sRect.bottom) : rect.bottom;
  }

  function positionStep() {
    const step = steps[currentIndex];
    if (!step) return;
    const targetEl = document.querySelector(step.selector);
    if (!isVisible(targetEl)) return;

    const rect = targetEl.getBoundingClientRect();
    const pad = step.padding != null ? step.padding : 8;

    const holeTop = rect.top - pad;
    const holeLeft = rect.left - pad;
    const holeRight = rect.right + pad;
    const holeBottom = rect.bottom + pad;

    highlightEl.style.top = `${holeTop}px`;
    highlightEl.style.left = `${holeLeft}px`;
    highlightEl.style.width = `${holeRight - holeLeft}px`;
    highlightEl.style.height = `${holeBottom - holeTop}px`;
    highlightEl.style.borderRadius = step.round ? '999px' : 'var(--radius-md)';

    positionMask(holeTop, holeLeft, holeRight, holeBottom);

    const extendedBottom = getExtendedBottom(targetEl, rect);

    // Mede o balão "invisível" antes de decidir o lado, pra não vazar da tela
    // nem ficar por cima de algo que acabou de aparecer (ex.: colapsável aberto).
    balloonEl.classList.remove('tutorial-balloon--above', 'tutorial-balloon--below');
    balloonEl.style.visibility = 'hidden';

    requestAnimationFrame(() => {
      const bRect = balloonEl.getBoundingClientRect();
      const spaceBelow = window.innerHeight - extendedBottom;
      const spaceAbove = rect.top;

      const belowTop = extendedBottom + pad + 16;
      const aboveTop = rect.top - pad - 16 - bRect.height;

      const belowFits = belowTop + bRect.height <= window.innerHeight - 12;
      const aboveFits = aboveTop >= 12;

      let preferBelow = step.position === 'bottom' ||
        (step.position !== 'top' && spaceBelow >= Math.min(spaceAbove, bRect.height + 30));

      // Se o lado escolhido não cabe de verdade (ex.: painel recém-aberto
      // ocupou o espaço abaixo), troca de lado — desde que o outro caiba.
      if (preferBelow && !belowFits && aboveFits) preferBelow = false;
      else if (!preferBelow && !aboveFits && belowFits) preferBelow = true;

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
    unlockScroll();
    stopMutationWatch();
    if (tutorialId) markSeen(tutorialId);
    const cb = onFinishCb;
    onFinishCb = null;
    if (cb) cb();
  }
})();
