"use strict";

// =========================================================================
// CONFIGURAÇÃO DO SERVICE WORKER - Definições de Cache
// =========================================================================

const CACHE_NAME = "gentehonesta-v126";

// CONFIGURAÇÃO DO SERVICE WORKER - Lista de Recursos Core para Cache Inicial
const urlsToCache = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/base.css",
  "./css/components.css",
  "./css/tutorial.css",
  "./css/auth.css",
  "./css/onboarding.css",
  "./css/install.css",
  "./css/feed.css",
  "./js/app.js",
  "./js/tutorial.js",
  "./js/install.js",
  "./js/session.js",
  "./js/auth.js",
  "./js/onboarding.js",
  "./js/feed.js",
  "./icon-192.png",
  "./icon-512.png"
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
  event.respondWith(
    fetch(event.request)
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
