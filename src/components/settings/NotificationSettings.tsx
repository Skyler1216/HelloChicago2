import React, { useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Mail,
  Smartphone,
  Heart,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface NotificationSettingsProps {
  profile: Profile;
  onBack: () => void;
}

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  push: boolean;
  email: boolean;
}

export default function NotificationSettings({
  onBack,
}: NotificationSettingsProps) {
  const [notifications, setNotifications] = useState<NotificationSetting[]>([
    {
      id: 'likes',
      title: 'いいね',
      description: 'あなたの投稿にいいねが付いたとき',
      icon: Heart,
      push: true,
      email: false,
    },
    {
      id: 'comments',
      title: 'コメント',
      description: 'あなたの投稿にコメントが付いたとき',
      icon: MessageSquare,
      push: true,
      email: true,
    },
    {
      id: 'follows',
      title: 'フォロー',
      description: '他のユーザーにフォローされたとき',
      icon: UserPlus,
      push: true,
      email: false,
    },
  ]);

  const [generalSettings, setGeneralSettings] = useState({
    weeklyDigest: false,
    importantUpdates: true,
    systemNotifications: true,
  });

  const updateNotificationSetting = (
    id: string,
    type: 'push' | 'email',
    value: boolean
  ) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id
          ? { ...notification, [type]: value }
          : notification
      )
    );
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
                enabled={generalSettings.weeklyDigest}
                onChange={value =>
                  setGeneralSettings(prev => ({ ...prev, weeklyDigest: value }))
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
                enabled={generalSettings.importantUpdates}
                onChange={value =>
                  setGeneralSettings(prev => ({
                    ...prev,
                    importantUpdates: value,
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
                enabled={generalSettings.systemNotifications}
                onChange={value =>
                  setGeneralSettings(prev => ({
                    ...prev,
                    systemNotifications: value,
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

        {/* Quiet Hours */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            おやすみモード
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">夜間の通知を停止</h3>
                <p className="text-sm text-gray-600">
                  22:00〜8:00の間は通知を受信しません
                </p>
              </div>
              <ToggleSwitch enabled={false} onChange={() => {}} />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                おやすみモード機能は今後実装予定です
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200">
            設定を保存
          </button>
          <p className="text-center text-sm text-gray-500 mt-3">
            ※ 通知機能は今後実装予定です
          </p>
        </div>
      </div>
    </div>
  );
}
