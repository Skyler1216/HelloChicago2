import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatSupabaseError, logError } from '../utils/errorHandler';

interface UserStats {
  postCount: number;
  likesReceived: number;
  commentsReceived: number;
  joinedDaysAgo: number;
  approvedPostsCount: number;
  popularPostsCount: number; // 10以上のいいねを獲得した投稿数
  favoritesCount: number; // ユーザーがいいねした投稿数
}

export function useUserStats(userId: string | undefined) {
  const [stats, setStats] = useState<UserStats>({
    postCount: 0,
    likesReceived: 0,
    commentsReceived: 0,
    joinedDaysAgo: 0,
    approvedPostsCount: 0,
    popularPostsCount: 0,
    favoritesCount: 0,
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
        .select('id, approved')
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
      let favoritesCount = 0;

      // 並行してお気に入り数と、投稿関連の統計を取得
      const [favoritesResult, ...postStats] = await Promise.all([
        // ユーザーがいいねした投稿数を取得
        supabase.from('likes').select('post_id').eq('user_id', userId),

        // 投稿がある場合のみいいね数とコメント数を取得
        ...(postIds.length > 0
          ? [
              // いいね数を取得
              supabase.from('likes').select('post_id').in('post_id', postIds),
              // コメント数を取得
              supabase
                .from('comments')
                .select('post_id')
                .in('post_id', postIds)
                .eq('approved', true),
            ]
          : []),
      ]);

      favoritesCount = favoritesResult.data?.length || 0;

      if (postIds.length > 0 && postStats.length >= 2) {
        likesCount = postStats[0].data?.length || 0;
        commentsCount = postStats[1].data?.length || 0;
      }

      const postsData = posts || [];
      const approvedPosts = postsData.filter(post => post.approved);
      // 人気投稿は likes テーブルから件数 >= 10 を満たす投稿を算出
      const popularPostsIds: string[] = [];
      if (postIds.length > 0) {
        const { data: likesForPopularity } = await supabase
          .from('likes')
          .select('post_id')
          .in('post_id', postIds);
        if (likesForPopularity) {
          const countMap = new Map<string, number>();
          likesForPopularity.forEach(row => {
            countMap.set(row.post_id, (countMap.get(row.post_id) || 0) + 1);
          });
          for (const [pid, count] of countMap) {
            if (count >= 10) popularPostsIds.push(pid);
          }
        }
      }
      const popularPosts = postsData.filter(p => popularPostsIds.includes(p.id));

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
        favoritesCount: favoritesCount,
      });
    } catch (err) {
      logError(err, 'useUserStats.loadUserStats');
      setError(formatSupabaseError(err));
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
