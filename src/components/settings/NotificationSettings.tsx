import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Heart,
  MessageSquare,
  Save,
} from 'lucide-react';
import { Database } from '../../types/database';
import { useNotificationSettings } from '../../hooks/useNotifications';
import { useToast } from '../../hooks/useToast';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NotificationSettingsProps {
  profile: Profile;
  onBack: () => void;
}

export default function NotificationSettings({
  profile,
  onBack,
}: NotificationSettingsProps) {
  const { settings, loading, error, updateSettings } = useNotificationSettings(
    profile.id
  );

  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  // ローカル設定状態
  const [localSettings, setLocalSettings] = useState({
    push_likes: true,
    push_comments: true,
    email_likes: false,
    email_comments: true,
    weekly_digest: false,
    important_updates: true,
    system_notifications: true,
  });

  // エラーハンドリング
  if (error) {
    console.error('📱 NotificationSettings: Hook error:', error);
  }

  // サーバー設定をローカル状態に同期
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        push_likes: settings.push_likes,
        push_comments: settings.push_comments,
        email_likes: settings.email_likes,
        email_comments: settings.email_comments,
        weekly_digest: settings.weekly_digest,
        important_updates: settings.important_updates,
        system_notifications: settings.system_notifications,
      });
    }
  }, [settings]);

  const notifications = [
    {
      id: 'likes',
      title: 'いいね',
      description: 'あなたの投稿にいいねが付いたとき',
      icon: Heart,
      push: localSettings.push_likes,
      email: localSettings.email_likes,
    },
    {
      id: 'comments',
      title: 'コメント',
      description: 'あなたの投稿にコメントが付いたとき',
      icon: MessageSquare,
      push: localSettings.push_comments,
      email: localSettings.email_comments,
    },
  ];

  const updateNotificationSetting = (
    id: string,
    type: 'push' | 'email',
    value: boolean
  ) => {
    const key = `${type}_${id}` as keyof typeof localSettings;
    setLocalSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const success = await updateSettings({
        push_likes: localSettings.push_likes,
        push_comments: localSettings.push_comments,
        email_likes: localSettings.email_likes,
        email_comments: localSettings.email_comments,
        weekly_digest: localSettings.weekly_digest,
        important_updates: localSettings.important_updates,
        system_notifications: localSettings.system_notifications,
      });

      if (success) {
        addToast('success', '通知設定が保存されました');
      } else {
        addToast('error', '設定の保存に失敗しました');
      }
    } catch {
      addToast('error', '設定の保存中にエラーが発生しました');
    } finally {
      setSaving(false);
    }
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
    size = 'default',
  }: {
    enabled: boolean;
    onChange: (value: boolean) => void;
    size?: 'small' | 'default';
  }) => {
    const sizeClasses = size === 'small' ? 'w-8 h-5' : 'w-11 h-6';
    const thumbClasses = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';

    return (
      <button
        onClick={() => onChange(!enabled)}
        className={`${sizeClasses} ${
          enabled ? 'bg-coral-500' : 'bg-gray-200'
        } relative inline-flex items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-coral-500 focus:ring-offset-2`}
      >
        <span
          className={`${thumbClasses} ${
            enabled
              ? size === 'small'
                ? 'translate-x-3'
                : 'translate-x-5'
              : 'translate-x-0.5'
          } inline-block bg-white rounded-full shadow transform transition-transform duration-200`}
        />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">設定を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">通知設定</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Notification Types */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            アクティビティ通知
          </h2>

          <div className="space-y-6">
            {notifications.map(notification => (
              <div key={notification.id} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                    <notification.icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {notification.description}
                    </p>
                  </div>
                </div>

                <div className="ml-11 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        プッシュ通知
                      </span>
                    </div>
                    <ToggleSwitch
                      enabled={notification.push}
                      onChange={value =>
                        updateNotificationSetting(
                          notification.id,
                          'push',
                          value
                        )
                      }
                      size="small"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700">メール通知</span>
                    </div>
                    <ToggleSwitch
                      enabled={notification.email}
                      onChange={value =>
                        updateNotificationSetting(
                          notification.id,
                          'email',
                          value
                        )
                      }
                      size="small"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">一般設定</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">週次まとめ</h3>
                <p className="text-sm text-gray-600">
                  週に一度、活動のまとめをメールで受信
                </p>
              </div>
              <ToggleSwitch
                enabled={localSettings.weekly_digest}
                onChange={value =>
                  setLocalSettings(prev => ({ ...prev, weekly_digest: value }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">重要なお知らせ</h3>
                <p className="text-sm text-gray-600">
                  アプリの重要な更新やお知らせ
                </p>
              </div>
              <ToggleSwitch
                enabled={localSettings.important_updates}
                onChange={value =>
                  setLocalSettings(prev => ({
                    ...prev,
                    important_updates: value,
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">システム通知</h3>
                <p className="text-sm text-gray-600">
                  メンテナンスやシステム関連の通知
                </p>
              </div>
              <ToggleSwitch
                enabled={localSettings.system_notifications}
                onChange={value =>
                  setLocalSettings(prev => ({
                    ...prev,
                    system_notifications: value,
                  }))
                }
              />
            </div>
          </div>
        </div>

        {/* Notification Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <Bell className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">
                ブラウザ通知について
              </h3>
              <p className="text-sm text-yellow-700 mb-3">
                プッシュ通知を受信するには、ブラウザで通知を許可してください。
              </p>
              <button className="px-4 py-2 bg-yellow-200 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-300 transition-colors">
                通知を許可
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>{saving ? '保存中...' : '設定を保存'}</span>
          </button>
          {error && (
            <p className="text-center text-sm text-red-600 mt-3">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
