import React, { useState } from 'react';
import { Heart, MessageCircle, Send, ArrowLeft } from 'lucide-react';
import { Database } from '../types/database';
import { useComments } from '../hooks/useComments';
import { useLikes } from '../hooks/useLikes';
import { useAuth } from '../hooks/useAuth';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
};

interface PostDetailViewProps {
  post: Post;
  onBack: () => void;
}

export default function PostDetailView({ post, onBack }: PostDetailViewProps) {
  const { user } = useAuth();
  const {
    isLiked,
    likesCount,
    loading: likesLoading,
    toggleLike,
  } = useLikes(post.id, user?.id);
  const {
    comments,
    loading: commentsLoading,
    addComment,
  } = useComments(post.id);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addComment(newComment.trim(), user.id);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <div className='bg-white border-b border-gray-100 sticky top-0 z-10'>
        <div className='max-w-md mx-auto px-4 py-4'>
          <div className='flex items-center space-x-3'>
            <button
              onClick={onBack}
              className='p-2 hover:bg-gray-100 rounded-full transition-colors'
            >
              <ArrowLeft className='w-5 h-5 text-gray-600' />
            </button>
            <h1 className='text-lg font-semibold text-gray-900'>投稿詳細</h1>
          </div>
        </div>
      </div>

      <div className='max-w-md mx-auto px-4 py-6'>
        {/* Post Content */}
        <div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6'>
          {/* Post header, content, etc. - same as PostCard */}
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center space-x-3'>
              <div className='w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center'>
                <span className='text-sm font-medium text-gray-600'>
                  {post.profiles.name.charAt(0)}
                </span>
              </div>
              <div>
                <p className='font-medium text-gray-900'>
                  {post.profiles.name}
                </p>
                <p className='text-xs text-gray-500'>
                  {new Date(post.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>
          </div>

          <h3 className='font-bold text-gray-900 mb-2 text-lg leading-tight'>
            {post.title}
          </h3>

          <p className='text-gray-700 mb-4 leading-relaxed'>{post.content}</p>

          {/* Actions */}
          <div className='flex items-center justify-between pt-3 border-t border-gray-100'>
            <button
              onClick={toggleLike}
              disabled={likesLoading || !user}
              className={`flex items-center space-x-2 transition-colors ${
                isLiked
                  ? 'text-coral-600'
                  : 'text-gray-500 hover:text-coral-600'
              } disabled:opacity-50`}
            >
              <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              <span className='text-sm font-medium'>{likesCount}</span>
            </button>
            <div className='flex items-center space-x-2 text-gray-500'>
              <MessageCircle className='w-5 h-5' />
              <span className='text-sm font-medium'>
                {comments.length}件のコメント
              </span>
            </div>
          </div>
        </div>

        {/* Comment Form */}
        {user && (
          <form
            onSubmit={handleSubmitComment}
            className='bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6'
          >
            <div className='flex space-x-3'>
              <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0'>
                <span className='text-xs font-medium text-gray-600'>
                  {user.email?.charAt(0)}
                </span>
              </div>
              <div className='flex-1'>
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder='コメントを入力...'
                  className='w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-coral-500 focus:border-transparent'
                  rows={3}
                />
                <div className='flex justify-end mt-2'>
                  <button
                    type='submit'
                    disabled={!newComment.trim() || isSubmitting}
                    className='flex items-center space-x-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <Send className='w-4 h-4' />
                    <span>{isSubmitting ? '送信中...' : 'コメント'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Comments */}
        <div className='space-y-4'>
          {commentsLoading ? (
            <div className='text-center py-4'>
              <div className='w-6 h-6 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto'></div>
            </div>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <div
                key={comment.id}
                className='bg-white rounded-2xl shadow-sm border border-gray-100 p-4'
              >
                <div className='flex items-start space-x-3'>
                  <div className='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0'>
                    <span className='text-xs font-medium text-gray-600'>
                      {comment.profiles.name.charAt(0)}
                    </span>
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-center space-x-2 mb-1'>
                      <span className='font-medium text-gray-900 text-sm'>
                        {comment.profiles.name}
                      </span>
                      <span className='text-xs text-gray-500'>
                        {new Date(comment.created_at).toLocaleDateString(
                          'ja-JP'
                        )}
                      </span>
                    </div>
                    <p className='text-gray-700 text-sm leading-relaxed'>
                      {comment.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className='text-center py-8'>
              <MessageCircle className='w-12 h-12 text-gray-300 mx-auto mb-2' />
              <p className='text-gray-500'>まだコメントがありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
