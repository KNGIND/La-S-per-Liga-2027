/* La Súper Liga · Service Worker (MEJORADO)
   Estrategia:
   - Archivos de la app (js, css): Network-first (traer de red primero, después caché)
   - Assets (fonts, icons): Cache-first (usar caché, después red)
   - Data (data.js): Network-first + caché como fallback
   
   VENTAJA: Automáticamente se actualiza cuando cambias archivos.
   NO necesitas cambiar VERSION manualmente.
*/

// VERSION con timestamp = se actualiza automáticamente cada vez que sube el SW
const VERSION = 'lsl-' + new Date().getTime();

const SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/config.js',
  'js/store.js',
  'js/ui.js',
  'js/app.js',
  'js/admin.js',
  'js/onboard.js',
  'data/data.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

// Archivos que deben actualizar desde la RED primero (código + datos)
const NETWORK_FIRST = [
  'index.html',
  'js/',
  'css/',
  'data/',
  'manifest.webmanifest'
];

// Archivos que pueden usar CACHÉ (assets estáticos)
const CACHE_FIRST = [
  'icons/',
  'images/',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => k !== VERSION)
          .map(k => {
            console.log('[SW] Limpiando caché viejo:', k);
            return caches.delete(k);
          })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  
  // Solo GET
  if (req.method !== 'GET') return;
  
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  
  // Requests externas (excepto fonts): dejar pasar directamente
  if (url.origin !== location.origin && !isFont) return;
  
  const path = url.pathname;
  
  // ESTRATEGIA 1: NETWORK-FIRST para archivos de la app
  // (código, datos) - siempre traer de la red primero
  if (NETWORK_FIRST.some(p => path.includes(p))) {
    e.respondWith(
      fetch(req)
        .then(r => {
          // Si la respuesta es válida, guardar en caché para offline
          if (r && (r.ok || r.type === 'opaque')) {
            const clone = r.clone();
            caches.open(VERSION).then(c => c.put(req, clone));
          }
          return r;
        })
        .catch(err => {
          // Si no hay red, usar caché
          console.log('[SW] Offline:', path, '→ usando caché');
          return caches.match(req);
        })
    );
    return;
  }
  
  // ESTRATEGIA 2: CACHE-FIRST para assets (fonts, icons)
  // (solo si está en caché) - muy rápido
  if (CACHE_FIRST.some(p => path.includes(p))) {
    e.respondWith(
      caches.open(VERSION)
        .then(async c => {
          const cached = await c.match(req, { ignoreSearch: true });
          
          if (cached) return cached;
          
          // Si no está en caché, traer de la red
          return fetch(req)
            .then(r => {
              if (r && (r.ok || r.type === 'opaque')) {
                c.put(req, r.clone());
              }
              return r;
            })
            .catch(err => {
              console.log('[SW] Error descargando asset:', path);
              throw err;
            });
        })
    );
    return;
  }
  
  // DEFAULT: NETWORK-FIRST (como ESTRATEGIA 1)
  e.respondWith(
    fetch(req)
      .then(r => {
        if (r && (r.ok || r.type === 'opaque')) {
          caches.open(VERSION).then(c => c.put(req, r.clone()));
        }
        return r;
      })
      .catch(() => caches.match(req))
  );
});

// Log de actualización
console.log('[SW] Service Worker activo. Versión:', VERSION);
