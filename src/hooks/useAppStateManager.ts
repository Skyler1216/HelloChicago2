import { useState, useEffect, useRef, useCallback } from 'react';

interface AppStateSnapshot {
  timestamp: number;
  loading: boolean;
  initialized: boolean;
  authenticated: boolean;
  approved: boolean | undefined;
  reason: string;
}

/**
 * アプリ状態の履歴管理と異常検知
 * 無限ローディングや状態の矛盾を検出・修正する
 */
export function useAppStateManager() {
  const [stateHistory, setStateHistory] = useState<AppStateSnapshot[]>([]);
  const lastSnapshotRef = useRef<AppStateSnapshot>();
  const watchdogRef = useRef<NodeJS.Timeout>();

  // 状態スナップショットを記録
  const recordSnapshot = useCallback(
    (snapshot: Omit<AppStateSnapshot, 'timestamp'>) => {
      const newSnapshot = {
        ...snapshot,
        timestamp: Date.now(),
      };

      // 前回と同じ状態の場合は記録しない（ノイズ削減）
      if (
        lastSnapshotRef.current &&
        lastSnapshotRef.current.loading === newSnapshot.loading &&
        lastSnapshotRef.current.initialized === newSnapshot.initialized &&
        lastSnapshotRef.current.authenticated === newSnapshot.authenticated &&
        lastSnapshotRef.current.approved === newSnapshot.approved
      ) {
        return;
      }

      lastSnapshotRef.current = newSnapshot;
      setStateHistory(prev => [...prev.slice(-9), newSnapshot]); // 最新10件のみ保持

      console.log('📱 StateManager: State changed:', newSnapshot);
    },
    []
  );

  // 異常状態の検知
  const detectAnomalies = useCallback(() => {
    if (stateHistory.length < 2) return null;

    const recent = stateHistory.slice(-5); // 最新5件を確認
    const now = Date.now();

    // 長時間ローディング状態が続いている場合
    const longLoadingStates = recent.filter(
      s => s.loading && now - s.timestamp > 30000
    );
    if (longLoadingStates.length > 0) {
      return {
        type: 'STUCK_LOADING',
        message: 'Loading state stuck for more than 30 seconds',
        since: longLoadingStates[0].timestamp,
      };
    }

    // 短期間に多数の状態変更がある場合（ループの可能性）
    const recentChanges = recent.filter(s => now - s.timestamp < 5000);
    if (recentChanges.length > 5) {
      return {
        type: 'RAPID_STATE_CHANGES',
        message: 'Too many state changes in short period',
        count: recentChanges.length,
      };
    }

    // 認証状態の矛盾
    const authStates = recent.filter(s => s.authenticated);
    const inconsistentAuth = authStates.find(
      s => s.authenticated && s.approved === false && s.loading
    );
    if (inconsistentAuth) {
      return {
        type: 'AUTH_INCONSISTENCY',
        message: 'Authenticated but not approved, still loading',
        state: inconsistentAuth,
      };
    }

    return null;
  }, [stateHistory]);

  // ウォッチドッグタイマー（5秒ごとに異常チェック）
  useEffect(() => {
    watchdogRef.current = setInterval(() => {
      const anomaly = detectAnomalies();
      if (anomaly) {
        console.warn('📱 StateManager: Anomaly detected:', anomaly);

        // 異常状態に応じた対処
        switch (anomaly.type) {
          case 'STUCK_LOADING':
            console.log(
              '📱 StateManager: Attempting to recover from stuck loading'
            );
            // カスタムイベントでリセットを通知
            window.dispatchEvent(
              new CustomEvent('app-state-recovery', {
                detail: { type: 'STUCK_LOADING', action: 'FORCE_COMPLETE' },
              })
            );
            break;
          case 'RAPID_STATE_CHANGES':
            console.log('📱 StateManager: Throttling rapid state changes');
            break;
          case 'AUTH_INCONSISTENCY':
            console.log('📱 StateManager: Resolving auth inconsistency');
            break;
        }
      }
    }, 5000);

    return () => {
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
      }
    };
  }, [detectAnomalies]);

  // 手動リカバリー
  const forceRecovery = useCallback(
    (reason: string) => {
      console.log('📱 StateManager: Force recovery triggered:', reason);
      recordSnapshot({
        loading: false,
        initialized: true,
        authenticated: false,
        approved: undefined,
        reason: `FORCE_RECOVERY: ${reason}`,
      });

      window.dispatchEvent(
        new CustomEvent('app-state-recovery', {
          detail: { type: 'MANUAL', action: 'FORCE_RESET', reason },
        })
      );
    },
    [recordSnapshot]
  );

  // 状態履歴のクリア
  const clearHistory = useCallback(() => {
    setStateHistory([]);
    lastSnapshotRef.current = undefined;
  }, []);

  return {
    stateHistory,
    recordSnapshot,
    detectAnomalies,
    forceRecovery,
    clearHistory,
    currentAnomaly: detectAnomalies(),
  };
}
