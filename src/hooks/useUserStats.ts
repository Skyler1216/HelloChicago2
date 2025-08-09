import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserStats {
  postCount: number;
  likesReceived: number;
  commentsReceived: number;
  joinedDaysAgo: number;
  approvedPostsCount: number;
  popularPostsCount: number; // 10以上のいいねを獲得した投稿数
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats>({
    postCount: 0,
    likesReceived: 0,
    commentsReceived: 0,
    joinedDaysAgo: 0,
    approvedPostsCount: 0,
    popularPostsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadUserStats();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserStats = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);

      // まずユーザーの投稿を取得
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('id, approved, likes')
        .eq('author_id', userId);

      if (postsError) throw postsError;

      // プロフィール作成日を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // 投稿IDのリストを作成
      const postIds = (posts || []).map(post => post.id);

      let likesCount = 0;
      let commentsCount = 0;

      // 投稿がある場合のみいいね数とコメント数を取得
      if (postIds.length > 0) {
        const [likesResult, commentsResult] = await Promise.all([
          // いいね数を取得
          supabase.from('likes').select('post_id').in('post_id', postIds),
          // コメント数を取得
          supabase
            .from('comments')
            .select('post_id')
            .in('post_id', postIds)
            .eq('approved', true),
        ]);

        likesCount = likesResult.data?.length || 0;
        commentsCount = commentsResult.data?.length || 0;
      }

      const postsData = posts || [];
      const approvedPosts = postsData.filter(post => post.approved);
      const popularPosts = postsData.filter(post => post.likes >= 10);

      // 登録からの日数計算
      const joinedDate = new Date(profileData.created_at);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      setStats({
        postCount: postsData.length,
        likesReceived: likesCount,
        commentsReceived: commentsCount,
        joinedDaysAgo: daysDiff,
        approvedPostsCount: approvedPosts.length,
        popularPostsCount: popularPosts.length,
      });
    } catch (err) {
      console.error('❌ Error loading user stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  return {
    stats,
    loading,
    error,
    refetch: loadUserStats,
  };
}
