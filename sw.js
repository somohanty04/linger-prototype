// Network first, so updates show up right away; the cache only helps when offline.
// Bump CACHE when the list below changes. The beta page (beta/) shares this worker and these files.
const CACHE = 'linger-v2';
const CORE = [
  './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
  './beta/', './beta/index.html', './beta/manifest.webmanifest', './beta.js',
  './firebase-config.js', './sync.js', './account.js', './cities.js', './learn.js', './entest.js', './extension/langs.js',
  './icons/icon-192.png', './icons/apple-touch-icon.png', './icons/lens-rings.svg',
  './icons/figma/logo.svg', './icons/figma/rings-words.svg', './icons/figma/tab-eye.svg', './icons/figma/tab-book.svg',
  './icons/figma/tab-pin.svg', './icons/figma/tab-cards.svg', './icons/figma/sparkle.svg', './icons/figma/x.svg'
];
self.addEventListener('install', (e) => {
  // One missing file shouldn't stop the whole install, so each is cached on its own.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Offline, a page falls back to its own app shell: the beta page to beta/, everything else to the prototype.
  const shell = new URL(req.url).pathname.includes('/beta/') ? './beta/' : './';
  e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || (req.mode === 'navigate' ? caches.match(shell) : undefined))));
});
