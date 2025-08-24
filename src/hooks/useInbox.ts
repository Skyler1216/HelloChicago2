import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { formatSupabaseError, logError } from '../utils/errorHandler';
import { useCache } from './useCache';
import { useAppLifecycle } from './useAppLifecycle';

type Notification = Database['public']['Tables']['notifications']['Row'];
type Comment = Database['public']['Tables']['comments']['Row'];

// Comment with profile and read status
type CommentWithProfileAndReadStatus = Comment & {
  profiles: {
    name: string;
    avatar_url: string | null;
  };
  comment_reads:
    | {
        read_at: string;
      }[]
    | null;
};

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
}

interface UseInboxReturn {
  inboxItems: InboxItem[];
  notifications: Notification[];
  messages: Comment[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshInbox: () => Promise<void>;
  filterByType: (type: 'notification' | 'message') => void;
  currentFilter: 'notification' | 'message';
}

export function useInbox(userId: string): UseInboxReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Comment[]>([]);
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentFilter, setCurrentFilter] = useState<
    'notification' | 'message'
  >('notification');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // キャッシュの設定
  const notificationsCache = useCache<Notification[]>('notifications', {
    ttl: 2 * 60 * 1000, // 2分
    priority: 9, // 通知は最高優先度
    staleWhileRevalidate: true,
  });

  const messagesCache = useCache<Comment[]>('messages', {
    ttl: 3 * 60 * 1000, // 3分
    priority: 8, // メッセージは高優先度
    staleWhileRevalidate: true,
  });

  // アプリライフサイクルの管理
  const { canFetchData, shouldRefreshData } = useAppLifecycle({
    onAppVisible: () => {
      if (shouldRefreshData()) {
        console.log('📱 App visible: refreshing inbox data');
        loadInbox(true); // 強制リフレッシュ
      }
    },
    refreshThreshold: 1 * 60 * 1000, // 1分以上非アクティブだったら再読み込み
  });

  // Load notifications with cache
  const loadNotifications = useCallback(
    async (forceRefresh = false) => {
      try {
        const cacheKey = `notifications_${userId}`;

        // キャッシュをチェック
        if (!forceRefresh) {
          const cachedNotifications = notificationsCache.get(cacheKey);
          if (cachedNotifications) {
            setNotifications(cachedNotifications);

            // 古いデータの場合はバックグラウンドで更新
            if (notificationsCache.isStale(cacheKey)) {
              setIsRefreshing(true);
              // バックグラウンド更新は続行
            } else {
              return; // 有効なキャッシュがあるので終了
            }
          }
        }

        // ネットワークが利用できない場合はオフラインデータを使用
        if (!canFetchData) {
          const offlineData = notificationsCache.getOfflineData(cacheKey);
          if (offlineData) {
            setNotifications(offlineData);
            return;
          }
        }

        // Fetch notifications that are not expired and still valid
        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .is('deleted_at', null)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        const notifications = data || [];

        // キャッシュに保存
        notificationsCache.set(cacheKey, notifications);
        setNotifications(notifications);
      } catch (err) {
        logError(err, 'useInbox.loadNotifications');
        setError(formatSupabaseError(err));

        // エラー時はキャッシュからフォールバック
        const fallbackData = notificationsCache.getOfflineData(
          `notifications_${userId}`
        );
        if (fallbackData) {
          setNotifications(fallbackData);
          console.log('📱 Using cached notifications as fallback');
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [userId, notificationsCache, canFetchData]
  );

  // Load messages (comments on user's posts) with cache
  const loadMessages = useCallback(
    async (forceRefresh = false) => {
      try {
        const cacheKey = `messages_${userId}`;

        // キャッシュをチェック
        if (!forceRefresh) {
          const cachedMessages = messagesCache.get(cacheKey);
          if (cachedMessages) {
            setMessages(cachedMessages);

            // 古いデータの場合はバックグラウンドで更新
            if (messagesCache.isStale(cacheKey)) {
              setIsRefreshing(true);
              // バックグラウンド更新は続行
            } else {
              return; // 有効なキャッシュがあるので終了
            }
          }
        }

        // ネットワークが利用できない場合はオフラインデータを使用
        if (!canFetchData) {
          const offlineData = messagesCache.getOfflineData(cacheKey);
          if (offlineData) {
            setMessages(offlineData);
            return;
          }
        }

        // Get user's posts first
        const { data: userPosts, error: postsError } = await supabase
          .from('posts')
          .select('id, title, type')
          .eq('author_id', userId);

        if (postsError) throw postsError;

        if (userPosts && userPosts.length > 0) {
          const postIds = userPosts.map(post => post.id);

          // Get comments on user's posts with read status
          const { data: comments, error: commentsError } = await supabase
            .from('comments')
            .select(
              `
            *,
            profiles!comments_author_id_fkey(name, avatar_url),
            comment_reads!left(read_at)
          `
            )
            .in('post_id', postIds)
            .eq('is_approved', true)
            .order('created_at', { ascending: false });

          if (commentsError) throw commentsError;

          const messages = comments || [];

          // キャッシュに保存
          messagesCache.set(cacheKey, messages);
          setMessages(messages);
        } else {
          setMessages([]);
          // 空の配列もキャッシュしておく
          messagesCache.set(cacheKey, []);
        }
      } catch (err) {
        logError(err, 'useInbox.loadMessages');
        setError(formatSupabaseError(err));

        // エラー時はキャッシュからフォールバック
        const fallbackData = messagesCache.getOfflineData(`messages_${userId}`);
        if (fallbackData) {
          setMessages(fallbackData);
          console.log('📱 Using cached messages as fallback');
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [userId, messagesCache, canFetchData]
  );

  // Transform data to inbox items
  const transformToInboxItems = useCallback(() => {
    const items: InboxItem[] = [];

    // Transform notifications
    notifications.forEach(notification => {
      // Skip expired notifications on client as double-safety
      if (
        notification.expires_at &&
        new Date(notification.expires_at).getTime() < Date.now()
      ) {
        return;
      }
      // Skip deleted notifications
      if ((notification as { deleted_at?: string | null }).deleted_at) {
        return;
      }
      items.push({
        id: notification.id,
        type: 'notification' as const,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        isRead: notification.is_read,
        actionUrl: notification.action_url || undefined,
        actionText: notification.action_text || undefined,
        metadata: notification.metadata,
      });
    });

    // Transform messages with read status
    (messages as CommentWithProfileAndReadStatus[]).forEach(comment => {
      const isRead = comment.comment_reads && comment.comment_reads.length > 0;

      items.push({
        id: comment.id,
        type: 'message' as const,
        title: `${comment.profiles?.name || 'ユーザー'}からのコメント`,
        message: comment.content,
        timestamp: comment.created_at,
        isRead: isRead || false,
        postId: comment.post_id,
        postTitle: '投稿', // TODO: 投稿タイトルを取得
        postType: 'post', // TODO: 投稿タイトルを取得
        authorName: comment.profiles?.name || 'ユーザー',
        authorAvatar: comment.profiles?.avatar_url || '',
        commentContent: comment.content,
        hasReplies: false, // TODO: Implement reply detection
      });
    });

    // Sort by timestamp (newest first)
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setInboxItems(items);
  }, [notifications, messages]);

  // Load all data
  const loadInbox = useCallback(
    async (forceRefresh = false) => {
      // 初期読み込み時のみローディング表示
      const shouldShowLoading = !notifications.length && !messages.length;
      if (shouldShowLoading) {
        setLoading(true);
      }
      setError(null);

      // タイムアウト処理
      const timeoutId = setTimeout(() => {
        if (shouldShowLoading) {
          console.log('📱 Inbox: Load timeout, completing with cached data');
          setLoading(false);
        }
      }, 10000); // 10秒でタイムアウト

      try {
        await Promise.all([
          loadNotifications(forceRefresh),
          loadMessages(forceRefresh),
        ]);
      } catch (err) {
        logError(err, 'useInbox.loadInbox');
        setError(formatSupabaseError(err));
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [loadNotifications, loadMessages, notifications.length, messages.length]
  );

  // Mark item as read (handles both notifications and comments)
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        // Find the item to determine its type
        const item = inboxItems.find(item => item.id === id);
        if (!item) return;

        if (item.type === 'notification') {
          // Mark notification as read
          const { error: updateError } = await supabase
            .from('notifications')
            .update({
              is_read: true,
              read_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('recipient_id', userId);

          if (updateError) throw updateError;

          // Update local state
          setNotifications(prev =>
            prev.map(notification =>
              notification.id === id
                ? {
                    ...notification,
                    is_read: true,
                    read_at: new Date().toISOString(),
                  }
                : notification
            )
          );
        } else if (item.type === 'message') {
          // Mark comment as read using the function
          const { error: functionError } = await supabase.rpc(
            'mark_comment_as_read',
            {
              p_comment_id: id,
              p_post_author_id: userId,
            }
          );

          if (functionError) throw functionError;

          // Update local state by refreshing messages
          await loadMessages(true); // 強制リフレッシュ
        }
      } catch (err) {
        logError(err, 'useInbox.markAsRead');
        setError(formatSupabaseError(err));
      }
    },
    [userId, inboxItems, loadMessages]
  );

  // Mark all items as read (handles both notifications and comments)
  const markAllAsRead = useCallback(async () => {
    try {
      // Mark all notifications as read
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (updateError) throw updateError;

      // Update local state for notifications
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );

      // Mark all unread comments as read
      const unreadComments = (
        messages as CommentWithProfileAndReadStatus[]
      ).filter(comment => {
        const isRead =
          comment.comment_reads && comment.comment_reads.length > 0;
        return !(isRead || false);
      });

      if (unreadComments.length > 0) {
        // Use batch processing for multiple comments
        const promises = unreadComments.map(comment =>
          supabase.rpc('mark_comment_as_read', {
            p_comment_id: comment.id,
            p_post_author_id: userId,
          })
        );

        await Promise.all(promises);

        // Refresh messages to update read status
        await loadMessages(true); // 強制リフレッシュ
      }
    } catch (err) {
      logError(err, 'useInbox.markAllAsRead');
      setError(formatSupabaseError(err));
    }
  }, [userId, messages, loadMessages]);

  // Refresh inbox
  const refreshInbox = useCallback(async () => {
    await loadInbox();
  }, [loadInbox]);

  // Filter inbox items
  const filterByType = useCallback((type: 'notification' | 'message') => {
    setCurrentFilter(type);
  }, []);

  // Load data on mount and when userId changes
  useEffect(() => {
    if (userId) {
      loadInbox();
    }
  }, [userId, loadInbox]);

  // Transform data when notifications or messages change
  useEffect(() => {
    transformToInboxItems();
  }, [transformToInboxItems]);

  // Calculate unread count (notifications + comments)
  const unreadCount =
    notifications.filter(n => !n.is_read).length +
    (messages as CommentWithProfileAndReadStatus[]).filter(comment => {
      const isRead = comment.comment_reads && comment.comment_reads.length > 0;
      return !(isRead || false);
    }).length;

  return {
    inboxItems: inboxItems.filter(item => item.type === currentFilter),
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
  };
}
