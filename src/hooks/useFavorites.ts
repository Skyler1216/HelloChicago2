import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

export function useFavorites(userId: string | undefined) {
  const [favorites, setFavorites] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadFavorites();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadFavorites = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // ユーザーがいいねした投稿を取得
      const { data: likedPosts, error: likesError } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', userId);

      if (likesError) throw likesError;

      if (!likedPosts || likedPosts.length === 0) {
        setFavorites([]);
        return;
      }

      const postIds = likedPosts.map(like => like.post_id);

      // いいねした投稿の詳細を取得
      const { data: posts, error: postsError } = await supabase
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
        .in('id', postIds)
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

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
      const postsWithCounts = (posts || []).map(post => ({
        ...post,
        likes_count: likesCountMap.get(post.id) || 0,
        comments_count: commentsCountMap.get(post.id) || 0,
      }));

      setFavorites(postsWithCounts);
    } catch (err) {
      console.error('❌ Error loading favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const addToFavorites = async (postId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase.from('likes').insert({
        user_id: userId,
        post_id: postId,
      });

      if (error) throw error;

      // リロードして最新状態を取得
      await loadFavorites();
      return true;
    } catch (err) {
      console.error('❌ Error adding to favorites:', err);
      return false;
    }
  };

  const removeFromFavorites = async (postId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (error) throw error;

      // ローカル状態を更新
      setFavorites(prev => prev.filter(post => post.id !== postId));
      return true;
    } catch (err) {
      console.error('❌ Error removing from favorites:', err);
      return false;
    }
  };

  const isFavorite = (postId: string) => {
    return favorites.some(post => post.id === postId);
  };

  return {
    favorites,
    loading,
    error,
    addToFavorites,
    removeFromFavorites,
    isFavorite,
    refetch: loadFavorites,
  };
}
