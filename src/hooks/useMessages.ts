import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

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
  post_title?: string;
  post_type?: string;
};

interface UseMessagesReturn {
  messages: CommentWithProfileAndReadStatus[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  isRefreshing: boolean;
}

export function useMessages(userId: string): UseMessagesReturn {
  const [messages, setMessages] = useState<CommentWithProfileAndReadStatus[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // メッセージを読み込み
  const loadMessages = useCallback(async () => {
    try {
      setError(null);

      // ユーザーの投稿を取得
      const { data: userPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, title, type')
        .eq('author_id', userId);

      if (postsError) throw postsError;

      if (userPosts && userPosts.length > 0) {
        const postIds = userPosts.map(post => post.id);

        // ユーザーの投稿へのコメントを取得
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

        // 投稿タイトルとタイプを追加
        const messagesWithPostInfo = (comments || []).map(comment => {
          const post = userPosts.find(p => p.id === comment.post_id);
          return {
            ...comment,
            post_title: post?.title || '投稿',
            post_type: post?.type || 'post',
          };
        });

        setMessages(messagesWithPostInfo);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('📱 Messages: Load error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'メッセージの読み込みに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 初期読み込み
  useEffect(() => {
    if (userId) {
      loadMessages();
    }
  }, [userId, loadMessages]);

  // 既読にする
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const { error: functionError } = await supabase.rpc(
          'mark_comment_as_read',
          {
            p_comment_id: id,
            p_post_author_id: userId,
          }
        );

        if (functionError) throw functionError;

        // ローカル状態を更新
        setMessages(prev =>
          prev.map(message => ({
            ...message,
            comment_reads: message.comment_reads || [
              { read_at: new Date().toISOString() },
            ],
          }))
        );
      } catch (err) {
        console.error('📱 Messages: Mark as read error:', err);
        throw err;
      }
    },
    [userId]
  );

  // 全て既読にする
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadMessages = messages.filter(message => {
        const isRead =
          message.comment_reads && message.comment_reads.length > 0;
        return !isRead;
      });

      if (unreadMessages.length > 0) {
        // バッチ処理で複数のコメントを既読にする
        const promises = unreadMessages.map(message =>
          supabase.rpc('mark_comment_as_read', {
            p_comment_id: message.id,
            p_post_author_id: userId,
          })
        );

        await Promise.all(promises);

        // ローカル状態を更新
        setMessages(prev =>
          prev.map(message => ({
            ...message,
            comment_reads: message.comment_reads || [
              { read_at: new Date().toISOString() },
            ],
          }))
        );
      }
    } catch (err) {
      console.error('📱 Messages: Mark all as read error:', err);
      throw err;
    }
  }, [userId, messages]);

  // リフレッシュ
  const refreshMessages = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadMessages();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMessages]);

  // 未読数を計算
  const unreadCount = messages.filter(message => {
    const isRead = message.comment_reads && message.comment_reads.length > 0;
    return !isRead;
  }).length;

  return {
    messages,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshMessages,
    isRefreshing,
  };
}
