const CACHE_NAME = 'lumina-cache-v15';
// index.html'deki ?v= sürümü değiştiğinde CACHE_NAME'i de artırın
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/firebase-config.js',
  './js/utils.js',
  './js/auth.js',
  './js/app/state.js',
  './js/app/data.js',
  './js/app/progress.js',
  './js/app/dashboard.js',
  './js/app/study.js',
  './js/app/lab.js',
  './js/app/ui.js',
  './js/app/main.js',
  './js/app/test-write.js',
  './js/app/race.js',
  './js/app/account.js'
];

// Install: tek bir dosya hata verse bile kurulum bozulmasın
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(STATIC_ASSETS.map((url) =>
        cache.add(url).catch((err) => console.warn('[SW] önbelleğe alınamadı:', url, err))
      ))
    )
  );
});

// Activate: eski önbellekleri sil
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

function putInCache(request, response) {
  if (response && (response.ok || response.type === 'opaque')) {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
  }
}

function networkFirst(request) {
  return fetch(request)
    .then((response) => { putInCache(request, response); return response; })
    .catch(() => caches.match(request, { ignoreSearch: true }).then((cached) =>
      cached || new Response('Offline - cached version not available', { status: 503 })
    ));
}

function cacheFirst(request) {
  return caches.match(request).then((cached) => {
    if (cached) return cached;
    return fetch(request).then((response) => { putInCache(request, response); return response; })
      .catch(() => new Response(JSON.stringify({ error: 'Offline' }), {
        status: 503, headers: { 'Content-Type': 'application/json' }
      }));
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Firebase SDK dosyaları sürümlü olduğundan önbellekten servis edilir (çevrimdışı giriş için)
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.origin !== location.origin) return;

  // Kod ve veri dosyaları: önce ağ (güncel kalsın), ağ yoksa önbellek
  const isFresh = /\.(html|js|css|csv|json)$/i.test(decodeURIComponent(url.pathname)) || url.pathname.endsWith('/');
  event.respondWith(isFresh ? networkFirst(request) : cacheFirst(request));
});
