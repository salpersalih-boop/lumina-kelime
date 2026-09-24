const CACHE_NAME = 'lumina-cache-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];


// Install Event: Cache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Cache First for static assets, Network for others
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini yönet
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Kendi domain'imizden gelen veya font olan statik dosyalar için Cache First stratejisi
  if (
    STATIC_ASSETS.some(asset => url.pathname === asset || url.href === asset) ||
    url.origin === location.origin
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          // Dinamik önbellekleme (opsiyonel) - Sadece başarılı olanları ekle
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Hem cache hem network yoksa (örneğin offline iken API çağrısı)
          return new Response(JSON.stringify({ error: 'Offline', message: 'Şu an çevrimdışısınız. Lütfen internet bağlantınızı kontrol edin.' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        });
      })
    );
  }
});
