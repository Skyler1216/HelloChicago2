import { useState } from 'react';
import {
  Settings,
  Bell,
  HelpCircle,
  Heart,
  MessageSquare,
  Shield,
  Edit3,
  Calendar,
  ArrowLeft,
  User,
  Users,
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { signOut } from '../lib/supabase';
import { Database } from '../types/database';
import { useUserStats } from '../hooks/useUserStats';
import ProfileEditModal from './ProfileEditModal';
import UserPostsView from './UserPostsView';
import FavoritesView from './FavoritesView';
import SettingsView from './settings/SettingsView';
import ProfileDetailView from './profile/ProfileDetailView';
import ProfileDetailEditor from './profile/ProfileDetailEditor';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileViewProps {
  user: SupabaseUser | null;
  profile: Profile | null;
  onAdminClick?: () => void;
}

export default function ProfileView({
  user,
  profile,
  onAdminClick,
}: ProfileViewProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentView, setCurrentView] = useState<
    | 'profile'
    | 'posts'
    | 'favorites'
    | 'settings'
    | 'details'
    | 'edit-details'
    | 'notifications'
  >('profile');
  const [currentProfile, setCurrentProfile] = useState(profile);

  const { stats: userStats } = useUserStats(profile?.id);

  // 現在のプロフィールデータを使用
  const activeProfile = currentProfile || profile;

  // ユーザーバッジを計算
  const getUserBadge = () => {
    if (!userStats)
      return { label: '新メンバー', icon: '👋', color: 'text-gray-600' };

    if (userStats.postCount >= 10 && userStats.likesReceived >= 50) {
      return { label: 'エキスパート', icon: '🌟', color: 'text-yellow-600' };
    } else if (userStats.postCount >= 5 && userStats.likesReceived >= 20) {
      return {
        label: 'アクティブメンバー',
        icon: '⭐',
        color: 'text-blue-600',
      };
    } else if (userStats.postCount >= 1) {
      return {
        label: 'コントリビューター',
        icon: '✨',
        color: 'text-green-600',
      };
    }
    return { label: '新メンバー', icon: '👋', color: 'text-gray-600' };
  };

  const userBadge = getUserBadge();

  const baseMenuItems = [
    {
      icon: Settings,
      label: '設定',
      description: 'アカウント設定を変更',
      onClick: () => setCurrentView('settings'),
    },
    {
      icon: Bell,
      label: '通知',
      description: '通知設定を管理',
      onClick: () => setCurrentView('notifications'),
    },
    {
      icon: HelpCircle,
      label: 'ヘルプ',
      description: 'よくある質問とサポート',
      onClick: undefined,
    },
  ];

  const adminMenuItem = {
    icon: Shield,
    label: '管理者用画面',
    description: 'ユーザー承認とシステム管理',
    onClick: onAdminClick,
  };

  const menuItems =
    profile?.role === 'admin'
      ? [...baseMenuItems, adminMenuItem]
      : baseMenuItems;

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      // Always reload to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  // ビューの切り替え
  if (currentView === 'posts' && activeProfile) {
    return (
      <UserPostsView
        userId={activeProfile.id}
        userName={activeProfile.name}
        onBack={() => setCurrentView('profile')}
      />
    );
  }

  if (currentView === 'favorites' && activeProfile) {
    return (
      <FavoritesView
        userId={activeProfile.id}
        onBack={() => setCurrentView('profile')}
      />
    );
  }

  if (currentView === 'settings' && activeProfile) {
    return (
      <SettingsView
        profile={activeProfile}
        onBack={() => setCurrentView('profile')}
        onProfileUpdate={updatedProfile => {
          setCurrentProfile(updatedProfile);
        }}
      />
    );
  }

  if (currentView === 'notifications' && activeProfile) {
    // 一時的に設定画面の通知セクションにリダイレクト
    return (
      <SettingsView
        profile={activeProfile}
        onBack={() => setCurrentView('profile')}
        onProfileUpdate={updatedProfile => {
          setCurrentProfile(updatedProfile);
        }}
      />
    );
  }

  if (currentView === 'details' && activeProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-md mx-auto px-4 py-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCurrentView('profile')}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-lg font-bold text-gray-900">
                詳細プロフィール
              </h1>
            </div>
          </div>
        </div>
        <div className="max-w-md mx-auto px-4 py-6">
          <ProfileDetailView
            profile={activeProfile}
            isOwnProfile={true}
            onEdit={() => setCurrentView('edit-details')}
          />
        </div>
      </div>
    );
  }

  if (currentView === 'edit-details' && activeProfile) {
    return (
      <ProfileDetailEditor
        profile={activeProfile}
        onBack={() => setCurrentView('details')}
        onSave={() => {
          // 保存完了後は詳細表示に戻る
        }}
      />
    );
  }

  // メインプロフィールビュー
  return (
    <div className="px-4 py-6">
      {/* Enhanced Profile Header */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 relative overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-coral-100 to-teal-100 rounded-full blur-3xl opacity-30 -translate-y-8 translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-2xl opacity-20 translate-y-4 -translate-x-4"></div>

        <div className="relative z-10 flex items-center space-x-4 mb-6">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center shadow-lg">
              {activeProfile?.avatar_url ? (
                <img
                  src={activeProfile.avatar_url}
                  alt="Avatar"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">
                  {activeProfile?.name?.charAt(0) ||
                    user?.email?.charAt(0) ||
                    'U'}
                </span>
              )}
            </div>
            {/* オンライン状態インジケーター */}
            <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-2xl font-bold text-gray-900">
                {activeProfile?.name || 'ユーザー'}
              </h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/60 transition-all duration-200 backdrop-blur-sm"
                title="プロフィールを編集"
              >
                <Edit3 className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            <p className="text-gray-600 text-sm mb-2">
              シカゴ在住{' '}
              {userStats
                ? Math.max(1, Math.floor(userStats.joinedDaysAgo / 365))
                : 1}
              年目
            </p>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-white/50 backdrop-blur-sm px-2 py-1 rounded-full">
                <span className="text-sm">{userBadge.icon}</span>
                <span className={`text-sm font-medium ${userBadge.color}`}>
                  {userBadge.label}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                <span className="text-xs">
                  {activeProfile?.created_at
                    ? `${new Date(activeProfile.created_at).toLocaleDateString('ja-JP')}から参加`
                    : '参加日不明'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Quick Actions */}
      <div className="bg-white rounded-2xl p-5 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">クイックアクション</h3>
          <div className="w-2 h-2 bg-coral-500 rounded-full animate-pulse"></div>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentView('posts')}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-coral-50 to-coral-100/50 rounded-xl hover:from-coral-100 hover:to-coral-200/50 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <div className="w-10 h-10 bg-coral-500 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-coral-700">
                投稿履歴
              </span>
              <span className="text-xs text-coral-600 mt-1">
                {userStats.postCount}件
              </span>
            </button>
            <button
              onClick={() => setCurrentView('favorites')}
              className="group flex flex-col items-center p-4 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-xl hover:from-teal-100 hover:to-teal-200/50 transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <Heart className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-teal-700">
                お気に入り
              </span>
              <span className="text-xs text-teal-600 mt-1">
                {userStats.favoritesCount}件
              </span>
            </button>
          </div>
          <button
            onClick={() => setCurrentView('details')}
            className="group w-full flex items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-gray-800 block">
                詳細プロフィール
              </span>
              <span className="text-xs text-gray-600 mt-1 block">
                自己紹介・趣味・居住エリアなど
              </span>
            </div>
            <div className="w-6 h-6 bg-white/50 rounded-full flex items-center justify-center group-hover:bg-white/80 transition-colors duration-300">
              <ArrowLeft className="w-4 h-4 text-gray-600 rotate-180" />
            </div>
          </button>
        </div>
      </div>

      {/* Enhanced Menu Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            disabled={!item.onClick}
            className={`group w-full flex items-center space-x-4 p-4 transition-all duration-200 border-b border-gray-100 last:border-b-0 ${
              item.onClick
                ? item.label === '管理者用画面'
                  ? 'bg-gradient-to-r from-coral-50 to-orange-50 hover:from-coral-100 hover:to-orange-100 hover:shadow-md'
                  : 'hover:bg-gray-50 hover:shadow-sm'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${
                item.label === '管理者用画面'
                  ? 'bg-gradient-to-br from-coral-500 to-orange-500 group-hover:scale-110 shadow-md'
                  : item.onClick
                    ? 'bg-gray-100 group-hover:bg-gray-200 group-hover:scale-105'
                    : 'bg-gray-100'
              }`}
            >
              <item.icon
                className={`w-5 h-5 ${
                  item.label === '管理者用画面'
                    ? 'text-white'
                    : item.onClick
                      ? 'text-gray-600'
                      : 'text-gray-400'
                }`}
              />
            </div>
            <div className="flex-1 text-left">
              <div
                className={`font-medium transition-colors duration-200 ${
                  item.label === '管理者用画面'
                    ? 'text-coral-900'
                    : item.onClick
                      ? 'text-gray-900 group-hover:text-gray-800'
                      : 'text-gray-500'
                }`}
              >
                {item.label}
                {!item.onClick && item.label !== '管理者用画面' && (
                  <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                    準備中
                  </span>
                )}
              </div>
              <div className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors duration-200">
                {item.description}
              </div>
            </div>
            {item.onClick && (
              <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
                <ArrowLeft className="w-3 h-3 text-gray-600 rotate-180 group-hover:translate-x-0.5 transition-transform duration-300" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Sign Out Button */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6 mt-6">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-4 text-red-600 hover:bg-red-50 transition-colors"
        >
          <span className="font-medium">ログアウト</span>
        </button>
      </div>

      {/* Enhanced Community Info */}
      <div className="relative p-5 bg-gradient-to-br from-coral-50 via-teal-50 to-blue-50 rounded-2xl border border-white/50 overflow-hidden">
        {/* 背景パターン */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-4 w-8 h-8 bg-coral-500 rounded-full"></div>
          <div className="absolute top-8 right-8 w-4 h-4 bg-teal-500 rounded-full"></div>
          <div className="absolute bottom-6 left-8 w-6 h-6 bg-blue-500 rounded-full"></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-coral-500 to-teal-500 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">コミュニティ情報</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm rounded-lg p-3">
              <span className="text-sm text-gray-600">アクティブメンバー</span>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="w-6 h-6 bg-gradient-to-br from-coral-400 to-teal-400 rounded-full border-2 border-white"
                    ></div>
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  18名
                </span>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              <span className="inline-flex items-center space-x-1 mb-1">
                <Shield className="w-3 h-3 text-green-600" />
                <span className="font-medium">
                  安全で信頼できるコミュニティ
                </span>
              </span>
              <br />
              新しいメンバーは招待制で厳選されています。
            </p>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showEditModal && activeProfile && (
        <ProfileEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          profile={activeProfile}
          onUpdate={updatedProfile => {
            setCurrentProfile(updatedProfile);
          }}
        />
      )}
    </div>
  );
}
