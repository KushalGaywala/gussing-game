/*
 * Service worker — offline app shell.
 *
 * The app shell (HTML/CSS/JS) is served NETWORK-FIRST: the newest code always
 * loads when online, falling back to cache offline. This avoids the stale-code
 * trap of a pure cache-first worker (e.g. new HTML paired with an old cached
 * script). Other assets (icons, images, manifest) stay CACHE-FIRST for speed.
 */
const CACHE = 'imposter-v9';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/icons.js',
  './js/i18n.js',
  './js/vocab.js',
  './js/db.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-maskable.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isShell(url) {
  return url.origin === self.location.origin &&
    (url.pathname === '/' || /\.(?:html|js|css)$/.test(url.pathname));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate' || isShell(url)) {
    // network-first: freshest code online, cached shell offline
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // cache-first for everything else (icons, images, manifest)
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
