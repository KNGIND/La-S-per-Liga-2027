/* La Súper Liga · Service Worker
   Objetivo: que la segunda visita cargue al instante (y funcione sin señal).
   - Archivos propios: primero red (siempre lo último que subiste a GitHub), y si no hay señal o tarda más de 4s usa lo guardado.
   Al cambiar archivos de la app, subí el número de VERSION para forzar la limpieza. */
const VERSION = 'lsl-v9';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/config.js', 'js/store.js', 'js/ui.js', 'js/app.js', 'data/data.js', 'manifest.webmanifest', 'icons/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !fonts) return;         // Supabase y otros: siempre a la red
  const guardado = () => caches.open(VERSION).then(c => c.match(req, { ignoreSearch: true }));
  const red = fetch(req, { cache: 'no-cache' }).then(r => {
    if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); }
    return r;
  });
  const lento = new Promise((_, no) => setTimeout(no, 4000));
  e.respondWith(Promise.race([red, lento]).catch(() => guardado().then(h => h || red)));
});
