// Service Worker for HelloChicago App
// キャッシュとオフライン対応

const CACHE_NAME = 'hellochicago-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  // その他の重要なアセット
];

// インストール時
self.addEventListener('install', (event) => {
  console.log('📱 SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📱 SW: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベーション時
self.addEventListener('activate', (event) => {
  console.log('📱 SW: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('📱 SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// フェッチ時
self.addEventListener('fetch', (event) => {
  // GET リクエストのみ処理
  if (event.request.method !== 'GET') return;

  // Supabase API の場合はネットワーク優先
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // レスポンスが成功した場合、キャッシュに保存
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // ネットワークエラーの場合、キャッシュから返す
          return caches.match(event.request);
        })
    );
    return;
  }

  // 静的アセットの場合はキャッシュ優先
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // 成功したレスポンスをキャッシュ
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// アプリライフサイクル管理のためのメッセージハンドリング
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CLEAR_CACHE':
        event.waitUntil(
          caches.keys().then((cacheNames) => {
            return Promise.all(
              cacheNames.map((cacheName) => caches.delete(cacheName))
            );
          })
        );
        break;
      case 'CACHE_URLS':
        if (event.data.urls) {
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => {
              return cache.addAll(event.data.urls);
            })
          );
        }
        break;
    }
  }
});