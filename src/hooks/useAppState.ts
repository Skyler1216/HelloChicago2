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
 * パフォーマンス最適化版
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
  const isMobile = useRef(false);
  const lastStateUpdateRef = useRef(0);

  // モバイルデバイス判定
  useEffect(() => {
    isMobile.current =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
  }, []);

  // パフォーマンス最適化された状態更新
  const updateAppState = useCallback(
    (updater: (prev: AppState) => AppState) => {
      const now = Date.now();

      // モバイルでは更新頻度を制限（200ms間隔）
      if (isMobile.current && now - lastStateUpdateRef.current < 200) {
        return;
      }

      lastStateUpdateRef.current = now;
      setAppState(updater);
    },
    []
  );

  // アプリライフサイクルの監視
  const { shouldRefreshData: shouldRefreshFromLifecycle } = useAppLifecycle({
    onAppVisible: () => {
      // アプリが表示されたときのロジック
      const now = Date.now();
      const timeSinceLastRefresh = now - appState.lastRefreshTime;
      const timeSinceLastForeground = now - appState.lastForegroundTime;

      // モバイルではログを簡素化
      if (!isMobile.current) {
        console.log('📱 App became visible', {
          timeSinceLastRefresh: Math.round(timeSinceLastRefresh / 1000) + 's',
          timeSinceLastForeground:
            Math.round(timeSinceLastForeground / 1000) + 's',
        });
      }

      // フォアグラウンド時間を更新
      updateAppState(prev => ({
        ...prev,
        lastForegroundTime: now,
      }));

      // 5分以上経過している場合はデータ更新を推奨
      if (timeSinceLastRefresh > 5 * 60 * 1000) {
        if (!isMobile.current) {
          console.log(
            '📱 App visible after long time, suggesting data refresh'
          );
        }
      }

      // 長時間バックグラウンドにいた場合は状態復旧を試行
      if (timeSinceLastForeground > 10 * 60 * 1000) {
        // 10分以上
        if (!isMobile.current) {
          console.log(
            '📱 Long background time detected, attempting state recovery'
          );
        }
        attemptStateRecovery();
      }
    },
    refreshThreshold: 5 * 60 * 1000, // 5分
  });

  // 状態復旧の試行
  const attemptStateRecovery = useCallback(() => {
    if (!isMobile.current) {
      console.log('📱 Attempting state recovery...');
    }

    // 既存のタイムアウトをクリア
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
    }

    // モバイルでは復旧時間を短縮（3秒）、PCでは5秒
    const recoveryDelay = isMobile.current ? 3000 : 5000;

    recoveryTimeoutRef.current = setTimeout(() => {
      if (!isMobile.current) {
        console.log('📱 Force recovery timeout reached, resetting state');
      }

      // 認証状態を再確認
      if (!authLoading) {
        if (isAuthenticated && isApproved !== undefined) {
          // 認証済み・承認済みの場合は初期化完了
          updateAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        } else if (!isAuthenticated) {
          // 未認証の場合は初期化完了
          updateAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        } else {
          // 承認状態が不明な場合は強制初期化
          if (!isMobile.current) {
            console.warn('📱 Approval status unclear, forcing initialization');
          }
          updateAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        }
      }
    }, recoveryDelay);
  }, [authLoading, isAuthenticated, isApproved, updateAppState]);

  // 強制初期化
  const forceInitialization = useCallback(() => {
    if (!isMobile.current) {
      console.log('📱 Force initialization triggered');
    }
    initializationRef.current = false;
    updateAppState(prev => ({
      ...prev,
      isInitialized: false,
      hasShownInitialLoading: false,
    }));
  }, [updateAppState]);

  // 初期化判定
  useEffect(() => {
    if (initializationRef.current) return;

    // 認証ローディングが完了し、かつ認証済みまたは未認証が確定した場合
    if (!authLoading) {
      // 認証されている場合は承認も確認
      if (isAuthenticated) {
        if (isApproved !== undefined) {
          initializationRef.current = true;
          updateAppState(prev => ({
            ...prev,
            isInitialized: true,
            lastRefreshTime: Date.now(),
          }));
        }
      } else {
        // 未認証の場合は即座に初期化完了
        initializationRef.current = true;
        updateAppState(prev => ({
          ...prev,
          isInitialized: true,
          lastRefreshTime: Date.now(),
        }));
      }
    }
  }, [authLoading, isAuthenticated, isApproved, updateAppState]);

  // 初回ローディング完了フラグの管理
  useEffect(() => {
    if (appState.isInitialized && !appState.hasShownInitialLoading) {
      // 初期化完了時に一度だけフラグを更新
      updateAppState(prev => ({ ...prev, hasShownInitialLoading: true }));
    }
  }, [appState.isInitialized, appState.hasShownInitialLoading, updateAppState]);

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
    updateAppState(prev => ({
      ...prev,
      lastRefreshTime: Date.now(),
      backgroundRefreshing: false,
    }));
  }, [updateAppState]);

  // バックグラウンド更新状態の設定
  const setBackgroundRefreshing = useCallback(
    (refreshing: boolean) => {
      updateAppState(prev => ({
        ...prev,
        backgroundRefreshing: refreshing,
      }));
    },
    [updateAppState]
  );

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
