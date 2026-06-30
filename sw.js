/* Service worker — offline app shell + reference bundle (ADR-0004 plan §3). */
const CACHE = 'scan-katalog-v1'
const SHELL = ['./', './index.html', './app.js', './styles.css', './manifest.webmanifest', './icon.svg', './reference.json', './reference.sample.json']

self.addEventListener('install', (e) => {
  // addAll fails if any URL 404s; reference.json may not be generated yet → cache best-effort.
  e.waitUntil(caches.open(CACHE).then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)))
})
