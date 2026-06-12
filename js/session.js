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

  const MINIMUM_LOADER_TIME = 1000;
  const startTime = Date.now();

  // MONITOR DE SESSÃO CENTRALIZADO - Observador Ativo do Estado de Autenticação
  auth.onAuthStateChanged(async (user) => {
    const loader = document.getElementById('loader-global');

    const timeElapsed = Date.now() - startTime;
    const remainingTime = Math.max(0, MINIMUM_LOADER_TIME - timeElapsed);
    await new Promise(resolve => setTimeout(resolve, remainingTime));

    if (user) {
      const lastSignInTimestamp = new Date(user.metadata.lastSignInTime).getTime();
      const nowTimestamp = Date.now();
      const secondsSinceSignIn = (nowTimestamp - lastSignInTimestamp) / 1000;
      const isNewSignIn = secondsSinceSignIn < 15;

      // MONITOR DE SESSÃO CENTRALIZADO - Verificação de Perfil Existente e Redirecionamento
      if (user.displayName && !isNewSignIn) {
        if (typeof showView === 'function') showView('view-feed');
      }
      // MONITOR DE SESSÃO CENTRALIZADO - Redirecionamento para Perfil Incompleto (Onboarding)
      else {
        if (typeof showView === 'function') showView('view-onboarding');
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

    // MONITOR DE SESSÃO CENTRALIZADO - Única responsável por esconder o loader após qualquer mudança de estado
    if (loader) {
      loader.classList.add('u-fade-out');
      setTimeout(() => loader.classList.add('u-hidden'), 400);
    }
  });
})();
