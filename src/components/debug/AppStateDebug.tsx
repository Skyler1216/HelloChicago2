import React, { useState } from 'react';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { useAppLifecycle } from '../../hooks/useAppLifecycle';
import { useCache } from '../../hooks/useCache';
import { useAuth } from '../../hooks/useAuth';
import { useInbox } from '../../hooks/useInbox';
import { useAppStateManager } from '../../hooks/useAppStateManager';
import { useCacheManager } from '../../hooks/useCacheManager';

export default function AppStateDebug() {
  const [isVisible, setIsVisible] = useState(false);

  const pageVisibility = usePageVisibility();
  const appLifecycle = useAppLifecycle();
  const cache = useCache('debug', { ttl: 60000 });
  const { user, loading: authLoading, isAuthenticated, isApproved } = useAuth();
  const {
    unreadCount,
    loading: inboxLoading,
    error: inboxError,
    notifications,
    messages,
  } = useInbox(user?.id || '');
  const {
    // stateHistory,
    // recordSnapshot,
    // detectAnomalies,
    forceRecovery,
    clearHistory,
  } = useAppStateManager();
  const { clearAllCache, clearCacheByPrefix, resetAppState, fullReset } =
    useCacheManager();

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-20 left-4 z-50 bg-gray-800 text-white text-xs px-2 py-1 rounded"
      >
        🐛 Debug
      </button>
    );
  }

  const pattern = pageVisibility.getUsagePattern();
  const cacheStats = cache.stats;

  return (
    <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-80 z-50 p-4 overflow-auto">
      <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">🐛 App State Debug</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 text-sm">
          {/* Page Visibility */}
          <div>
            <h4 className="font-semibold text-blue-600">📱 Page Visibility</h4>
            <div className="pl-2 space-y-1">
              <div>Visible: {pageVisibility.isVisible ? '✅' : '❌'}</div>
              <div>
                Background Time:{' '}
                {Math.round(pageVisibility.backgroundTime / 1000)}s
              </div>
              <div>Switch Count: {pageVisibility.visibilityCount}</div>
              <div>
                Last Visible:{' '}
                {new Date(pageVisibility.lastVisibleTime).toLocaleTimeString()}
              </div>
            </div>
          </div>

          {/* App Lifecycle */}
          <div>
            <h4 className="font-semibold text-green-600">🔄 App Lifecycle</h4>
            <div className="pl-2 space-y-1">
              <div>Online: {appLifecycle.isOnline ? '✅' : '❌'}</div>
              <div>Can Fetch: {appLifecycle.canFetchData ? '✅' : '❌'}</div>
              <div>
                Should Refresh: {appLifecycle.shouldRefreshData() ? '✅' : '❌'}
              </div>
              <div>
                Inactive Time: {Math.round(appLifecycle.inactiveTime / 1000)}s
              </div>
            </div>
          </div>

          {/* Usage Pattern */}
          <div>
            <h4 className="font-semibold text-purple-600">📊 Usage Pattern</h4>
            <div className="pl-2 space-y-1">
              <div>Active User: {pattern.isActiveUser ? '✅' : '❌'}</div>
              <div>Long Session: {pattern.isLongSession ? '✅' : '❌'}</div>
              <div>
                Long Background: {pattern.wasLongBackground ? '✅' : '❌'}
              </div>
              <div>Session: {Math.round(pattern.sessionDuration / 1000)}s</div>
            </div>
          </div>

          {/* Auth State */}
          <div>
            <h4 className="font-semibold text-red-600">🔐 Auth State</h4>
            <div className="pl-2 space-y-1">
              <div>Loading: {authLoading ? '⏳' : '✅'}</div>
              <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
              <div>Approved: {isApproved ? '✅' : '❌'}</div>
            </div>
          </div>

          {/* Inbox State */}
          <div>
            <h4 className="font-semibold text-indigo-600">📨 Inbox State</h4>
            <div className="pl-2 space-y-1">
              <div>Loading: {inboxLoading ? '⏳' : '✅'}</div>
              <div>Error: {inboxError ? '❌' : '✅'}</div>
              <div>Unread: {unreadCount}</div>
              <div>Notifications: {notifications.length}</div>
              <div>Messages: {messages.length}</div>
            </div>
          </div>

          {/* Cache Stats */}
          <div>
            <h4 className="font-semibold text-orange-600">💾 Cache Stats</h4>
            <div className="pl-2 space-y-1">
              <div>Size: {cacheStats.size}</div>
              <div>Hit Rate: {Math.round(cacheStats.hitRate)}%</div>
              <div>Hits: {cacheStats.hits}</div>
              <div>Misses: {cacheStats.misses}</div>
              <div>Stale Hits: {cacheStats.staleHits}</div>
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="font-semibold text-red-600">🛠 Actions</h4>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                onClick={() => {
                  cache.clear();
                  console.log('🐛 Cache cleared');
                }}
                className="bg-red-500 text-white px-2 py-1 rounded text-xs"
              >
                Clear Cache
              </button>
              <button
                onClick={() => {
                  if (
                    'serviceWorker' in navigator &&
                    navigator.serviceWorker.controller
                  ) {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'CLEAR_API_CACHE',
                    });
                    console.log('🐛 API Cache cleared');
                  }
                }}
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
              >
                Clear SW Cache
              </button>
              <button
                onClick={() => {
                  pageVisibility.forceVisibilityCheck();
                  console.log('🐛 Visibility check forced');
                }}
                className="bg-green-500 text-white px-2 py-1 rounded text-xs"
              >
                Force Check
              </button>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
              >
                Reload
              </button>
              <button
                onClick={() => {
                  forceRecovery('Manual debug action');
                  console.log('🐛 Force recovery triggered');
                }}
                className="bg-orange-500 text-white px-2 py-1 rounded text-xs"
              >
                Force Recovery
              </button>
              <button
                onClick={() => {
                  clearHistory();
                  console.log('🐛 History cleared');
                }}
                className="bg-purple-500 text-white px-2 py-1 rounded text-xs"
              >
                Clear History
              </button>
            </div>

            {/* 新しいキャッシュ管理ボタン */}
            <div className="mt-3">
              <h5 className="font-semibold text-blue-600">
                🗂 Cache Management
              </h5>
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={() => {
                    clearAllCache();
                    console.log('🐛 All cache cleared via CacheManager');
                  }}
                  className="bg-red-600 text-white px-2 py-1 rounded text-xs"
                >
                  Clear All Cache
                </button>
                <button
                  onClick={() => {
                    clearCacheByPrefix('profile_');
                    console.log('🐛 Profile cache cleared');
                  }}
                  className="bg-yellow-600 text-white px-2 py-1 rounded text-xs"
                >
                  Clear Profile Cache
                </button>
                <button
                  onClick={() => {
                    clearCacheByPrefix('posts_');
                    console.log('🐛 Posts cache cleared');
                  }}
                  className="bg-green-600 text-white px-2 py-1 rounded text-xs"
                >
                  Clear Posts Cache
                </button>
                <button
                  onClick={() => {
                    resetAppState();
                    console.log('🐛 App state reset');
                  }}
                  className="bg-blue-600 text-white px-2 py-1 rounded text-xs"
                >
                  Reset App State
                </button>
                <button
                  onClick={() => {
                    fullReset();
                    console.log('🐛 Full reset completed');
                  }}
                  className="bg-red-700 text-white px-2 py-1 rounded text-xs"
                >
                  Full Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
