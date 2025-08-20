import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  Send,
  Calendar,
  Link,
  AlertTriangle,
} from 'lucide-react';
import {
  useSystemNotifications,
  NOTIFICATION_TYPES,
} from '../../hooks/useSystemNotifications';
import { useToast } from '../../hooks/useToast';
// 未使用のインポートを削除

// 未使用の型定義を削除

interface SystemNotificationManagerProps {
  onClose?: () => void;
}

export default function SystemNotificationManager({
  onClose,
}: SystemNotificationManagerProps) {
  const {
    loading,
    error,
    systemNotifications,
    createSystemNotification,
    deleteSystemNotification,
    getSystemNotifications,
    getNotificationStats,
  } = useSystemNotifications();

  const { addToast } = useToast();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [notificationStats, setNotificationStats] = useState<
    Record<
      string,
      {
        total: number;
        delivered: number;
        read: number;
        pending: number;
      }
    >
  >({});

  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'system' as
      | 'system'
      | 'app_update'
      | 'system_maintenance'
      | 'feature_release'
      | 'community_event',

    expiresAt: '',
    actionUrl: '',
    actionText: '',
    targetUsers: [] as string[],
  });

  // システム通知一覧を読み込み
  const loadSystemNotifications = useCallback(async () => {
    await getSystemNotifications();
  }, [getSystemNotifications]);

  // 通知統計を読み込み
  const loadNotificationStats = useCallback(async () => {
    const stats: Record<
      string,
      {
        total: number;
        delivered: number;
        read: number;
        pending: number;
      }
    > = {};
    for (const notification of systemNotifications) {
      const stat = await getNotificationStats(notification.id);
      if (stat) {
        stats[notification.id] = stat;
      }
    }
    setNotificationStats(stats);
  }, [systemNotifications, getNotificationStats]);

  useEffect(() => {
    loadSystemNotifications();
  }, [loadSystemNotifications]);

  useEffect(() => {
    if (systemNotifications.length > 0) {
      loadNotificationStats();
    }
  }, [systemNotifications, loadNotificationStats]);

  // フォームをリセット
  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'system',

      expiresAt: '',
      actionUrl: '',
      actionText: '',
      targetUsers: [],
    });
    setShowCreateForm(false);
  };

  // 全ユーザーに通知を配信
  const broadcastNotification = async (notificationData: {
    title: string;
    message: string;
    type:
      | 'system'
      | 'app_update'
      | 'system_maintenance'
      | 'feature_release'
      | 'community_event';

    expiresAt?: string;
    actionUrl?: string;
    actionText?: string;
    targetUsers?: string[];
  }) => {
    try {
      // 全ユーザーに通知を配信する場合は、createSystemNotificationを使用
      return await createSystemNotification(notificationData);
    } catch (err) {
      console.error('❌ 通知配信エラー:', err);
      return false;
    }
  };

  // 通知を作成
  const handleCreateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const notificationData = {
        title: formData.title,
        message: formData.message,
        type: formData.type,
        expiresAt: formData.expiresAt || undefined,
        actionUrl: formData.actionUrl || undefined,
        actionText: formData.actionText || undefined,
        targetUsers:
          formData.targetUsers.length > 0 ? formData.targetUsers : undefined,
      };

      let success = false;
      if (formData.targetUsers.length > 0) {
        success = await createSystemNotification(notificationData);
      } else {
        success = await broadcastNotification(notificationData);
      }

      if (success) {
        addToast('success', '通知が正常に作成されました');
        resetForm();
        await loadSystemNotifications();
      } else {
        const errorMessage = error || '通知の作成に失敗しました';
        console.error('❌ 通知作成エラー:', errorMessage);
        addToast('error', errorMessage);
      }
    } catch (err) {
      console.error('❌ 通知作成中に予期しないエラー:', err);
      addToast('error', '通知の作成中にエラーが発生しました');
    } finally {
      setIsCreating(false);
    }
  };

  // 通知を削除
  const handleDeleteNotification = async (id: string) => {
    if (!confirm('この通知を削除しますか？')) return;

    const success = await deleteSystemNotification(id);
    if (success) {
      addToast('success', '通知を削除しました');
      await loadSystemNotifications();
    } else {
      addToast('error', error || '通知の削除に失敗しました');
    }
  };

  // 通知タイプのアイコンを取得
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'app_update':
        return '🔄';
      case 'system_maintenance':
        return '🔧';
      case 'feature_release':
        return '🚀';
      case 'community_event':
        return '🎉';
      default:
        return '📢';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center justify-center">
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  システム通知管理
                </h1>
                <p className="text-sm text-gray-600">通知の作成・管理</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>新規作成</span>
              </button>

              {onClose && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  閉じる
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* 通知作成フォーム */}
        {showCreateForm && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              新しい通知を作成
            </h2>

            <form onSubmit={handleCreateNotification} className="space-y-4">
              {/* タイトル */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="通知のタイトルを入力"
                  required
                />
              </div>

              {/* メッセージ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  メッセージ *
                </label>
                <textarea
                  value={formData.message}
                  onChange={e =>
                    setFormData({ ...formData, message: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="通知の内容を入力"
                  required
                />
              </div>

              {/* タイプと優先度 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイプ
                  </label>
                  <select
                    value={formData.type}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        type: e.target.value as
                          | 'app_update'
                          | 'system_maintenance'
                          | 'feature_release'
                          | 'community_event'
                          | 'system',
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {NOTIFICATION_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 有効期限 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  有効期限（オプション）
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={e =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* アクションボタン */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    アクションURL（オプション）
                  </label>
                  <input
                    type="url"
                    value={formData.actionUrl}
                    onChange={e =>
                      setFormData({ ...formData, actionUrl: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    アクションテキスト（オプション）
                  </label>
                  <input
                    type="text"
                    value={formData.actionText}
                    onChange={e =>
                      setFormData({ ...formData, actionText: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="詳細を見る"
                  />
                </div>
              </div>

              {/* ボタン */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isCreating ? '作成中...' : '通知を送信'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* システム通知一覧 */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              システム通知一覧
            </h2>
            <p className="text-sm text-gray-600">
              作成されたシステム通知の管理
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-600">読み込み中...</p>
              </div>
            ) : systemNotifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">システム通知はありません</p>
              </div>
            ) : (
              systemNotifications.map(notification => {
                const stats = notificationStats[notification.id];
                return (
                  <div key={notification.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">
                          {getTypeIcon(notification.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-900">
                              {notification.title}
                            </h3>

                            <span className="px-2 py-1 text-xs rounded-full border bg-gray-100 text-gray-700 border-gray-200">
                              {notification.status === 'sent'
                                ? '配信済み'
                                : notification.status}
                            </span>
                          </div>

                          <p className="text-gray-600 mb-2">
                            {notification.message}
                          </p>

                          {/* 配信統計 */}
                          {stats && (
                            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                              <div className="grid grid-cols-4 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="font-semibold text-gray-900">
                                    {stats.total}
                                  </div>
                                  <div className="text-gray-600">対象者</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-blue-600">
                                    {stats.delivered}
                                  </div>
                                  <div className="text-gray-600">配信済み</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-green-600">
                                    {stats.read}
                                  </div>
                                  <div className="text-gray-600">既読</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-orange-600">
                                    {stats.pending}
                                  </div>
                                  <div className="text-gray-600">保留</div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                {new Date(
                                  notification.created_at
                                ).toLocaleString('ja-JP')}
                              </span>
                            </span>

                            {notification.expires_at && (
                              <span className="flex items-center space-x-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>
                                  期限:{' '}
                                  {new Date(
                                    notification.expires_at
                                  ).toLocaleString('ja-JP')}
                                </span>
                              </span>
                            )}

                            {notification.action_url && (
                              <span className="flex items-center space-x-1">
                                <Link className="w-3 h-3" />
                                <span>
                                  {notification.action_text || 'リンク'}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleDeleteNotification(notification.id)
                        }
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
