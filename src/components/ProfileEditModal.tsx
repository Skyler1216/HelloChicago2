import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Save, Upload, AlertCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useToast } from '../hooks/useToast';
import { useImageUpload } from '../hooks/useImageUpload';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdate: (updatedProfile: Profile) => void;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  profile,
  onUpdate,
}: ProfileEditModalProps) {
  const [formData, setFormData] = useState({
    name: profile.name,
    avatar_url: profile.avatar_url || '',
  });
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const {
    uploadImage,
    uploading,
    uploadProgress,
    error: uploadError,
  } = useImageUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いている時に背景スクロールを禁止
  useEffect(() => {
    if (isOpen) {
      // モーダルが開いた時にbodyのスクロールを禁止
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '0px'; // スクロールバーが消えることによるレイアウトシフトを防ぐ
    } else {
      // モーダルが閉じた時にbodyのスクロールを復活
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    // クリーンアップ関数
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          avatar_url: formData.avatar_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data);
      addToast('success', 'プロフィールが更新されました');
      onClose();
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      addToast('error', 'プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const uploadedUrl = await uploadImage(file, profile.id);
      if (uploadedUrl) {
        setFormData(prev => ({
          ...prev,
          avatar_url: uploadedUrl,
        }));
        addToast('success', '画像がアップロードされました');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
    }

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      avatar_url: '',
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">プロフィール編集</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="w-24 h-24 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-bold text-2xl">
                    {formData.name?.charAt(0) || 'U'}
                  </span>
                )}

                {/* アップロード中のオーバーレイ */}
                {uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                      <div className="text-xs text-white">
                        {uploadProgress}%
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* カメラアイコンボタン */}
              <button
                type="button"
                onClick={handleCameraClick}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center text-white hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {uploading ? (
                  <Upload className="w-4 h-4" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>

              {/* 画像削除ボタン（画像がある場合のみ表示） */}
              {formData.avatar_url && !uploading && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-0 right-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* ファイル入力（非表示） */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
            />

            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">
                カメラアイコンをクリックして画像をアップロード
              </p>
              <p className="text-xs text-gray-400">
                JPEG、PNG、WebP形式・2MB以下推奨
              </p>

              {/* アップロードエラー表示 */}
              {uploadError && (
                <div className="flex items-center justify-center space-x-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              名前
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
                placeholder="お名前を入力してください"
                required
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Profile Info */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-3 flex items-center">
              <User className="w-4 h-4 mr-2 text-coral-500" />
              アカウント情報
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">
                  メールアドレス
                </span>
                <span className="text-gray-900 font-mono text-xs">
                  {profile.email}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600 font-medium">登録日</span>
                <span className="text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium">ロール</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    profile.role === 'admin'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {profile.role === 'admin' ? '管理者' : 'ユーザー'}
                </span>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:border-gray-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
