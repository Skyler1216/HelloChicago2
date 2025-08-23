import React, { useState } from 'react';
import { ArrowLeft, Heart, MessageSquare, HeartOff } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import PostDetailView from './PostDetailView';
import { Database } from '../types/database';
import { useToast } from '../hooks/useToast';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

interface FavoritesViewProps {
  userId: string;
  onBack: () => void;
}

export default function FavoritesView({ userId, onBack }: FavoritesViewProps) {
  const { favorites, loading, removeFromFavorites } = useFavorites(userId);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const { addToast } = useToast();

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  const handleRemoveFromFavorites = async (
    postId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();

    const success = await removeFromFavorites(postId);
    if (success) {
      addToast('success', 'お気に入りから削除しました');
    } else {
      addToast('error', '削除に失敗しました');
    }
  };

  const getTypeLabel = (type: string) => {
    const typeLabels = {
      post: '体験',
      consultation: '相談',
      transfer: '譲渡',
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    const colors = {
      post: 'bg-blue-100 text-blue-800',
      consultation: 'bg-teal-100 text-teal-800',
      transfer: 'bg-coral-100 text-coral-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
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
            <div>
              <h1 className="text-lg font-bold text-gray-900">お気に入り</h1>
              <p className="text-sm text-gray-500">
                {favorites.length}件の投稿
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : favorites.length > 0 ? (
          <div className="space-y-4">
            {favorites.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadgeColor(post.type)}`}
                      >
                        {getTypeLabel(post.type)}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                  <button
                    onClick={e => handleRemoveFromFavorites(post.id, e)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition-colors group flex-shrink-0 ml-2"
                    title="お気に入りから削除"
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-current group-hover:hidden" />
                    <HeartOff className="w-5 h-5 text-red-500 hidden group-hover:block" />
                  </button>
                </div>

                {/* Post Content */}
                <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                  {post.content}
                </p>

                {/* Author Info */}
                <div className="flex items-center space-x-2 mb-3">
                  <div className="w-6 h-6 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-xs">
                      {post.profiles.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {post.profiles.name}
                  </span>
                </div>

                {/* Post Meta */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Heart className="w-4 h-4" />
                      <span>{post.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{post.comments_count || 0}</span>
                    </div>
                    {/* 場所情報は非表示 */}
                  </div>
                  <span className="text-xs">
                    {new Date(post.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>

                {/* Category */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: post.categories.color }}
                    ></div>
                    <span className="text-sm text-gray-600">
                      {post.categories.name_ja}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              お気に入りがありません
            </h3>
            <p className="text-gray-500 mb-4">
              気になる投稿にハートマークを付けて
              <br />
              お気に入りに追加しましょう
            </p>
            <button
              onClick={onBack}
              className="px-6 py-3 bg-gradient-to-r from-coral-500 to-coral-400 text-white rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200"
            >
              投稿を見つける
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
