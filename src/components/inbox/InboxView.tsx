import { useState, useEffect } from 'react';
import { Inbox, Bell, MessageSquare, RefreshCw } from 'lucide-react';
import { useInbox } from '../../hooks/useInbox';
import { useAuth } from '../../hooks/useAuth';
import { InboxItem, EmptyState } from './';
import TabNavigation, { TabItem } from '../common/TabNavigation';

interface InboxViewProps {
  onNavigateToPost?: (postId: string) => void;
  onBack?: () => void;
  onTabChange?: (tab: 'notification' | 'message') => void;
  currentTab?: 'notification' | 'message';
}

export default function InboxView({
  onNavigateToPost,
  onTabChange,
  currentTab,
}: InboxViewProps) {
  const { user } = useAuth();
  const {
    inboxItems,
    unreadCount,
    loading,
    error,
    isRefreshing: inboxRefreshing,
    markAsRead,
    markAllAsRead,
    refreshInbox,
    filterByType,
    currentFilter,
    forceReset,
  } = useInbox(user?.id || '');

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Set initial tab based on currentTab prop
  useEffect(() => {
    if (currentTab && currentTab !== currentFilter) {
      filterByType(currentTab);
    }
  }, [currentTab, currentFilter, filterByType]);

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
    id: string;
  }) => {
    if (item.type === 'message' && item.postId) {
      // Mark message as read when navigating to post
      markAsRead(item.id);
      onNavigateToPost?.(item.postId);
    } else if (item.type === 'notification' && item.actionUrl) {
      // Handle notification action (could be navigation or external link)
      window.open(item.actionUrl, '_blank');
    }
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const tabs: TabItem[] = [
    { id: 'notification', label: '通知', icon: Bell },
    { id: 'message', label: 'メッセージ', icon: MessageSquare },
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
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button
              onClick={refreshInbox}
              className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
            >
              再試行
            </button>
            <button
              onClick={forceReset}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              リセット
            </button>
          </div>
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
                disabled={isRefreshing || inboxRefreshing}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="更新"
              >
                <RefreshCw
                  className={`w-4 h-4 text-gray-600 ${isRefreshing || inboxRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={currentFilter}
        onTabChange={tabId => {
          filterByType(tabId as 'notification' | 'message');
          onTabChange?.(tabId as 'notification' | 'message');
        }}
        className="sticky top-16 z-30"
      />

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
                onAction={item => handleItemAction({ ...item, id: item.id })}
                onMarkAsRead={() => handleMarkAsRead(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
