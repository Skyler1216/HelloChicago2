import React from 'react';
import { User, Calendar, Users, Edit3, Clock } from 'lucide-react';
import { Database } from '../../types/database';
import { useProfileDetails } from '../../hooks/useProfileDetails';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileDetailViewProps {
  profile: Profile;
  isOwnProfile?: boolean;
  onEdit?: () => void;
}

export default function ProfileDetailView({
  profile,
  isOwnProfile = false,
  onEdit,
}: ProfileDetailViewProps) {
  const { profileDetails, loading, error } = useProfileDetails(profile.id);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <p className="text-red-600">詳細情報の読み込みに失敗しました</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!profileDetails) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="text-center py-8">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            詳細情報がありません
          </h3>
          <p className="text-gray-600 mb-4">
            {isOwnProfile
              ? 'プロフィールの詳細情報を追加しましょう'
              : 'このユーザーは詳細情報を設定していません'}
          </p>
          {isOwnProfile && onEdit && (
            <button
              onClick={onEdit}
              className="px-6 py-3 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
            >
              詳細情報を追加
            </button>
          )}
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateDaysInChicago = (arrivalDate: string) => {
    const arrival = new Date(arrivalDate);
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
  };

  const calculateYearsInChicago = (arrivalDate: string) => {
    const arrival = new Date(arrivalDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - arrival.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 365) {
      return null; // 1年未満の場合は年数表示なし
    }

    const years = Math.floor(diffDays / 365);
    return years;
  };

  return (
    <div className="space-y-4">
      {/* 編集ボタン（自分のプロフィールの場合） */}
      {isOwnProfile && onEdit && (
        <div className="flex justify-end">
          <button
            onClick={onEdit}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>編集</span>
          </button>
        </div>
      )}

      {/* シカゴ在住年数（目立つ表示） */}
      {profileDetails.arrival_date &&
        calculateYearsInChicago(profileDetails.arrival_date) && (
          <div className="bg-gradient-to-r from-coral-500 to-coral-600 rounded-2xl p-6 shadow-sm border border-coral-200">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Calendar className="w-6 h-6 text-white" />
                <h3 className="text-xl font-bold text-white">シカゴ在住</h3>
              </div>
              <div className="text-4xl font-bold text-white mb-2">
                {calculateYearsInChicago(profileDetails.arrival_date)}年目
              </div>
              <p className="text-coral-100 text-sm">
                アメリカ到着: {formatDate(profileDetails.arrival_date)}
              </p>
            </div>
          </div>
        )}

      {/* 基本情報 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">基本情報</h3>
        <div className="space-y-4">
          {/* アメリカ到着日 */}
          {profileDetails.arrival_date && (
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <span className="text-sm text-gray-600">アメリカ到着:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {formatDate(profileDetails.arrival_date)}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  ({calculateDaysInChicago(profileDetails.arrival_date)})
                </span>
              </div>
            </div>
          )}

          {/* 家族構成 */}
          {profileDetails.family_structure && (
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <span className="text-sm text-gray-600">家族構成:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {profileDetails.family_structure}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 最終更新日 */}
      <div className="text-center text-xs text-gray-500">
        <div className="flex items-center justify-center space-x-1">
          <Clock className="w-3 h-3" />
          <span>最終更新: {formatDate(profileDetails.updated_at)}</span>
        </div>
      </div>
    </div>
  );
}
