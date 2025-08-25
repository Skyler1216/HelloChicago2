// Service Worker for HelloChicago App
// キャッシュとオフライン対応、アプリライフサイクル管理

const CACHE_NAME = 'hellochicago-v2';
const API_CACHE_NAME = 'hellochicago-api-v2';
const STATIC_ASSETS = ['/', '/index.html']; // Minimal initial assets

// Cache all same-origin GET requests
const SAME_ORIGIN_GET_REQUESTS = true;

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
  API: 30 * 60 * 1000, // 30分（以前の5分から延長）
  STATIC: 7 * 24 * 60 * 60 * 1000, // 7日
  IMAGES: 30 * 24 * 60 * 60 * 1000, // 30日
};

// モバイル対応のキャッシュ設定（より長いキャッシュ時間）
const MOBILE_CACHE_EXPIRY = {
  API: 60 * 60 * 1000, // モバイルでは1時間（アプリ切り替えでキャッシュ有効活用）
  STATIC: 7 * 24 * 60 * 60 * 1000, // モバイルでは7日（静的ファイルは長期キャッシュ）
  IMAGES: 14 * 24 * 60 * 60 * 1000, // モバイルでは14日（画像も長期キャッシュ）
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
      console.log('📱 SW: Caching minimal static assets');
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

  // キャッシュがある場合は即座に返し、有効期限をチェックしてバックグラウンド更新
  if (cachedResponse) {
    console.log('📱 SW: Serving from cache:', request.url);
    // バックグラウンドでネットワークから最新データを取得し、キャッシュを更新
    event.waitUntil(
      fetch(request)
        .then(response => {
          if (response.status === 200) {
            const responseWithHeaders = addCacheHeaders(response.clone());
            cache.put(request, responseWithHeaders);
            console.log('📱 SW: Cache updated in background for:', request.url);
          }
          return response;
        })
        .catch(error => {
          console.warn(
            '📱 SW: Background network update failed for:',
            request.url,
            error
          );
        })
    );
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
    // HTMLドキュメントは常にネットワークファースト（最新のアプリシェルを保証）
    if (event.request.mode === 'navigate' || url.pathname === '/index.html') {
      event.respondWith(networkFirst(event.request, CACHE_NAME));
      return;
    }

    // Viteのビルド出力ファイル（/assets/）をキャッシュファーストで処理
    if (url.pathname.startsWith('/assets/')) {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // 画像ファイルはキャッシュファースト
    if (event.request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
      event.respondWith(cacheFirst(event.request, CACHE_NAME));
      return;
    }

    // その他の同一オリジンリソースはStale While Revalidate
    event.respondWith(staleWhileRevalidate(event.request, CACHE_NAME));
    return;
  }

  // 外部API (Supabase) の場合は Stale While Revalidate
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(staleWhileRevalidate(event.request, API_CACHE_NAME));
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
      .then(response => {
        if (response.status === 200) {
          const responseWithHeaders = addCacheHeaders(response.clone());
          cache.put(request, responseWithHeaders);
          console.log('📱 SW: Background update completed for stale cache');
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
*/

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
