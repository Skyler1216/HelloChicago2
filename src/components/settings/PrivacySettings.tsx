import React, { useState } from 'react';
import {
  ArrowLeft,
  Shield,
  Eye,
  EyeOff,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import { Database } from '../../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface PrivacySettingsProps {
  profile: Profile;
  onBack: () => void;
}

export default function PrivacySettings({ onBack }: PrivacySettingsProps) {
  const [profileVisible, setProfileVisible] = useState(true);
  const [postsVisible, setPostsVisible] = useState(true);
  const [activityVisible, setActivityVisible] = useState(false);
  const [contactAllowed, setContactAllowed] = useState(true);

  const privacyOptions = [
    {
      id: 'profile_visibility',
      title: 'プロフィール公開',
      description: '他のユーザーがあなたのプロフィールを見ることができます',
      icon: Eye,
      value: profileVisible,
      onChange: setProfileVisible,
      options: [
        {
          value: true,
          label: '公開',
          icon: Globe,
          description: 'すべてのメンバーに公開',
        },
        {
          value: false,
          label: '非公開',
          icon: Lock,
          description: 'あなたのみ表示',
        },
      ],
    },
    {
      id: 'posts_visibility',
      title: '投稿公開',
      description: 'あなたの投稿を他のユーザーが見ることができます',
      icon: Users,
      value: postsVisible,
      onChange: setPostsVisible,
      options: [
        {
          value: true,
          label: '公開',
          icon: Globe,
          description: 'すべてのメンバーに公開',
        },
        {
          value: false,
          label: '非公開',
          icon: Lock,
          description: 'あなたのみ表示',
        },
      ],
    },
    {
      id: 'activity_visibility',
      title: '活動履歴公開',
      description: 'いいねやコメントの履歴を他のユーザーが見ることができます',
      icon: EyeOff,
      value: activityVisible,
      onChange: setActivityVisible,
      options: [
        {
          value: true,
          label: '公開',
          icon: Globe,
          description: 'すべてのメンバーに公開',
        },
        {
          value: false,
          label: '非公開',
          icon: Lock,
          description: 'あなたのみ表示',
        },
      ],
    },
    {
      id: 'contact_allowed',
      title: 'メッセージ受信',
      description: '他のユーザーからのメッセージを受信できます',
      icon: Shield,
      value: contactAllowed,
      onChange: setContactAllowed,
      options: [
        {
          value: true,
          label: '許可',
          icon: Globe,
          description: 'すべてのメンバーから受信',
        },
        {
          value: false,
          label: '拒否',
          icon: Lock,
          description: 'メッセージを受信しない',
        },
      ],
    },
  ];

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
            <h1 className="text-lg font-bold text-gray-900">
              プライバシー設定
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">
                プライバシーについて
              </h3>
              <p className="text-sm text-blue-700">
                HelloChicagoは信頼できるコミュニティを維持するため、
                すべてのメンバーは事前に承認されています。
                あなたの情報は安全に保護されます。
              </p>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-4">
          {privacyOptions.map(option => (
            <div
              key={option.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="flex items-start space-x-4 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <option.icon className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-600">{option.description}</p>
                </div>
              </div>

              <div className="space-y-3">
                {option.options.map(choice => (
                  <label
                    key={choice.value.toString()}
                    className={`flex items-center space-x-3 p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                      option.value === choice.value
                        ? 'bg-coral-50 border-2 border-coral-200'
                        : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name={option.id}
                      checked={option.value === choice.value}
                      onChange={() => option.onChange(choice.value)}
                      className="hidden"
                    />
                    <div className="flex items-center space-x-3">
                      <choice.icon
                        className={`w-5 h-5 ${
                          option.value === choice.value
                            ? 'text-coral-600'
                            : 'text-gray-500'
                        }`}
                      />
                      <div>
                        <div
                          className={`font-medium ${
                            option.value === choice.value
                              ? 'text-coral-900'
                              : 'text-gray-900'
                          }`}
                        >
                          {choice.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {choice.description}
                        </div>
                      </div>
                    </div>
                    {option.value === choice.value && (
                      <div className="ml-auto w-5 h-5 bg-coral-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Data Usage Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">データの取り扱い</h3>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <p>投稿データは承認されたメンバーのみが閲覧できます</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <p>個人情報は暗号化して安全に保存されます</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <p>データは第三者に共有されることはありません</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-2"></div>
              <p>アカウント削除時にすべてのデータが削除されます</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4">
          <button className="w-full py-4 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200">
            設定を保存
          </button>
          <p className="text-center text-sm text-gray-500 mt-3">
            ※ プライバシー設定機能は今後実装予定です
          </p>
        </div>
      </div>
    </div>
  );
}
