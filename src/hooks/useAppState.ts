import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';

interface InternalAppState {
  isInitialized: boolean;
  lastRefreshTime: number;
}

interface UseAppStateReturn {
  isInitialized: boolean;
  markDataRefreshed: () => void;
  forceInitialization: () => void;
}

/**
 * アプリ全体の状態管理フック（簡素化版）
 * 無限ローディングを防ぐためのシンプルで確実な実装
 */
export function useAppState(): UseAppStateReturn {
  const { loading: authLoading } = useAuth();

  const [appState, setAppState] = useState<InternalAppState>({
    isInitialized: false,
    lastRefreshTime: 0,
  });

  const initializationRef = useRef(false);

  // 強制初期化（デバッグ・復旧用）
  const forceInitialization = useCallback(() => {
    console.log('📱 AppState: Force initialization triggered');
    initializationRef.current = true;
    setAppState({
      isInitialized: true,
      lastRefreshTime: Date.now(),
    });
  }, []);

  // 認証ローディングが完了したら即座に初期化完了
  useEffect(() => {
    if (!authLoading && !initializationRef.current) {
      console.log('📱 AppState: Auth loading completed, initializing app');
      initializationRef.current = true;
      setAppState({
        isInitialized: true,
        lastRefreshTime: Date.now(),
      });
    }
  }, [authLoading]);

  // フォールバック初期化（1秒後）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!initializationRef.current) {
        console.log('📱 AppState: Fallback initialization triggered');
        forceInitialization();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [forceInitialization]);

  // データ更新完了の記録
  const markDataRefreshed = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      lastRefreshTime: Date.now(),
    }));
  }, []);

  return {
    isInitialized: appState.isInitialized,
    markDataRefreshed,
    forceInitialization,
  };
}
