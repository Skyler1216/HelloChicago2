import { useState, useEffect, useCallback, useRef } from 'react';
import { usePageVisibility } from './usePageVisibility';

interface AppState {
  isVisible: boolean;
  isOnline: boolean;
  lastActiveTime: number;
  inactiveTime: number;
}

interface UseAppLifecycleOptions {
  onAppVisible?: () => void;
  onAppHidden?: () => void;
  onAppOnline?: () => void;
  onAppOffline?: () => void;
  refreshThreshold?: number; // 非アクティブ時間がこの値を超えたら再読み込み (ms)
}

export function useAppLifecycle(options: UseAppLifecycleOptions = {}) {
  const {
    onAppVisible,
    onAppHidden,
    onAppOnline,
    onAppOffline,
    refreshThreshold = 30 * 60 * 1000, // デスクトップデフォルト30分（モバイルはコード内で2時間に設定）
  } = options;

  const [appState, setAppState] = useState<AppState>({
    isVisible: !document.hidden,
    isOnline: navigator.onLine,
    lastActiveTime: Date.now(),
    inactiveTime: 0,
  });

  const stateRef = useRef(appState);
  const callbacksRef = useRef({
    onAppVisible,
    onAppHidden,
    onAppOnline,
    onAppOffline,
  });

  // Page Visibility API を使用した高度な可視性検知
  const { isVisible, shouldForceRefresh, getUsagePattern } = usePageVisibility({
    onVisible: bgTime => {
      const now = Date.now();
      setAppState(prev => ({
        ...prev,
        isVisible: true,
        lastActiveTime: now,
        inactiveTime: bgTime,
      }));

      const pattern = getUsagePattern();

      console.log('📱 App lifecycle - visible:', {
        backgroundTime: Math.round(bgTime / 1000) + 's',
        shouldRefresh: shouldForceRefresh(now - bgTime),
        pattern,
      });

      // モバイルではより保守的な闾値で読み込み処理を判定
      const isMobileDevice =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      const actualRefreshThreshold = isMobileDevice
        ? 10 * 60 * 1000
        : 5 * 60 * 1000; // 緊急修正: モバイル10分、デスクトップ5分

      if (bgTime > actualRefreshThreshold || shouldForceRefresh(now - bgTime)) {
        console.log(
          `📱 Long background time detected (${Math.round(bgTime / 1000)}s), triggering refresh`
        );
        callbacksRef.current.onAppVisible?.();
      } else {
        // 短時間のバックグラウンドではキャッシュを活用して読み込み処理をスキップ
        console.log(
          `📱 Short background time (${Math.round(bgTime / 1000)}s), using cached data`
        );
      }
    },
    onHidden: () => {
      setAppState(prev => ({
        ...prev,
        isVisible: false,
      }));
      callbacksRef.current.onAppHidden?.();
    },
    refreshThreshold,
  });

  // コールバックの更新
  useEffect(() => {
    callbacksRef.current = {
      onAppVisible,
      onAppHidden,
      onAppOnline,
      onAppOffline,
    };
  }, [onAppVisible, onAppHidden, onAppOnline, onAppOffline]);

  // レガシーのvisibilitychange処理は削除（usePageVisibilityで処理）

  // ネットワーク状態変更時の処理
  const handleOnline = useCallback(() => {
    setAppState(prev => ({ ...prev, isOnline: true }));
    callbacksRef.current.onAppOnline?.();
  }, []);

  const handleOffline = useCallback(() => {
    setAppState(prev => ({ ...prev, isOnline: false }));
    callbacksRef.current.onAppOffline?.();
  }, []);

  // ネットワークイベントリスナーの設定
  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // 手動でアクティブ時間を更新
  const updateActiveTime = useCallback(() => {
    const now = Date.now();
    setAppState(prev => ({
      ...prev,
      lastActiveTime: now,
      inactiveTime: 0,
    }));
  }, []);

  // データ再読み込みが必要かチェック（usePageVisibilityと連携）
  const shouldRefreshData = useCallback(() => {
    const now = Date.now();
    const inactiveTime = now - stateRef.current.lastActiveTime;
    return (
      inactiveTime > refreshThreshold ||
      shouldForceRefresh(stateRef.current.lastActiveTime)
    );
  }, [refreshThreshold, shouldForceRefresh]);

  // ページの可視性とオンライン状態を組み合わせた状態（usePageVisibilityの結果を使用）
  const canFetchData = isVisible && appState.isOnline;

  return {
    ...appState,
    canFetchData,
    shouldRefreshData,
    updateActiveTime,
  };
}
