import { useState } from 'react';
import {
  Settings,
  HelpCircle,
  Heart,
  MessageSquare,
  Shield,
  Calendar,
  ArrowLeft,
  User,
  Users,
} from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { signOut } from '../lib/supabase';
import { Database } from '../types/database';
import { useUserStats } from '../hooks/useUserStats';
import { useCommunityInfo } from '../hooks/useCommunityInfo';
import { useAuth } from '../hooks/useAuth';
import { useProfileDetails } from '../hooks/useProfileDetails';
import ProfileEditView from './profile/edit/ProfileEditView';
import UserPostsView from './UserPostsView';
import FavoritesView from './FavoritesView';
import SettingsView from './settings/SettingsView';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileViewProps {
  user: SupabaseUser | null;
  profile: Profile | null;
  onAdminClick?: () => void;
  onAdminDashboardClick?: () => void;
}

export default function ProfileView({
  user,
  profile,
  onAdminClick,
  onAdminDashboardClick,
}: ProfileViewProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentView, setCurrentView] = useState<
    'profile' | 'posts' | 'favorites' | 'settings' | 'details' | 'edit-details'
  >('profile');

  // useAuthの状態を使用
  const { profile: authProfile, reloadProfile } = useAuth();

  // 現在のプロフィールデータを使用（useAuthの状態を優先）
  const activeProfile = authProfile || profile;

  // プロフィール更新後の強制再読み込み
  const handleProfileUpdate = async () => {
    console.log('🔄 Profile update detected, reloading auth state...');
    await reloadProfile();
    // プロフィール詳細情報も再読み込み
    await reloadProfileDetails();
  };

  const { stats: userStats } = useUserStats(activeProfile?.id);
  const { profileDetails, reload: reloadProfileDetails } = useProfileDetails(
    activeProfile?.id || ''
  );
  const {
    communityInfo,
    loading: communityLoading,
    error: communityError,
  } = useCommunityInfo();

  const baseMenuItems = [
    {
      icon: Settings,
      label: '設定',
      description: 'アカウント設定を変更',
      onClick: () => setCurrentView('settings'),
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

  const adminDashboardMenuItem = {
    icon: Shield,
    label: '管理ダッシュボード',
    description: 'システム監視・セキュリティ監査・パフォーマンス監視',
    onClick: onAdminDashboardClick,
  };

  const menuItems =
    profile?.role === 'admin'
      ? [...baseMenuItems, adminMenuItem, adminDashboardMenuItem]
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
          // プロフィール更新後の処理
          console.log('Profile updated from settings:', updatedProfile);
          // 強制再読み込みで状態を同期
          handleProfileUpdate();
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
            </div>
            <p className="text-gray-600 text-sm mb-2">
              アメリカ在住年月{' '}
              {(() => {
                // アメリカ到着日が設定されている場合はそちらを優先
                if (profileDetails?.arrival_date) {
                  const arrival = new Date(profileDetails.arrival_date);
                  const now = new Date();
                  const diffTime = Math.abs(now.getTime() - arrival.getTime());
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  if (diffDays < 30) {
                    return `${diffDays}日`;
                  } else if (diffDays < 365) {
                    const months = Math.floor(diffDays / 30);
                    return `約${months}ヶ月`;
                  } else {
                    const years = Math.floor(diffDays / 365);
                    const remainingMonths = Math.floor((diffDays % 365) / 30);
                    return remainingMonths > 0
                      ? `${years}年${remainingMonths}ヶ月`
                      : `${years}年`;
                  }
                }
                // アメリカ到着日が未設定の場合は「未設定」と表示
                return '未設定';
              })()}
            </p>
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
            onClick={() => setShowEditModal(true)}
            className="group w-full flex items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl hover:from-blue-100 hover:to-purple-100 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-left">
              <span className="text-sm font-medium text-gray-800 block">
                プロフィール編集
              </span>
              <span className="text-xs text-gray-600 mt-1 block">
                基本情報・自己紹介・趣味・居住エリアなど
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

          {communityLoading ? (
            <div className="space-y-3">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-gray-200 rounded"></div>
                  <div className="h-16 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : communityError ? (
            <div className="text-center py-4">
              <div className="text-red-500 mb-2">
                <Shield className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-red-600 text-sm font-medium">
                コミュニティ情報の読み込みに失敗しました
              </p>
              <p className="text-gray-500 text-xs mt-1">
                しばらく時間をおいて再度お試しください
              </p>
            </div>
          ) : communityInfo ? (
            <div className="space-y-3">
              {/* 総メンバー数 */}
              <div className="flex items-center justify-between bg-white/50 backdrop-blur-sm rounded-lg p-3 transition-all duration-300 hover:bg-white/70 hover:shadow-sm">
                <span className="text-sm text-gray-600">総メンバー数</span>
                <span className="text-lg font-bold text-coral-600">
                  {communityInfo.totalMembers.toLocaleString()}名
                </span>
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
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-500 text-sm">
                コミュニティ情報がありません
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile Edit Modal */}
      {showEditModal && activeProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ProfileEditView
              profile={activeProfile}
              onBack={() => setShowEditModal(false)}
              onSave={() => {
                setShowEditModal(false);
                // 強制再読み込みで状態を同期
                handleProfileUpdate();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
