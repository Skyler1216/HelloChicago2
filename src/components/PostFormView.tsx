import { useState, useEffect } from 'react';
import { Camera, Send, ArrowLeft } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';

interface PostFormViewProps {
  initialType?: 'post' | 'consultation' | 'transfer';
  onBack?: () => void;
}

export default function PostFormView({
  initialType = 'post',
  onBack,
}: PostFormViewProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createPost } = usePosts();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: initialType as 'post' | 'consultation' | 'transfer',
    title: '',
    content: '',
    category: '',
    // location fields removed from UI; keep defaults for backend compatibility
    lat: 41.8781,
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
        // no explicit address in Home form
        location_address: '',
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

      // Reset form
      setFormData({
        type: 'post',
        title: '',
        content: '',
        category: '',
        lat: 41.8781,
        lng: -87.6298,
        images: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  // カテゴリーの表示順序は sort_order → name_ja
  const sortedCategories = [...categories].sort((a, b) => {
    const ao = (a.sort_order ?? 9999) as number;
    const bo = (b.sort_order ?? 9999) as number;
    if (ao !== bo) return ao - bo;
    return a.name_ja.localeCompare(b.name_ja, 'ja');
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack || (() => window.history.back())}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-900">新しい投稿</h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Post Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              投稿タイプ
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  id: 'post',
                  label: '体験',
                  icon: Camera,
                  color: 'text-blue-600',
                  bgColor: 'bg-blue-50',
                  borderColor: 'border-blue-200',
                },
                {
                  id: 'consultation',
                  label: '相談',
                  icon: LucideIcons.HelpCircle,
                  color: 'text-teal-600',
                  bgColor: 'bg-teal-50',
                  borderColor: 'border-teal-200',
                },
                {
                  id: 'transfer',
                  label: '譲渡',
                  icon: LucideIcons.Gift,
                  color: 'text-coral-600',
                  bgColor: 'bg-coral-50',
                  borderColor: 'border-coral-200',
                },
              ].map(type => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({
                        ...prev,
                        type: type.id as 'post' | 'consultation' | 'transfer',
                      }))
                    }
                    className={`p-3 rounded-lg border-2 transition-all ${
                      formData.type === type.id
                        ? `${type.borderColor} ${type.bgColor}`
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <IconComponent
                      className={`w-5 h-5 mx-auto mb-1 ${type.color}`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        formData.type === type.id ? type.color : 'text-gray-600'
                      }`}
                    >
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              タイトル
              <span className="text-xs text-gray-500 ml-2">
                ({formData.title.length}/30)
              </span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={e => {
                const value = e.target.value;
                if (value.length <= 30) {
                  setFormData(prev => ({ ...prev, title: value }));
                }
              }}
              maxLength={30}
              placeholder={
                formData.type === 'post'
                  ? '例: ミレニアムパークで子どもとピクニック'
                  : formData.type === 'consultation'
                    ? '例: シカゴでおすすめの日本語学校は？'
                    : '例: 子ども服を譲ります'
              }
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent ${
                formData.title.length >= 30
                  ? 'border-orange-300 bg-orange-50'
                  : 'border-gray-300'
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
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              カテゴリー
            </label>
            <div className="grid grid-cols-2 gap-3">
              {sortedCategories.map(category => {
                const IconComponent = LucideIcons[
                  category.icon as keyof typeof LucideIcons
                ] as React.ComponentType<{ className?: string }>;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setFormData(prev => ({ ...prev, category: category.id }))
                    }
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      formData.category === category.id
                        ? 'border-coral-500 bg-coral-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {IconComponent && (
                        <IconComponent className="w-4 h-4 text-gray-600" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {category.name_ja}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 場所入力は不要のため削除 */}

          {/* Content */}
          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              {formData.type === 'post'
                ? '体験談・詳細'
                : formData.type === 'consultation'
                  ? '相談内容・詳細'
                  : '譲渡内容・詳細'}
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={e =>
                setFormData(prev => ({ ...prev, content: e.target.value }))
              }
              placeholder={
                formData.type === 'post'
                  ? 'あなたの体験を詳しく教えてください。できれば、他の方の参考になるように、具体的な情報 (料金、予約方法、注意点など)も含めてください。'
                  : formData.type === 'consultation'
                    ? 'どのような相談でしょうか？できるだけ詳しく教えてください。他の方からのアドバイスが得やすくなります。'
                    : '譲渡したいものについて詳しく教えてください。状態、サイズ、受け渡し方法などを含めてください。'
              }
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              写真 (任意)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-coral-400 transition-colors">
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">写真を追加する</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-coral-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
  );
}
