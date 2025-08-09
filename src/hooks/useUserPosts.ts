import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

export function useUserPosts(userId: string | undefined) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadUserPosts();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserPosts = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // ユーザーの投稿を取得（承認済み・未承認問わず自分の投稿は表示）
      const { data, error } = await supabase
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
        .eq('author_id', userId)
        .order('created_at', { ascending: false });

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
      console.error('❌ Error loading user posts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  return {
    posts,
    loading,
    error,
    refetch: loadUserPosts,
  };
}
