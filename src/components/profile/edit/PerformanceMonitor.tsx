import React, { useState, useMemo } from 'react';
import { BarChart3, Cpu, Wifi, WifiOff } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  cacheHitRate: number;
  isOnline: boolean;
  componentCount: number;
}

interface PerformanceMonitorProps {
  metrics: PerformanceMetrics;
  className?: string;
}

export default function PerformanceMonitor({
  metrics,
  className = '',
}: PerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const performanceScore = useMemo(() => {
    let score = 100;

    // レンダリング時間による減点
    if (metrics.renderTime > 16) score -= 20; // 60fps未満
    if (metrics.renderTime > 33) score -= 30; // 30fps未満

    // キャッシュヒット率による加点/減点
    if (metrics.cacheHitRate > 80) score += 10;
    else if (metrics.cacheHitRate < 50) score -= 20;

    // オフライン時の減点
    if (!metrics.isOnline) score -= 30;

    return Math.max(0, Math.min(100, score));
  }, [metrics]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return '優秀';
    if (score >= 60) return '良好';
    if (score >= 40) return '要改善';
    return '問題あり';
  };

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-gray-600" />
          <h3 className="text-sm font-medium text-gray-900">
            パフォーマンス監視
          </h3>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? '詳細を隠す' : '詳細を表示'}
        </button>
      </div>

      {/* スコア表示 */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">総合スコア</span>
          <span
            className={`text-lg font-bold ${getScoreColor(performanceScore)}`}
          >
            {performanceScore}
          </span>
        </div>
        <div className="mt-1">
          <span className={`text-xs ${getScoreColor(performanceScore)}`}>
            {getScoreLabel(performanceScore)}
          </span>
        </div>

        {/* プログレスバー */}
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              performanceScore >= 80
                ? 'bg-green-500'
                : performanceScore >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${performanceScore}%` }}
          />
        </div>
      </div>

      {/* 基本メトリクス */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Cpu className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-xs text-gray-600">レンダリング時間</div>
          <div className="text-sm font-medium text-gray-900">
            {metrics.renderTime.toFixed(1)}ms
          </div>
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            {metrics.isOnline ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
          <div className="text-xs text-gray-600">接続状態</div>
          <div
            className={`text-sm font-medium ${
              metrics.isOnline ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {metrics.isOnline ? 'オンライン' : 'オフライン'}
          </div>
        </div>
      </div>

      {/* 詳細メトリクス */}
      {isExpanded && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">キャッシュヒット率</span>
            <span className="text-sm font-medium text-gray-900">
              {metrics.cacheHitRate.toFixed(1)}%
            </span>
          </div>

          {metrics.memoryUsage && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">メモリ使用量</span>
              <span className="text-sm font-medium text-gray-900">
                {(metrics.memoryUsage / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">コンポーネント数</span>
            <span className="text-sm font-medium text-gray-900">
              {metrics.componentCount}
            </span>
          </div>

          {/* パフォーマンス改善のヒント */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-xs font-medium text-blue-800 mb-2">
              改善のヒント
            </h4>
            <ul className="text-xs text-blue-700 space-y-1">
              {metrics.renderTime > 16 && (
                <li>
                  •
                  レンダリング時間が長いです。React.memoの使用を検討してください
                </li>
              )}
              {metrics.cacheHitRate < 50 && (
                <li>
                  •
                  キャッシュヒット率が低いです。データの再利用を検討してください
                </li>
              )}
              {!metrics.isOnline && (
                <li>
                  • オフライン状態です。キャッシュされたデータを使用しています
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
