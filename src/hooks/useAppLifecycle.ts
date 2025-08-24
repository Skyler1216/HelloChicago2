import { useState, useEffect, useCallback, useRef } from 'react';

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
    refreshThreshold = 5 * 60 * 1000, // デフォルト5分
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

  // コールバックの更新
  useEffect(() => {
    callbacksRef.current = {
      onAppVisible,
      onAppHidden,
      onAppOnline,
      onAppOffline,
    };
  }, [onAppVisible, onAppHidden, onAppOnline, onAppOffline]);

  // アプリの表示状態変更時の処理
  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    const now = Date.now();

    setAppState(prev => {
      const newState = {
        ...prev,
        isVisible,
        lastActiveTime: isVisible ? now : prev.lastActiveTime,
        inactiveTime: isVisible ? now - prev.lastActiveTime : prev.inactiveTime,
      };
      stateRef.current = newState;
      return newState;
    });

    if (isVisible) {
      // アプリがフォアグラウンドに戻った
      const inactiveTime = now - stateRef.current.lastActiveTime;

      // 非アクティブ時間が閾値を超えた場合、再読み込みが必要かもしれない
      if (inactiveTime > refreshThreshold) {
        console.log(
          '📱 App returned after long inactive period, may need refresh'
        );
      }

      callbacksRef.current.onAppVisible?.();
    } else {
      // アプリがバックグラウンドに移行
      callbacksRef.current.onAppHidden?.();
    }
  }, [refreshThreshold]);

  // ネットワーク状態変更時の処理
  const handleOnline = useCallback(() => {
    setAppState(prev => ({ ...prev, isOnline: true }));
    callbacksRef.current.onAppOnline?.();
  }, []);

  const handleOffline = useCallback(() => {
    setAppState(prev => ({ ...prev, isOnline: false }));
    callbacksRef.current.onAppOffline?.();
  }, []);

  // イベントリスナーの設定
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // ページフォーカス/ブラーイベントも追加
    const handleFocus = () => {
      const now = Date.now();
      setAppState(prev => ({
        ...prev,
        isVisible: true,
        lastActiveTime: now,
        inactiveTime: now - prev.lastActiveTime,
      }));
      callbacksRef.current.onAppVisible?.();
    };

    const handleBlur = () => {
      callbacksRef.current.onAppHidden?.();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleVisibilityChange, handleOnline, handleOffline]);

  // 手動でアクティブ時間を更新
  const updateActiveTime = useCallback(() => {
    const now = Date.now();
    setAppState(prev => ({
      ...prev,
      lastActiveTime: now,
      inactiveTime: 0,
    }));
  }, []);

  // データ再読み込みが必要かチェック
  const shouldRefreshData = useCallback(() => {
    const now = Date.now();
    const inactiveTime = now - stateRef.current.lastActiveTime;
    return inactiveTime > refreshThreshold;
  }, [refreshThreshold]);

  // ページの可視性とオンライン状態を組み合わせた状態
  const canFetchData = appState.isVisible && appState.isOnline;

  return {
    ...appState,
    canFetchData,
    shouldRefreshData,
    updateActiveTime,
  };
}
