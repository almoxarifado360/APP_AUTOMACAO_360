const CACHE_NAME = 'automacao-360-v3';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo-360.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        return cache.addAll(APP_SHELL);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Nunca intercepta a API do Apps Script ou outros domínios.
  if (url.origin !== self.location.origin) return;

  // Apenas GET.
  if (request.method !== 'GET') return;

  // Navegação: REDE PRIMEIRO.
  // Isso evita que uma versão antiga do index.html fique presa no cache.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(function (response) {
          if (response && response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put('./index.html', copia);
            });
          }
          return response;
        })
        .catch(function () {
          return caches.match('./index.html');
        })
    );
    return;
  }

  // O próprio Service Worker também deve ser sempre atualizado.
  if (url.pathname.endsWith('/sw.js')) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .catch(function () {
          return caches.match(request);
        })
    );
    return;
  }

  // Demais arquivos estáticos:
  // cache primeiro, mas atualiza em segundo plano.
  event.respondWith(
    caches.match(request).then(function (cached) {
      const atualizado = fetch(request, { cache: 'no-store' })
        .then(function (response) {
          if (response && response.ok) {
            const copia = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copia);
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });

      return cached || atualizado;
    })
  );
});
