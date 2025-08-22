import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Send, X } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';

interface PostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'post' | 'consultation' | 'transfer';
}

export default function PostFormModal({
  isOpen,
  onClose,
  initialType = 'post',
}: PostFormModalProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createPost } = usePosts();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: initialType,
    title: '',
    content: '',
    category: '',
    location: '',
    lat: 41.8781, // Default to Chicago coordinates
    lng: -87.6298,
    images: [] as string[],
  });

  // Update formData.type when initialType changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      type: initialType,
    }));
  }, [initialType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('ログインが必要です');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createPost({
        title: formData.title,
        content: formData.content,
        type: formData.type,
        category_id: formData.category,
        location_lat: formData.lat,
        location_lng: formData.lng,
        location_address: formData.location,
        images: formData.images,
        author_id: user.id,
        status: formData.type !== 'post' ? 'open' : null,
        approved: true, // Auto-approve posts
      });

      const typeLabel =
        formData.type === 'post'
          ? '体験'
          : formData.type === 'consultation'
            ? '相談'
            : '譲渡';
      alert(`${typeLabel}が投稿されました！`);

      // Reset form and close modal
      setFormData({
        type: initialType,
        title: '',
        content: '',
        category: '',
        location: '',
        lat: 41.8781,
        lng: -87.6298,
        images: [],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  if (categoriesLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">新しい投稿</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-red-500" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                タイトル
                <span className="text-xs text-gray-500 ml-2">
                  ({formData.title.length}/30)
                </span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => {
                  const value = e.target.value;
                  if (value.length <= 30) {
                    setFormData({ ...formData, title: value });
                  }
                }}
                maxLength={30}
                placeholder={
                  formData.type === 'post'
                    ? '例：ミレニアムパークで子どもとピクニック'
                    : formData.type === 'consultation'
                      ? '例：子ども向けのオススメの病院'
                      : '例：ベビーゲートお譲りします'
                }
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all ${
                  formData.title.length >= 30
                    ? 'border-orange-300 bg-orange-50'
                    : 'border-gray-200'
                }`}
                required
              />
              {formData.title.length >= 30 && (
                <p className="mt-1 text-xs text-orange-600">
                  タイトルは30文字までです
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                カテゴリー
              </label>
              <div className="grid grid-cols-2 gap-3">
                {categories.map(category => {
                  const IconComponent =
                    LucideIcons[category.icon as keyof typeof LucideIcons];

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, category: category.id })
                      }
                      className={`flex items-center space-x-2 p-3 rounded-xl border-2 transition-all ${
                        formData.category === category.id
                          ? 'border-coral-500 bg-coral-50 text-coral-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {IconComponent &&
                        typeof IconComponent === 'function' &&
                        React.createElement(
                          IconComponent as React.ComponentType<{
                            className?: string;
                          }>,
                          { className: 'w-4 h-4' }
                        )}
                      <span className="text-sm font-medium">
                        {category.name_ja}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                場所
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.location}
                  onChange={e =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  placeholder="住所または場所名を入力"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.type === 'post'
                  ? '体験談・詳細'
                  : formData.type === 'consultation'
                    ? '相談内容・詳細'
                    : '譲渡内容・詳細'}
              </label>
              <textarea
                value={formData.content}
                onChange={e =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder={
                  formData.type === 'post'
                    ? 'あなたの体験を詳しく教えてください。他の方の参考になるように、具体的な情報 (料金、予約方法、注意点など)も含めてください。'
                    : formData.type === 'consultation'
                      ? 'どのような相談でしょうか？できるだけ詳しく教えてください。他の方からのアドバイスが得やすくなります。'
                      : '譲渡したいものについて詳しく教えてください。状態、サイズ、受け渡し方法などを含めてください。'
                }
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all resize-none"
                required
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                写真 (任意)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-coral-400 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">写真を追加する</p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-coral-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>投稿中...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>投稿する</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
      {/* Overlay click handler */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
