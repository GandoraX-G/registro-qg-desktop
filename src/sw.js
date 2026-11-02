/* ============================================================
   Service worker — Registro del Quartier Generale
   Percorsi relativi alla propria location: identico su GitHub Pages
   (/registro-qg-desktop/), in dev (/) e nel build Tauri.
   Navigazione: network-first, così un deploy nuovo si vede subito.
   Asset: cache-first con aggiornamento in background.
   ============================================================ */

/* Alzare questo numero ad ogni release: la cache vecchia viene cancellata
   in fase di activate. Dalla v4 la configurazione di gioco è dentro il
   bundle (niente più fetch di data/regolamento.json a runtime). */
const CACHE_NAME = 'registro-qg-v5';

/* Risorse minime per aprire l'app offline. I bundle hashati entrano in
   cache alla prima visita, tramite il gestore degli asset. */
const PRECACHE = ['./', './manifest.json', './icons/icon_32x32.png', './icons/icon_128x128.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE.map(url => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        const shell = await caches.match(new URL('./', self.registration.scope));
        return shell || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    const network = fetch(request).then(async response => {
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => cached);
    return cached || network;
  })());
});
