import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { formatSupabaseError, logError } from '../utils/errorHandler';

type SystemNotification =
  Database['public']['Tables']['system_notifications']['Row'];
type SystemNotificationInsert =
  Database['public']['Tables']['system_notifications']['Insert'];
type NotificationDelivery =
  Database['public']['Tables']['notification_deliveries']['Row'];

interface SystemNotificationCreate {
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expiresAt?: string;
  actionUrl?: string;
  actionText?: string;
  type:
    | 'app_update'
    | 'system_maintenance'
    | 'feature_release'
    | 'community_event'
    | 'system';
  targetUsers?: string[]; // 特定ユーザーのみ（空の場合は全ユーザー）
}

interface UseSystemNotificationsReturn {
  loading: boolean;
  error: string | null;
  systemNotifications: SystemNotification[];
  createSystemNotification: (
    notification: SystemNotificationCreate
  ) => Promise<boolean>;
  deleteSystemNotification: (id: string) => Promise<boolean>;
  getSystemNotifications: () => Promise<void>;
  getNotificationStats: (id: string) => Promise<{
    total: number;
    delivered: number;
    read: number;
    pending: number;
  } | null>;
}

export function useSystemNotifications(): UseSystemNotificationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [systemNotifications, setSystemNotifications] = useState<
    SystemNotification[]
  >([]);

  // システム通知を作成・配信
  const createSystemNotification = useCallback(
    async (notification: SystemNotificationCreate): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 システム通知作成開始:', notification);

        // PostgreSQL関数を使用してシステム通知を作成・配信
        const { data, error: functionError } = await supabase.rpc(
          'send_system_notification',
          {
            p_title: notification.title,
            p_message: notification.message,
            p_type: notification.type,
            p_priority: notification.priority,
            p_expires_at: notification.expiresAt || null,
            p_action_url: notification.actionUrl || null,
            p_action_text: notification.actionText || null,
            p_target_users: notification.targetUsers || [],
          }
        );

        if (functionError) {
          console.error('❌ システム通知作成エラー:', functionError);
          throw functionError;
        }

        console.log('✅ システム通知作成・配信完了:', data);

        // 通知一覧を更新
        await getSystemNotifications();

        return true;
      } catch (err) {
        logError(err, 'useSystemNotifications.createSystemNotification');
        setError(formatSupabaseError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // システム通知を削除
  const deleteSystemNotification = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        const { error: deleteError } = await supabase
          .from('system_notifications')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        // 通知一覧を更新
        await getSystemNotifications();

        return true;
      } catch (err) {
        logError(err, 'useSystemNotifications.deleteSystemNotification');
        setError(formatSupabaseError(err));
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // システム通知一覧を取得
  const getSystemNotifications = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('system_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      setSystemNotifications(data || []);
    } catch (err) {
      logError(err, 'useSystemNotifications.getSystemNotifications');
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // 通知の配信統計を取得
  const getNotificationStats = useCallback(
    async (
      id: string
    ): Promise<{
      total: number;
      delivered: number;
      read: number;
      pending: number;
    } | null> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('notification_deliveries')
          .select('status')
          .eq('system_notification_id', id);

        if (fetchError) throw fetchError;

        const stats = {
          total: data?.length || 0,
          delivered: data?.filter(d => d.status === 'delivered').length || 0,
          read: data?.filter(d => d.status === 'read').length || 0,
          pending: data?.filter(d => d.status === 'pending').length || 0,
        };

        return stats;
      } catch (err) {
        logError(err, 'useSystemNotifications.getNotificationStats');
        return null;
      }
    },
    []
  );

  return {
    loading,
    error,
    systemNotifications,
    createSystemNotification,
    deleteSystemNotification,
    getSystemNotifications,
    getNotificationStats,
  };
}

// 通知タイプのオプション
export const NOTIFICATION_TYPES = [
  { value: 'app_update', label: 'アプリアップデート', priority: 'normal' },
  {
    value: 'system_maintenance',
    label: 'システムメンテナンス',
    priority: 'high',
  },
  { value: 'feature_release', label: '新機能リリース', priority: 'normal' },
  {
    value: 'community_event',
    label: 'コミュニティイベント',
    priority: 'normal',
  },
  { value: 'system', label: 'システム通知', priority: 'normal' },
] as const;

// 優先度のオプション
export const NOTIFICATION_PRIORITIES = [
  { value: 'low', label: '低', color: 'gray' },
  { value: 'normal', label: '通常', color: 'blue' },
  { value: 'high', label: '高', color: 'orange' },
  { value: 'urgent', label: '緊急', color: 'red' },
] as const;
