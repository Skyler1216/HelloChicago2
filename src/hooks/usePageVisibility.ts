import { useState, useEffect, useCallback, useRef } from 'react';

interface VisibilityState {
  isVisible: boolean;
  lastVisibleTime: number;
  lastHiddenTime: number;
  visibilityCount: number;
  backgroundTime: number;
}

interface UsePageVisibilityOptions {
  onVisible?: (backgroundTime: number) => void;
  onHidden?: () => void;
  staleThreshold?: number; // データが古いと判定する時間（ms）
  refreshThreshold?: number; // 強制リフレッシュする時間（ms）
}

/**
 * Page Visibility APIを使用したアプリのフォアグラウンド/バックグラウンド状態管理
 * スマホアプリのスイッチ動作を適切に検知する
 */
export function usePageVisibility(options: UsePageVisibilityOptions = {}) {
  const {
    onVisible,
    onHidden,
    staleThreshold = 2 * 60 * 1000, // 2分
    refreshThreshold = 5 * 60 * 1000, // 5分
  } = options;

  const [state, setState] = useState<VisibilityState>(() => ({
    isVisible: !document.hidden,
    lastVisibleTime: Date.now(),
    lastHiddenTime: 0,
    visibilityCount: 0,
    backgroundTime: 0,
  }));

  const callbacksRef = useRef({ onVisible, onHidden });
  const stateRef = useRef(state);

  // コールバックの更新
  useEffect(() => {
    callbacksRef.current = { onVisible, onHidden };
  }, [onVisible, onHidden]);

  // 状態の更新
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleVisibilityChange = useCallback(() => {
    const isVisible = !document.hidden;
    const now = Date.now();

    setState(prevState => {
      const newState = { ...prevState };

      if (isVisible && !prevState.isVisible) {
        // バックグラウンドからフォアグラウンドに復帰
        const backgroundTime = now - prevState.lastHiddenTime;
        newState.isVisible = true;
        newState.lastVisibleTime = now;
        newState.visibilityCount += 1;
        newState.backgroundTime = backgroundTime;

        console.log(
          `📱 App became visible (background time: ${Math.round(backgroundTime / 1000)}s)`
        );

        // Service Workerにアプリフォーカスを通知
        if (
          'serviceWorker' in navigator &&
          navigator.serviceWorker.controller
        ) {
          navigator.serviceWorker.controller.postMessage({
            type: 'APP_FOCUS',
            backgroundTime,
          });
        }

        // コールバック実行
        setTimeout(() => {
          callbacksRef.current.onVisible?.(backgroundTime);
        }, 0);
      } else if (!isVisible && prevState.isVisible) {
        // フォアグラウンドからバックグラウンドに移行
        newState.isVisible = false;
        newState.lastHiddenTime = now;
        newState.backgroundTime = 0;

        console.log('📱 App became hidden');

        // コールバック実行
        setTimeout(() => {
          callbacksRef.current.onHidden?.();
        }, 0);
      }

      return newState;
    });
  }, []);

  // Page Visibility API のセットアップ
  useEffect(() => {
    // visibilitychange イベント
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // フォーカス/ブラーイベント（補完用）
    const handleFocus = () => {
      if (document.hidden) return; // visibilitychange で処理される

      const now = Date.now();
      const backgroundTime = now - stateRef.current.lastHiddenTime;

      if (!stateRef.current.isVisible && backgroundTime > 1000) {
        // 1秒以上のバックグラウンド時間があった場合のみ処理
        console.log('📱 App focus detected (fallback)');
        handleVisibilityChange();
      }
    };

    const handleBlur = () => {
      if (!document.hidden) return; // visibilitychange で処理される

      if (stateRef.current.isVisible) {
        console.log('📱 App blur detected (fallback)');
        handleVisibilityChange();
      }
    };

    window.addEventListener('focus', handleFocus, { passive: true });
    window.addEventListener('blur', handleBlur, { passive: true });

    // ページの読み込み完了時も初期状態をチェック
    const handleLoad = () => {
      if (!document.hidden && !stateRef.current.isVisible) {
        handleVisibilityChange();
      }
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('load', handleLoad);
    };
  }, [handleVisibilityChange]);

  // データの新鮮度チェック
  const isDataStale = useCallback(
    (lastUpdateTime: number = 0) => {
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdateTime;
      return timeSinceUpdate > staleThreshold;
    },
    [staleThreshold]
  );

  // 強制リフレッシュが必要かチェック
  const shouldForceRefresh = useCallback(
    (lastUpdateTime: number = 0) => {
      const now = Date.now();
      const timeSinceUpdate = now - lastUpdateTime;
      return (
        timeSinceUpdate > refreshThreshold ||
        state.backgroundTime > refreshThreshold
      );
    },
    [refreshThreshold, state.backgroundTime]
  );

  // アプリの使用パターン分析
  const getUsagePattern = useCallback(() => {
    const now = Date.now();
    const sessionTime = now - (state.lastVisibleTime - state.backgroundTime);

    return {
      isActiveUser: state.visibilityCount > 3, // 3回以上の切り替えがあれば活発なユーザー
      sessionDuration: sessionTime,
      backgroundTime: state.backgroundTime,
      switchCount: state.visibilityCount,
      isLongSession: sessionTime > 10 * 60 * 1000, // 10分以上のセッション
      wasLongBackground: state.backgroundTime > 5 * 60 * 1000, // 5分以上のバックグラウンド
    };
  }, [state]);

  return {
    // 基本状態
    isVisible: state.isVisible,
    backgroundTime: state.backgroundTime,
    lastVisibleTime: state.lastVisibleTime,
    visibilityCount: state.visibilityCount,

    // データ新鮮度チェック
    isDataStale,
    shouldForceRefresh,

    // 使用パターン分析
    getUsagePattern,

    // 手動状態更新（テスト用）
    forceVisibilityCheck: handleVisibilityChange,
  };
}
