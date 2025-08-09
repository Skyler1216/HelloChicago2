import React, { useState, useRef } from 'react';
import { X, Camera, Save, Upload, AlertCircle } from 'lucide-react';
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

              <button
                type="button"
                onClick={handleCameraClick}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 bg-coral-500 rounded-full flex items-center justify-center text-white hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Upload className="w-4 h-4" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
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
              <p className="text-sm text-gray-500">
                カメラアイコンをクリックして画像をアップロード
              </p>
              <p className="text-xs text-gray-400">
                JPEG、PNG、WebP形式・2MB以下推奨
              </p>

              {/* アップロードエラー表示 */}
              {uploadError && (
                <div className="flex items-center space-x-2 text-red-600 text-sm">
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
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={e => handleChange('name', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
              placeholder="お名前を入力してください"
              required
            />
          </div>

          {/* Avatar URL Field */}
          <div>
            <label
              htmlFor="avatar_url"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              プロフィール画像URL（オプション）
            </label>
            <input
              type="url"
              id="avatar_url"
              value={formData.avatar_url}
              onChange={e => handleChange('avatar_url', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
              placeholder="https://example.com/avatar.jpg"
            />
            <p className="text-sm text-gray-500 mt-1">
              画像のURLを入力してください（HTTPS推奨）
            </p>
          </div>

          {/* Profile Info */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-medium text-gray-900 mb-2">アカウント情報</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">メールアドレス:</span>
                <span className="text-gray-900">{profile.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">登録日:</span>
                <span className="text-gray-900">
                  {new Date(profile.created_at).toLocaleDateString('ja-JP')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ロール:</span>
                <span className="text-gray-900">
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
              className="flex-1 py-3 px-6 border border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-6 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
