import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

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
      // Get likes count
      const { data: post } = await supabase
        .from('posts')
        .select('likes')
        .eq('id', postId)
        .single();

      if (post) {
        setLikesCount(post.likes);
      }

      // Check if user has liked this post
      if (userId) {
        const { data: like } = await supabase
          .from('likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', userId)
          .maybeSingle();

        setIsLiked(!!like);
      }
    } catch (error) {
      console.error('Error loading like status:', error);
    }
  };

  const toggleLike = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);
        if (error) throw error;

        // Refresh from server to ensure consistency
        await loadLikeStatus();
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: userId
          });
        if (error) throw error;

        // Refresh from server to ensure consistency
        await loadLikeStatus();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
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