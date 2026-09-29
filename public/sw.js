importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// Bloom service worker
//
// Previous version served EVERYTHING cache-first, and because this file never
// changed between deploys, phones kept showing the first version they ever
// cached. Now:
//   • pages (navigations)      → network first, cached copy only when offline
//   • /_next/static/* + icons  → cache first (filenames change every deploy, so this is safe)
//   • /api/* and non-GET       → never cached
// Bump VERSION whenever you want to force every phone to drop its old cache.
const VERSION = 'bloom-2026-09-29';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

self.addEventListener('install', () => {
  self.skipWaiting(); // activate immediately
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;          // Supabase, Google, OneSignal, fonts…
  if (url.pathname.startsWith('/api/')) return;              // always live data

  // Pages: network first so a new deploy shows up on the next open
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/')))
    );
    return;
  }

  // Hashed build assets and icons: cache first
  if (url.pathname.startsWith('/_next/static/') || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        return res;
      }))
    );
  }
  // everything else: straight to the network
});
