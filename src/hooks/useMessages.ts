import { useState, useEffect, useCallback, useMemo } from 'react';
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
const isMobileDevice =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const CACHE_TTL = isMobileDevice ? 2 * 60 * 60 * 1000 : 60 * 60 * 1000; // モバイルでは2時間、デスクトップでは60分

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

  // キャッシュをクリア
  const clearCache = useCallback((id: string) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      localStorage.removeItem(cacheKey);
      console.log('📱 useMessages: Cache cleared for user:', id);
    } catch (err) {
      console.warn('📱 useMessages: Cache clear error', err);
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

        // モバイル環境でのタイムアウト付きクエリ
        const isMobileDevice =
          /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
            navigator.userAgent
          );
        const controller = new AbortController();
        const timeoutDuration = isMobileDevice ? 12000 : 8000;

        const timeoutId = setTimeout(() => {
          console.warn('📱 useMessages: Query timeout, aborting...');
          controller.abort();
        }, timeoutDuration);

        try {
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
            .order('created_at', { ascending: false })
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);

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
          clearTimeout(timeoutId);

          if (err instanceof Error && err.name === 'AbortError') {
            console.warn('📱 useMessages: Request aborted due to timeout');
            // タイムアウト時はキャッシュデータを使用
            const cachedData = getCachedData(userId);
            if (cachedData) {
              setMessages(cachedData);
              setLoading(false);
              return;
            }
          }
          throw err;
        }
      } catch (err) {
        console.error('📱 Messages: Load error:', err);
        setError(
          err instanceof Error && err.name === 'AbortError'
            ? 'ネットワーク接続が不安定です。画面を下に引っ張って更新してください。'
            : err instanceof Error
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

        // ローカル状態を更新（特定のメッセージのみ）
        setMessages(prev =>
          prev.map(message =>
            message.id === id
              ? {
                  ...message,
                  comment_reads: [{ id, read_at: new Date().toISOString() }],
                }
              : message
          )
        );

        // キャッシュをクリア（強制リフレッシュは削除）
        clearCache(userId);
        console.log('📱 Messages: Item marked as read successfully:', id);
      } catch (err) {
        console.error('📱 Messages: Mark as read error:', err);
        throw err;
      }
    },
    [userId, clearCache]
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

        // ローカル状態を更新（未読だったメッセージのみ）
        setMessages(prev =>
          prev.map(message => {
            const wasUnread = !(
              message.comment_reads && message.comment_reads.length > 0
            );
            return wasUnread
              ? {
                  ...message,
                  comment_reads: [
                    { id: message.id, read_at: new Date().toISOString() },
                  ],
                }
              : message;
          })
        );

        // キャッシュをクリア（強制リフレッシュは削除）
        clearCache(userId);
        console.log('📱 Messages: All items marked as read successfully');
      }
    } catch (err) {
      console.error('📱 Messages: Mark all as read error:', err);
      throw err;
    }
  }, [userId, messages, clearCache]);

  // リフレッシュ
  const refreshMessages = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadMessages(true); // forceRefreshをtrueに設定
    } finally {
      setIsRefreshing(false);
    }
  }, [loadMessages]);

  // 未読数を計算（永続化された既読状態を考慮）
  const unreadCount = useMemo(() => {
    // 永続化された既読状態を取得
    let persistentReadCount = 0;
    try {
      const cached = localStorage.getItem(`inbox_read_state_${userId}`);
      if (cached) {
        const readItems = new Set<string>(JSON.parse(cached));
        persistentReadCount = messages.filter(m => readItems.has(m.id)).length;
      }
    } catch (err) {
      console.warn('📱 Messages: Failed to get persistent read state:', err);
    }

    // データベースの既読状態と永続化された既読状態を統合
    const databaseUnread = messages.filter(message => {
      const isRead = message.comment_reads && message.comment_reads.length > 0;
      return !isRead;
    }).length;

    const actualUnreadCount = databaseUnread - persistentReadCount;

    console.log('📱 Messages: Unread count calculation', {
      totalMessages: messages.length,
      databaseUnread,
      persistentRead: persistentReadCount,
      actualUnread: Math.max(0, actualUnreadCount),
    });

    return Math.max(0, actualUnreadCount);
  }, [messages, userId]);

  // 永続化された既読状態の変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      // 強制的に再計算を促す
      console.log(
        '📱 Messages: Storage change detected, forcing recalculation'
      );
    };

    window.addEventListener('storage', handleStorageChange);

    // カスタムイベントも監視（同じタブ内での変更）
    window.addEventListener('inboxReadStateChanged', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('inboxReadStateChanged', handleStorageChange);
    };
  }, []);

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
