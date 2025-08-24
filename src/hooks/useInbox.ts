import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNotifications } from './useNotifications';
import { useMessages } from './useMessages';

interface InboxItem {
  id: string;
  type: 'notification' | 'message';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  actionText?: string;
  // For messages
  postId?: string;
  postTitle?: string;
  postType?: string;
  authorName?: string;
  authorAvatar?: string;
  commentContent?: string;
  hasReplies?: boolean;
  metadata?: Record<string, unknown>;
}

interface UseInboxReturn {
  inboxItems: InboxItem[];
  notifications: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshInbox: () => Promise<void>;
  filterByType: (type: 'notification' | 'message') => void;
  currentFilter: 'notification' | 'message';
  forceReset: () => void; // 強制リセット機能
}

export function useInbox(userId: string): UseInboxReturn {
  const [currentFilter, setCurrentFilter] = useState<
    'notification' | 'message'
  >('notification');
  const [error, setError] = useState<string | null>(null);
  const [forceLoading, setForceLoading] = useState(false);

  // 通知とメッセージを個別に管理
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    unreadCount: notificationsUnreadCount,
    markAsRead: markNotificationAsRead,
    markAllAsRead: markAllNotificationsAsRead,
    refreshNotifications,
    isRefreshing: notificationsRefreshing,
  } = useNotifications(userId);

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    unreadCount: messagesUnreadCount,
    markAsRead: markMessageAsRead,
    markAllAsRead: markAllMessagesAsRead,
    refreshMessages,
    isRefreshing: messagesRefreshing,
  } = useMessages(userId);

  // 統合されたローディング状態（タイムアウト機能付き）
  const loading = useMemo(() => {
    // 強制ローディングが有効な場合はfalse
    if (forceLoading) return false;

    // 通知またはメッセージのローディング中
    return notificationsLoading || messagesLoading;
  }, [notificationsLoading, messagesLoading, forceLoading]);

  const isRefreshing = notificationsRefreshing || messagesRefreshing;

  // タイムアウト機能（無限ローディング防止）
  useEffect(() => {
    if (!userId) return;

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('📱 Inbox: Loading timeout reached, forcing completion');
        setForceLoading(true);
        setError('読み込みがタイムアウトしました。再試行してください。');
      }
    }, 15000); // 15秒でタイムアウト

    return () => clearTimeout(timeoutId);
  }, [userId, loading]);

  // エラーの統合
  useEffect(() => {
    if (notificationsError || messagesError) {
      setError(notificationsError || messagesError);
    } else {
      setError(null);
    }
  }, [notificationsError, messagesError]);

  // 強制リセット機能
  const forceReset = useCallback(() => {
    console.log('📱 Inbox: Force reset triggered');
    setForceLoading(false);
    setError(null);
  }, []);

  // 通知をInboxItem形式に変換
  const notificationItems = useMemo((): InboxItem[] => {
    return notifications.map(notification => ({
      id: notification.id,
      type: 'notification' as const,
      title: notification.title,
      message: notification.message,
      timestamp: notification.created_at,
      isRead: notification.is_read,
      actionUrl: notification.action_url || undefined,
      actionText: notification.action_text || undefined,
      metadata: notification.metadata,
    }));
  }, [notifications]);

  // メッセージをInboxItem形式に変換
  const messageItems = useMemo((): InboxItem[] => {
    return messages.map(message => ({
      id: message.id,
      type: 'message' as const,
      title: `${message.profiles?.name || 'ユーザー'}からのコメント`,
      message: message.content,
      timestamp: message.created_at,
      isRead: !!(message.comment_reads && message.comment_reads.length > 0),
      postId: message.post_id,
      postTitle: message.post_title || '投稿',
      postType: message.post_type || 'post',
      authorName: message.profiles?.name || 'ユーザー',
      authorAvatar: message.profiles?.avatar_url || '',
      commentContent: message.content,
      hasReplies: false, // TODO: Implement reply detection
    }));
  }, [messages]);

  // フィルタリングされたアイテム
  const inboxItems = useMemo(() => {
    const items =
      currentFilter === 'notification' ? notificationItems : messageItems;
    // タイムスタンプでソート（新しい順）
    return items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [currentFilter, notificationItems, messageItems]);

  // 統合された未読数
  const unreadCount = notificationsUnreadCount + messagesUnreadCount;

  // アイテムを既読にする
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        console.log('📱 Inbox: Marking item as read:', id);

        // アイテムのタイプを判定
        const notificationItem = notificationItems.find(item => item.id === id);
        const messageItem = messageItems.find(item => item.id === id);

        if (notificationItem) {
          await markNotificationAsRead(id);
        } else if (messageItem) {
          await markMessageAsRead(id);
        } else {
          console.warn('📱 Inbox: Item not found:', id);
        }
      } catch (err) {
        console.error('📱 Inbox: Mark as read error:', err);
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      }
    },
    [notificationItems, messageItems, markNotificationAsRead, markMessageAsRead]
  );

  // 全て既読にする
  const markAllAsRead = useCallback(async () => {
    try {
      console.log('📱 Inbox: Marking all as read for filter:', currentFilter);

      if (currentFilter === 'notification') {
        await markAllNotificationsAsRead();
      } else {
        await markAllMessagesAsRead();
      }
    } catch (err) {
      console.error('📱 Inbox: Mark all as read error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, [currentFilter, markAllNotificationsAsRead, markAllMessagesAsRead]);

  // インボックスを更新
  const refreshInbox = useCallback(async () => {
    try {
      console.log('📱 Inbox: Refreshing');
      setError(null);

      await Promise.all([refreshNotifications(), refreshMessages()]);

      console.log('📱 Inbox: Refresh completed');
    } catch (err) {
      console.error('📱 Inbox: Refresh error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, [refreshNotifications, refreshMessages]);

  // フィルタータイプを変更
  const filterByType = useCallback((type: 'notification' | 'message') => {
    console.log('📱 Inbox: Filtering by type:', type);
    setCurrentFilter(type);
  }, []);

  // デバッグ情報をログ出力
  useEffect(() => {
    console.log('📱 Inbox: State update', {
      userId,
      currentFilter,
      notificationsCount: notifications.length,
      messagesCount: messages.length,
      totalUnread: unreadCount,
      loading,
      error,
    });
  }, [
    userId,
    currentFilter,
    notifications.length,
    messages.length,
    unreadCount,
    loading,
    error,
  ]);

  return {
    inboxItems,
    notifications,
    messages,
    unreadCount,
    loading,
    error,
    isRefreshing,
    markAsRead,
    markAllAsRead,
    refreshInbox,
    filterByType,
    currentFilter,
    forceReset,
  };
}
