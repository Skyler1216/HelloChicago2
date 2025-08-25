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
  isCached: boolean;
  cacheAge: number;
  forceRefresh: () => Promise<void>;
}

// シンプルなグローバルキャッシュ（ページ切り替えで消えない）
const userStatsCache = new Map<
  string,
  {
    data: UserStats;
    timestamp: number;
  }
>();

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

  // モバイル環境の検出
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // キャッシュの有効期限（モバイルでは長めに設定）
  const CACHE_TTL = isMobileDevice ? 60 * 60 * 1000 : 30 * 60 * 1000; // モバイル60分、デスクトップ30分

  // キャッシュからデータを取得
  const getCachedData = useCallback(
    (id: string): UserStats | null => {
      const cached = userStatsCache.get(id);
      if (!cached) return null;

      const now = Date.now();
      const age = now - cached.timestamp;

      // キャッシュが有効期限内かチェック
      if (age < CACHE_TTL) {
        setCacheAge(Math.floor(age / 1000));
        setIsCached(true);
        console.log('📱 useUserStats: Cache hit', {
          age: Math.floor(age / 1000) + 's',
          userId: id,
        });
        return cached.data;
      }

      // 期限切れのキャッシュを削除
      userStatsCache.delete(id);
      return null;
    },
    [CACHE_TTL]
  );

  // キャッシュにデータを保存
  const setCachedData = useCallback((id: string, data: UserStats) => {
    userStatsCache.set(id, {
      data,
      timestamp: Date.now(),
    });
    setIsCached(false);
    setCacheAge(0);
    console.log('📱 useUserStats: Data cached for user:', id);
  }, []);

  // ユーザー統計情報の読み込み（キャッシュ優先）
  const loadUserStats = useCallback(
    async (forceRefresh = false) => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(userId);
          if (cachedData) {
            console.log('📱 useUserStats: Using cached data immediately');
            setStats(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 useUserStats: Fetching from database...');
        setLoading(true);

        // タイムアウト付きでデータを取得
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => {
            controller.abort();
          },
          isMobileDevice ? 8000 : 5000
        );

        try {
          // まずユーザーの投稿を取得
          const { data: posts, error: postsError } = await supabase
            .from('posts')
            .select('id, approved')
            .eq('author_id', userId)
            .abortSignal(controller.signal);

          if (postsError) throw postsError;

          // プロフィール作成日を取得
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('created_at')
            .eq('id', userId)
            .single()
            .abortSignal(controller.signal);

          if (profileError) throw profileError;

          // 投稿IDのリストを作成
          const postIds = (posts || []).map(post => post.id);

          let likesCount = 0;
          let commentsCount = 0;
          let favoritesCount = 0;

          // 並行してお気に入り数と、投稿関連の統計を取得
          const promises = [
            // ユーザーがいいねした投稿数を取得
            supabase
              .from('likes')
              .select('post_id')
              .eq('user_id', userId)
              .abortSignal(controller.signal),
          ];

          // 投稿がある場合のみいいね数とコメント数を取得
          if (postIds.length > 0) {
            promises.push(
              // いいね数を取得
              supabase
                .from('likes')
                .select('post_id')
                .in('post_id', postIds)
                .abortSignal(controller.signal),
              // コメント数を取得
              supabase
                .from('comments')
                .select('post_id')
                .in('post_id', postIds)
                .eq('is_approved', true)
                .abortSignal(controller.signal)
            );
          }

          const results = await Promise.all(promises);
          clearTimeout(timeoutId);

          favoritesCount = results[0].data?.length || 0;

          if (postIds.length > 0 && results.length >= 3) {
            likesCount = results[1].data?.length || 0;
            commentsCount = results[2].data?.length || 0;
          }

          const postsData = posts || [];
          const approvedPosts = postsData.filter(post => post.approved);

          // 人気投稿は likes テーブルから件数 >= 10 を満たす投稿を算出
          const popularPostsIds: string[] = [];
          if (postIds.length > 0 && results.length >= 2) {
            const likesForPopularity = results[1].data;
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

          console.log('📱 useUserStats: Data fetched and cached successfully');
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof Error && err.name === 'AbortError') {
            console.warn('📱 useUserStats: Request timeout, using cached data');
            const cachedData = getCachedData(userId);
            if (cachedData) {
              setStats(cachedData);
              setLoading(false);
              return;
            }
          }

          throw err;
        }
      } catch (err) {
        logError(err, 'useUserStats.loadUserStats');
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [userId, getCachedData, setCachedData, isMobileDevice]
  );

  // 初期化時の処理
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // まずキャッシュをチェック
    const cachedData = getCachedData(userId);
    if (cachedData) {
      console.log('📱 useUserStats: Initial load from cache');
      setStats(cachedData);
      setLoading(false);

      // バックグラウンドで更新（古いキャッシュの場合のみ）
      const now = Date.now();
      const cached = userStatsCache.get(userId);
      if (cached && now - cached.timestamp > CACHE_TTL * 0.5) {
        console.log(
          '📱 useUserStats: Background refresh (cache is getting old)'
        );
        setTimeout(() => {
          loadUserStats(true);
        }, 100);
      }
    } else {
      console.log('📱 useUserStats: Initial load from database');
      loadUserStats();
    }
  }, [userId, getCachedData, loadUserStats, CACHE_TTL]);

  // 強制更新（キャッシュを無視）
  const forceRefresh = useCallback(async () => {
    await loadUserStats(true);
  }, [loadUserStats]);

  const refetch = useCallback(async () => {
    await loadUserStats(true);
  }, [loadUserStats]);

  return {
    stats,
    loading,
    error,
    refetch,
    isCached,
    cacheAge,
    forceRefresh,
  };
}
