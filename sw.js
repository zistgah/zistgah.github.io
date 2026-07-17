/* Zistgah service worker — © 1993–2026 Abhishek Choudhary · AyeAI
   Cache-first for the shell so the portal opens offline, installed outside any store. */
const CACHE = 'zistgah-v1';
const SHELL = [
  './index.html',
  './widget.html',
  './chakra-ui.js',
  './chakra-kernel.js',
  './chakra-core.js',
  './chakra-widget.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      // runtime-cache same-origin GETs so the whole portal survives going offline
      if (res && res.status === 200 && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
