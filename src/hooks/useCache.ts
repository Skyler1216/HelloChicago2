import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  priority: number; // 優先度（高いほど削除されにくい）
  accessCount: number; // アクセス回数
  lastAccessed: number; // 最後のアクセス時間
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  staleWhileRevalidate?: boolean; // 古いデータを返しつつバックグラウンドで更新
  priority?: number; // キャッシュの優先度（0-10、デフォルト5）
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  staleHits: number; // 古いデータのヒット数
  hitRate: number;
}

export function useCache<T>(key: string, options: CacheOptions = {}) {
  const {
    ttl = 5 * 60 * 1000,
    maxSize = 100,
    staleWhileRevalidate = true,
    priority = 5,
  } = options;
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    size: 0,
    hits: 0,
    misses: 0,
    staleHits: 0,
    hitRate: 0,
  });

  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map());

  // オンライン/オフライン状態の監視
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 統計情報の更新
  const updateStats = useCallback(() => {
    const size = cacheRef.current.size;
    const hits = cacheStats.hits;
    const misses = cacheStats.misses;
    const staleHits = cacheStats.staleHits;
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    setCacheStats({ size, hits, misses, staleHits, hitRate });
  }, []); // 依存配列を空にする

  // 初期化時にキャッシュを復元
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        cacheRef.current = new Map(parsed);
        updateStats();
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }, [key, updateStats]);

  // キャッシュの永続化
  const persistCache = useCallback(() => {
    try {
      const serialized = Array.from(cacheRef.current.entries());
      localStorage.setItem(`cache_${key}`, JSON.stringify(serialized));
    } catch (error) {
      console.warn('Failed to persist cache to localStorage:', error);
    }
  }, [key]);

  // キャッシュの取得
  const get = useCallback(
    (cacheKey: string): T | null => {
      const item = cacheRef.current.get(cacheKey);

      if (!item) {
        console.log('📱 useCache: Cache miss', { cacheKey, key });
        setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
        return null;
      }

      const now = Date.now();

      // TTLチェック
      if (now > item.expiresAt) {
        if (staleWhileRevalidate) {
          // 古いデータでも返す（Stale-While-Revalidateパターン）
          item.lastAccessed = now;
          item.accessCount++;
          console.log('📱 useCache: Stale cache hit', {
            cacheKey,
            key,
            age: Math.floor((now - item.timestamp) / 1000) + 's',
            ttl: Math.floor(ttl / 1000) + 's',
          });
          setCacheStats(prev => ({ ...prev, staleHits: prev.staleHits + 1 }));
          return item.data;
        } else {
          console.log('📱 useCache: Cache expired', { cacheKey, key });
          cacheRef.current.delete(cacheKey);
          setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
          return null;
        }
      }

      // アクセス情報を更新
      item.lastAccessed = now;
      item.accessCount++;
      console.log('📱 useCache: Cache hit', {
        cacheKey,
        key,
        age: Math.floor((now - item.timestamp) / 1000) + 's',
        remaining: Math.floor((item.expiresAt - now) / 1000) + 's',
      });
      setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
      return item.data;
    },
    [staleWhileRevalidate, ttl]
  );

  // キャッシュの設定
  const set = useCallback(
    (cacheKey: string, data: T): void => {
      const now = Date.now();
      console.log('📱 useCache: Setting cache', {
        cacheKey,
        key,
        dataSize: Array.isArray(data) ? data.length : 'single',
        ttl: Math.floor(ttl / 1000) + 's',
        priority,
      });

      // 最大サイズチェック
      if (cacheRef.current.size >= maxSize) {
        // 優先度とアクセス頻度を考慮したLRU方式で削除
        let candidateKey: string | null = null;
        let lowestScore = Infinity;

        for (const [key, item] of cacheRef.current.entries()) {
          // スコア計算：優先度が低く、アクセス頻度が少なく、最近アクセスされていないほど削除候補
          const timeSinceAccess = now - item.lastAccessed;
          const score =
            item.priority * 1000 + item.accessCount - timeSinceAccess / 10000;

          if (score < lowestScore) {
            lowestScore = score;
            candidateKey = key;
          }
        }

        if (candidateKey) {
          console.log('📱 useCache: Evicting cache item', {
            evictedKey: candidateKey,
            key,
            reason: 'maxSize reached',
          });
          cacheRef.current.delete(candidateKey);
        }
      }

      const item: CacheItem<T> = {
        data,
        timestamp: now,
        expiresAt: now + ttl,
        priority,
        accessCount: 1,
        lastAccessed: now,
      };

      cacheRef.current.set(cacheKey, item);
      updateStats();
      persistCache();
    },
    [maxSize, ttl, priority, updateStats, persistCache]
  );

  // キャッシュの削除
  const remove = useCallback(
    (cacheKey: string): boolean => {
      const deleted = cacheRef.current.delete(cacheKey);
      if (deleted) {
        updateStats();
        persistCache();
      }
      return deleted;
    },
    [updateStats, persistCache]
  );

  // キャッシュのクリア
  const clear = useCallback((): void => {
    cacheRef.current.clear();
    updateStats();
    persistCache();
  }, [updateStats, persistCache]);

  // キャッシュの有効期限チェック
  const isValid = useCallback((cacheKey: string): boolean => {
    const item = cacheRef.current.get(cacheKey);
    if (!item) return false;
    return Date.now() <= item.expiresAt;
  }, []);

  // オフライン時のフォールバックデータ取得
  const getOfflineData = useCallback(
    (cacheKey: string): T | null => {
      if (isOnline) return null;

      const item = cacheRef.current.get(cacheKey);
      if (item && Date.now() <= item.expiresAt) {
        return item.data;
      }

      return null;
    },
    [isOnline]
  );

  // キャッシュの状態を取得
  const getCacheInfo = useCallback((cacheKey: string) => {
    const item = cacheRef.current.get(cacheKey);
    if (!item) return null;

    return {
      age: Date.now() - item.timestamp,
      expiresIn: item.expiresAt - Date.now(),
      isValid: Date.now() <= item.expiresAt,
    };
  }, []);

  // データが古いかチェック
  const isStale = useCallback(
    (cacheKey: string): boolean => {
      const item = cacheRef.current.get(cacheKey);
      if (!item) {
        console.log('📱 useCache: isStale check - no item found', {
          cacheKey,
          key,
        });
        return true;
      }
      const isStaleResult = Date.now() > item.expiresAt;
      console.log('📱 useCache: isStale check', {
        cacheKey,
        key,
        isStale: isStaleResult,
        age: Math.floor((Date.now() - item.timestamp) / 1000) + 's',
        ttl: Math.floor(ttl / 1000) + 's',
      });
      return isStaleResult;
    },
    [ttl]
  );

  // キャッシュの効率的な一括更新
  const setMultiple = useCallback(
    (entries: Array<{ key: string; data: T }>): void => {
      entries.forEach(({ key, data }) => {
        set(key, data);
      });
    },
    [set]
  );

  // 期限切れのアイテムをクリーンアップ
  const cleanup = useCallback((): number => {
    let cleanedCount = 0;
    const now = Date.now();

    for (const [key, item] of cacheRef.current.entries()) {
      if (now > item.expiresAt && !staleWhileRevalidate) {
        cacheRef.current.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      updateStats();
      persistCache();
    }

    return cleanedCount;
  }, [staleWhileRevalidate, updateStats, persistCache]);

  // 定期的なクリーンアップ
  useEffect(() => {
    const interval = setInterval(cleanup, 60000); // 1分ごと
    return () => clearInterval(interval);
  }, [cleanup]);

  return {
    // 基本操作
    get,
    set,
    setMultiple,
    remove,
    clear,
    isValid,
    isStale,
    cleanup,

    // オフライン対応
    isOnline,
    getOfflineData,

    // 統計・情報
    stats: cacheStats,
    getCacheInfo,
    size: cacheRef.current.size,
  };
}
