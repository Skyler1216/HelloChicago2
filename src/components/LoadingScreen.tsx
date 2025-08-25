import React, { useState, useEffect } from 'react';
import { Heart, MapPin, RefreshCw } from 'lucide-react';

interface LoadingScreenProps {
  maxLoadingTime?: number; // 最大ローディング時間（ms）
}

export default function LoadingScreen({
  maxLoadingTime = 15000, // デフォルト15秒に短縮
}: LoadingScreenProps) {
  const [showRecovery, setShowRecovery] = useState(false);
  const [loadingTime, setLoadingTime] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingTime(prev => {
        const newTime = prev + 1000;
        if (newTime >= maxLoadingTime && !showRecovery) {
          setShowRecovery(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [maxLoadingTime, showRecovery]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-coral-500 via-coral-400 to-warm-400 flex items-center justify-center relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white rounded-full blur-xl"></div>
        <div className="absolute bottom-32 right-16 w-24 h-24 bg-white rounded-full blur-lg"></div>
        <div className="absolute top-1/2 right-8 w-16 h-16 bg-white rounded-full blur-md"></div>
      </div>

      <div className="text-center z-10">
        {/* Logo Animation */}
        <div className="mb-8 relative">
          <div className="w-24 h-24 bg-white rounded-3xl shadow-2xl mx-auto flex items-center justify-center mb-6 animate-pulse">
            <div className="relative">
              <Heart className="w-10 h-10 text-coral-500 fill-current" />
              <MapPin className="w-6 h-6 text-teal-500 absolute -bottom-1 -right-1" />
            </div>
          </div>

          {/* App Name */}
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            HelloChicago
          </h1>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center space-x-2 mt-8">
          <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '0.1s' }}
          ></div>
          <div
            className="w-3 h-3 bg-white rounded-full animate-bounce"
            style={{ animationDelay: '0.2s' }}
          ></div>
        </div>

        <p className="text-white/80 text-sm mt-6">読み込み中...</p>

        {/* 状態復旧オプション */}
        {showRecovery && (
          <div className="mt-8 p-4 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 space-y-3">
            <p className="text-white/90 text-sm mb-3">
              ネットワーク接続が不安定です
            </p>
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => {
                  setIsRetrying(true);
                  // キャッシュをクリアして再読み込み
                  localStorage.clear();
                  sessionStorage.clear();
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                }}
                disabled={isRetrying}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                {isRetrying ? '再読み込み中...' : 'アプリを再起動'}
              </button>
              <button
                onClick={() => {
                  // Service Workerのキャッシュをクリア
                  if (
                    'serviceWorker' in navigator &&
                    navigator.serviceWorker.controller
                  ) {
                    navigator.serviceWorker.controller.postMessage({
                      type: 'CLEAR_CACHE',
                    });
                  }
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-lg transition-colors text-sm"
              >
                キャッシュをクリアして再起動
              </button>
            </div>
            <p className="text-white/70 text-xs mt-2">
              読み込み時間: {Math.round(loadingTime / 1000)}秒
            </p>
            <p className="text-white/60 text-xs">
              💡 WiFiまたはモバイルデータの接続を確認してください
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
