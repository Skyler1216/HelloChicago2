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
  const [totalCount, setTotalCount] = useState(0);

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
      setTotalCount(totalComments);

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

      // 新しいコメントをローカルステートに追加
      const newComment = {
        ...data,
        replies: [],
      };

      if (parentId) {
        // 返信の場合、親コメントのrepliesに追加
        setComments(prev =>
          prev.map(comment =>
            comment.id === parentId
              ? {
                  ...comment,
                  replies: [...(comment.replies || []), newComment],
                }
              : comment
          )
        );
      } else {
        // トップレベルコメントの場合、直接追加
        setComments(prev => [...prev, newComment]);
      }

      // 総コメント数を即座に更新
      const newTotalCount = totalCount + 1;
      setTotalCount(newTotalCount);

      // データベースの投稿のrepliesカウントも更新
      await supabase
        .from('posts')
        .update({ replies: newTotalCount })
        .eq('id', postId);

      return data;
    } catch (err) {
      console.error('❌ Error adding comment:', err);
      throw err instanceof Error ? err : new Error('Failed to add comment');
    }
  };

  const updateComment = async (commentId: string, content: string) => {
    try {
      if (!content.trim()) {
        throw new Error('コメント内容を入力してください');
      }

      const { data, error } = await supabase
        .from('comments')
        .update({ content: content.trim() })
        .eq('id', commentId)
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

      if (error) {
        console.error('❌ Error updating comment:', error);
        if (error.code === 'PGRST116') {
          throw new Error('コメントが見つかりません');
        } else if (error.code === '42501') {
          throw new Error('コメントの編集権限がありません');
        } else {
          throw new Error('コメントの更新に失敗しました');
        }
      }

      // ローカルステートを即座に更新
      setComments(prev =>
        prev.map(comment =>
          comment.id === commentId
            ? { ...comment, content: content.trim() }
            : comment
        )
      );

      return data;
    } catch (err) {
      console.error('❌ Error updating comment:', err);
      throw err instanceof Error ? err : new Error('Failed to update comment');
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('❌ Error deleting comment:', error);
        if (error.code === 'PGRST116') {
          throw new Error('コメントが見つかりません');
        } else if (error.code === '42501') {
          throw new Error('コメントの削除権限がありません');
        } else {
          throw new Error('コメントの削除に失敗しました');
        }
      }

      // ローカルステートからコメントを削除
      setComments(prev => {
        const newComments = prev.filter(comment => comment.id !== commentId);
        // 返信も含めて総数を再計算
        const newTotalCount = newComments.reduce((total, comment) => {
          return total + 1 + (comment.replies?.length || 0);
        }, 0);
        setTotalCount(newTotalCount);
        return newComments;
      });

      // データベースの投稿のrepliesカウントも更新
      const newTotalCount = totalCount - 1;
      await supabase
        .from('posts')
        .update({ replies: newTotalCount })
        .eq('id', postId);
    } catch (err) {
      console.error('❌ Error deleting comment:', err);
      throw err instanceof Error ? err : new Error('Failed to delete comment');
    }
  };

  return {
    comments,
    loading,
    error,
    addComment,
    updateComment,
    deleteComment,
    refetch: loadComments,
    totalCount,
  };
}
