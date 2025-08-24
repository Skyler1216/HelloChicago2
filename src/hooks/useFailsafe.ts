import { useEffect, useRef, useState } from 'react';

interface FailsafeOptions {
  name: string;
  timeout?: number;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}

/**
 * フェイルセーフ機能付きのローディング状態管理
 * 無限ローディングを防ぐためのタイムアウト機能
 */
export function useFailsafe(options: FailsafeOptions) {
  const { name, timeout = 15000, onTimeout, onError } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const startTimeRef = useRef<number>();

  // ローディング開始
  const startLoading = () => {
    console.log(`📱 Failsafe[${name}]: Loading started`);
    setIsLoading(true);
    setHasTimedOut(false);
    startTimeRef.current = Date.now();

    // タイムアウト設定
    timeoutRef.current = setTimeout(() => {
      const duration = Date.now() - (startTimeRef.current || 0);
      console.warn(`📱 Failsafe[${name}]: Timeout after ${duration}ms`);

      setHasTimedOut(true);
      setIsLoading(false);
      onTimeout?.();
    }, timeout);
  };

  // ローディング完了
  const stopLoading = () => {
    const duration = startTimeRef.current
      ? Date.now() - startTimeRef.current
      : 0;
    console.log(`📱 Failsafe[${name}]: Loading completed in ${duration}ms`);

    setIsLoading(false);
    setHasTimedOut(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
  };

  // エラー発生時
  const handleError = (error: Error) => {
    console.error(`📱 Failsafe[${name}]: Error occurred:`, error);
    stopLoading();
    onError?.(error);
  };

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // 強制完了（デバッグ用）
  const forceComplete = () => {
    console.log(`📱 Failsafe[${name}]: Force completing`);
    stopLoading();
  };

  return {
    isLoading,
    hasTimedOut,
    startLoading,
    stopLoading,
    handleError,
    forceComplete,
  };
}
