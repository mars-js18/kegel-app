/* ==========================================================================
   CONTROL PÉLVICO PWA - SERVICE WORKER (SW.JS)
   Estrategia Network-First con Fallback en Caché (Actualización Garantizada)
   ========================================================================== */

const CACHE_NAME = 'control-pelvico-v3.0.0';

// Recursos estáticos indispensables para precargar
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './assets/icon.svg'
];

// --------------------------------------------------------------------------
// 1. EVENTO INSTALL: Precargar recursos y forzar activación inmediata
// --------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nuevo Service Worker:', CACHE_NAME);
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => console.warn('[SW] Error en precarga:', err))
  );
});

// --------------------------------------------------------------------------
// 2. EVENTO ACTIVATE: Limpieza de cachés antiguas y reclamar clientes
// --------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker:', CACHE_NAME);

  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              console.log('[SW] Eliminando caché obsoleta:', cache);
              return caches.delete(cache);
            }
          })
        );
      })
    ])
  );
});

// --------------------------------------------------------------------------
// 3. ESTRATEGIA NETWORK-FIRST (Primero Red, Fallback a Caché)
// --------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;

  // Para documentos HTML y scripts JS: Network-First garantizado para que las actualizaciones se vean de inmediato
  const isHtmlOrJs = event.request.mode === 'navigate' || 
                     event.request.destination === 'document' || 
                     event.request.destination === 'script' ||
                     event.request.url.includes('.js') || 
                     event.request.url.includes('.html');

  if (isHtmlOrJs) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Si no hay conexión, responder con la caché
          return caches.match(event.request).then((cached) => {
            return cached || caches.match('./index.html') || caches.match('./');
          });
        })
    );
    return;
  }

  // Para otros activos (imágenes, CSS, fuentes): Cache-First con actualización de fondo
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

// --------------------------------------------------------------------------
// 4. FORZAR ACTIVACIÓN ANTE MENSAJE SKIP_WAITING
// --------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
