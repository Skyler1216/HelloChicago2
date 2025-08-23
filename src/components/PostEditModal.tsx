import React, { useEffect, useState } from 'react';
import { X, Send, Camera } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Database } from '../types/database';
import { useCategories } from '../hooks/useCategories';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

interface PostEditModalProps {
  isOpen: boolean;
  post: Post | null;
  onClose: () => void;
  onSaved?: (updated: Post) => void;
}

export default function PostEditModal({
  isOpen,
  post,
  onClose,
  onSaved,
}: PostEditModalProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { updatePost } = usePosts();
  const { user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'post' as 'post' | 'consultation' | 'transfer',
    title: '',
    content: '',
    category: '',
    location: '',
    lat: 41.8781,
    lng: -87.6298,
    images: [] as string[],
  });

  // Prefill when post changes
  useEffect(() => {
    if (!post) return;
    setFormData({
      type: post.type,
      title: post.title,
      content: post.content,
      category: post.category_id,
      location: post.location_address,
      lat: post.location_lat,
      lng: post.location_lng,
      images: post.images || [],
    });
  }, [post]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!post || !user || user.id !== post.author_id) {
      setError('権限がありません');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updatePost(post.id, {
        title: formData.title,
        content: formData.content,
        type: formData.type,
        category_id: formData.category,
        location_lat: formData.lat,
        location_lng: formData.lng,
        location_address: formData.location,
        images: formData.images,
      });
      if (onSaved) {
        onSaved(updated as unknown as Post);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !post) return null;

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

  // Reuse PostFormModal's look and feel
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">投稿を編集</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
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

            {/* 場所入力は不要のため削除 */}

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
                rows={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all resize-none"
                required
              />
            </div>

            {/* Photo Upload placeholder (same as create form) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                写真 (任意)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-coral-400 transition-colors">
                <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">写真を追加・変更</p>
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
                  <span>更新中...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>更新する</span>
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
