import { useCallback, useEffect } from 'react';

/**
 * アプリ全体のキャッシュ管理フック
 * 手動再読み込みやアプリ再起動時のキャッシュクリアと初期化処理を行う
 */
export function useCacheManager() {
  // 全キャッシュをクリア
  const clearAllCache = useCallback(() => {
    console.log('📱 CacheManager: Clearing all cache...');

    try {
      // localStorageのキャッシュをクリア
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(
        key =>
          key.startsWith('cache_') ||
          key.startsWith('profile_') ||
          key.startsWith('posts_') ||
          key.startsWith('notifications_') ||
          key.startsWith('messages_') ||
          key === 'home_selected_tab'
      );

      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('📱 CacheManager: Removed cache key:', key);
      });

      // Service Workerのキャッシュをクリア
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // 全キャッシュをクリア
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE',
        });
        console.log('📱 CacheManager: Service Worker cache clear requested');

        // アプリ再起動フラグも送信
        navigator.serviceWorker.controller.postMessage({
          type: 'APP_RESTART',
        });
        console.log('📱 CacheManager: App restart flag sent to Service Worker');
      }

      // ブラウザのキャッシュをクリア（可能な場合）
      if ('caches' in window) {
        caches
          .keys()
          .then(cacheNames => {
            return Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          })
          .then(() => {
            console.log('📱 CacheManager: Browser cache cleared');
          })
          .catch(error => {
            console.warn(
              '📱 CacheManager: Failed to clear browser cache:',
              error
            );
          });
      }

      console.log('📱 CacheManager: All cache cleared successfully');
    } catch (error) {
      console.error('📱 CacheManager: Error clearing cache:', error);
    }
  }, []);

  // 特定のキャッシュをクリア
  const clearCacheByPrefix = useCallback((prefix: string) => {
    console.log('📱 CacheManager: Clearing cache with prefix:', prefix);

    try {
      const keys = Object.keys(localStorage);
      const targetKeys = keys.filter(key => key.startsWith(prefix));

      targetKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log('📱 CacheManager: Removed cache key:', key);
      });

      console.log('📱 CacheManager: Cache cleared for prefix:', prefix);
    } catch (error) {
      console.error('📱 CacheManager: Error clearing cache by prefix:', error);
    }
  }, []);

  // アプリ状態をリセット
  const resetAppState = useCallback(() => {
    console.log('📱 CacheManager: Resetting app state...');

    try {
      // タブ状態をリセット（「体験」タブに戻す）
      localStorage.removeItem('home_selected_tab');

      // その他のアプリ状態をリセット
      const appStateKeys = [
        'current_view',
        'selected_inbox_tab',
        'last_visited_post',
        'map_last_location',
        'user_preferences',
      ];

      appStateKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.log('📱 CacheManager: Removed app state key:', key);
        }
      });

      console.log('📱 CacheManager: App state reset completed');
    } catch (error) {
      console.error('📱 CacheManager: Error resetting app state:', error);
    }
  }, []);

  // 完全リセット（キャッシュ + アプリ状態）
  const fullReset = useCallback(() => {
    console.log('📱 CacheManager: Performing full reset...');
    clearAllCache();
    resetAppState();
    console.log('📱 CacheManager: Full reset completed');
  }, [clearAllCache, resetAppState]);

  // 手動再読み込み時の処理
  const handleManualReload = useCallback(() => {
    console.log('📱 CacheManager: Manual reload detected, clearing cache...');
    fullReset();

    // タブ状態を確実にリセット
    localStorage.removeItem('home_selected_tab');
    console.log('📱 CacheManager: Tab state reset to post tab');

    // ページリロードは行わない（無限ループを防ぐ）
    console.log('📱 CacheManager: Cache cleared, manual reload completed');
  }, [fullReset]);

  // アプリ再起動時の処理
  const handleAppRestart = useCallback(() => {
    console.log(
      '📱 CacheManager: App restart detected, initializing fresh state...'
    );
    fullReset();
  }, [fullReset]);

  // ページ可視性変更時の処理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // アプリが表示された時
        console.log(
          '📱 CacheManager: App became visible, checking for restart...'
        );

        // 前回の非表示時刻をチェック
        const lastHiddenTime = sessionStorage.getItem('last_hidden_time');
        const currentTime = Date.now();

        if (lastHiddenTime) {
          const hiddenDuration = currentTime - parseInt(lastHiddenTime);
          // 5分以上非表示だった場合は再起動とみなす
          if (hiddenDuration > 5 * 60 * 1000) {
            console.log(
              '📱 CacheManager: Long hidden duration detected, treating as app restart'
            );
            // フラグを更新して重複実行を防ぐ
            sessionStorage.setItem('last_hidden_time', currentTime.toString());
            handleAppRestart();
          }
        }

        // 現在時刻を更新（初回または短時間の場合は更新しない）
        if (
          !lastHiddenTime ||
          (lastHiddenTime &&
            currentTime - parseInt(lastHiddenTime) > 5 * 60 * 1000)
        ) {
          sessionStorage.setItem('last_visible_time', currentTime.toString());
        }
      } else {
        // アプリが非表示になった時
        sessionStorage.setItem('last_hidden_time', Date.now().toString());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleAppRestart]);

  // 手動再読み込みイベントの監視
  useEffect(() => {
    const handleBeforeUnload = () => {
      // ページ離脱時にフラグを設定
      sessionStorage.setItem('manual_reload_detected', 'true');
      console.log('📱 CacheManager: Manual reload flag set');
    };

    const handleLoad = () => {
      // ページ読み込み時にフラグをチェック
      const isManualReload = sessionStorage.getItem('manual_reload_detected');
      if (isManualReload) {
        console.log('📱 CacheManager: Manual reload detected on page load');
        sessionStorage.removeItem('manual_reload_detected');

        // 即座にキャッシュクリアを実行
        handleManualReload();
      }
    };

    // 初回読み込み時のみチェック
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', handleLoad);
    } else {
      // DOMが既に読み込まれている場合は即座にチェック
      handleLoad();
    }

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('DOMContentLoaded', handleLoad);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [handleManualReload]);

  return {
    clearAllCache,
    clearCacheByPrefix,
    resetAppState,
    fullReset,
    handleManualReload,
    handleAppRestart,
  };
}
