import React, { useState } from 'react';
import {
  Heart,
  MessageCircle,
  MapPin,
  Send,
  ArrowLeft,
  Edit,
  Trash2,
  X,
  Check,
} from 'lucide-react';
// import * as LucideIcons from 'lucide-react';
import { Database } from '../types/database';
import { useComments } from '../hooks/useComments';
import { useLikes } from '../hooks/useLikes';
import { useAuth } from '../hooks/useAuth';
import { usePosts } from '../hooks/usePosts';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  replies?: Comment[];
};

interface PostDetailViewProps {
  post: Post;
  onBack: () => void;
  onPostUpdate?: (updatedPost: Post) => void;
}

interface CommentItemProps {
  comment: Comment;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  currentUserId?: string;
}

function CommentItem({
  comment,
  onUpdate,
  onDelete,
  currentUserId,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOwnComment = currentUserId === comment.author_id;

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate(comment.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating comment:', error);
      alert('コメントの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('このコメントを削除しますか？')) return;

    setIsSubmitting(true);
    try {
      await onDelete(comment.id);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('コメントの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
          {comment.profiles.avatar_url ? (
            <img
              src={comment.profiles.avatar_url}
              alt={`${comment.profiles.name}のプロフィール画像`}
              className="w-full h-full object-cover"
              onError={e => {
                // 画像読み込みエラー時はイニシャルを表示
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('span');
                  fallback.className = 'text-xs font-medium text-gray-600';
                  fallback.textContent = comment.profiles.name.charAt(0);
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <span className="text-xs font-medium text-gray-600">
              {comment.profiles.name.charAt(0)}
            </span>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 text-sm">
                {comment.profiles.name}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(comment.created_at).toLocaleDateString('ja-JP')}
              </span>
              {isOwnComment && (
                <span className="text-xs text-coral-600 bg-coral-50 px-2 py-1 rounded-full">
                  あなた
                </span>
              )}
            </div>
            {isOwnComment && !isEditing && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  disabled={isSubmitting}
                  title="編集"
                >
                  <Edit className="w-3 h-3" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  disabled={isSubmitting}
                  title="削除"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                rows={3}
                disabled={isSubmitting}
                placeholder="コメントを編集..."
              />
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleEdit}
                  disabled={!editContent.trim() || isSubmitting}
                  className="flex items-center space-x-1 px-3 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <Check className="w-3 h-3" />
                  <span>{isSubmitting ? '保存中...' : '保存'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  <X className="w-3 h-3" />
                  <span>キャンセル</span>
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 text-sm leading-relaxed">
              {comment.content}
            </p>
          )}

          {/* Show replies if any */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 pl-4 border-l-2 border-gray-100 space-y-2">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostDetailView({
  post,
  onBack,
  onPostUpdate,
}: PostDetailViewProps) {
  const { user } = useAuth();
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentPost, setCurrentPost] = useState(post);
  const { updatePostStatus } = usePosts();

  // 投稿のいいね数を取得（複数のソースから）
  const getInitialLikesCount = () => {
    // 1. likes_countフィールド（usePostsで計算された値）
    if (currentPost.likes_count !== undefined) {
      return currentPost.likes_count;
    }
    // 2. likesフィールド（データベースの値）
    if (currentPost.likes !== undefined) {
      return currentPost.likes;
    }
    // 3. デフォルト値
    return 0;
  };

  const {
    isLiked,
    likesCount,
    loading: likesLoading,
    toggleLike,
  } = useLikes(currentPost.id, user?.id, getInitialLikesCount());

  const {
    comments,
    loading: commentsLoading,
    addComment,
    updateComment,
    deleteComment,
    totalCount: commentsCount,
  } = useComments(currentPost.id);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // const IconComponent =
  //   LucideIcons[post.categories.icon as keyof typeof LucideIcons]; // eslint-disable-line @typescript-eslint/no-unused-vars

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      await addComment(newComment.trim(), user.id);
      setNewComment('');

      // 投稿データのコメント件数も更新
      const updatedPost = {
        ...currentPost,
        replies: (currentPost.replies || 0) + 1,
      };
      setCurrentPost(updatedPost);

      // 親コンポーネントに更新を通知
      if (onPostUpdate) {
        onPostUpdate(updatedPost);
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('コメントの投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string, content: string) => {
    try {
      await updateComment(commentId, content);
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);

      // 投稿データのコメント件数も更新
      const updatedPost = {
        ...currentPost,
        replies: Math.max((currentPost.replies || 0) - 1, 0),
      };
      setCurrentPost(updatedPost);

      // 親コンポーネントに更新を通知
      if (onPostUpdate) {
        onPostUpdate(updatedPost);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  };

  const handleUpdateStatus = async (
    newStatus: 'open' | 'in_progress' | 'closed'
  ) => {
    if (!user || user.id !== currentPost.author_id) {
      alert('投稿者以外はステータスを変更できません');
      return;
    }

    setIsUpdatingStatus(true);
    try {
      // usePostsフックのupdatePostStatus関数を使用
      await updatePostStatus(currentPost.id, newStatus);

      // ローカルステートも更新
      const updatedPost = {
        ...currentPost,
        status: newStatus,
      };
      setCurrentPost(updatedPost);

      // 親コンポーネントに更新を通知
      if (onPostUpdate) {
        onPostUpdate(updatedPost);
      }
    } catch (error) {
      console.error('Error updating post status:', error);
      alert('ステータスの更新に失敗しました');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 表示用のいいね数とコメント数を取得
  const displayLikesCount =
    likesCount !== undefined ? likesCount : getInitialLikesCount();
  const displayCommentsCount = commentsCount || 0;

  // 投稿者が自分かどうかをチェック
  const isOwnPost = user?.id === currentPost.author_id;
  const isConsultationOrTransfer =
    currentPost.type === 'consultation' || currentPost.type === 'transfer';

  // ステータス表示用の関数
  const getStatusDisplay = (status: string | null) => {
    switch (status) {
      case 'open':
        return { text: '受付中', color: 'bg-green-100 text-green-800' };
      case 'in_progress':
        return { text: '対応中', color: 'bg-yellow-100 text-yellow-800' };
      case 'closed':
        return { text: '受付停止', color: 'bg-gray-100 text-gray-800' };
      default:
        return { text: '受付中', color: 'bg-green-100 text-green-800' };
    }
  };

  const currentStatus = getStatusDisplay(currentPost.status);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              ホームに戻る
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        {/* Post Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          {/* Post header, content, etc. - same as PostCard */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {post.profiles.avatar_url ? (
                  <img
                    src={post.profiles.avatar_url}
                    alt={`${post.profiles.name}のプロフィール画像`}
                    className="w-full h-full object-cover"
                    onError={e => {
                      // 画像読み込みエラー時はイニシャルを表示
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('span');
                        fallback.className =
                          'text-sm font-medium text-gray-600';
                        fallback.textContent = post.profiles.name.charAt(0);
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span className="text-sm font-medium text-gray-600">
                    {post.profiles.name.charAt(0)}
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {post.profiles.name}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>
          </div>

          <h3 className="font-bold text-gray-900 mb-2 text-lg leading-tight">
            {post.title}
          </h3>

          <p className="text-gray-700 mb-4 leading-relaxed">{post.content}</p>

          {/* Status Badge for consultations and transfers */}
          {isConsultationOrTransfer && currentPost.status && (
            <div className="mb-4">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${currentStatus.color}`}
              >
                {currentStatus.text}
              </span>
              {isOwnPost && (
                <div className="mt-2">
                  <select
                    value={currentPost.status || 'open'}
                    onChange={e =>
                      handleUpdateStatus(
                        e.target.value as 'open' | 'in_progress' | 'closed'
                      )
                    }
                    disabled={isUpdatingStatus}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-coral-500 focus:border-transparent disabled:opacity-50"
                  >
                    <option value="open">受付中</option>
                    <option value="in_progress">対応中</option>
                    <option value="closed">受付停止</option>
                  </select>
                  {isUpdatingStatus && (
                    <span className="ml-2 text-sm text-gray-500">
                      更新中...
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center space-x-1 text-gray-500 mb-4">
            <MapPin className="w-4 h-4" />
            <span className="text-sm">{post.location_address}</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
              <span className="text-sm font-medium">{displayLikesCount}</span>
            </button>
            <div className="flex items-center space-x-2 text-gray-500">
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {displayCommentsCount}件のコメント
              </span>
            </div>
          </div>
        </div>

        {/* Comment Form */}
        {user && (
          <form
            onSubmit={handleSubmitComment}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6"
          >
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="あなたのプロフィール画像"
                    className="w-full h-full object-cover"
                    onError={e => {
                      // 画像読み込みエラー時はイニシャルを表示
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = document.createElement('span');
                        fallback.className =
                          'text-xs font-medium text-gray-600';
                        fallback.textContent =
                          user.user_metadata?.name?.charAt(0) ||
                          user.email?.charAt(0) ||
                          'U';
                        parent.appendChild(fallback);
                      }
                    }}
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-600">
                    {user.user_metadata?.name?.charAt(0) ||
                      user.email?.charAt(0) ||
                      'U'}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="コメントを入力..."
                  className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-coral-500 focus:border-transparent"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="flex items-center space-x-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? '送信中...' : 'コメント'}</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Comments */}
        <div className="space-y-4">
          {commentsLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">
                コメントを読み込み中...
              </p>
            </div>
          ) : comments.length > 0 ? (
            comments.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                onUpdate={handleUpdateComment}
                onDelete={handleDeleteComment}
                currentUserId={user?.id}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">まだコメントがありません</p>
              <p className="text-sm text-gray-400 mt-1">
                最初のコメントを投稿してみましょう
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
