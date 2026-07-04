/*
 * Service worker — offline app shell.
 *
 * The shell (HTML/CSS/JS) is served NETWORK-FIRST so the newest code loads when
 * online, with the cache as the offline fallback. On update it clears old caches
 * and refreshes any open page onto the fresh shell. Asset URLs are versioned
 * (?v=) and served no-cache by nginx, so a deploy can't leave a client running
 * new HTML against a stale cached script.
 */
const VERSION = '15';
const CACHE = 'imposter-v' + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  `./css/style.css?v=${VERSION}`,
  `./js/icons.js?v=${VERSION}`,
  `./js/i18n.js?v=${VERSION}`,
  `./js/vocab.js?v=${VERSION}`,
  `./js/db.js?v=${VERSION}`,
  `./js/app.js?v=${VERSION}`,
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
  e.waitUntil((async () => {
    const keys = await caches.keys();
    const stale = keys.filter((k) => k !== CACHE);
    await Promise.all(stale.map((k) => caches.delete(k)));
    await self.clients.claim();
    // On an UPDATE (old caches existed), reload open pages so they run the fresh
    // shell instead of whatever the previous worker had already served.
    if (stale.length) {
      const wins = await self.clients.matchAll({ type: 'window' });
      await Promise.all(wins.map((w) => w.navigate(w.url).catch(() => {})));
    }
  })());
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
        .catch(() => caches.match(req, { ignoreSearch: true }).then((c) => c || caches.match('./index.html')))
    );
    return;
  }

  // cache-first for other assets (icons, images, manifest)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => cached || fetch(req).then((res) => {
      if (res && res.ok && url.origin === self.location.origin) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
