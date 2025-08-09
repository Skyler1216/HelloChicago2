import { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CheckCheck,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';
import { Database } from '../../types/database';

type NotificationType =
  Database['public']['Tables']['notifications']['Row']['type'];

interface NotificationCenterProps {
  userId: string;
  onBack: () => void;
  onNavigateToPost?: (postId: string) => void;
}

export default function NotificationCenter({
  userId,
  onBack,
  onNavigateToPost,
}: NotificationCenterProps) {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  } = useNotifications(userId);

  const [filter, setFilter] = useState<NotificationType | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredNotifications = notifications.filter(
    notification => filter === 'all' || notification.type === filter
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshNotifications();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const filterOptions = [
    { value: 'all' as const, label: 'すべて', icon: Bell },
    { value: 'like' as const, label: 'いいね', icon: '❤️' },
    { value: 'comment' as const, label: 'コメント', icon: '💬' },
    { value: 'follow' as const, label: 'フォロー', icon: '👥' },
    { value: 'system' as const, label: 'システム', icon: '🔔' },
  ];

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">通知を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">通知</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-coral-600">
                    {unreadCount}件の未読
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 更新ボタン */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="更新"
              >
                <RefreshCw
                  className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>

              {/* 全て既読にするボタン */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  title="すべて既読にする"
                >
                  <CheckCheck className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center space-x-1 overflow-x-auto">
            <Filter className="w-4 h-4 text-gray-500 flex-shrink-0 mr-2" />
            {filterOptions.map(option => (
              <button
                key={option.value}
                onClick={() => setFilter(option.value)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-full text-sm font-medium transition-colors flex-shrink-0 ${
                  filter === option.value
                    ? 'bg-coral-100 text-coral-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {typeof option.icon === 'string' ? (
                  <span>{option.icon}</span>
                ) : (
                  <option.icon className="w-4 h-4" />
                )}
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-w-md mx-auto">
        {error && (
          <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {filteredNotifications.length === 0 ? (
          <div className="text-center py-12">
            {filter === 'all' ? (
              <div>
                <BellOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  通知はありません
                </h3>
                <p className="text-gray-600">
                  いいねやコメントがあると、ここに表示されます
                </p>
              </div>
            ) : (
              <div>
                <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {filterOptions.find(opt => opt.value === filter)?.label}
                  の通知はありません
                </h3>
                <p className="text-gray-600">
                  フィルターを変更して他の通知を確認してください
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map(notification => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onDelete={deleteNotification}
                onNavigate={onNavigateToPost}
              />
            ))}
          </div>
        )}

        {/* Load More Button (Future Enhancement) */}
        {filteredNotifications.length >= 50 && (
          <div className="p-4 text-center">
            <button className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              さらに読み込む
            </button>
          </div>
        )}
      </div>

      {/* Footer Space */}
      <div className="h-20"></div>
    </div>
  );
}
