import { useState, useEffect, useCallback } from 'react';
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

interface UseUserStatsReturn {
  stats: UserStats;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  // キャッシュ関連の機能を追加
  isCached: boolean;
  cacheAge: number;
  forceRefresh: () => Promise<void>;
}

// キャッシュの設定
const CACHE_KEY_PREFIX = 'user_stats_cache_';
const CACHE_TTL = 60 * 60 * 1000; // 60分に延長（統計情報の更新頻度を考慮）

interface CacheData {
  data: UserStats;
  timestamp: number;
}

export function useUserStats(userId: string | undefined): UseUserStatsReturn {
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
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // キャッシュからデータを取得
  const getCachedData = useCallback((id: string): UserStats | null => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();

      // キャッシュが有効期限切れかチェック
      if (now - cacheData.timestamp > CACHE_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      const age = Math.floor((now - cacheData.timestamp) / 1000);
      setCacheAge(age);
      setIsCached(true);

      console.log('📱 useUserStats: Cache hit', { age: age + 's' });
      return cacheData.data;
    } catch (err) {
      console.warn('📱 useUserStats: Cache read error', err);
      return null;
    }
  }, []);

  // データをキャッシュに保存
  const setCachedData = useCallback((id: string, data: UserStats) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setIsCached(false);
      setCacheAge(0);

      console.log('📱 useUserStats: Data cached');
    } catch (err) {
      console.warn('📱 useUserStats: Cache write error', err);
    }
  }, []);

  // ユーザー統計情報の読み込み（キャッシュ優先）
  const loadUserStats = useCallback(
    async (forceRefresh = false) => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(userId);
          if (cachedData) {
            setStats(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 useUserStats: Fetching from database...');

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
        const popularPosts = postsData.filter(p =>
          popularPostsIds.includes(p.id)
        );

        // 登録からの日数計算
        const joinedDate = new Date(profileData.created_at);
        const now = new Date();
        const daysDiff = Math.floor(
          (now.getTime() - joinedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const newStats = {
          postCount: postsData.length,
          likesReceived: likesCount,
          commentsReceived: commentsCount,
          joinedDaysAgo: daysDiff,
          approvedPostsCount: approvedPosts.length,
          popularPostsCount: popularPosts.length,
          favoritesCount: favoritesCount,
        };

        setStats(newStats);

        // データをキャッシュに保存
        setCachedData(userId, newStats);
      } catch (err) {
        logError(err, 'useUserStats.loadUserStats');
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [userId, getCachedData, setCachedData]
  );

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadUserStats(false); // 初回はキャッシュ優先
  }, [userId, loadUserStats]);

  // 強制更新（キャッシュを無視）
  const forceRefresh = useCallback(async () => {
    await loadUserStats(true);
  }, [loadUserStats]);

  return {
    stats,
    loading,
    error,
    refetch: loadUserStats,
    // キャッシュ関連の情報を追加
    isCached,
    cacheAge,
    forceRefresh,
  };
}
