// Moja Omara service worker: app works offline after the first visit.
const V = 'omara-v7';
const CDN = 'omara-cdn';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('omara-') && k !== V && k !== CDN).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (req.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html')) {
      // fresh app when online, cached app when offline
      e.respondWith(fetch(req).then(r => {
        const cp = r.clone(); caches.open(V).then(c => c.put(req, cp)); return r;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
    } else {
      e.respondWith(caches.match(req).then(r => r || fetch(req).then(r2 => {
        const cp = r2.clone(); caches.open(V).then(c => c.put(req, cp)); return r2;
      })));
    }
    return;
  }
  // libraries and fonts: keep a copy so background removal works offline
  if (u.hostname === 'cdn.jsdelivr.net' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(CDN).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
  // weather and the background model are handled by the page itself
});
