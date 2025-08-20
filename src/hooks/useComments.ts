import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { formatSupabaseError, logError } from '../utils/errorHandler';

type Comment = Database['public']['Tables']['comments']['Row'];
type CommentInsert = Database['public']['Tables']['comments']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface CommentWithProfile extends Comment {
  profiles: Profile | null;
  replies?: CommentWithProfile[];
}

interface UseCommentsReturn {
  comments: CommentWithProfile[];
  loading: boolean;
  error: string | null;
  createComment: (
    comment: Omit<CommentInsert, 'id' | 'created_at' | 'updated_at'>
  ) => Promise<boolean>;
  updateComment: (id: string, content: string) => Promise<boolean>;
  deleteComment: (id: string) => Promise<boolean>;
  refreshComments: () => Promise<void>;
  getCommentsByPost: (postId: string) => Promise<CommentWithProfile[]>;
  getUserComments: (userId: string) => Promise<CommentWithProfile[]>;
}

export function useComments(postId?: string): UseCommentsReturn {
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // コメントを取得
  const loadComments = useCallback(
    async (specificPostId?: string) => {
      try {
        setLoading(true);
        setError(null);

        const targetPostId = specificPostId || postId;

        let query = supabase
          .from('comments')
          .select(
            `
          *,
          profiles!comments_author_id_fkey(id, name, avatar_url)
        `
          )
          .eq('is_approved', true)
          .order('created_at', { ascending: true });

        if (targetPostId) {
          query = query.eq('post_id', targetPostId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        // コメントを階層構造に変換
        const commentsWithReplies = buildCommentTree(data || []);
        setComments(commentsWithReplies);
      } catch (err) {
        logError(err, 'useComments.loadComments');
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [postId]
  );

  // コメントを再読み込み
  const refreshComments = useCallback(async () => {
    await loadComments();
  }, [loadComments]);

  // コメントを階層構造に変換
  const buildCommentTree = (
    flatComments: CommentWithProfile[]
  ): CommentWithProfile[] => {
    const commentMap = new Map<string, CommentWithProfile>();
    const rootComments: CommentWithProfile[] = [];

    // まず全てのコメントをMapに格納
    flatComments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        replies: [],
      });
    });

    // 親子関係を構築
    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;

      if (comment.parent_comment_id) {
        // 返信の場合は親コメントに追加
        const parentComment = commentMap.get(comment.parent_comment_id);
        if (parentComment) {
          parentComment.replies = parentComment.replies || [];
          parentComment.replies.push(commentWithReplies);
        }
      } else {
        // ルートコメントの場合
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  // コメント通知を作成
  const createCommentNotification = useCallback(
    async (postId: string, commentAuthorId: string, commentId: string) => {
      try {
        // 投稿者を取得
        const { data: post, error: postError } = await supabase
          .from('posts')
          .select('author_id, title')
          .eq('id', postId)
          .single();

        if (postError || !post) return;

        // 自分の投稿に自分がコメントした場合は通知しない
        if (post.author_id === commentAuthorId) return;

        // コメント投稿者の情報を取得
        const { data: commenter, error: commenterError } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', commentAuthorId)
          .single();

        if (commenterError || !commenter) return;

        // 投稿者に通知を送信
        await supabase.from('notifications').insert({
          recipient_id: post.author_id,
          sender_id: commentAuthorId,
          type: 'comment',
          title: `${commenter.name}さんがコメントしました`,
          message: `あなたの投稿「${post.title}」にコメントが付きました。`,
          related_post_id: postId,
          related_comment_id: commentId,
          metadata: {
            post_title: post.title,
            commenter_name: commenter.name,
          },
        });
      } catch (err) {
        logError(err, 'useComments.createCommentNotification');
        // 通知の失敗はコメント作成の失敗にしない
      }
    },
    []
  );

  // コメントを作成
  const createComment = useCallback(
    async (
      comment: Omit<CommentInsert, 'id' | 'created_at' | 'updated_at'>
    ): Promise<boolean> => {
      try {
        setError(null);

        const { data, error: insertError } = await supabase
          .from('comments')
          .insert(comment)
          .select(
            `
          *,
          profiles!comments_author_id_fkey(id, name, avatar_url)
        `
          )
          .single();

        if (insertError) throw insertError;

        // コメント作成時に投稿者に通知を送信
        if (comment.post_id && !comment.parent_comment_id) {
          await createCommentNotification(
            comment.post_id,
            comment.author_id,
            data.id
          );
        }

        // リアルタイムでコメントリストを更新
        await refreshComments();
        return true;
      } catch (err) {
        logError(err, 'useComments.createComment');
        setError(formatSupabaseError(err));
        return false;
      }
    },
    [createCommentNotification, refreshComments]
  );

  // コメントを更新
  const updateComment = useCallback(
    async (id: string, content: string): Promise<boolean> => {
      try {
        setError(null);

        const { error: updateError } = await supabase
          .from('comments')
          .update({
            content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;

        await refreshComments();
        return true;
      } catch (err) {
        logError(err, 'useComments.updateComment');
        setError(formatSupabaseError(err));
        return false;
      }
    },
    [refreshComments]
  );

  // コメントを削除
  const deleteComment = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        setError(null);

        const { error: deleteError } = await supabase
          .from('comments')
          .delete()
          .eq('id', id);

        if (deleteError) throw deleteError;

        await refreshComments();
        return true;
      } catch (err) {
        logError(err, 'useComments.deleteComment');
        setError(formatSupabaseError(err));
        return false;
      }
    },
    [refreshComments]
  );

  // 特定の投稿のコメントを取得
  const getCommentsByPost = useCallback(
    async (targetPostId: string): Promise<CommentWithProfile[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('comments')
          .select(
            `
          *,
          profiles!comments_author_id_fkey(id, name, avatar_url)
        `
          )
          .eq('post_id', targetPostId)
          .eq('is_approved', true)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        return buildCommentTree(data || []);
      } catch (err) {
        logError(err, 'useComments.getCommentsByPost');
        return [];
      }
    },
    []
  );

  // ユーザーのコメントを取得
  const getUserComments = useCallback(
    async (userId: string): Promise<CommentWithProfile[]> => {
      try {
        const { data, error: fetchError } = await supabase
          .from('comments')
          .select(
            `
          *,
          profiles!comments_author_id_fkey(id, name, avatar_url),
          posts!comments_post_id_fkey(id, title, type)
        `
          )
          .eq('author_id', userId)
          .eq('is_approved', true)
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        return data || [];
      } catch (err) {
        logError(err, 'useComments.getUserComments');
        return [];
      }
    },
    []
  );

  // 初回読み込み
  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId, loadComments]);

  return {
    comments,
    loading,
    error,
    createComment,
    updateComment,
    deleteComment,
    refreshComments,
    getCommentsByPost,
    getUserComments,
  };
}
