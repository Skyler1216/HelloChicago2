import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from './useAuth';

interface InternalAppState {
  isInitialized: boolean;
  lastRefreshTime: number;
  lastForegroundTime: number;
}

interface UseAppStateReturn {
  isInitialized: boolean;
  shouldShowLoading: boolean;
  markDataRefreshed: () => void;
  forceInitialization: () => void;
}

/**
 * アプリ全体の状態管理フック
 * 無限ローディングを防ぐためのシンプルで確実な実装
 */
export function useAppState(): UseAppStateReturn {
  const {
    loading: authLoading,
    isAuthenticated,
    isApproved,
    initialized: authInitialized,
  } = useAuth();

  const [appState, setAppState] = useState<InternalAppState>({
    isInitialized: false,
    lastRefreshTime: 0,
    lastForegroundTime: Date.now(),
  });

  const initializationRef = useRef(false);
  const isMobile = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // モバイルデバイス判定
  useEffect(() => {
    isMobile.current =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
  }, []);

  // 強制初期化（デバッグ・復旧用）
  const forceInitialization = useCallback(() => {
    console.log('📱 AppState: Force initialization triggered');

    // 初期化フラグをリセット
    initializationRef.current = false;

    // 状態をリセット
    setAppState(prev => ({
      isInitialized: false,
    }));

    // 即座に初期化完了（setTimeoutを使わない）
    console.log('📱 AppState: Force initialization completed immediately');
    initializationRef.current = true;
    setAppState(prev => ({
      ...prev,
      isInitialized: true,
      lastRefreshTime: Date.now(),
    }));
  }, []);

  // タイムアウト機能（無限ローディング防止）
  useEffect(() => {
    // 10秒後に強制初期化
    timeoutRef.current = setTimeout(() => {
      if (!initializationRef.current) {
        console.warn('📱 AppState: Timeout reached, forcing initialization');
        forceInitialization();
      }
    }, 10000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [forceInitialization]);

  // シンプルで確実な初期化判定
  useEffect(() => {
    // 既に初期化済みの場合は何もしない
    if (initializationRef.current) return;

    // 認証の初期化が完了していない場合は待機
    if (!authInitialized) return;

    // 認証ローディングが完了している場合
    if (!authLoading) {
      console.log('📱 AppState: Auth loading completed', {
        isAuthenticated,
        isApproved,
        authLoading,
        authInitialized,
      });

      // 認証状態に関係なく初期化完了
      initializationRef.current = true;
      setAppState(prev => ({
        ...prev,
        isInitialized: true,
        lastRefreshTime: Date.now(),
      }));

      // 永続化状態を更新
      try {
        const appStateData =
          sessionStorage.getItem('app_persistent_state') || '{}';
        const parsed = JSON.parse(appStateData);
        parsed.isInitialized = true;
        parsed.lastInitTime = Date.now();
        sessionStorage.setItem('app_persistent_state', JSON.stringify(parsed));
      } catch (error) {
        console.warn('📱 AppState: Failed to save init state:', error);
      }

      console.log('📱 AppState: Initialization completed');
    }
  }, [authLoading, isAuthenticated, isApproved, authInitialized]);

  // フォールバック初期化（認証完了後も初期化されていない場合）
  useEffect(() => {
    // 認証が完了しているのに初期化されていない場合
    if (authInitialized && !authLoading && !initializationRef.current) {
      console.log('📱 AppState: Fallback initialization triggered');

      initializationRef.current = true;
      setAppState(prev => ({
        ...prev,
        isInitialized: true,
        lastRefreshTime: Date.now(),
      }));

      // 永続化状態を更新
      try {
        const appStateData =
          sessionStorage.getItem('app_persistent_state') || '{}';
        const parsed = JSON.parse(appStateData);
        parsed.isInitialized = true;
        parsed.lastInitTime = Date.now();
        sessionStorage.setItem('app_persistent_state', JSON.stringify(parsed));
      } catch (error) {
        console.warn('📱 AppState: Failed to save init state:', error);
      }

      console.log('📱 AppState: Fallback initialization completed');
    }
  }, [authInitialized, authLoading]); // initializationRef.currentを削除

  // ローディング表示の判定
  const shouldShowLoading = useMemo(() => {
    // 認証が初期化されていない場合はローディング表示
    if (!authInitialized) return true;

    // 認証ローディング中はローディング表示
    if (authLoading) return true;

    // アプリが初期化されていない場合はローディング表示
    if (!appState.isInitialized) return true;

    // それ以外の場合はローディング不要
    return false;
  }, [authInitialized, authLoading, appState.isInitialized]);

  // データ更新が必要かの判定
  // このロジックはuseAppLifecycleに移動

  // データ更新完了の記録
  const markDataRefreshed = useCallback(() => {
    setAppState(prev => ({
      ...prev,
      lastRefreshTime: Date.now(),
    }));
  }, []);

  // デバッグ用：現在の状態をログ出力
  useEffect(() => {
    if (isMobile.current) return; // モバイルではログを出力しない

    console.log('📱 AppState: State changed', {
      authInitialized,
      authLoading,
      isAuthenticated,
      isApproved,
      appStateIsInitialized: appState.isInitialized,
      shouldShowLoading,
      initializationRef: initializationRef.current,
    });
  }, [
    authInitialized,
    authLoading,
    isAuthenticated,
    isApproved,
    appState.isInitialized,
    shouldShowLoading,
  ]);

  return {
    isInitialized: appState.isInitialized,
    shouldShowLoading, // App.tsxで認証ローディングの表示制御に使用
    markDataRefreshed,
    forceInitialization,
  };
}
