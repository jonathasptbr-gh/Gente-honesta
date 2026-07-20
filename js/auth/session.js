"use strict";

// =========================================================================
// MONITOR DE SESSÃO CENTRALIZADO (FIREBASE AUTH STATE LIFECYCLE)
// Único ponto que decide a tela inicial em qualquer mudança de estado de
// autenticação: login, logout, expiração de sessão e primeiro carregamento.
// Depende de: window.auth (app.js), showView/navigateTo (app.js),
// window.resetAuthFlow (auth.js — chamado de forma tardia, só no logout).
// =========================================================================

(() => {
  // BLOQUEIO DESKTOP: em desktop o app não inicializa — a tela de bloqueio
  // (CSS via html.is-desktop) cobre tudo e o monitor de sessão nem é registrado.
  if (!window.IS_MOBILE) return;

  // COLD START: a tela de entrada é o SPINNER (#loader-global), escondido aqui na
  // 1ª resolução (com um tempo mínimo p/ não piscar). As resoluções SEGUINTES
  // (login por OTP, logout) escondem o BLOQUEIO INTERNO (blur+spinner) que o
  // disparador mostrou — o spinner de entrada não reaparece nesses casos.
  const MINIMUM_LOADER_TIME = 1000;
  const startTime = Date.now();
  let firstResolve = true;

  // MONITOR DE SESSÃO CENTRALIZADO - Observador Ativo do Estado de Autenticação
  auth.onAuthStateChanged(async (user) => {
    let onboardingPath = false;

    // No cold start, garante o tempo mínimo do spinner antes de decidir/esconder.
    if (firstResolve) {
      const remaining = Math.max(0, MINIMUM_LOADER_TIME - (Date.now() - startTime));
      if (remaining) await new Promise(resolve => setTimeout(resolve, remaining));
    }

    if (user) {
      const lastSignInTimestamp = new Date(user.metadata.lastSignInTime).getTime();
      const nowTimestamp = Date.now();
      const secondsSinceSignIn = (nowTimestamp - lastSignInTimestamp) / 1000;
      const isNewSignIn = secondsSinceSignIn < 15;

      // MONITOR DE SESSÃO CENTRALIZADO - Verificação de Perfil Existente e Redirecionamento
      if (user.displayName && !isNewSignIn) {
        if (typeof showView === 'function') showView('view-feed');
        if (typeof window.syncProfileAvatar === 'function') window.syncProfileAvatar();
      }
      // MONITOR DE SESSÃO CENTRALIZADO - Redirecionamento para Perfil Incompleto (Onboarding)
      else {
        if (typeof showView === 'function') showView('view-onboarding');
        onboardingPath = true;
      }
    }
    // MONITOR DE SESSÃO CENTRALIZADO - Inicialização de Usuário Deslogado (Fallback)
    else {
      if (typeof showView === 'function') {
        showView('view-auth');
        // Reset central: garante que QUALQUER logout (feed, onboarding ou expiração
        // de sessão) limpe campos, timer de cooldown e reCAPTCHA antes de voltar à intro.
        if (typeof window.resetAuthFlow === 'function') window.resetAuthFlow();
        navigateTo('step-intro');
      }
    }

    // Tutorial guiado do cadastro (js/tutorial.js): destaca o 1º campo só depois
    // que a tela do onboarding está de fato visível para o usuário.
    const startTutorial = () => {
      if (typeof window.startOnboardingTutorial === 'function') window.startOnboardingTutorial();
    };

    if (onboardingPath) setTimeout(startTutorial, 600);

    if (firstResolve) {
      firstResolve = false;
      // COLD START: esconde o SPINNER de entrada (#loader-global) com fade.
      const loader = document.getElementById('loader-global');
      if (loader) {
        loader.classList.add('u-fade-out');
        setTimeout(() => {
          loader.classList.add('u-hidden');
          loader.classList.remove('u-fade-out');   // limpa p/ reexibições futuras
        }, 400);
      }
    } else {
      // Transição INTERNA (login/logout): esconde o blur+spinner interno.
      if (typeof window.hideBlockingLoader === 'function') window.hideBlockingLoader();
    }
  });
})();
