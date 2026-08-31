/* ==========================================================================
   CONTROL PÉLVICO PWA - SERVICE WORKER (SW.JS)
   Estrategia Offline-First con Actualización Automática Inmediata
   ========================================================================== */

const CACHE_NAME = 'control-pelvico-v1.0.0';

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
// 1. EVENTO INSTALL: Precargar recursos y omitir espera de activación
// --------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando nuevo Service Worker:', CACHE_NAME);

  // Forzar activación inmediata sin esperar a que la pestaña actual se cierre
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precargando recursos estáticos...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .catch((err) => {
        console.warn('[SW] Error en addAll durante precarga:', err);
      })
  );
});

// --------------------------------------------------------------------------
// 2. EVENTO ACTIVATE: Limpieza de cachés antiguas y reclamar clientes
// --------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker:', CACHE_NAME);

  event.waitUntil(
    Promise.all([
      // Tomar el control de todas las pestañas abiertas inmediatamente
      self.clients.claim(),

      // Eliminar cachés previas desactualizadas
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
// 3. ESTRATEGIA DE ESTRATEGIA DE ESTRATEGIAS: Cache-First con Fallback a Red
// --------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  // Ignorar peticiones no HTTP/HTTPS o de extensiones
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Retornar de la caché inmediatamente y actualizar en segundo plano (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {
          /* Red no disponible; ignora de forma segura */
        });

        return cachedResponse;
      }

      // Si no está en caché, buscar en la red
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // Clonar y guardar en caché la nueva respuesta
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Si no hay red y se busca navegación HTML, responder con index.html precargado
        if (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html')) {
          return caches.match('./index.html') || caches.match('./');
        }
      });
    })
  );
});

// --------------------------------------------------------------------------
// 4. ESCUCHAR MENSAJES PARA FORZAR SKIP_WAITING
// --------------------------------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
