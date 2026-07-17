/* AAB service worker — © 1993–2026 Abhishek Choudhary · AyeAI */
const CACHE='aab-v1';
const SHELL=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-maskable-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(
  caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(h=>h||fetch(e.request).then(r=>{
    if(r&&r.status===200&&new URL(e.request.url).origin===location.origin){
      const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c)).catch(()=>{});}
    return r;}).catch(()=>caches.match('./index.html'))));});
