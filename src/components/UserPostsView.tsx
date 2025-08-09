import React, { useState } from 'react';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Heart,
  MessageSquare,
  Clock,
  MapPin,
} from 'lucide-react';
import { useUserPosts } from '../hooks/useUserPosts';
import PostDetailView from './PostDetailView';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

interface UserPostsViewProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

export default function UserPostsView({
  userId,
  userName,
  onBack,
}: UserPostsViewProps) {
  const { posts, loading } = useUserPosts(userId);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showFilter, setShowFilter] = useState<'all' | 'approved' | 'pending'>(
    'all'
  );

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  const filteredPosts = posts.filter(post => {
    if (showFilter === 'approved') return post.approved;
    if (showFilter === 'pending') return !post.approved;
    return true;
  });

  const getStatusBadge = (post: Post) => {
    if (!post.approved) {
      return (
        <div className="flex items-center space-x-1 text-yellow-600">
          <Clock className="w-4 h-4" />
          <span className="text-xs">承認待ち</span>
        </div>
      );
    }

    if (post.type === 'consultation') {
      const statusColors = {
        open: 'text-green-600',
        in_progress: 'text-yellow-600',
        closed: 'text-gray-600',
      };

      const statusLabels = {
        open: '募集中',
        in_progress: '進行中',
        closed: '解決済み',
      };

      return (
        <div
          className={`flex items-center space-x-1 ${statusColors[post.status as keyof typeof statusColors] || 'text-gray-600'}`}
        >
          <div className="w-2 h-2 rounded-full bg-current"></div>
          <span className="text-xs">
            {statusLabels[post.status as keyof typeof statusLabels] || '未設定'}
          </span>
        </div>
      );
    }

    if (post.type === 'transfer') {
      const statusColors = {
        open: 'text-blue-600',
        in_progress: 'text-yellow-600',
        closed: 'text-gray-600',
      };

      const statusLabels = {
        open: '募集中',
        in_progress: '取引中',
        closed: '完了',
      };

      return (
        <div
          className={`flex items-center space-x-1 ${statusColors[post.status as keyof typeof statusColors] || 'text-gray-600'}`}
        >
          <div className="w-2 h-2 rounded-full bg-current"></div>
          <span className="text-xs">
            {statusLabels[post.status as keyof typeof statusLabels] || '未設定'}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1 text-green-600">
        <Eye className="w-4 h-4" />
        <span className="text-xs">公開中</span>
      </div>
    );
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
              <h1 className="text-lg font-bold text-gray-900">
                {userName}の投稿
              </h1>
              <p className="text-sm text-gray-500">{posts.length}件の投稿</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex space-x-1">
            {[
              { key: 'all', label: 'すべて', count: posts.length },
              {
                key: 'approved',
                label: '公開中',
                count: posts.filter(p => p.approved).length,
              },
              {
                key: 'pending',
                label: '承認待ち',
                count: posts.filter(p => !p.approved).length,
              },
            ].map(filter => (
              <button
                key={filter.key}
                onClick={() => setShowFilter(filter.key as typeof showFilter)}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                  showFilter === filter.key
                    ? 'bg-coral-500 text-white'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                }`}
              >
                {filter.label} ({filter.count})
              </button>
            ))}
          </div>
        </div>

        {/* Posts List */}
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-500">読み込み中...</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          <div className="space-y-4">
            {filteredPosts.map(post => (
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
                      {getStatusBadge(post)}
                    </div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2">
                      {post.title}
                    </h3>
                  </div>
                  {!post.approved && (
                    <EyeOff className="w-5 h-5 text-yellow-500 flex-shrink-0 ml-2" />
                  )}
                </div>

                {/* Post Content */}
                <p className="text-gray-600 text-sm line-clamp-3 mb-3">
                  {post.content}
                </p>

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
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">
                        {post.location_address}
                      </span>
                    </div>
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
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              投稿がありません
            </h3>
            <p className="text-gray-500">
              {showFilter === 'pending' && '承認待ちの投稿はありません'}
              {showFilter === 'approved' && '公開中の投稿はありません'}
              {showFilter === 'all' && 'まだ投稿がありません'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
