import React, { memo } from 'react';
import { Heart, MessageCircle, MapPin, HelpCircle, Gift } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Database } from '../types/database';
import { useLikes } from '../hooks/useLikes';
import { useAuth } from '../hooks/useAuth';
import { useComments } from '../hooks/useComments';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
};

interface PostCardProps {
  post: Post;
  onClick?: () => void;
}

function PostCard({ post, onClick }: PostCardProps) {
  const { user } = useAuth();
  const {
    isLiked,
    likesCount,
    loading: likesLoading,
    toggleLike,
  } = useLikes(post.id, user?.id);
  const { totalCount: commentsCount } = useComments(post.id);

  const IconComponent =
    LucideIcons[post.categories.icon as keyof typeof LucideIcons];

  const getPostTypeInfo = () => {
    switch (post.type) {
      case 'consultation':
        return {
          icon: HelpCircle,
          label: '相談',
          color: 'text-teal-600',
          bgColor: 'bg-teal-50',
          borderColor: 'border-teal-200',
        };
      case 'transfer':
        return {
          icon: Gift,
          label: '譲渡',
          color: 'text-coral-600',
          bgColor: 'bg-coral-50',
          borderColor: 'border-coral-200',
        };
      default:
        return {
          icon: MessageCircle,
          label: '投稿',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
        };
    }
  };

  const postTypeInfo = getPostTypeInfo();
  const PostTypeIcon = postTypeInfo.icon;

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4 hover:shadow-md transition-shadow duration-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-gray-600">
              {post.profiles.name.charAt(0)}
            </span>
          </div>
          <div>
            <p className="font-medium text-gray-900">{post.profiles.name}</p>
            <p className="text-xs text-gray-500">
              {new Date(post.created_at).toLocaleDateString('ja-JP')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Post Type Badge */}
          <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${postTypeInfo.bgColor} ${postTypeInfo.color} border ${postTypeInfo.borderColor}`}
          >
            <PostTypeIcon className="w-3 h-3" />
            <span>{postTypeInfo.label}</span>
          </div>
          {/* Category Badge */}
          <div
            className="flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: post.categories.color + '20',
              color: post.categories.color,
            }}
          >
            {IconComponent && <IconComponent className="w-4 h-4" />}
            <span>{post.categories.name_ja}</span>
          </div>
        </div>
      </div>

      {/* Status Badge for consultations and transfers */}
      {(post.type === 'consultation' || post.type === 'transfer') &&
        post.status && (
          <div className="mb-3">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                post.status === 'open'
                  ? 'bg-green-100 text-green-800'
                  : post.status === 'in_progress'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}
            >
              {post.status === 'open' && '受付中'}
              {post.status === 'in_progress' && '対応中'}
              {post.status === 'closed' && '解決済み'}
            </span>
          </div>
        )}

      {/* Title */}
      <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight">
        {post.title}
      </h3>

      {/* Image */}
      {post.images.length > 0 && (
        <div className="mb-3 rounded-xl overflow-hidden">
          <img
            src={post.images[0]}
            alt={post.title}
            className="w-full h-48 object-cover"
          />
        </div>
      )}

      {/* Content/Summary */}
      {post.summary && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {post.summary}
          </p>
        </div>
      )}

      {/* Location */}
      <div className="flex items-center space-x-1 text-gray-500 mb-3">
        <MapPin className="w-4 h-4" />
        <span className="text-sm">{post.location_address}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <button
          onClick={e => {
            e.stopPropagation();
            toggleLike();
          }}
          disabled={likesLoading || !user}
          className={`flex items-center space-x-2 transition-colors ${
            isLiked ? 'text-coral-600' : 'text-gray-500 hover:text-coral-600'
          } disabled:opacity-50`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-sm font-medium">{likesCount}</span>
        </button>
        <button
          onClick={e => {
            e.stopPropagation();
            onClick?.();
          }}
          className="flex items-center space-x-2 text-gray-500 hover:text-teal-600 transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-sm font-medium">
            {commentsCount > 0 ? `${commentsCount}件のコメント` : 'コメント'}
          </span>
        </button>
      </div>
    </div>
  );
}

export default memo(PostCard);
