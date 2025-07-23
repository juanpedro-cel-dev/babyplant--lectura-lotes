
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('babyplant-cache').then((cache) => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './icono-babyplant-512.png',
        './Logotipo-Babyplant.png'
      ]);
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});
