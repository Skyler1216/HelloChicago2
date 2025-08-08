import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useLikes(
  postId: string,
  userId?: string,
  initialLikesCount?: number
) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikesCount || 0);
  const [loading, setLoading] = useState(false);

  // 初期値が変更された場合に更新
  useEffect(() => {
    if (initialLikesCount !== undefined) {
      setLikesCount(initialLikesCount);
    }
  }, [initialLikesCount]);

  useEffect(() => {
    if (postId) {
      loadLikeStatus();
    }
  }, [postId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLikeStatus = async () => {
    try {
      console.log('🔄 Loading like status for post:', postId, 'user:', userId);

      // ユーザーのいいね状態のみを確認（いいね数は初期値を使用）
      if (userId) {
        const { data: userLike, error: likeError } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle();

        if (likeError) {
          console.error('❌ Error checking user like:', likeError);
          return;
        }

        const hasLiked = !!userLike;
        setIsLiked(hasLiked);
      }
    } catch (error) {
      console.error('❌ Error in loadLikeStatus:', error);
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      console.log('❌ No user ID provided for like toggle');
      alert('ログインが必要です');
      return;
    }

    if (loading) {
      console.log('❌ Like toggle already in progress');
      return;
    }

    setLoading(true);

    // Store current state for rollback
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    try {
      if (isLiked) {
        // Unlike: Optimistic update first
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));

        console.log('🔄 Unliking post:', postId, 'for user:', userId);

        // Remove from likes table
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) {
          console.error('❌ Error unliking post:', error);
          throw error;
        }

        console.log('✅ Successfully unliked post');
      } else {
        // Like: Optimistic update first
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        console.log('🔄 Liking post:', postId, 'for user:', userId);

        // Add to likes table
        const { error } = await supabase.from('likes').insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) {
          console.error('❌ Error liking post:', error);
          throw error;
        }

        console.log('✅ Successfully liked post');
      }

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Reload the like status to ensure consistency
      await loadLikeStatus();
    } catch (error) {
      console.error('❌ Error toggling like:', error);

      // Rollback optimistic updates on error
      setIsLiked(previousIsLiked);
      setLikesCount(previousLikesCount);

      // Show error to user
      alert('いいねの処理に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike,
  };
}
