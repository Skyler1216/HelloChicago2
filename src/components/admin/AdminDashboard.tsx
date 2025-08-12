import React, { useState } from 'react';
import {
  Users,
  FileText,
  Activity,
  Shield,
  Zap,
  BarChart3,
  Clock,
  Database,
  Eye,
} from 'lucide-react';
import { SecurityAuditDashboard } from '../security/SecurityAuditDashboard';
import { PerformanceDashboard } from '../performance/PerformanceDashboard';

type DashboardTab = 'overview' | 'security' | 'performance';

interface AdminDashboardProps {
  className?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const tabs = [
    {
      id: 'overview',
      name: '概要',
      icon: BarChart3,
    },
    {
      id: 'security',
      name: 'セキュリティ',
      icon: Shield,
    },
    {
      id: 'performance',
      name: 'パフォーマンス',
      icon: Zap,
    },
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
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-coral-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                管理者ダッシュボード
              </h1>
              <p className="text-gray-600 mt-1">システムの監視と管理</p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>システム稼働中</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span>最終更新: {new Date().toLocaleTimeString('ja-JP')}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <nav className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-coral-500 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC = () => {
  const metrics = [
    {
      label: '総ユーザー数',
      value: '1,234',
      change: '+12%',
      changeType: 'positive',
      icon: Users,
    },
    {
      label: 'アクティブ投稿',
      value: '567',
      change: '+8%',
      changeType: 'positive',
      icon: FileText,
    },
    {
      label: 'システム稼働率',
      value: '99.9%',
      change: '安定',
      changeType: 'neutral',
      icon: Activity,
    },
    {
      label: '平均レスポンス',
      value: '120ms',
      change: '-15%',
      changeType: 'positive',
      icon: Zap,
    },
  ];

  const activities = [
    {
      text: '新しいユーザーが登録しました',
      time: '2分前',
      status: 'success',
    },
    {
      text: '新しい投稿が作成されました',
      time: '15分前',
      status: 'info',
    },
    {
      text: 'システムメンテナンスが完了しました',
      time: '1時間前',
      status: 'warning',
    },
    {
      text: 'パフォーマンス監視が開始されました',
      time: '2時間前',
      status: 'info',
    },
  ];

  const systemStatus = [
    { name: 'データベース接続', status: 'normal' },
    { name: 'API レスポンス', status: 'normal' },
    { name: 'ストレージ', status: 'warning' },
    { name: 'セキュリティ監査', status: 'running' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal':
        return '正常';
      case 'warning':
        return '注意';
      case 'error':
        return 'エラー';
      case 'running':
        return '実行中';
      default:
        return '不明';
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      case 'neutral':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="p-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;

          return (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-sm transition-shadow duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-coral-500 rounded-lg flex items-center justify-center">
                  <IconComponent className="w-5 h-5 text-white" />
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${getChangeColor(metric.changeType)}`}
                >
                  {metric.change}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recent Activities */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            最近のアクティビティ
          </h3>

          <div className="space-y-3">
            {activities.map((activity, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 p-2 rounded hover:bg-white transition-colors duration-200"
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    activity.status === 'success'
                      ? 'bg-green-500'
                      : activity.status === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                  }`}
                ></div>
                <span className="text-sm text-gray-700 flex-1">
                  {activity.text}
                </span>
                <span className="text-xs text-gray-400">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Status */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            システム状況
          </h3>

          <div className="space-y-3">
            {systemStatus.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded hover:bg-white transition-colors duration-200"
              >
                <span className="text-sm text-gray-700">{item.name}</span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusColor(item.status)}`}
                >
                  {getStatusText(item.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-coral-50 rounded-lg p-4 border border-coral-200">
        <h3 className="text-lg font-semibold text-coral-900 mb-4">
          クイックアクション
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button className="flex flex-col items-center p-3 bg-white rounded-lg border border-coral-200 hover:bg-coral-50 transition-colors duration-200">
            <Shield className="w-6 h-6 text-coral-600 mb-2" />
            <span className="text-xs font-medium text-coral-800">
              セキュリティ監査
            </span>
          </button>

          <button className="flex flex-col items-center p-3 bg-white rounded-lg border border-coral-200 hover:bg-coral-50 transition-colors duration-200">
            <Activity className="w-6 h-6 text-coral-600 mb-2" />
            <span className="text-xs font-medium text-coral-800">
              パフォーマンス監視
            </span>
          </button>

          <button className="flex flex-col items-center p-3 bg-white rounded-lg border border-coral-200 hover:bg-coral-50 transition-colors duration-200">
            <Eye className="w-6 h-6 text-coral-600 mb-2" />
            <span className="text-xs font-medium text-coral-800">
              システムログ
            </span>
          </button>

          <button className="flex flex-col items-center p-3 bg-white rounded-lg border border-coral-200 hover:bg-coral-50 transition-colors duration-200">
            <Database className="w-6 h-6 text-coral-600 mb-2" />
            <span className="text-xs font-medium text-coral-800">DB最適化</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
