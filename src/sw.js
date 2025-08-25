// Service Worker for HelloChicago App
// キャッシュとオフライン対応、アプリライフサイクル管理

const CACHE_NAME = 'hellochicago-v3';
const API_CACHE_NAME = 'hellochicago-api-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// モバイル環境の検出
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

// キャッシュ戦略の設定
const CACHE_STRATEGIES = {
  // 静的アセット: キャッシュファースト
  STATIC: 'cache-first',
  // API: ネットワークファースト（Stale While Revalidate）
  API: 'network-first',
  // 画像: キャッシュファースト（長期間）
  IMAGES: 30 * 24 * 60 * 60 * 1000, // 30日
};

// キャッシュの有効期限設定（ユーザーフレンドリーな設定）
const CACHE_EXPIRY = {
  API: 60 * 60 * 1000, // 60分に延長
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7日
  IMAGES: 30 * 24 * 60 * 60 * 1000, // 30日
};

// モバイル対応のキャッシュ設定（大幅に延長）
const MOBILE_CACHE_EXPIRY = {
  API: 8 * 60 * 60 * 1000, // モバイルでは8時間（アプリ切り替えでキャッシュ有効活用）
  STATIC: 7 * 24 * 60 * 60 * 1000, // モバイルでは7日（静的ファイルは長期キャッシュ）
  IMAGES: 14 * 24 * 60 * 60 * 1000, // モバイルでは14日（画像も長期キャッシュ）
};

// デバイス判定（重複削除）

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
    Promise.all([
      // 静的アセットをキャッシュ
      caches.open(CACHE_NAME).then(cache => {
        console.log('📱 SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // 重要なAPIエンドポイントも事前キャッシュ
      caches.open(API_CACHE_NAME).then(cache => {
        console.log('📱 SW: Pre-caching critical API endpoints');
        // 認証関連のエンドポイントを事前キャッシュ（空のレスポンスでも構造を準備）
        return Promise.allSettled([
          fetch('/auth/session').then(response => {
            if (response.ok) cache.put('/auth/session', response.clone());
          }).catch(() => {}),
        ]);
      })
    ])
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
    const now = Date.now();
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

  return new Response(response.clone(), { headers });
}

// Stale While Revalidate 戦略（ユーザーフレンドリーなキャッシュ戦略）
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // モバイル環境での特別な処理
  const isMobileEnv = isMobile();

  // キャッシュがある場合は即座に返し、有効期限をチェックしてバックグラウンド更新
  if (cachedResponse) {
    console.log('📱 SW: Serving from cache:', request.url);
    
    // モバイルでは更新頻度を制限してバッテリーを節約
    const updateDelay = isMobileEnv ? 2000 : 0;
    
    setTimeout(() => {
      // キャッシュの年齢をチェック
      const cachedTime = cachedResponse.headers.get('sw-cached-time');
      if (cachedTime) {
        const age = Date.now() - parseInt(cachedTime);
        const expiry = getCacheExpiry('API');
        
        // まだ新しい場合はバックグラウンド更新をスキップ
        if (age < expiry * 0.5) {
          console.log('📱 SW: Cache is still fresh, skipping background update');
          return;
        }
      }
      
      fetch(request, { 
        // モバイルでのタイムアウト設定
        signal: AbortSignal.timeout(isMobileEnv ? 15000 : 10000)
      })
        .then(response => {
          if (response.status === 200) {
            const responseWithHeaders = addCacheHeaders(response.clone());
            cache.put(request, responseWithHeaders);
            console.log('📱 SW: Cache updated in background for:', request.url);
          }
          return response;
        })
        .catch(error => {
          if (error.name === 'TimeoutError') {
            console.warn('📱 SW: Background update timeout for:', request.url);
          } else {
            console.warn('📱 SW: Background network update failed for:', request.url, error);
          }
        });
    }, updateDelay);
    
    return cachedResponse;
  }

  // キャッシュがない場合はネットワークから取得し、キャッシュする
  console.log('📱 SW: Fetching from network (no cache hit):', request.url);
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, addCacheHeaders(responseClone));
    }
    return response;
  } catch (error) {
    console.error('📱 SW: Network request failed:', request.url, error);
    throw error; // エラーを再スローして、呼び出し元で処理できるようにする
  }
}

// Cache First 戦略
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('📱 SW: Serving from cache (cache-first):', request.url);
    return cachedResponse;
  }

  console.log('📱 SW: Fetching from network (cache-first, no cache hit):', request.url);
  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    return response;
  } catch (error) {
    console.error('📱 SW: Network request failed (cache-first):', request.url, error);
    throw error;
  }
}

// Network First 戦略
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.status === 200) {
      const responseClone = response.clone();
      cache.put(request, responseClone);
    }
    console.log('📱 SW: Serving from network (network-first):', request.url);
    return response;
  } catch (error) {
    console.warn('📱 SW: Network request failed (network-first), falling back to cache:', request.url, error);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('📱 SW: Serving from cache (network-first fallback):', request.url);
      return cachedResponse;
    }
    throw error;
  }
}

// フェッチ時
self.addEventListener('fetch', event => {
  // GET リクエストのみ処理
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 同一オリジンのリクエストをキャッシュファーストで処理
  if (url.origin === self.location.origin) {
    // HTMLドキュメントは常にキャッシュファーストで即座に表示
    if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // Viteのビルド出力ファイル（/assets/）をキャッシュファーストで処理
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // JavaScript/CSSファイルもキャッシュファースト
    if (url.pathname.match(/\.(js|css|mjs|jsx|ts|tsx)$/i)) {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // 画像ファイルはキャッシュファースト
    if (event.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // マニフェストファイルもキャッシュファースト
    if (url.pathname === '/manifest.json') {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // その他の同一オリジンリソースはStale While Revalidate
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
    return;
  }

  // 外部API (Supabase) の場合は Stale While Revalidate
  if (url.hostname.includes('supabase.co')) {
    // モバイル環境ではより積極的にキャッシュを使用
    if (isMobile()) {
      event.respondWith(staleWhileRevalidate(event.request, API_CACHE_NAME));
    } else {
      event.respondWith(networkFirst(event.request, API_CACHE_NAME));
    }
    return;
  }

  // その他の外部リソースはネットワークオンリー（キャッシュしない）
  event.respondWith(fetch(event.request));
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
                  console.log('📱 SW: Deleting old cache:', cacheName);
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
                fetch(url).then(response => {
                  if (response.status === 200) {
                    return response.clone();
                  }
                  return null;
                })
              )
            )
              .then(responses => {
                responses.forEach(response => {
                  if (response) {
                    caches.open(CACHE_NAME).then(cache => {
                      cache.put(new Request(response.url), response);
                    });
                  }
                });
              })
              .catch(error => {
                console.error('📱 SW: Error preloading data:', error);
              })
          );
        }
        break;
      case 'APP_FOCUS':
        // アプリがフォーカスされた時の処理
        console.log('📱 SW: App focused, running cleanup');
        event.waitUntil(cleanExpiredCache());
        break;
      case 'APP_RESTART':
        // App restart handling is now managed by the client-side to preserve cache.
        console.log('📱 SW: App restart detected, but not clearing caches.');
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
