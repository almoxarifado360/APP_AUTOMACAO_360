const CACHE_NAME = 'automacao-360-v1';
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
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function (event) {
  const request = event.request;
  const url = new URL(request.url);

  // Nunca intercepta chamadas da API do Apps Script.
  if (url.origin !== self.location.origin) return;

  if (request.method !== 'GET') return;

  // Para navegação, tenta a versão atual da página e usa o cache como fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then(function (response) {
        const copia = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put('./index.html', copia);
        });
        return response;
      }).catch(function () {
        return caches.match('./index.html');
      })
    );
    return;
  }

  // Arquivos estáticos: cache primeiro e rede como atualização.
  event.respondWith(
    caches.match(request).then(function (cached) {
      const atualizado = fetch(request).then(function (response) {
        if (response && response.ok) {
          const copia = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copia);
          });
        }
        return response;
      }).catch(function () {
        return cached;
      });
      return cached || atualizado;
    })
  );
});
