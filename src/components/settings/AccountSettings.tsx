import { useState } from 'react';
import {
  ArrowLeft,
  User,
  Mail,
  Lock,
  Edit3,
  Save,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../types/database';
import { useToast } from '../../hooks/useToast';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AccountSettingsProps {
  profile: Profile;
  onBack: () => void;
  onProfileUpdate: (updatedProfile: Profile) => void;
}

export default function AccountSettings({
  profile,
  onBack,
  onProfileUpdate,
}: AccountSettingsProps) {
  const [editingName, setEditingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const { addToast } = useToast();

  const handleNameUpdate = async () => {
    if (name.trim() === '' || name === profile.name) {
      setEditingName(false);
      setName(profile.name);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ name: name.trim() })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      onProfileUpdate(data);
      setEditingName(false);
      addToast('success', '名前が更新されました');
    } catch (error) {
      console.error('Name update error:', error);
      addToast('error', '名前の更新に失敗しました');
      setName(profile.name);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (email.trim() === '' || email === profile.email) {
      setEditingEmail(false);
      setEmail(profile.email);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        email: email.trim(),
      });

      if (error) throw error;

      addToast('success', 'メールアドレス変更の確認メールを送信しました');
      setEditingEmail(false);
    } catch (error: unknown) {
      console.error('Email update error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'メールアドレスの更新に失敗しました';
      addToast('error', errorMessage);
      setEmail(profile.email);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      addToast('error', 'パスワードが一致しません');
      return;
    }

    if (newPassword.length < 6) {
      addToast('error', 'パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      addToast('success', 'パスワードが更新されました');
      setShowPasswordForm(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: unknown) {
      console.error('Password update error:', error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'パスワードの更新に失敗しました';
      addToast('error', errorMessage);
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-lg font-bold text-gray-900">アカウント設定</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Profile Information */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h2>

          {/* Name Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="w-5 h-5 text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    名前
                  </label>
                  {editingName ? (
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                      autoFocus
                      onBlur={handleNameUpdate}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleNameUpdate();
                        } else if (e.key === 'Escape') {
                          setEditingName(false);
                          setName(profile.name);
                        }
                      }}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.name}</p>
                  )}
                </div>
              </div>
              {!editingName && (
                <button
                  onClick={() => setEditingName(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* Email Section */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    メールアドレス
                  </label>
                  {editingEmail ? (
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                      autoFocus
                      onBlur={handleEmailUpdate}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleEmailUpdate();
                        } else if (e.key === 'Escape') {
                          setEditingEmail(false);
                          setEmail(profile.email);
                        }
                      }}
                    />
                  ) : (
                    <p className="text-gray-900">{profile.email}</p>
                  )}
                </div>
              </div>
              {!editingEmail && (
                <button
                  onClick={() => setEditingEmail(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Edit3 className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* Role Display */}
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-gray-400" />
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ロール
                </label>
                <p className="text-gray-900">
                  {profile.role === 'admin' ? '管理者' : 'ユーザー'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">パスワード</h2>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors"
              >
                <Lock className="w-4 h-4" />
                <span>変更</span>
              </button>
            )}
          </div>

          {showPasswordForm ? (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  新しいパスワード
                </label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                  placeholder="新しいパスワードを入力"
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  パスワード確認
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                  placeholder="パスワードを再入力"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handlePasswordUpdate}
                  disabled={loading || !newPassword || !confirmPassword}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>更新</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">
              パスワードを変更するには上記のボタンをクリックしてください
            </p>
          )}
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            アカウント情報
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">登録日:</span>
              <span className="text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">最終更新:</span>
              <span className="text-gray-900">
                {new Date(profile.updated_at).toLocaleDateString('ja-JP')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">承認状態:</span>
              <span
                className={`font-medium ${profile.is_approved ? 'text-green-600' : 'text-yellow-600'}`}
              >
                {profile.is_approved ? '承認済み' : '承認待ち'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
