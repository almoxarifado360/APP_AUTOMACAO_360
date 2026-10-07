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
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Nunca intercepta chamadas externas, incluindo a API do Apps Script.
  if (url.origin !== self.location.origin) return;

  // O aplicativo só trata requisições GET.
  if (request.method !== 'GET') return;

  /*
   * REDE PRIMEIRO:
   * Sempre tenta buscar a versão atual do GitHub Pages.
   * O cache fica como fallback para uso offline.
   */
  event.respondWith(
    fetch(request)
      .then(function (response) {

        if (response && response.ok) {
          const copia = response.clone();

          caches.open(CACHE_NAME)
            .then(function (cache) {
              cache.put(request, copia);
            });
        }

        return response;
      })
      .catch(function () {

        return caches.match(request)
          .then(function (cached) {

            if (cached) {
              return cached;
            }

            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }

            return Response.error();
          });

      })
  );
});
