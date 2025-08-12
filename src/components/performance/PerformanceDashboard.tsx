import React, { useState, useEffect } from 'react';
import { PerformanceMonitor } from '../../lib/performance-monitor';

interface PerformanceMetrics {
  pageLoads: number;
  apiCalls: number;
  databaseQueries: number;
  componentRenders: number;
  errors: number;
  averagePageLoadTime: number;
  averageApiResponseTime: number;
  averageDbQueryTime: number;
}

interface PerformanceDashboardProps {
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className = '',
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitor, setMonitor] = useState<PerformanceMonitor | null>(null);

  useEffect(() => {
    const performanceMonitor = new PerformanceMonitor();
    setMonitor(performanceMonitor);

    // パフォーマンスメトリクスの更新を監視
    const updateMetrics = () => {
      const currentMetrics = performanceMonitor.getCurrentMetrics();
      setMetrics({
        pageLoads: currentMetrics.pageLoads.length,
        apiCalls: currentMetrics.apiCalls.length,
        databaseQueries: currentMetrics.databaseQueries.length,
        componentRenders: currentMetrics.componentRenders.length,
        errors: currentMetrics.errors.length,
        averagePageLoadTime: calculateAverage(
          currentMetrics.pageLoads,
          'loadTime'
        ),
        averageApiResponseTime: calculateAverage(
          currentMetrics.apiCalls,
          'responseTime'
        ),
        averageDbQueryTime: calculateAverage(
          currentMetrics.databaseQueries,
          'queryTime'
        ),
      });
    };

    // 初期メトリクスを取得
    updateMetrics();

    // 定期的にメトリクスを更新
    const interval = setInterval(updateMetrics, 5000);

    return () => {
      clearInterval(interval);
      performanceMonitor.stop();
    };
  }, []);

  const calculateAverage = (
    items: Array<{ [key: string]: number }>,
    timeKey: string
  ): number => {
    if (items.length === 0) return 0;
    const total = items.reduce((sum, item) => sum + (item[timeKey] || 0), 0);
    return Math.round(total / items.length);
  };

  const startMonitoring = () => {
    if (monitor) {
      monitor.start();
      setIsMonitoring(true);
    }
  };

  const stopMonitoring = () => {
    if (monitor) {
      monitor.stop();
      setIsMonitoring(false);
    }
  };

  const clearMetrics = () => {
    if (monitor) {
      monitor.clearMetrics();
      setMetrics(null);
    }
  };

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value <= threshold) return 'text-green-600';
    if (value <= threshold * 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (value: number, threshold: number) => {
    if (value <= threshold) return 'bg-green-100 text-green-800';
    if (value <= threshold * 1.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            パフォーマンス監視
          </h2>
          <p className="text-gray-600 mt-1">
            アプリケーションのパフォーマンスをリアルタイムで監視します
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              isMonitoring
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isMonitoring ? '停止' : '開始'}
          </button>
          <button
            onClick={clearMetrics}
            className="px-4 py-2 bg-gray-600 text-white rounded-md font-medium hover:bg-gray-700 transition-colors"
          >
            クリア
          </button>
        </div>
      </div>

      {/* 監視状況 */}
      <div className="mb-6">
        <div
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            isMonitoring
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full mr-2 ${
              isMonitoring ? 'bg-green-500' : 'bg-gray-500'
            }`}
          ></div>
          {isMonitoring ? '監視中' : '停止中'}
        </div>
      </div>

      {metrics && (
        <div className="space-y-6">
          {/* 主要メトリクス */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-blue-600 text-2xl mr-3">📄</div>
                <div>
                  <div className="text-sm font-medium text-blue-600">
                    ページ読み込み
                  </div>
                  <div className="text-2xl font-bold text-blue-900">
                    {metrics.pageLoads}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-green-600 text-2xl mr-3">🌐</div>
                <div>
                  <div className="text-sm font-medium text-green-600">
                    API呼び出し
                  </div>
                  <div className="text-2xl font-bold text-green-900">
                    {metrics.apiCalls}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-purple-600 text-2xl mr-3">🗄️</div>
                <div>
                  <div className="text-sm font-medium text-purple-600">
                    DBクエリ
                  </div>
                  <div className="text-2xl font-bold text-purple-900">
                    {metrics.databaseQueries}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center">
                <div className="text-orange-600 text-2xl mr-3">⚡</div>
                <div>
                  <div className="text-sm font-medium text-orange-600">
                    コンポーネント
                  </div>
                  <div className="text-2xl font-bold text-orange-900">
                    {metrics.componentRenders}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* パフォーマンス指標 */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              パフォーマンス指標
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${getPerformanceColor(metrics.averagePageLoadTime, 1000)}`}
                >
                  {metrics.averagePageLoadTime}ms
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  平均ページ読み込み時間
                </div>
                <div
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getPerformanceBadge(metrics.averagePageLoadTime, 1000)}`}
                >
                  {metrics.averagePageLoadTime <= 1000
                    ? '優秀'
                    : metrics.averagePageLoadTime <= 1500
                      ? '良好'
                      : '要改善'}
                </div>
              </div>

              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${getPerformanceColor(metrics.averageApiResponseTime, 500)}`}
                >
                  {metrics.averageApiResponseTime}ms
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  平均API応答時間
                </div>
                <div
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getPerformanceBadge(metrics.averageApiResponseTime, 500)}`}
                >
                  {metrics.averageApiResponseTime <= 500
                    ? '優秀'
                    : metrics.averageApiResponseTime <= 750
                      ? '良好'
                      : '要改善'}
                </div>
              </div>

              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${getPerformanceColor(metrics.averageDbQueryTime, 100)}`}
                >
                  {metrics.averageDbQueryTime}ms
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  平均DBクエリ時間
                </div>
                <div
                  className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-2 ${getPerformanceBadge(metrics.averageDbQueryTime, 100)}`}
                >
                  {metrics.averageDbQueryTime <= 100
                    ? '優秀'
                    : metrics.averageDbQueryTime <= 150
                      ? '良好'
                      : '要改善'}
                </div>
              </div>
            </div>
          </div>

          {/* エラー状況 */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="text-red-600 text-2xl mr-3">⚠️</div>
                <div>
                  <div className="text-lg font-semibold text-red-800">
                    エラー数
                  </div>
                  <div className="text-sm text-red-600">
                    アプリケーションで発生したエラーの総数
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`text-3xl font-bold ${metrics.errors === 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.errors}
                </div>
                <div
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    metrics.errors === 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {metrics.errors === 0 ? 'エラーなし' : 'エラー発生中'}
                </div>
              </div>
            </div>
          </div>

          {/* リアルタイム更新情報 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">監視情報</h3>
            <div className="text-sm text-gray-600">
              <p>• メトリクスは5秒ごとに自動更新されます</p>
              <p>
                • 監視を開始すると、リアルタイムでパフォーマンスを追跡できます
              </p>
              <p>• エラーが発生した場合、自動的に記録されます</p>
            </div>
          </div>
        </div>
      )}

      {!metrics && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            パフォーマンス監視を開始してください
          </h3>
          <p className="text-gray-600">
            上記の「開始」ボタンをクリックして、パフォーマンス監視を開始します
          </p>
        </div>
      )}
    </div>
  );
};
