import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAppLifecycle } from './useAppLifecycle';

interface AppState {
  isInitialized: boolean;
  hasShownInitialLoading: boolean;
  backgroundRefreshing: boolean;
  lastRefreshTime: number;
}

interface UseAppStateReturn {
  isInitialized: boolean;
  shouldShowLoading: boolean;
  shouldRefreshData: boolean;
  backgroundRefreshing: boolean;
  markDataRefreshed: () => void;
  setBackgroundRefreshing: (refreshing: boolean) => void;
}

/**
 * アプリ全体の状態管理フック
 * アプリの初期化、ローディング状態、データ更新を統一管理
 */
export function useAppState(): UseAppStateReturn {
  const { loading: authLoading, isAuthenticated, isApproved } = useAuth();
  const [appState, setAppState] = useState<AppState>({
    isInitialized: false,
    hasShownInitialLoading: false,
    backgroundRefreshing: false,
    lastRefreshTime: 0,
  });

  const initializationRef = useRef(false);

  // アプリライフサイクルの監視
  const { shouldRefreshData: shouldRefreshFromLifecycle } = useAppLifecycle({
    onAppVisible: () => {
      // アプリが表示されたときのロジック
      const now = Date.now();
      const timeSinceLastRefresh = now - appState.lastRefreshTime;

      // 5分以上経過している場合はデータ更新を推奨
      if (timeSinceLastRefresh > 5 * 60 * 1000) {
        console.log('📱 App visible after long time, suggesting data refresh');
      }
    },
    refreshThreshold: 5 * 60 * 1000, // 5分
  });

  // 初期化判定
  useEffect(() => {
    if (initializationRef.current) return;

    // 認証ローディングが完了し、かつ認証済みまたは未認証が確定した場合
    if (!authLoading) {
      // 認証されている場合は承認も確認
      if (isAuthenticated) {
        if (isApproved !== undefined) {
          initializationRef.current = true;
          setAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        }
      } else {
        // 未認証の場合は即座に初期化完了
        initializationRef.current = true;
        setAppState(prev => ({
          ...prev,
          isInitialized: true,
          lastRefreshTime: Date.now(),
        }));
      }
    }
  }, [authLoading, isAuthenticated, isApproved]);

  // 初回ローディング完了フラグの管理
  useEffect(() => {
    if (appState.isInitialized && !appState.hasShownInitialLoading) {
      // 初期化完了時に一度だけフラグを更新
      setAppState(prev => ({ ...prev, hasShownInitialLoading: true }));
    }
  }, [appState.isInitialized, appState.hasShownInitialLoading]);

  // ローディング表示の判定（副作用なし）
  const shouldShowLoading = useMemo(() => {
    // まだ初期化されていない場合は常にローディング表示
    return !appState.isInitialized;
  }, [appState.isInitialized]);

  // データ更新が必要かの判定
  const shouldRefreshData = useCallback(() => {
    if (!appState.isInitialized) return false;

    const now = Date.now();
    const timeSinceLastRefresh = now - appState.lastRefreshTime;

    // ライフサイクルからの更新推奨または30分以上経過
    return (
      shouldRefreshFromLifecycle() || timeSinceLastRefresh > 30 * 60 * 1000
    );
  }, [
    appState.isInitialized,
    appState.lastRefreshTime,
    shouldRefreshFromLifecycle,
  ]);

  // データ更新完了の記録
  const markDataRefreshed = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      lastRefreshTime: Date.now(),
      backgroundRefreshing: false,
    }));
  }, []);

  // バックグラウンド更新状態の設定
  const setBackgroundRefreshing = useCallback((refreshing: boolean) => {
    setAppState(prev => ({
      ...prev,
      backgroundRefreshing: refreshing,
    }));
  }, []);

  return {
    isInitialized: appState.isInitialized,
    shouldShowLoading,
    shouldRefreshData: shouldRefreshData(),
    backgroundRefreshing: appState.backgroundRefreshing,
    markDataRefreshed,
    setBackgroundRefreshing,
  };
}
