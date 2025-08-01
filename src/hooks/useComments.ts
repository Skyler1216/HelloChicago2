import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Comment = Database['public']['Tables']['comments']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  replies?: Comment[];
};

export function useComments(postId: string) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComments = async () => {
    try {
      setLoading(true);

      // Load top-level comments
      const { data: topLevelComments, error: commentsError } = await supabase
        .from('comments')
        .select(
          `
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `
        )
        .eq('post_id', postId)
        .eq('approved', true)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('❌ Error loading comments:', commentsError);
        throw commentsError;
      }

      // Load replies for each comment
      const commentsWithReplies = await Promise.all(
        (topLevelComments || []).map(async comment => {
          const { data: replies, error: repliesError } = await supabase
            .from('comments')
            .select(
              `
              *,
              profiles (
                id,
                name,
                avatar_url
              )
            `
            )
            .eq('parent_id', comment.id)
            .eq('approved', true)
            .order('created_at', { ascending: true });

          if (repliesError) {
            console.error(
              '❌ Error loading replies for comment:',
              comment.id,
              repliesError
            );
          }

          return {
            ...comment,
            replies: replies || [],
          };
        })
      );

      const totalComments = commentsWithReplies.reduce((total, comment) => {
        return total + 1 + (comment.replies?.length || 0);
      }, 0);

      setComments(commentsWithReplies);

      // Update post replies count in database
      await supabase
        .from('posts')
        .update({ replies: totalComments })
        .eq('id', postId);
    } catch (err) {
      console.error('❌ Error in loadComments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (
    content: string,
    userId: string,
    parentId?: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content,
          parent_id: parentId || null,
          approved: true,
        })
        .select(
          `
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `
        )
        .single();

      if (error) throw error;

      // Refresh comments to get updated data
      await loadComments();

      return data;
    } catch (err) {
      console.error('❌ Error adding comment:', err);
      throw err instanceof Error ? err : new Error('Failed to add comment');
    }
  };

  const getTotalCommentsCount = () => {
    return comments.reduce((total, comment) => {
      return total + 1 + (comment.replies?.length || 0);
    }, 0);
  };

  return {
    comments,
    loading,
    error,
    addComment,
    refetch: loadComments,
    totalCount: getTotalCommentsCount(),
  };
}
