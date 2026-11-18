// Repeat visits load the walk from the browser's cache: the scripts and styles (their names change with each build), the models and the site stills.
// Each is served from the cache at once and refreshed from the network behind it. The page itself is never cached, so a new build is always picked up.
const CACHE = 'scrollstory-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !/\/(assets|models|shots)\//.test(u.pathname)) return;
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
