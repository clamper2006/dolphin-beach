/* ================================================================
   service-worker.js — Dolphin Beach PWA Service Worker
   ================================================================ */

const CACHE_NAME = 'dolphin-beach-v2-cache-v1';

const CACHE_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './js/auth.js',
  './js/storage.js',
  './js/data/churuatas.js',
  './js/data/isla.js',
  './js/components/toast.js',
  './js/pages/playa.js',
  './js/pages/isla.js',
  './js/pages/registro.js',
  './js/pages/admin.js',
  './js/router.js',
  './js/app.js',
  './img/android-chrome-192x192.png',
  './img/android-chrome-512x512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for HTML, cache fallback for rest
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html'))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
