// Service Worker برای قابلیت آفلاین
const CACHE_NAME = 'ms-papli-v2.0';
const urlsToCache = [
  '/papoli-taxi/',
  '/papoli-taxi/index.html',
  '/papoli-taxi/manifest.json',
  'https://cdn.jsdelivr.net/npm/@fontsource/vazirmatn@5.0.1/index.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css'
];

// نصب Service Worker
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// فعال‌سازی Service Worker
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// مدیریت درخواست‌ها
self.addEventListener('fetch', function(event) {
  // عدم کش‌گذاری درخواست‌های API
  if (event.request.url.includes('api.github.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // بازگرداندن پاسخ از کش یا درخواست شبکه
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

// مدیریت همگام‌سازی پس از اتصال
self.addEventListener('sync', function(event) {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      doBackgroundSync()
    );
  }
});

async function doBackgroundSync() {
  // این تابع زمانی که اتصال اینترنت برقرار شود اجرا می‌شود
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETED',
      message: 'داده‌ها همگام‌سازی شدند'
    });
  });
}
