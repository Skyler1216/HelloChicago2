import React, { useState } from 'react';
import { SecurityAuditDashboard } from '../security/SecurityAuditDashboard';
import { PerformanceDashboard } from '../performance/PerformanceDashboard';

type DashboardTab = 'security' | 'performance' | 'overview';

interface AdminDashboardProps {
  className?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const tabs = [
    { id: 'overview', name: '概要', icon: '📊' },
    { id: 'security', name: 'セキュリティ', icon: '🔒' },
    { id: 'performance', name: 'パフォーマンス', icon: '⚡' },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'security':
        return <SecurityAuditDashboard />;
      case 'performance':
        return <PerformanceDashboard />;
      case 'overview':
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className={`bg-gray-50 min-h-screen ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            管理者ダッシュボード
          </h1>
          <p className="text-gray-600 mt-2">
            HelloChicagoアプリケーションの管理・監視を行います
          </p>
        </div>

        {/* タブナビゲーション */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as DashboardTab)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* タブコンテンツ */}
        <div className="bg-white rounded-lg shadow-sm">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// 概要タブのコンポーネント
const OverviewTab: React.FC = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">システム概要</h2>
        <p className="text-gray-600 mt-1">
          アプリケーションの現在の状況と主要指標を表示します
        </p>
      </div>

      {/* 主要指標カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">総ユーザー数</p>
              <p className="text-3xl font-bold">1,234</p>
            </div>
            <div className="text-blue-200 text-3xl">👥</div>
          </div>
          <div className="mt-4">
            <span className="text-blue-200 text-sm">+12% 今月</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">総投稿数</p>
              <p className="text-3xl font-bold">5,678</p>
            </div>
            <div className="text-green-200 text-3xl">📝</div>
          </div>
          <div className="mt-4">
            <span className="text-green-200 text-sm">+8% 今月</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">
                アクティブユーザー
              </p>
              <p className="text-3xl font-bold">892</p>
            </div>
            <div className="text-purple-200 text-3xl">🟢</div>
          </div>
          <div className="mt-4">
            <span className="text-purple-200 text-sm">+15% 今月</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">
                システム稼働率
              </p>
              <p className="text-3xl font-bold">99.9%</p>
            </div>
            <div className="text-orange-200 text-3xl">🖥️</div>
          </div>
          <div className="mt-4">
            <span className="text-orange-200 text-sm">安定稼働中</span>
          </div>
        </div>
      </div>

      {/* 最近のアクティビティ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            最近のアクティビティ
          </h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                新しいユーザーが登録しました
              </span>
              <span className="text-xs text-gray-400 ml-auto">2分前</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                新しい投稿が作成されました
              </span>
              <span className="text-xs text-gray-400 ml-auto">15分前</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                システムメンテナンスが完了しました
              </span>
              <span className="text-xs text-gray-400 ml-auto">1時間前</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">
                パフォーマンス監視が開始されました
              </span>
              <span className="text-xs text-gray-400 ml-auto">2時間前</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            システム状況
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">データベース接続</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                正常
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">API レスポンス</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
                正常
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">ストレージ</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
                注意
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">セキュリティ監査</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-1"></span>
                実行中
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">
          クイックアクション
        </h3>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors">
            セキュリティ監査実行
          </button>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors">
            パフォーマンス監視開始
          </button>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors">
            システムログ確認
          </button>
          <button className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700 transition-colors">
            データベース最適化
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
