"use strict";

// =========================================================================
// INSTALAÇÃO DO PWA — captura do prompt nativo e tela-guia (view-install)
// Autossuficiente: tudo que diz respeito a instalar o app vive aqui.
// Expõe em window: deferredInstallPrompt, isStandalone, prepareInstallView.
// =========================================================================

// INSTALAÇÃO DO PWA - Captura do prompt nativo (beforeinstallprompt)
// Capturado globalmente o quanto antes (o evento pode disparar bem cedo) e
// guardado para a tela view-install usar depois do cadastro.
window.deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.deferredInstallPrompt = e;
});

window.addEventListener('appinstalled', () => {
  window.deferredInstallPrompt = null;
  console.log('[PWA] App instalado pelo usuário.');
});

// INSTALAÇÃO DO PWA - Detector de modo standalone (PWA instalado)
// Função (e não constante) porque o estado pode mudar durante a sessão.
window.isStandalone = function () {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || window.navigator.standalone === true;
};


// =========================================================================
// TELA - INSTALAÇÃO PWA - Preparação, estágios e ações
// =========================================================================

document.addEventListener('DOMContentLoaded', () => {

  // prepareInstallView é exposta em window para o finishRegistration (onboarding.js)
  // decidir o bloco visível NO MOMENTO de exibir a tela (o beforeinstallprompt pode
  // ter sido capturado a qualquer instante após o load).
  const installBlocks = () => ({
    android:  document.getElementById('install-block-android'),
    ios:      document.getElementById('install-block-ios'),
    generic:  document.getElementById('install-block-generic'),
    progress: document.getElementById('install-block-progress'),
    skip:     document.getElementById('btn-skip-install'),
    hero:     document.getElementById('icon-install-hero'),
    title:    document.getElementById('text-install-title'),
    sub:      document.getElementById('text-install-sub'),
    retry:    document.getElementById('btn-retry-install'),
  });

  window.prepareInstallView = () => {
    const el = installBlocks();
    [el.android, el.ios, el.generic, el.progress].forEach(b => b?.classList.add('u-hidden'));
    el.skip?.classList.remove('u-hidden');

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (window.deferredInstallPrompt) {
      el.android?.classList.remove('u-hidden'); // instalação em 1 toque
    } else if (isIOS) {
      el.ios?.classList.remove('u-hidden');     // passo a passo do Safari
    } else {
      el.generic?.classList.remove('u-hidden'); // instrução via menu do navegador
    }
  };

  // Estágio "instalação em andamento": o aceite no prompt NÃO significa app
  // instalado — informa o andamento, avisa que a aba pode ser fechada, oferece
  // retry discreto e REMOVE o acesso ao feed por esta tela (some o "Continuar
  // no navegador").
  const showInstallProgress = () => {
    const el = installBlocks();
    [el.android, el.ios, el.generic].forEach(b => b?.classList.add('u-hidden'));
    el.skip?.classList.add('u-hidden');
    el.progress?.classList.remove('u-hidden');
    if (el.hero)  el.hero.innerText = 'downloading';
    if (el.title) el.title.innerHTML = 'Instalação em<br>andamento...';
    if (el.sub)   el.sub.innerText = 'Em instantes o Gente Honesta estará disponível na sua tela inicial ou na gaveta de aplicativos. Você já pode fechar esta aba — depois, é só abrir o app pelo ícone.';
  };

  // Quando o sistema confirmar a instalação de fato (evento appinstalled),
  // atualiza o estágio para "instalado" e esconde o retry.
  window.addEventListener('appinstalled', () => {
    const progress = document.getElementById('install-block-progress');
    if (!progress || progress.classList.contains('u-hidden')) return; // não estamos neste fluxo
    const el = installBlocks();
    if (el.hero)  el.hero.innerText = 'task_alt';
    if (el.title) el.title.innerHTML = 'App instalado!';
    if (el.sub)   el.sub.innerText = 'Abra o Gente Honesta pelo ícone na sua tela inicial ou na gaveta de aplicativos. Esta aba já pode ser fechada.';
    el.retry?.classList.add('u-hidden');
  });

  // Dispara o prompt nativo de instalação (compartilhado pelo botão principal
  // e pelo retry). Aceitou → estágio de andamento. Cancelou → permanece na
  // tela, com o botão disponível para tentar de novo.
  const triggerInstallPrompt = async () => {
    const promptEvent = window.deferredInstallPrompt;
    if (!promptEvent) {
      // Prompt indisponível/já consumido — orienta o caminho manual.
      window.prepareInstallView();
      await customAlert(
        'O instalador automático não está disponível agora. Você pode instalar pelo menu do navegador: toque em ⋮ e escolha "Instalar app" ou "Adicionar à tela inicial".',
        'Instalação Manual',
        'info'
      );
      return;
    }

    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    window.deferredInstallPrompt = null; // o evento só pode ser usado uma vez

    if (outcome === 'accepted') {
      showInstallProgress();
    }
    // Cancelou ("dismissed"): nada a fazer — a tela permanece com o botão
    // "Instalar agora" visível, e o feed continua acessível apenas pelo
    // "Continuar no navegador".
  };

  document.getElementById('btn-install-app')?.addEventListener('click', triggerInstallPrompt);
  document.getElementById('btn-retry-install')?.addEventListener('click', triggerInstallPrompt);

  // Botão "Continuar no navegador": ÚNICO caminho desta tela para o feed.
  document.getElementById('btn-skip-install')?.addEventListener('click', () => {
    if (typeof showView === 'function') showView('view-feed');
  });

});
