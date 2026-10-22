const C='kc-v1';self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['/','/index.html','/app.js','/ind.js','/lwc.js','/manifest.webmanifest'])));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.pathname.startsWith('/api/'))return;e.respondWith(fetch(e.request).then(r=>{const cl=r.clone();caches.open(C).then(c=>c.put(e.request,cl));return r}).catch(()=>caches.match(e.request)))});
