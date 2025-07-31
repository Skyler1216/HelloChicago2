import React from 'react';
import { Settings, Bell, HelpCircle, Heart, MessageSquare, Users, Award, Shield } from 'lucide-react';
import { signOut } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileViewProps {
  user: any;
  profile: Profile | null;
  onAdminClick?: () => void;
}

export default function ProfileView({ user, profile, onAdminClick }: ProfileViewProps) {
  const stats = [
    { label: '投稿数', value: '3', icon: MessageSquare, color: 'text-coral-600' },
    { label: 'いいね', value: '24', icon: Heart, color: 'text-red-500' },
    { label: 'フォロワー', value: '12', icon: Users, color: 'text-teal-600' },
  ];

  const baseMenuItems = [
    { icon: Settings, label: '設定', description: 'アカウント設定を変更' },
    { icon: Bell, label: '通知', description: '通知設定を管理' },
    { icon: HelpCircle, label: 'ヘルプ', description: 'よくある質問とサポート' },
  ];

  const adminMenuItem = {
    icon: Shield,
    label: '管理者用画面',
    description: 'ユーザー承認とシステム管理',
    onClick: onAdminClick
  };

  const menuItems = profile?.role === 'admin' 
    ? [...baseMenuItems, adminMenuItem]
    : baseMenuItems;

  const handleSignOut = async () => {
    try {
      await signOut();
      // Force page reload to ensure clean state
      window.location.reload();
    } catch (error) {
      console.error('Sign out error:', error);
      // Even if there's an error, try to reload to clear any corrupted state
      window.location.reload();
    }
  };

  return (
    <div className="px-4 py-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-gray-100">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {profile?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{profile?.name || 'ユーザー'}</h2>
            <p className="text-gray-600 text-sm">シカゴ在住 2年目</p>
            <div className="flex items-center space-x-1 mt-1">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-gray-600">アクティブメンバー</span>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className={`${stat.color} mb-1`}>
                <stat.icon className="w-5 h-5 mx-auto" />
              </div>
              <div className="text-lg font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-3">クイックアクション</h3>
        <div className="grid grid-cols-2 gap-3">
          <button className="flex flex-col items-center p-4 bg-coral-50 rounded-xl hover:bg-coral-100 transition-colors">
            <MessageSquare className="w-6 h-6 text-coral-600 mb-2" />
            <span className="text-sm font-medium text-coral-700">投稿履歴</span>
          </button>
          <button className="flex flex-col items-center p-4 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors">
            <Heart className="w-6 h-6 text-teal-600 mb-2" />
            <span className="text-sm font-medium text-teal-700">お気に入り</span>
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {menuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.onClick}
            className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <item.icon className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-gray-900">{item.label}</div>
              <div className="text-sm text-gray-500">{item.description}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Sign Out Button */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center p-4 text-red-600 hover:bg-red-50 transition-colors"
        >
          <span className="font-medium">ログアウト</span>
        </button>
      </div>

      {/* Community Info */}
      <div className="mt-6 p-4 bg-gradient-to-r from-coral-50 to-teal-50 rounded-2xl">
        <h3 className="font-semibold text-gray-900 mb-2">コミュニティ情報</h3>
        <p className="text-sm text-gray-600 mb-2">
          現在 18名のメンバーが参加中
        </p>
        <p className="text-xs text-gray-500">
          安全で信頼できるコミュニティを維持するため、新しいメンバーは招待制となっています。
        </p>
      </div>
    </div>
  );
}