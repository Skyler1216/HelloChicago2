import React from 'react';
import {
  User,
  MapPin,
  Heart,
  MessageCircle,
  Calendar,
  Users,
  Edit3,
  Clock,
} from 'lucide-react';
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

      {/* 自己紹介 */}
      {profileDetails.bio && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <User className="w-5 h-5 text-coral-600" />
            <h3 className="font-semibold text-gray-900">自己紹介</h3>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {profileDetails.bio}
          </p>
        </div>
      )}

      {/* 基本情報 */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4">基本情報</h3>
        <div className="space-y-4">
          {/* 居住エリア */}
          {profileDetails.location_area && (
            <div className="flex items-center space-x-3">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <span className="text-sm text-gray-600">居住エリア:</span>
                <span className="ml-2 text-gray-900 font-medium">
                  {profileDetails.location_area}
                </span>
              </div>
            </div>
          )}

          {/* シカゴ到着日 */}
          {profileDetails.arrival_date && (
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <div>
                <span className="text-sm text-gray-600">シカゴ到着:</span>
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

      {/* 趣味・関心事 */}
      {profileDetails.interests && profileDetails.interests.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <Heart className="w-5 h-5 text-coral-600" />
            <h3 className="font-semibold text-gray-900">趣味・関心事</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profileDetails.interests.map(interest => (
              <span
                key={interest}
                className="bg-coral-100 text-coral-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 話せる言語 */}
      {profileDetails.languages && profileDetails.languages.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-4">
            <MessageCircle className="w-5 h-5 text-coral-600" />
            <h3 className="font-semibold text-gray-900">話せる言語</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {profileDetails.languages.map(language => (
              <span
                key={language}
                className="bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1 rounded-full"
              >
                {language}
              </span>
            ))}
          </div>
        </div>
      )}

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
