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
  }, [postId]);

  const loadComments = async () => {
    try {
      setLoading(true);
      console.log('💬 Loading comments for post:', postId);
      
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .eq('approved', true)
        .is('parent_id', null)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('💬 Comments loaded:', data?.length || 0, 'comments');
      
      // Load replies for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              profiles (
                id,
                name,
                avatar_url
              )
            `)
            .eq('parent_id', comment.id)
            .eq('approved', true)
            .order('created_at', { ascending: true });

          return {
            ...comment,
            replies: replies || []
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (err) {
      console.error('❌ Error loading comments:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const addComment = async (content: string, userId: string, parentId?: string) => {
    try {
      console.log('💬 Adding comment:', { content, userId, parentId });
      
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: userId,
          content,
          parent_id: parentId || null,
          approved: true
        })
        .select(`
          *,
          profiles (
            id,
            name,
            avatar_url
          )
        `)
        .single();

      if (error) throw error;

      console.log('💬 Comment added successfully');
      
      // Refresh comments to get updated data
      await loadComments();

      return data;
    } catch (err) {
      console.error('❌ Error adding comment:', err);
      throw err instanceof Error ? err : new Error('Failed to add comment');
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    refetch: loadComments,
  };
}