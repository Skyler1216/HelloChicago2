import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { formatSupabaseError, logError } from '../utils/errorHandler';

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

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setNotifications(data || []);
    } catch (err) {
      logError(err, 'useInbox.loadNotifications');
      setError(formatSupabaseError(err));
    }
  }, [userId]);

  // Load messages (comments on user's posts)
  const loadMessages = useCallback(async () => {
    try {
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

        setMessages(comments || []);
      } else {
        setMessages([]);
      }
    } catch (err) {
      logError(err, 'useInbox.loadMessages');
      setError(formatSupabaseError(err));
    }
  }, [userId]);

  // Transform data to inbox items
  const transformToInboxItems = useCallback(() => {
    const items: InboxItem[] = [];

    // Transform notifications
    notifications.forEach(notification => {
      items.push({
        id: notification.id,
        type: 'notification' as const,
        title: notification.title,
        message: notification.message,
        timestamp: notification.created_at,
        isRead: notification.is_read,
        priority: notification.priority,
        actionUrl: notification.action_url || undefined,
        actionText: notification.action_text || undefined,
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
  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([loadNotifications(), loadMessages()]);
    } catch (err) {
      logError(err, 'useInbox.loadInbox');
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, [loadNotifications, loadMessages]);

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
          await loadMessages();
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
        await loadMessages();
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
    markAsRead,
    markAllAsRead,
    refreshInbox,
    filterByType,
    currentFilter,
  };
}
