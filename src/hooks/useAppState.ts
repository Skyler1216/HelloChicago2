import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useAppLifecycle } from './useAppLifecycle';

interface AppState {
  isInitialized: boolean;
  hasShownInitialLoading: boolean;
  backgroundRefreshing: boolean;
  lastRefreshTime: number;
  lastForegroundTime: number; // フォアグラウンドに戻ってきた時間を追跡
}

interface UseAppStateReturn {
  isInitialized: boolean;
  shouldShowLoading: boolean;
  shouldRefreshData: boolean;
  backgroundRefreshing: boolean;
  markDataRefreshed: () => void;
  setBackgroundRefreshing: (refreshing: boolean) => void;
  forceInitialization: () => void; // 強制初期化用
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
    lastForegroundTime: Date.now(),
  });

  const initializationRef = useRef(false);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout>();

  // アプリライフサイクルの監視
  const { shouldRefreshData: shouldRefreshFromLifecycle } = useAppLifecycle({
    onAppVisible: () => {
      // アプリが表示されたときのロジック
      const now = Date.now();
      const timeSinceLastRefresh = now - appState.lastRefreshTime;
      const timeSinceLastForeground = now - appState.lastForegroundTime;

      console.log('📱 App became visible', {
        timeSinceLastRefresh: Math.round(timeSinceLastRefresh / 1000) + 's',
        timeSinceLastForeground:
          Math.round(timeSinceLastForeground / 1000) + 's',
      });

      // フォアグラウンド時間を更新
      setAppState(prev => ({
        ...prev,
        lastForegroundTime: now,
      }));

      // 5分以上経過している場合はデータ更新を推奨
      if (timeSinceLastRefresh > 5 * 60 * 1000) {
        console.log('📱 App visible after long time, suggesting data refresh');
      }

      // 長時間バックグラウンドにいた場合は状態復旧を試行
      if (timeSinceLastForeground > 10 * 60 * 1000) {
        // 10分以上
        console.log(
          '📱 Long background time detected, attempting state recovery'
        );
        attemptStateRecovery();
      }
    },
    refreshThreshold: 5 * 60 * 1000, // 5分
  });

  // 状態復旧の試行
  const attemptStateRecovery = useCallback(() => {
    console.log('📱 Attempting state recovery...');

    // 既存のタイムアウトをクリア
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
    }

    // 5秒後に強制復旧を試行
    recoveryTimeoutRef.current = setTimeout(() => {
      console.log('📱 Force recovery timeout reached, resetting state');

      // 認証状態を再確認
      if (!authLoading) {
        if (isAuthenticated && isApproved !== undefined) {
          // 認証済み・承認済みの場合は初期化完了
          setAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        } else if (!isAuthenticated) {
          // 未認証の場合は初期化完了
          setAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        } else {
          // 承認状態が不明な場合は強制初期化
          console.warn('📱 Approval status unclear, forcing initialization');
          setAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        }
      }
    }, 5000);
  }, [authLoading, isAuthenticated, isApproved]);

  // 強制初期化
  const forceInitialization = useCallback(() => {
    console.log('📱 Force initialization triggered');
    initializationRef.current = false;
    setAppState(prev => ({
      ...prev,
      isInitialized: false,
      hasShownInitialLoading: false,
    }));
  }, []);

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

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  return {
    isInitialized: appState.isInitialized,
    shouldShowLoading,
    shouldRefreshData: shouldRefreshData(),
    backgroundRefreshing: appState.backgroundRefreshing,
    markDataRefreshed,
    setBackgroundRefreshing,
    forceInitialization,
  };
}
