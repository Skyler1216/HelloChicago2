import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export function useCache<T>(key: string, options: CacheOptions = {}) {
  const { ttl = 5 * 60 * 1000, maxSize = 100 } = options; // デフォルト5分
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<CacheStats>({
    size: 0,
    hits: 0,
    misses: 0,
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

  // キャッシュの初期化
  useEffect(() => {
    try {
      const cached = localStorage.getItem(`cache_${key}`);
      if (cached) {
        const parsed = JSON.parse(cached);
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

  // 統計情報の更新
  const updateStats = useCallback(() => {
    const size = cacheRef.current.size;
    const hits = cacheStats.hits;
    const misses = cacheStats.misses;
    const hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    setCacheStats({ size, hits, misses, hitRate });
  }, [cacheStats.hits, cacheStats.misses]);

  // キャッシュの取得
  const get = useCallback((cacheKey: string): T | null => {
    const item = cacheRef.current.get(cacheKey);

    if (!item) {
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    // TTLチェック
    if (Date.now() > item.expiresAt) {
      cacheRef.current.delete(cacheKey);
      setCacheStats(prev => ({ ...prev, misses: prev.misses + 1 }));
      return null;
    }

    setCacheStats(prev => ({ ...prev, hits: prev.hits + 1 }));
    return item.data;
  }, []);

  // キャッシュの設定
  const set = useCallback(
    (cacheKey: string, data: T): void => {
      // 最大サイズチェック
      if (cacheRef.current.size >= maxSize) {
        // LRU方式で古いアイテムを削除
        const oldestKey = cacheRef.current.keys().next().value;
        if (oldestKey) {
          cacheRef.current.delete(oldestKey);
        }
      }

      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      cacheRef.current.set(cacheKey, item);
      updateStats();
      persistCache();
    },
    [maxSize, ttl, updateStats, persistCache]
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

  return {
    // 基本操作
    get,
    set,
    remove,
    clear,
    isValid,

    // オフライン対応
    isOnline,
    getOfflineData,

    // 統計・情報
    stats: cacheStats,
    getCacheInfo,
    size: cacheRef.current.size,
  };
}
