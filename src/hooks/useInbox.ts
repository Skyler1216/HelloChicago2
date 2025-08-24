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
  const [readStateCache, setReadStateCache] = useState<Set<string>>(new Set());

  // 既読状態の永続化
  useEffect(() => {
    if (userId) {
      try {
        const cached = localStorage.getItem(`inbox_read_state_${userId}`);
        if (cached) {
          const readItems = new Set<string>(JSON.parse(cached));
          setReadStateCache(readItems);
          console.log(
            '📱 Inbox: Read state restored from cache:',
            readItems.size,
            'items'
          );
        }
      } catch (err) {
        console.warn('📱 Inbox: Failed to restore read state from cache:', err);
      }
    } else {
      // ユーザーが変更された場合は既読状態をクリア
      setReadStateCache(new Set());
    }
  }, [userId]);

  // 既読状態を永続化
  const persistReadState = useCallback(
    (id: string) => {
      if (!userId) return;

      try {
        const newReadState = new Set(readStateCache);
        newReadState.add(id);
        setReadStateCache(newReadState);

        localStorage.setItem(
          `inbox_read_state_${userId}`,
          JSON.stringify(Array.from(newReadState))
        );

        // カスタムイベントを発火して他のフックに変更を通知
        window.dispatchEvent(
          new CustomEvent('inboxReadStateChanged', { detail: { id, userId } })
        );

        console.log('📱 Inbox: Read state persisted for item:', id);
      } catch (err) {
        console.warn('📱 Inbox: Failed to persist read state:', err);
      }
    },
    [userId, readStateCache]
  );

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
        setError(
          notificationsError ||
            messagesError ||
            '読み込みがタイムアウトしました。再試行してください。'
        );
      }
    }, 15000); // 15秒でタイムアウト

    return () => clearTimeout(timeoutId);
  }, [userId, loading, notificationsError, messagesError]);

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
      id: notification.id as string,
      type: 'notification' as const,
      title: notification.title as string,
      message: notification.message as string,
      timestamp: notification.created_at as string,
      isRead:
        (notification.is_read as boolean) ||
        readStateCache.has(notification.id as string),
      actionUrl: (notification.action_url as string) || undefined,
      actionText: (notification.action_text as string) || undefined,
      metadata: notification.metadata as Record<string, unknown>,
    }));
  }, [notifications, readStateCache]);

  // メッセージをInboxItem形式に変換
  const messageItems = useMemo((): InboxItem[] => {
    return messages.map(message => ({
      id: message.id as string,
      type: 'message' as const,
      title: `${(message.profiles as { name?: string })?.name || 'ユーザー'}からのコメント`,
      message: message.content as string,
      timestamp: message.created_at as string,
      isRead:
        !!(
          (message.comment_reads as Array<{ id: string }>) &&
          (message.comment_reads as Array<{ id: string }>).length > 0
        ) || readStateCache.has(message.id as string),
      postId: message.post_id as string,
      postTitle: (message.post_title as string) || '投稿',
      postType: (message.post_type as string) || 'post',
      authorName: (message.profiles as { name?: string })?.name || 'ユーザー',
      authorAvatar:
        (message.profiles as { avatar_url?: string })?.avatar_url || '',
      commentContent: message.content as string,
      hasReplies: false, // TODO: Implement reply detection
    }));
  }, [messages, readStateCache]);

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

  // 統合された未読数（個別フックの未読数を使用）
  const unreadCount = useMemo(() => {
    const totalUnread = notificationsUnreadCount + messagesUnreadCount;

    console.log('📱 Inbox: Unread count calculation', {
      notificationsUnreadCount,
      messagesUnreadCount,
      totalUnread,
      readStateCacheSize: readStateCache.size,
      readStateCache: Array.from(readStateCache),
    });

    return totalUnread;
  }, [notificationsUnreadCount, messagesUnreadCount, readStateCache]);

  // インボックスを更新
  const refreshInbox = useCallback(async () => {
    try {
      console.log('📱 Inbox: Refreshing');
      setError(null);

      await Promise.all([refreshNotifications(), refreshMessages()]);

      console.log('📱 Inbox: Refresh completed');
    } catch (err) {
      console.error('📱 Inbox: Refresh error', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, [refreshNotifications, refreshMessages]);

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
          persistReadState(id); // 通知の場合は永続化
        } else if (messageItem) {
          await markMessageAsRead(id);
          persistReadState(id); // メッセージの場合は永続化
        } else {
          console.warn('📱 Inbox: Item not found:', id);
        }

        // 既読処理後に個別フックを強制リフレッシュして未読数を同期
        console.log(
          '📱 Inbox: Forcing refresh for immediate unread count sync'
        );
        await Promise.all([refreshNotifications(), refreshMessages()]);

        console.log('📱 Inbox: Item marked as read successfully:', id);
      } catch (err) {
        console.error('📱 Inbox: Mark as read error:', err);
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      }
    },
    [
      notificationItems,
      messageItems,
      markNotificationAsRead,
      markMessageAsRead,
      persistReadState,
      refreshNotifications,
      refreshMessages,
    ]
  );

  // 全て既読にする
  const markAllAsRead = useCallback(async () => {
    try {
      console.log('📱 Inbox: Marking all as read for filter:', currentFilter);

      if (currentFilter === 'notification') {
        await markAllNotificationsAsRead();
        // 現在表示されている通知を全て永続化
        notificationItems.forEach(item => {
          if (!item.isRead) {
            persistReadState(item.id);
          }
        });
      } else {
        await markAllMessagesAsRead();
        // 現在表示されているメッセージを全て永続化
        messageItems.forEach(item => {
          if (!item.isRead) {
            persistReadState(item.id);
          }
        });
      }

      // 全既読処理後に個別フックを強制リフレッシュして未読数を同期
      console.log(
        '📱 Inbox: Forcing refresh after mark all as read for immediate unread count sync'
      );
      await Promise.all([refreshNotifications(), refreshMessages()]);

      console.log('📱 Inbox: All items marked as read successfully');
    } catch (err) {
      console.error('📱 Inbox: Mark all as read error:', err);
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  }, [
    currentFilter,
    markAllNotificationsAsRead,
    markAllMessagesAsRead,
    notificationItems,
    messageItems,
    persistReadState,
    refreshNotifications,
    refreshMessages,
  ]);

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
      readStateCacheSize: readStateCache.size,
      readStateCache: Array.from(readStateCache),
    });
  }, [
    userId,
    currentFilter,
    notifications.length,
    messages.length,
    unreadCount,
    loading,
    error,
    readStateCache,
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
