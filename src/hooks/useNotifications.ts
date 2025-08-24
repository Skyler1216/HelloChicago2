import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface UseNotificationsReturn {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  isRefreshing: boolean;
  // キャッシュ関連の機能を追加
  isCached: boolean;
  cacheAge: number;
}

// キャッシュの設定
const CACHE_KEY_PREFIX = 'notifications_cache_';
const CACHE_TTL = 10 * 60 * 1000; // 10分

interface CacheData {
  data: Notification[];
  timestamp: number;
}

export function useNotifications(userId: string): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // キャッシュからデータを取得
  const getCachedData = useCallback((id: string): Notification[] | null => {
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

      console.log('📱 useNotifications: Cache hit', { age: age + 's' });
      return cacheData.data;
    } catch (err) {
      console.warn('📱 useNotifications: Cache read error', err);
      return null;
    }
  }, []);

  // データをキャッシュに保存
  const setCachedData = useCallback((id: string, data: Notification[]) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      console.log('📱 useNotifications: Data cached');
    } catch (err) {
      console.warn('📱 useNotifications: Cache write error', err);
    }
  }, []);

  // キャッシュをクリア
  const clearCache = useCallback((id: string) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      localStorage.removeItem(cacheKey);
      console.log('📱 useNotifications: Cache cleared for user:', id);
    } catch (err) {
      console.warn('📱 useNotifications: Cache clear error', err);
    }
  }, []);

  // 通知を読み込み（キャッシュ優先）
  const loadNotifications = useCallback(
    async (forceRefresh = false) => {
      if (!userId) return;

      try {
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(userId);
          if (cachedData) {
            setNotifications(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 useNotifications: Fetching from database...');

        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .is('deleted_at', null)
          .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        setNotifications(data || []);

        // データをキャッシュに保存
        if (data) {
          setCachedData(userId, data);
        }
      } catch (err) {
        console.error('📱 Notifications: Load error:', err);
        setError(
          err instanceof Error ? err.message : '通知の読み込みに失敗しました'
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
      loadNotifications();
    }
  }, [userId, loadNotifications]);

  // 既読にする
  const markAsRead = useCallback(
    async (id: string) => {
      try {
        const { error: updateError } = await supabase
          .from('notifications')
          .update({
            is_read: true,
            read_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('recipient_id', userId);

        if (updateError) throw updateError;

        // ローカル状態を更新
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

        // キャッシュをクリア（強制リフレッシュは削除）
        clearCache(userId);
        console.log('📱 Notifications: Item marked as read successfully:', id);
      } catch (err) {
        console.error('📱 Notifications: Mark as read error:', err);
        throw err;
      }
    },
    [userId, clearCache]
  );

  // 全て既読にする
  const markAllAsRead = useCallback(async () => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('recipient_id', userId)
        .eq('is_read', false);

      if (updateError) throw updateError;

      // ローカル状態を更新
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: new Date().toISOString(),
        }))
      );

      // キャッシュをクリア（強制リフレッシュは削除）
      clearCache(userId);
      console.log('📱 Notifications: All items marked as read successfully');
    } catch (err) {
      console.error('📱 Notifications: Mark all as read error:', err);
      throw err;
    }
  }, [userId, clearCache]);

  // リフレッシュ
  const refreshNotifications = useCallback(async () => {
    try {
      setIsRefreshing(true);
      await loadNotifications();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadNotifications]);

  // 未読数を計算（永続化された既読状態を考慮）
  const unreadCount = useMemo(() => {
    // 永続化された既読状態を取得
    let persistentReadCount = 0;
    try {
      const cached = localStorage.getItem(`inbox_read_state_${userId}`);
      if (cached) {
        const readItems = new Set<string>(JSON.parse(cached));
        persistentReadCount = notifications.filter(n =>
          readItems.has(n.id)
        ).length;
      }
    } catch (err) {
      console.warn(
        '📱 Notifications: Failed to get persistent read state:',
        err
      );
    }

    // データベースの既読状態と永続化された既読状態を統合
    const actualUnreadCount =
      notifications.filter(n => !n.is_read).length - persistentReadCount;

    console.log('📱 Notifications: Unread count calculation', {
      totalNotifications: notifications.length,
      databaseUnread: notifications.filter(n => !n.is_read).length,
      persistentRead: persistentReadCount,
      actualUnread: Math.max(0, actualUnreadCount),
    });

    return Math.max(0, actualUnreadCount);
  }, [notifications, userId]);

  // 永続化された既読状態の変更を監視
  useEffect(() => {
    const handleStorageChange = () => {
      // 強制的に再計算を促す
      console.log(
        '📱 Notifications: Storage change detected, forcing recalculation'
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
    notifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
    isRefreshing,
    isCached,
    cacheAge,
  };
}

// 通知設定管理フック
interface NotificationSettings {
  push_likes: boolean;
  push_comments: boolean;
  push_mentions: boolean;
  email_likes: boolean;
  email_comments: boolean;
  email_mentions: boolean;
  weekly_digest: boolean;
  important_updates: boolean;
  system_notifications: boolean;
}

interface UseNotificationSettingsReturn {
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<NotificationSettings>) => Promise<boolean>;
}

export function useNotificationSettings(
  userId: string
): UseNotificationSettingsReturn {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 設定の読み込み
  const loadSettings = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // 通知設定テーブルから設定を取得
      const { data, error: fetchError } = await supabase
        .from('notification_settings')
        .select(
          `
          push_likes,
          push_comments,
          push_mentions,
          email_likes,
          email_comments,
          email_mentions,
          weekly_digest,
          important_updates,
          system_notifications
        `
        )
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        // 設定が存在しない場合はデフォルト値で作成
        if (fetchError.code === 'PGRST116') {
          console.log('📱 NotificationSettings: Creating default settings');
          const defaultSettings = {
            user_id: userId,
            push_likes: true,
            push_comments: true,
            push_mentions: true,
            email_likes: false,
            email_comments: true,
            email_mentions: false,
            weekly_digest: false,
            important_updates: true,
            system_notifications: true,
          };

          const { data: createdData, error: createError } = await supabase
            .from('notification_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (createError) throw createError;

          if (createdData) {
            setSettings({
              push_likes: createdData.push_likes,
              push_comments: createdData.push_comments,
              push_mentions: createdData.push_mentions,
              email_likes: createdData.email_likes,
              email_comments: createdData.email_comments,
              email_mentions: createdData.email_mentions,
              weekly_digest: createdData.weekly_digest,
              important_updates: createdData.important_updates,
              system_notifications: createdData.system_notifications,
            });
          }
        } else {
          throw fetchError;
        }
      } else if (data) {
        setSettings({
          push_likes: data.push_likes ?? true,
          push_comments: data.push_comments ?? true,
          push_mentions: data.push_mentions ?? true,
          email_likes: data.email_likes ?? false,
          email_comments: data.email_comments ?? true,
          email_mentions: data.email_mentions ?? false,
          weekly_digest: data.weekly_digest ?? false,
          important_updates: data.important_updates ?? true,
          system_notifications: data.system_notifications ?? true,
        });
      }
    } catch (err) {
      console.error('📱 NotificationSettings: Load error:', err);
      setError(
        err instanceof Error ? err.message : '通知設定の読み込みに失敗しました'
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // 設定の更新
  const updateSettings = useCallback(
    async (newSettings: Partial<NotificationSettings>): Promise<boolean> => {
      if (!userId || !settings) return false;

      try {
        // upsert（存在しない場合は作成、存在する場合は更新）
        const { error: upsertError } = await supabase
          .from('notification_settings')
          .upsert({
            user_id: userId,
            ...newSettings,
            updated_at: new Date().toISOString(),
          });

        if (upsertError) throw upsertError;

        // ローカル状態を更新
        setSettings(prev => (prev ? { ...prev, ...newSettings } : null));
        return true;
      } catch (err) {
        console.error('📱 NotificationSettings: Update error:', err);
        setError(
          err instanceof Error ? err.message : '通知設定の更新に失敗しました'
        );
        return false;
      }
    },
    [userId, settings]
  );

  // 初期読み込み
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    error,
    updateSettings,
  };
}
