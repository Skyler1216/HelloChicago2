import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Message = Database['public']['Tables']['comments']['Row'] & {
  profiles?: {
    name: string;
    avatar_url?: string;
  };
  post_title?: string;
  post_type?: string;
  comment_reads?: Array<{ id: string; read_at: string }>;
};

interface UseMessagesReturn {
  messages: Message[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  isRefreshing: boolean;
  // キャッシュ関連の機能を追加
  isCached: boolean;
  cacheAge: number;
}

// キャッシュの設定
const CACHE_KEY_PREFIX = 'messages_cache_';
const CACHE_TTL = 10 * 60 * 1000; // 10分

interface CacheData {
  data: Message[];
  timestamp: number;
}

export function useMessages(userId: string): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // キャッシュからデータを取得
  const getCachedData = useCallback((id: string): Message[] | null => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();

      // キャッシュが有効期限切れかチェック
      if (now - cacheData.timestamp > CACHE_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      const age = Math.floor((now - cacheData.timestamp) / 1000);
      setCacheAge(age);
      setIsCached(true);

      console.log('📱 useMessages: Cache hit', { age: age + 's' });
      return cacheData.data;
    } catch (err) {
      console.warn('📱 useMessages: Cache read error', err);
      return null;
    }
  }, []);

  // データをキャッシュに保存
  const setCachedData = useCallback((id: string, data: Message[]) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('📱 useMessages: Data cached');
    } catch (err) {
      console.warn('📱 useMessages: Cache write error', err);
    }
  }, []);

  // メッセージを読み込み（キャッシュ優先）
  const loadMessages = useCallback(
    async (forceRefresh = false) => {
      if (!userId) return;

      try {
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(userId);
          if (cachedData) {
            setMessages(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 useMessages: Fetching from database...');

        const { data, error: fetchError } = await supabase
          .from('comments')
          .select(
            `
          *,
          profiles:profiles(name, avatar_url),
          posts:posts(title, type)
        `
          )
          .eq('author_id', userId)
          .eq('approved', true)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        // データを整形
        const formattedMessages: Message[] = (data || []).map(message => ({
          ...message,
          post_title: message.posts?.title,
          post_type: message.posts?.type,
        }));

        setMessages(formattedMessages);

        // データをキャッシュに保存
        if (formattedMessages.length > 0) {
          setCachedData(userId, formattedMessages);
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
    },
    [userId, getCachedData, setCachedData]
  );

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
              { id, read_at: new Date().toISOString() },
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
              { id: message.id, read_at: new Date().toISOString() },
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
      await loadMessages(true); // forceRefreshをtrueに設定
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
    isCached,
    cacheAge,
  };
}
