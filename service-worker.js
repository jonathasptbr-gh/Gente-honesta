"use strict";

// =========================================================================
// CONFIGURAÇÃO DO SERVICE WORKER - Definições de Cache
// =========================================================================

const CACHE_NAME = "gentehonesta-v432";
// Versão legível derivada do CACHE_NAME (ex.: "v261") — enviada à página sob demanda
// (mensagem GET_VERSION) para exibir no banner "Nova versão disponível".
const APP_VERSION = CACHE_NAME.replace("gentehonesta-", "");

// CONFIGURAÇÃO DO SERVICE WORKER - Lista de Recursos Core para Cache Inicial
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base/base.css",
  "./css/components/buttons.css",
  "./css/components/forms.css",
  "./css/components/surfaces.css",
  "./css/components/dialogs.css",
  "./css/components/blocks.css",
  "./css/tutorial/tutorial.css",
  "./css/auth/auth.css",
  "./css/onboarding/form.css",
  "./css/onboarding/ic-card.css",
  "./css/onboarding/camera.css",
  "./css/install/install.css",
  "./css/feed/shell.css",
  "./css/feed/navigation.css",
  "./css/feed/pedidos.css",
  "./css/feed/pedido-sheet.css",
  "./css/feed/historico.css",
  "./css/feed/cards-pro.css",
  "./css/feed/vagas.css",
  "./css/feed/ajudantes.css",
  "./css/profile/profile.css",
  "./js/core/app.js",
  "./js/tutorial/tutorial.js",
  "./js/install/install.js",
  "./js/auth/session.js",
  "./js/auth/auth.js",
  "./js/onboarding/onboarding.js",
  "./js/core/domain.js",
  "./js/feed/index.js",
  "./js/feed/repository.js",
  "./js/feed/config.js",
  "./js/feed/utils.js",
  "./js/feed/templates.js",
  "./js/feed/state.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./icon-transparent.svg",
  "./icon-intro.svg"
];

// =========================================================================
// SISTEMA DE INSTALAÇÃO - Cache Pré-carregado
// =========================================================================

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // SISTEMA DE INSTALAÇÃO - Cache - Registro de falhas individuais para não travar a instalação
      return Promise.all(
        urlsToCache.map(url => {
          return cache.add(url).catch(err => console.warn(`[SW] Falha ao carregar no cache: ${url}`, err));
        })
      );
    })
  );
  // SEM self.skipWaiting() aqui: o novo worker fica em "waiting" até o usuário
  // confirmar a atualização no app (banner "Nova versão disponível") — só então
  // a página envia a mensagem SKIP_WAITING abaixo. Isso evita trocar a versão
  // no meio de uma ação do usuário sem ele saber.
});

// SISTEMA DE ATUALIZAÇÃO - Só assume o controle quando o usuário confirma
// (postMessage disparado pelo clique em "Atualizar" — ver js/app.js)
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  } else if (event.data && event.data.type === "GET_VERSION") {
    // Responde a versão deste worker pela porta do MessageChannel (a página usa
    // para exibir "Nova versão disponível (vN)"). event.source como fallback.
    const reply = { type: "VERSION", version: APP_VERSION };
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else if (event.source) event.source.postMessage(reply);
  }
});

// =========================================================================
// SISTEMA DE ATIVAÇÃO - Limpeza de Versões Obsoletas
// =========================================================================

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// =========================================================================
// ESTRATÉGIA DE FETCH - Network-First com Fallback de Cache
// =========================================================================

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // ESTRATÉGIA DE FETCH - Filtro de Segurança e Validação de Método
  if (event.request.method !== "GET" || !url.protocol.startsWith('http')) {
    return;
  }

  // ESTRATÉGIA DE FETCH - Exclusão de Requisições Dinâmicas (Firebase/API)
  if (url.hostname.includes("googleapis.com") || 
      url.hostname.includes("firebase")) { 
    return; 
  }

  // ESTRATÉGIA DE FETCH - Execução da Estratégia
  // Arquivos do PRÓPRIO site: cache:'no-cache' força revalidação no servidor
  // (ETag/304, barato). Sem isso, o max-age=600 do GitHub Pages fazia o
  // navegador servir arquivos VELHOS do cache HTTP por até 10 minutos — o
  // banner "Atualizar" recarregava a página e recebia a versão antiga de novo
  // (a atualização parecia não fazer nada). Cross-origin (fontes) segue o
  // cache normal do navegador.
  const sameOrigin = url.origin === self.location.origin;
  event.respondWith(
    fetch(event.request, sameOrigin ? { cache: "no-cache" } : undefined)
      .then(networkResponse => {
        // ESTRATÉGIA DE FETCH - Validação e Atualização Dinâmica do Cache
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // ESTRATÉGIA DE FETCH - Fallback: Busca no Cache caso a rede falhe
        return caches.match(event.request);
      })
  );
});
