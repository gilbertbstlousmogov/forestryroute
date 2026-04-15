const CACHE = 'stlcityroute-%%VERSION%%';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.add(self.registration.scope).catch(() => {}))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(
        ks.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const u = e.request.url;
  const passthrough =
    u.includes('script.google.com') ||
    u.includes('googleapis.com') ||
    u.includes('openstreetmap.org') ||
    u.includes('nominatim') ||
    u.includes('ipapi.co') ||
    u.includes('qrserver.com') ||
    u.includes('stlouis-mo.gov') ||
    u.includes('maps.arcgis.com') ||
    u.includes('maps6.stlouis-mo.gov');

  if (passthrough) {
    e.respondWith(
      fetch(e.request).catch(() =>
        new Response('{"error":"offline"}', {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(r => {
        if (r && r.status === 200) {
          const clone = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return r;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});
