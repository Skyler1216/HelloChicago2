import { useState } from 'react';
import { Inbox, Bell, MessageSquare, RefreshCw } from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import { useAuth } from '../../hooks/useAuth';
import { InboxItem, EmptyState } from './';

interface InboxViewProps {
  onNavigateToPost?: (postId: string) => void;
  onBack?: () => void;
}

export default function InboxView({ onNavigateToPost }: InboxViewProps) {
  const { user } = useAuth();
  const {
    inboxItems,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    refreshInbox,
    filterByType,
    currentFilter,
  } = useInbox(user?.id || '');

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshInbox();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleItemAction = (item: {
    type: 'notification' | 'message';
    postId?: string;
    actionUrl?: string;
  }) => {
    if (item.type === 'message' && item.postId) {
      onNavigateToPost?.(item.postId);
    } else if (item.type === 'notification' && item.actionUrl) {
      // Handle notification action (could be navigation or external link)
      window.open(item.actionUrl, '_blank');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const tabs = [
    { id: 'all' as const, label: 'すべて', icon: Inbox },
    { id: 'notification' as const, label: '通知', icon: Bell },
    { id: 'message' as const, label: 'メッセージ', icon: MessageSquare },
  ];

  if (loading && inboxItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">受信トレイを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            エラーが発生しました
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={refreshInbox}
            className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
          >
            再試行
          </button>
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
              <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-coral-400 rounded-lg flex items-center justify-center">
                <Inbox className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">受信トレイ</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-coral-600">
                    {unreadCount}件の未読
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* 全既読ボタン */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-3 py-1 text-sm text-coral-600 hover:text-coral-700 hover:bg-coral-50 rounded-md transition-colors"
                >
                  全既読
                </button>
              )}

              {/* 更新ボタン */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map(tab => {
              const IconComponent = tab.icon;
              const isActive = currentFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => filterByType(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'text-coral-600 bg-coral-50 border-b-2 border-coral-500'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-md mx-auto">
        {inboxItems.length === 0 ? (
          <EmptyState currentFilter={currentFilter} />
        ) : (
          <div className="space-y-1 p-4">
            {inboxItems.map(item => (
              <InboxItem
                key={item.id}
                item={item}
                onAction={() => handleItemAction(item)}
                onMarkAsRead={() => handleMarkAsRead(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
