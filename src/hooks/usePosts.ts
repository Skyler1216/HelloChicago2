import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

export function usePosts(
  type?: 'post' | 'consultation' | 'transfer',
  categoryId?: string
) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, [type, categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('posts')
        .select(
          `
          *,
          profiles (
            id,
            name,
            avatar_url
          ),
          categories (
            id,
            name,
            name_ja,
            icon,
            color
          )
        `
        )
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 投稿IDのリストを作成
      const postIds = (data || []).map(post => post.id);

      if (postIds.length === 0) {
        setPosts(data || []);
        return;
      }

      // いいね数とコメント数を一括取得
      const [likesResult, commentsResult] = await Promise.all([
        // いいね数を一括取得
        supabase.from('likes').select('post_id').in('post_id', postIds),

        // コメント数を一括取得
        supabase
          .from('comments')
          .select('post_id')
          .in('post_id', postIds)
          .eq('approved', true),
      ]);

      // いいね数とコメント数をカウント
      const likesCountMap = new Map<string, number>();
      const commentsCountMap = new Map<string, number>();

      // いいね数をカウント
      if (likesResult.data) {
        likesResult.data.forEach(like => {
          const count = likesCountMap.get(like.post_id) || 0;
          likesCountMap.set(like.post_id, count + 1);
        });
      }

      // コメント数をカウント
      if (commentsResult.data) {
        commentsResult.data.forEach(comment => {
          const count = commentsCountMap.get(comment.post_id) || 0;
          commentsCountMap.set(comment.post_id, count + 1);
        });
      }

      // 投稿データにいいね数とコメント数を追加
      const postsWithCounts = (data || []).map(post => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
      }));

      setPosts(postsWithCounts);
    } catch (err) {
      console.error('❌ Error loading posts:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createPost = async (
    postData: Database['public']['Tables']['posts']['Insert']
  ) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .insert(postData)
        .select(
          `
          *,
          profiles (
            id,
            name,
            avatar_url
          ),
          categories (
            id,
            name,
            name_ja,
            icon,
            color
          )
        `
        )
        .single();

      if (error) throw error;

      // Add to local state if approved (for immediate feedback)
      if (data.approved) {
        const postWithCounts = {
          ...data,
          likes_count: 0,
          comments_count: 0,
        };
        setPosts(prev => [postWithCounts, ...prev]);
      }

      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create post');
    }
  };

  const updatePostStatus = async (
    postId: string,
    status: 'open' | 'in_progress' | 'closed'
  ) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({ status })
        .eq('id', postId)
        .select(
          `
          *,
          profiles (
            id,
            name,
            avatar_url
          ),
          categories (
            id,
            name,
            name_ja,
            icon,
            color
          )
        `
        )
        .single();

      if (error) throw error;

      // Update local state
      setPosts(prev =>
        prev.map(post =>
          post.id === postId ? { ...post, status: data.status } : post
        )
      );

      return data;
    } catch (err) {
      throw err instanceof Error
        ? err
        : new Error('Failed to update post status');
    }
  };

  const updatePost = async (
    postId: string,
    updates: Database['public']['Tables']['posts']['Update']
  ) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', postId)
        .select(
          `
          *,
          profiles (
            id,
            name,
            avatar_url
          ),
          categories (
            id,
            name,
            name_ja,
            icon,
            color
          )
        `
        )
        .single();

      if (error) throw error;

      // Update local state with the full updated record
      setPosts(prev =>
        prev.map(post => (post.id === postId ? (data as unknown as Post) : post))
      );

      return data as unknown as Post;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update post');
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      // Remove from local state
      setPosts(prev => prev.filter(post => post.id !== postId));
      return true;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete post');
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    updatePostStatus,
    updatePost,
    deletePost,
    refetch: loadPosts,
  };
}
