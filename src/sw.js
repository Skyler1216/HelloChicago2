// Service Worker for HelloChicago App
// キャッシュとオフライン対応、アプリライフサイクル管理

const CACHE_NAME = 'hellochicago-v2';
const API_CACHE_NAME = 'hellochicago-api-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  // その他の重要なアセット
];

// キャッシュ戦略の設定
const CACHE_STRATEGIES = {
  // 静的アセット: キャッシュファースト
  STATIC: 'cache-first',
  // API: ネットワークファースト（Stale While Revalidate）
  API: 'network-first',
  // 画像: キャッシュファースト（長期間）
  IMAGES: 'cache-first',
};

// キャッシュの有効期限設定
const CACHE_EXPIRY = {
  API: 5 * 60 * 1000, // 5分
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7日
  IMAGES: 30 * 24 * 60 * 60 * 1000, // 30日
};

// モバイル対応のキャッシュ設定
const MOBILE_CACHE_EXPIRY = {
  API: 2 * 60 * 1000, // モバイルでは2分
  STATIC: 3 * 24 * 60 * 60 * 1000, // モバイルでは3日
  IMAGES: 7 * 24 * 60 * 60 * 1000, // モバイルでは7日
};

// デバイス判定
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// デバイスに応じたキャッシュ有効期限を取得
const getCacheExpiry = type => {
  const device = isMobile() ? 'mobile' : 'desktop';
  const expiry = isMobile() ? MOBILE_CACHE_EXPIRY[type] : CACHE_EXPIRY[type];

  console.log(
    `📱 SW: Cache expiry for ${type} on ${device}: ${Math.round(expiry / 1000)}s`
  );
  return expiry;
};

// インストール時
self.addEventListener('install', event => {
  console.log('📱 SW: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('📱 SW: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// アクティベーション時
self.addEventListener('activate', event => {
  console.log('📱 SW: Activating...');
  event.waitUntil(
    Promise.all([
      // 古いキャッシュを削除
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (![CACHE_NAME, API_CACHE_NAME].includes(cacheName)) {
              console.log('📱 SW: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // 期限切れのキャッシュエントリを削除
      cleanExpiredCache(),
    ])
  );
  self.clients.claim();
});

// 期限切れキャッシュのクリーンアップ
async function cleanExpiredCache() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const requests = await cache.keys();

    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const cachedTime = response.headers.get('sw-cached-time');
        if (cachedTime) {
          const age = Date.now() - parseInt(cachedTime);
          const expiry = getCacheExpiry('API');

          if (age > expiry) {
            await cache.delete(request);
            console.log(
              `📱 SW: Deleted expired cache entry (age: ${Math.round(age / 1000)}s, expiry: ${Math.round(expiry / 1000)}s)`
            );
          }
        }
      }
    }
  } catch (error) {
    console.error('📱 SW: Error cleaning expired cache:', error);
  }
}

// レスポンスにキャッシュ時間を追加
function addCacheHeaders(response, cacheTime = Date.now()) {
  const headers = new Headers(response.headers);
  headers.set('sw-cached-time', cacheTime.toString());

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: headers,
  });
}

// Stale While Revalidate 戦略
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // キャッシュがある場合は即座に返し、バックグラウンドで更新
  if (cachedResponse) {
    // バックグラウンドで更新
    fetch(request)
      .then(response => {
        if (response.status === 200) {
          const responseWithHeaders = addCacheHeaders(response.clone());
          cache.put(request, responseWithHeaders);
        }
      })
      .catch(error => {
        console.log('📱 SW: Background update failed:', error);
      });

    return cachedResponse;
  }

  // キャッシュがない場合はネットワークから取得
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const responseWithHeaders = addCacheHeaders(response.clone());
      cache.put(request, responseWithHeaders);
    }
    return response;
  } catch (error) {
    throw error;
  }
}

// フェッチ時
self.addEventListener('fetch', event => {
  // GET リクエストのみ処理
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Supabase API の場合は Stale While Revalidate
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      staleWhileRevalidate(event.request, API_CACHE_NAME).catch(() => {
        // 完全にネットワークが使えない場合は古いキャッシュでも返す
        return caches.match(event.request);
      })
    );
    return;
  }

  // 画像ファイルの場合はキャッシュ優先（長期間）
  if (
    event.request.destination === 'image' ||
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)
  ) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then(response => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 静的アセットの場合はキャッシュ優先
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then(response => {
        // 成功したレスポンスをキャッシュ
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});

// アプリライフサイクル管理のためのメッセージハンドリング
self.addEventListener('message', event => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'CLEAR_CACHE':
        event.waitUntil(
          caches
            .keys()
            .then(cacheNames => {
              console.log('📱 SW: Clearing all caches:', cacheNames);
              return Promise.all(
                cacheNames.map(cacheName => {
                  console.log('📱 SW: Deleting cache:', cacheName);
                  return caches.delete(cacheName);
                })
              );
            })
            .then(() => {
              console.log('📱 SW: All caches cleared successfully');
            })
            .catch(error => {
              console.error('📱 SW: Error clearing caches:', error);
            })
        );
        break;
      case 'CLEAR_API_CACHE':
        event.waitUntil(
          caches
            .delete(API_CACHE_NAME)
            .then(() => {
              console.log('📱 SW: API cache cleared successfully');
            })
            .catch(error => {
              console.error('📱 SW: Error clearing API cache:', error);
            })
        );
        break;
      case 'CLEAR_APP_CACHE':
        event.waitUntil(
          caches
            .delete(CACHE_NAME)
            .then(() => {
              console.log('📱 SW: App cache cleared successfully');
            })
            .catch(error => {
              console.error('📱 SW: Error clearing app cache:', error);
            })
        );
        break;
      case 'CACHE_URLS':
        if (event.data.urls) {
          event.waitUntil(
            caches.open(CACHE_NAME).then(cache => {
              return cache.addAll(event.data.urls);
            })
          );
        }
        break;
      case 'PRELOAD_DATA':
        // アプリ復帰時の事前データ読み込み
        if (event.data.urls) {
          event.waitUntil(
            Promise.all(
              event.data.urls.map(url =>
                staleWhileRevalidate(new Request(url), API_CACHE_NAME).catch(
                  error => console.log('📱 SW: Preload failed for', url, error)
                )
              )
            )
          );
        }
        break;
      case 'APP_FOCUS':
        // アプリがフォーカスされた時の処理
        console.log('📱 SW: App focused, running cleanup');
        event.waitUntil(cleanExpiredCache());
        break;
      case 'APP_RESTART':
        // アプリ再起動時の処理
        console.log('📱 SW: App restart detected, clearing all caches');
        event.waitUntil(
          caches
            .keys()
            .then(cacheNames => {
              return Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
              );
            })
            .then(() => {
              console.log('📱 SW: All caches cleared for app restart');
            })
        );
        break;
    }
  }
});

// バックグラウンド同期のサポート
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('📱 SW: Background sync triggered');
    event.waitUntil(
      // 重要なデータの事前キャッシュなど
      cleanExpiredCache()
    );
  }
});

// プッシュ通知のサポート（将来的な拡張用）
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('📱 SW: Push received:', data);

    // 通知の表示は必要に応じて実装
  }
});
