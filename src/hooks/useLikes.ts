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
      console.log('❤️ Loading like status for post:', postId, 'user:', userId);

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

      console.log('❤️ Loaded like status:', {
        postId,
        likesCount: currentLikesCount,
        hasLiked,
        userId,
      });

      setLikesCount(currentLikesCount);
      setIsLiked(hasLiked);
    } catch (error) {
      console.error('❌ Error in loadLikeStatus:', error);
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      console.log('❤️ No user ID, cannot toggle like');
      return;
    }

    if (loading) {
      console.log('❤️ Already processing like toggle, skipping');
      return;
    }

    setLoading(true);

    // Store current state for rollback
    const previousIsLiked = isLiked;
    const previousLikesCount = likesCount;

    try {
      console.log('❤️ Toggling like, current state:', { isLiked, likesCount });

      if (isLiked) {
        // Unlike: Optimistic update first
        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));

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

        console.log('❤️ Successfully unliked post');
      } else {
        // Like: Optimistic update first
        setIsLiked(true);
        setLikesCount(prev => prev + 1);

        // Add to likes table
        const { error } = await supabase.from('likes').insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) {
          console.error('❌ Error liking post:', error);
          throw error;
        }

        console.log('❤️ Successfully liked post');
      }

      // Wait a moment for database triggers to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verify the final state from database
      const { data: finalPost, error: verifyError } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();

      if (!verifyError && finalPost) {
        const finalLikesCount = finalPost.likes || 0;
        console.log('❤️ Final verification - likes count:', finalLikesCount);
        setLikesCount(finalLikesCount);
      }
    } catch (error) {
      console.error('❌ Error toggling like:', error);

      // Rollback optimistic updates on error
      console.log('❤️ Rolling back optimistic updates');
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
