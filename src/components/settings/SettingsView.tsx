import { useState } from 'react';
import { ArrowLeft, User, Bell, ChevronRight } from 'lucide-react';
import { Database as DatabaseType } from '../../types/database';
import AccountSettings from './AccountSettings';
import NotificationSettings from './NotificationSettings';

type Profile = DatabaseType['public']['Tables']['profiles']['Row'];

interface SettingsViewProps {
  profile: Profile;
  onBack: () => void;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

type SettingsSection = 'main' | 'account' | 'notifications';

export default function SettingsView({
  profile,
  onBack,
  onProfileUpdate,
}: SettingsViewProps) {
  const [currentSection, setCurrentSection] = useState<SettingsSection>('main');

  const settingsCategories = [
    {
      id: 'account' as const,
      title: 'アカウント',
      description: 'プロフィール、パスワード、メールアドレス',
      icon: User,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      id: 'notifications' as const,
      title: '通知',
      description: 'プッシュ通知、メール通知',
      icon: Bell,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
  ];

  const renderSettingsSection = () => {
    switch (currentSection) {
      case 'account':
        return (
          <AccountSettings
            profile={profile}
            onBack={() => setCurrentSection('main')}
            onProfileUpdate={onProfileUpdate}
          />
        );
      case 'notifications':
        return (
          <NotificationSettings
            profile={profile}
            onBack={() => setCurrentSection('main')}
          />
        );

      default:
        return null;
    }
  };

  // サブセクションを表示中の場合
  if (currentSection !== 'main') {
    return renderSettingsSection();
  }

  // メイン設定画面
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
            <h1 className="text-lg font-bold text-gray-900">設定</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* User Info */}
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-lg">
                  {profile.name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {profile.name}
              </h2>
              <p className="text-gray-600 text-sm">{profile.email}</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  {profile.role === 'admin' ? '管理者' : 'ユーザー'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Categories */}
        <div className="space-y-3">
          {settingsCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setCurrentSection(category.id)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center space-x-4">
                <div
                  className={`w-12 h-12 ${category.bgColor} rounded-xl flex items-center justify-center`}
                >
                  <category.icon className={`w-6 h-6 ${category.color}`} />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-gray-900">
                    {category.title}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {category.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </button>
          ))}
        </div>

        {/* Version Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">HelloChicago v1.0</p>
          <p className="text-xs text-gray-400 mt-1">© 2025 HelloChicago</p>
        </div>
      </div>
    </div>
  );
}
