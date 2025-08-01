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
  }, [postId, userId]);

  const loadLikeStatus = async () => {
    try {
      console.log('❤️ Loading like status for post:', postId, 'user:', userId);
      
      // Get likes count from posts table
      const { data: post, error: postError } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();

      if (postError) {
        console.error('❌ Error loading post likes:', postError);
        return;
      }

      if (post) {
        console.log('❤️ Post likes count from DB:', post.likes);
        setLikesCount(post.likes || 0);
      }

      // Check if current user has liked this post
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
        console.log('❤️ User has liked:', hasLiked);
        setIsLiked(hasLiked);
      }
    } catch (error) {
      console.error('❌ Error in loadLikeStatus:', error);
    }
  };

  const toggleLike = async () => {
    if (!userId) {
      console.log('❤️ No user ID, cannot toggle like');
      return;
    }

    setLoading(true);
    try {
      console.log('❤️ Toggling like, current state:', isLiked);
      
      if (isLiked) {
        // Unlike: Remove from likes table
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (error) throw error;

        setIsLiked(false);
        setLikesCount(prev => Math.max(0, prev - 1));
        console.log('❤️ Successfully unliked post');
      } else {
        // Like: Add to likes table
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: userId
          });

        if (error) throw error;

        setIsLiked(true);
        setLikesCount(prev => prev + 1);
        console.log('❤️ Successfully liked post');
      }

      // Refresh the actual count from database
      setTimeout(() => {
        loadLikeStatus();
      }, 500);

    } catch (error) {
      console.error('❌ Error toggling like:', error);
      // Revert optimistic update on error
      await loadLikeStatus();
    } finally {
      setLoading(false);
    }
  };

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike
  };
}