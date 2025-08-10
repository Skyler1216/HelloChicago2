import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert =
  Database['public']['Tables']['notifications']['Insert'];

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
}

export function useNotifications(
  userId: string | undefined
): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadNotifications = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('notifications')
          .select(
            `
          *,
          sender:profiles(id, name, avatar_url),
          related_post:posts(id, title)
        `
          )
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (fetchError) throw fetchError;

        setNotifications(data || []);
      } catch (err) {
        console.error('❌ Error loading notifications:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load notifications'
        );
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();

    // リアルタイム更新の設定
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const markAsRead = async (notificationId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('recipient_id', userId);

      if (updateError) throw updateError;

      // ローカル状態を更新
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                read_at: new Date().toISOString(),
              }
            : notification
        )
      );

      return true;
    } catch (err) {
      console.error('❌ Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark as read');
      return false;
    }
  };

  const markAllAsRead = async (): Promise<boolean> => {
    if (!userId) return false;

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
      const now = new Date().toISOString();
      setNotifications(prev =>
        prev.map(notification => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || now,
        }))
      );

      return true;
    } catch (err) {
      console.error('❌ Error marking all notifications as read:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to mark all as read'
      );
      return false;
    }
  };

  const deleteNotification = async (
    notificationId: string
  ): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('recipient_id', userId);

      if (deleteError) throw deleteError;

      // ローカル状態から削除
      setNotifications(prev =>
        prev.filter(notification => notification.id !== notificationId)
      );

      return true;
    } catch (err) {
      console.error('❌ Error deleting notification:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to delete notification'
      );
      return false;
    }
  };

  const refreshNotifications = async (): Promise<void> => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select(
          `
          *,
          sender:profiles(id, name, avatar_url),
          related_post:posts(id, title)
        `
        )
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (err) {
      console.error('❌ Error loading notifications:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load notifications'
      );
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refreshNotifications,
  };
}

// 通知設定管理用のフック
export function useNotificationSettings(userId: string | undefined) {
  const [settings, setSettings] = useState<
    Database['public']['Tables']['notification_settings']['Row'] | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setSettings(data);
      } catch (err) {
        console.error('❌ Error loading notification settings:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load settings'
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  const updateSettings = async (
    updates: Partial<
      Database['public']['Tables']['notification_settings']['Update']
    >
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      setError(null);

      // 設定が存在しない場合は作成
      if (!settings) {
        const { data, error: insertError } = await supabase
          .from('notification_settings')
          .insert({
            user_id: userId,
            ...updates,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        setSettings(data);
      } else {
        // 既存設定を更新
        const { data, error: updateError } = await supabase
          .from('notification_settings')
          .update(updates)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) throw updateError;
        setSettings(data);
      }

      return true;
    } catch (err) {
      console.error('❌ Error updating notification settings:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to update settings'
      );
      return false;
    }
  };

  const refreshSettings = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setSettings(data);
    } catch (err) {
      console.error('❌ Error loading notification settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refreshSettings,
  };
}

// 通知作成用のヘルパー関数
export const createNotification = async (
  notification: NotificationInsert
): Promise<boolean> => {
  try {
    const { error } = await supabase.from('notifications').insert(notification);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('❌ Error creating notification:', err);
    return false;
  }
};

// 通知タイプに応じたアイコンとカラーを取得
export const getNotificationStyle = (type: Notification['type']) => {
  switch (type) {
    case 'like':
      return {
        icon: '❤️',
        color: 'text-red-500',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
      };
    case 'comment':
      return {
        icon: '💬',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
      };

    case 'mention':
      return {
        icon: '📢',
        color: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
      };
    case 'system':
      return {
        icon: '🔔',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
      };
    case 'weekly_digest':
      return {
        icon: '📊',
        color: 'text-teal-500',
        bgColor: 'bg-teal-50',
        borderColor: 'border-teal-200',
      };
    default:
      return {
        icon: '🔔',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
      };
  }
};
