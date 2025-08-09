import React, { useState } from 'react';
import {
  Settings,
  Bell,
  HelpCircle,
  Heart,
  MessageSquare,
  Shield,
  Edit3,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { signOut } from '../lib/supabase';
import { Database } from '../types/database';
import { useUserStats } from '../hooks/useUserStats';
import ProfileEditModal from './ProfileEditModal';
import UserPostsView from './UserPostsView';
import FavoritesView from './FavoritesView';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileViewProps {
  user: any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    'profile' | 'posts' | 'favorites'
  >('profile');
  const [currentProfile, setCurrentProfile] = useState(profile);

  const { stats: userStats, loading: statsLoading } = useUserStats(profile?.id);

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

  const stats = [
    {
      label: '投稿数',
      value: statsLoading ? '-' : userStats.postCount.toString(),
      icon: MessageSquare,
      color: 'text-coral-600',
      onClick: () => setCurrentView('posts'),
    },
    {
      label: 'いいね',
      value: statsLoading ? '-' : userStats.likesReceived.toString(),
      icon: Heart,
      color: 'text-red-500',
    },
    {
      label: 'お気に入り',
      value: statsLoading ? '-' : '0', // お気に入り数は後で実装
      icon: TrendingUp,
      color: 'text-teal-600',
      onClick: () => setCurrentView('favorites'),
    },
  ];

  const baseMenuItems = [
    {
      icon: Settings,
      label: '設定',
      description: 'アカウント設定を変更',
      onClick: undefined,
    },
    {
      icon: Bell,
      label: '通知',
      description: '通知設定を管理',
      onClick: undefined,
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

  // メインプロフィールビュー
  return (
    <div className="px-4 py-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center">
            {activeProfile?.avatar_url ? (
              <img
                src={activeProfile.avatar_url}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {activeProfile?.name?.charAt(0) ||
                  user?.email?.charAt(0) ||
                  'U'}
              </span>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-gray-900">
                {activeProfile?.name || 'ユーザー'}
              </h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                title="プロフィールを編集"
              >
                <Edit3 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              シカゴ在住{' '}
              {userStats
                ? Math.max(1, Math.floor(userStats.joinedDaysAgo / 365))
                : 1}
              年目
            </p>
            <div className="flex items-center space-x-1 mt-1">
              <span className="text-sm">{userBadge.icon}</span>
              <span className={`text-sm font-medium ${userBadge.color}`}>
                {userBadge.label}
              </span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">
                {activeProfile?.created_at
                  ? `${new Date(activeProfile.created_at).toLocaleDateString('ja-JP')}から参加`
                  : '参加日不明'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`text-center ${stat.onClick ? 'cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors' : ''}`}
              onClick={stat.onClick}
            >
              <div className={`${stat.color} mb-1`}>
                <stat.icon className="w-5 h-5 mx-auto" />
              </div>
              <div className="text-lg font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">クイックアクション</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setCurrentView('posts')}
            className="flex flex-col items-center p-4 bg-coral-50 rounded-xl hover:bg-coral-100 transition-colors"
          >
            <MessageSquare className="w-6 h-6 text-coral-600 mb-2" />
            <span className="text-sm font-medium text-coral-700">投稿履歴</span>
          </button>
          <button
            onClick={() => setCurrentView('favorites')}
            className="flex flex-col items-center p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
          >
            <Heart className="w-6 h-6 text-teal-600 mb-2" />
            <span className="text-sm font-medium text-teal-700">
              お気に入り
            </span>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className={`w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
              item.label === '管理者用画面' ? 'bg-coral-50' : ''
            }`}
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <item.icon
                className={`w-5 h-5 ${
                  item.label === '管理者用画面'
                    ? 'text-coral-600'
                    : 'text-gray-600'
                }`}
              />
            </div>
            <div className="flex-1 text-left">
              <div
                className={`font-medium ${
                  item.label === '管理者用画面'
                    ? 'text-coral-900'
                    : 'text-gray-900'
                }`}
              >
                {item.label}
              </div>
              <div className="text-sm text-gray-500">{item.description}</div>
            </div>
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

      {/* Community Info */}
      <div className="p-4 bg-gradient-to-r from-coral-50 to-teal-50 rounded-2xl">
        <h3 className="font-semibold text-gray-900 mb-2">コミュニティ情報</h3>
        <p className="text-sm text-gray-600 mb-2">
          現在 18名のメンバーが参加中
        </p>
        <p className="text-xs text-gray-500">
          安全で信頼できるコミュニティを維持するため、新しいメンバーは招待制となっています。
        </p>
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
