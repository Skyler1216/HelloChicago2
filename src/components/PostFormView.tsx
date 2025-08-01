import React, { useState } from 'react';
import {
  Camera,
  MapPin,
  Send,
  MessageSquare,
  HelpCircle,
  Gift,
} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { usePosts } from '../hooks/usePosts';
import { useAuth } from '../hooks/useAuth';

export default function PostFormView() {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createPost } = usePosts();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'post' as 'post' | 'consultation' | 'transfer',
    title: '',
    content: '',
    category: '',
    location: '',
    lat: 41.8781, // Default to Chicago coordinates
    lng: -87.6298,
    images: [] as string[],
  });

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
          ? '投稿'
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
        location: '',
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

  const postTypes = [
    {
      id: 'post' as const,
      label: '投稿',
      icon: MessageSquare,
      description: '体験談やおすすめをシェア',
    },
    {
      id: 'consultation' as const,
      label: '相談',
      icon: HelpCircle,
      description: '質問や相談をする',
    },
    {
      id: 'transfer' as const,
      label: '譲渡',
      icon: Gift,
      description: '不要なものを譲る・もらう',
    },
  ];

  if (categoriesLoading) {
    return (
      <div className='px-4 py-6 flex items-center justify-center'>
        <div className='w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin'></div>
      </div>
    );
  }

  return (
    <div className='px-4 py-6'>
      <div className='mb-6'>
        <h2 className='text-xl font-bold text-gray-900 mb-2'>新しい投稿</h2>
        <p className='text-gray-600 text-sm'>
          体験談のシェア、相談、譲渡など、コミュニティで情報交換しましょう
        </p>
      </div>

      {error && (
        <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
          <p className='text-red-600 text-sm'>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className='space-y-6'>
        {/* Post Type Selection */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-3'>
            投稿タイプ
          </label>
          <div className='space-y-2'>
            {postTypes.map(type => {
              const IconComponent = type.icon;

              return (
                <button
                  key={type.id}
                  type='button'
                  onClick={() => setFormData({ ...formData, type: type.id })}
                  className={`w-full flex items-center space-x-3 p-4 rounded-xl border-2 transition-all text-left ${
                    formData.type === type.id
                      ? 'border-teal-500 bg-teal-50 text-teal-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className='w-5 h-5' />
                  <div>
                    <div className='font-medium'>{type.label}</div>
                    <div className='text-sm text-gray-500'>
                      {type.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            タイトル
          </label>
          <input
            type='text'
            value={formData.title}
            onChange={e => setFormData({ ...formData, title: e.target.value })}
            placeholder={
              formData.type === 'post'
                ? '例：Northwestern Memorial Hospitalで出産体験'
                : formData.type === 'consultation'
                  ? '例：土曜夜に品川区で婚姻届を出したい'
                  : '例：ベビーゲートいただけませんか？'
            }
            className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all'
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            カテゴリー
          </label>
          <div className='grid grid-cols-2 gap-3'>
            {categories.map(category => {
              const IconComponent =
                LucideIcons[category.icon as keyof typeof LucideIcons];

              return (
                <button
                  key={category.id}
                  type='button'
                  onClick={() =>
                    setFormData({ ...formData, category: category.id })
                  }
                  className={`flex items-center space-x-2 p-3 rounded-xl border-2 transition-all ${
                    formData.category === category.id
                      ? 'border-coral-500 bg-coral-50 text-coral-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {IconComponent && <IconComponent className='w-4 h-4' />}
                  <span className='text-sm font-medium'>
                    {category.name_ja}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            場所
          </label>
          <div className='relative'>
            <MapPin className='absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
            <input
              type='text'
              value={formData.location}
              onChange={e =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder='住所または場所名を入力'
              className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all'
              required
            />
          </div>
        </div>

        {/* Content */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            {formData.type === 'post'
              ? '体験談・詳細'
              : formData.type === 'consultation'
                ? '相談内容'
                : '詳細・条件'}
          </label>
          <textarea
            value={formData.content}
            onChange={e =>
              setFormData({ ...formData, content: e.target.value })
            }
            placeholder={
              formData.type === 'post'
                ? 'あなたの体験を詳しく教えてください。他の方の参考になるように、具体的な情報（料金、予約方法、注意点など）も含めてください。'
                : formData.type === 'consultation'
                  ? '相談したい内容を詳しく教えてください。状況や背景も含めて書いていただくと、より適切なアドバイスがもらえます。'
                  : '譲渡したいもの・欲しいものの詳細、状態、受け渡し方法などを教えてください。'
            }
            rows={6}
            className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all resize-none'
            required
          />
        </div>

        {/* Photo Upload */}
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            写真（任意）
          </label>
          <div className='border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-coral-400 transition-colors'>
            <Camera className='w-8 h-8 text-gray-400 mx-auto mb-2' />
            <p className='text-sm text-gray-600 mb-2'>写真をアップロード</p>
            <button
              type='button'
              className='text-coral-600 text-sm font-medium hover:text-coral-700 transition-colors'
            >
              ファイルを選択
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type='submit'
          disabled={isSubmitting}
          className='w-full bg-gradient-to-r from-coral-500 to-coral-400 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-center space-x-2 hover:from-coral-600 hover:to-coral-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSubmitting ? (
            <>
              <div className='w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              <span>送信中...</span>
            </>
          ) : (
            <>
              <Send className='w-5 h-5' />
              <span>
                {formData.type === 'post'
                  ? '投稿する'
                  : formData.type === 'consultation'
                    ? '相談する'
                    : '投稿する'}
              </span>
            </>
          )}
        </button>

        <p className='text-xs text-gray-500 text-center'>
          投稿内容はコミュニティガイドラインに従ってください
        </p>
      </form>
    </div>
  );
}
