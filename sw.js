/* ============================================================
   Service Worker — کتابخانه شخصی
   برای به‌روزرسانی برنامه، فقط CACHE_VERSION را تغییر بده
   ============================================================ */
const CACHE_VERSION = 'book-library-v1.0.0';
const STATIC_CACHE  = CACHE_VERSION + '-static';
const RUNTIME_CACHE = CACHE_VERSION + '-runtime';

const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/app.css',
  './js/config.js',
  './js/utils.js',
  './js/cover-store.js',
  './js/store.js',
  './js/charts.js',
  './js/books.js',
  './js/sessions.js',
  './js/timer.js',
  './js/theme.js',
  './js/render.js',
  './css/shelf.css',
  './css/room.css',
  './css/museum.css',
  './js/museum.js',
  './js/daily-quote.js',
  './js/gestures.js',
  './js/views.js',
  './js/shelf.js',
  './js/book-cover.js',
  './js/book-page.js',
  './js/ambient.js',
  './js/reports.js',
  './js/recommend.js',
  './js/ai-local.js',
  './js/ai-cloud.js',
  './js/ai-chat.js',
  './js/modals.js',
  './js/quotes.js',
  './js/backup.js',
  './js/pwa.js',
  './js/app.js',
  './fonts/Vazirmatn-Regular.woff2',
  './fonts/Vazirmatn-Medium.woff2',
  './fonts/Vazirmatn-Bold.woff2',
  './fonts/Vazirmatn-ExtraBold.woff2',
  './index.html'
];

/* ---------- Install: پیش‌کش کردن فایل‌های ضروری ---------- */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => console.warn('[SW] cache miss:', url, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

/* ---------- Activate: پاک‌سازی کش قدیمی ---------- */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('book-library-') && n !== STATIC_CACHE && n !== RUNTIME_CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

/* ---------- Fetch: استراتژی هوشمند ---------- */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /* ناوبری: Network-first با fallback به کش */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match('./index.html'))
        )
    );
    return;
  }

  /* فونت‌ها و فایل‌های ثابت: Cache-first */
  const isFont = url.pathname.includes('/fonts/') || /\.(woff2?|ttf|otf|eot)$/i.test(url.pathname);
  const isAsset = /\.(css|js|png|jpe?g|svg|webp|gif|ico|json)$/i.test(url.pathname);

  /* seed-data.js را کش نکن تا در نسخه عمومی حذف‌شدن آن واقعاً اعمال شود */
if (url.pathname.endsWith('/seed-data.js')) return;

  if (isFont || isAsset) {
    /* seed-data.js را کش نکن تا در نسخه عمومی حذف‌شدن آن واقعاً اعمال شود */
if (url.pathname.endsWith('/seed-data.js')) {
  return; // مرورگر بدون دخالت SW آن را از شبکه می‌گیرد
}
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (!res || res.status !== 200 || res.type === 'opaque') return res;
          const clone = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(request, clone));
          return res;
        });
      })
    );
    return;
  }

  /* بقیه: Network-first با کش */
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

/* ---------- پیام برای به‌روزرسانی فوری ---------- */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});