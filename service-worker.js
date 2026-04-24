/* ================================================================
   service-worker.js — Playa Delfín v2.0.1
   Cache-First PWA — offline support
   ================================================================ */

const CACHE_NAME = 'playa-delfin-v2.0.3';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/main.css',
  './js/auth.js',
  './js/storage.js',
  './js/router.js',
  './js/app.js',
  './js/components/toast.js',
  './js/components/ocr.js',
  './js/data/churuatas.js',
  './js/data/isla.js',
  './js/pages/registro.js',
  './js/pages/playa.js',
  './js/pages/isla.js',
  './js/pages/admin.js',
  './manifest.json',
  './img/android-chrome-192x192.png',
  './img/android-chrome-512x512.png',
  './img/favicon-32x32.png',
  './img/favicon.ico'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS_TO_CACHE))
      .catch(err => console.warn('SW cache error:', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
