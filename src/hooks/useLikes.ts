import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useLikes(postId: string, userId?: string) {
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (postId) {
      loadLikeStatus();
    }
  }, [postId, userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLikeStatus = async () => {
    try {
      console.log('🔄 Loading like status for post:', postId, 'user:', userId);

      // Get likes count and user like status in parallel
      const [postResult, userLikeResult] = await Promise.all([
        // Get post likes count
        supabase.from('posts').select('likes').eq('id', postId).single(),

        // Check if current user has liked this post (only if userId exists)
        userId
          ? supabase
              .from('likes')
              .select('id')
              .eq('post_id', postId)
              .eq('user_id', userId)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      const { data: post, error: postError } = postResult;
      const { data: userLike, error: likeError } = userLikeResult;

      if (postError) {
        console.error('❌ Error loading post likes:', postError);
        return;
      }

      if (likeError) {
        console.error('❌ Error checking user like:', likeError);
        return;
      }

      const currentLikesCount = post?.likes || 0;
      const hasLiked = !!userLike;

      console.log('📊 Loaded like status:', {
        postId,
        userId,
        currentLikesCount,
        hasLiked,
        userLike,
      });

      // Debug: Check if likes count matches the actual likes in the likes table
      if (userId) {
        const { data: actualLikes, error: actualLikesError } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId);

        if (!actualLikesError && actualLikes) {
          const actualLikesCount = actualLikes.length;
          if (actualLikesCount !== currentLikesCount) {
            console.warn(
              '⚠️ Likes count mismatch - posts.likes:',
              currentLikesCount,
              'actual likes count:',
              actualLikesCount
            );
            // Use the actual count if there's a mismatch
            setLikesCount(actualLikesCount);
            return;
          }
        }
      }

      setLikesCount(currentLikesCount);
      setIsLiked(hasLiked);
    } catch (error) {
      console.error('❌ Error in loadLikeStatus:', error);
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      console.log('❌ No user ID provided for like toggle');
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
