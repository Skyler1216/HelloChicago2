import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useCache } from './useCache';
import { useAppLifecycle } from './useAppLifecycle';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number; // データベースのlikesカラムは削除されたため、オプショナルに
  comments_count?: number; // データベースのrepliesカラムは削除されたため、オプショナルに

};

interface UsePostsReturn {
  posts: Post[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  createPost: (
    postData: Database['public']['Tables']['posts']['Insert']
  ) => Promise<Post>;
  updatePostStatus: (
    postId: string,
    status: 'open' | 'in_progress' | 'closed'
  ) => Promise<{ status: string }>;
  updatePost: (
    postId: string,
    updates: Database['public']['Tables']['posts']['Update']
  ) => Promise<Post>;
  refetch: () => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  // キャッシュ状態を追加
  isCached: boolean;
  cacheAge: number;
}

export function usePosts(
  type?: 'post' | 'consultation' | 'transfer',
  categoryId?: string
): UsePostsReturn {
  // モバイルデバイス検出
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
  );

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // キャッシュキーを生成
  const cacheKey = `posts_${type || 'all'}_${categoryId || 'all'}`;

  // モバイル対応のキャッシュ設定
  const effectiveTTL = isMobileDevice ? 30 * 60 * 1000 : 15 * 60 * 1000; // モバイル30分、デスクトップ15分
  const effectivePriority = 9;
  const effectiveMaxSize = 50;
  const effectiveRefreshThreshold = isMobileDevice ? 4 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000; // モバイル4時間、デスクトップ2時間

  // キャッシュと App Lifecycle の管理
  const cache = useCache<Post[]>(`posts`, {
    ttl: effectiveTTL,
    priority: effectivePriority,
    staleWhileRevalidate: true,
    maxSize: effectiveMaxSize,
  });

  const { canFetchData, shouldRefreshData } = useAppLifecycle({
    onAppVisible: () => {
      // アプリがフォアグラウンドに戻ったとき（ユーザーフレンドリーなリフレッシュ）
      // モバイルではキャッシュをより積極的に活用し、デスクトップでは適度に更新
      if (shouldRefreshData()) {
        console.log('📱 App visible: refreshing posts data');
        loadPosts(true); // 強制リフレッシュ
      } else {
        console.log('📱 App visible: using cached posts data');
      }
    },
    refreshThreshold: effectiveRefreshThreshold,
  });

  // 初期ローディング管理（緊急修正: シンプルに戻す）
  useEffect(() => {
    // モバイル環境での安全な初期化
    const initializePosts = async () => {
      try {
        // キャッシュから即座に読み込み
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          console.log('📱 usePosts: Using cached data immediately');
          setPosts(cachedData);
          setLoading(false);
          setIsCached(true);
          
          // バックグラウンドで更新（モバイルでは控えめに）
          if (isMobileDevice) {
            setTimeout(() => {
              if (cache.isStale(cacheKey)) {
                loadPosts(true);
              }
            }, 2000); // モバイルでは2秒待機
          } else {
            setTimeout(() => {
              if (cache.isStale(cacheKey)) {
                loadPosts(true);
              }
            }, 100);
          }
        } else {
          await loadPosts();
        }
      } catch (error) {
        console.error('📱 usePosts: Initialization error:', error);
        setError('投稿の初期化に失敗しました');
        setLoading(false);
      }
    };
    
    initializePosts();
  }, [type, categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = useCallback(
    async (forceRefresh = false) => {
      try {
        // キャッシュをチェック
        if (!forceRefresh) {
          const cachedPosts = cache.get(cacheKey);
          if (cachedPosts) {
            console.log('📱 usePosts: Using cached data', {
              cacheKey,
              postsCount: cachedPosts.length,
              type: type || 'all',
              categoryId: categoryId || 'all',
            });
            setPosts(cachedPosts);
            setLoading(false);
            setIsCached(true);
            setCacheAge(Math.floor((Date.now() - Date.now()) / 1000)); // キャッシュヒット時は0秒

            // 古いデータの場合はバックグラウンドで更新
            if (cache.isStale(cacheKey)) {
              console.log(
                '📱 usePosts: Cache is stale, updating in background'
              );
              setIsRefreshing(true);
              // バックグラウンド更新は続行
            } else {
              console.log('📱 usePosts: Using fresh cached data');
              return; // 有効なキャッシュがあるので終了
            }
          } else {
            console.log('📱 usePosts: Cache miss', {
              cacheKey,
              type: type || 'all',
              categoryId: categoryId || 'all',
            });
            setIsCached(false);
            setCacheAge(0);
          }
        } else {
          console.log('📱 usePosts: Force refresh requested');
          setIsCached(false);
          setCacheAge(0);
        }

        // ネットワークが利用できない場合はオフラインデータを使用
        if (!canFetchData) {
          const offlineData = cache.getOfflineData(cacheKey);
          if (offlineData) {
            console.log('📱 usePosts: Using offline cached data', {
              postsCount: offlineData.length,
            });
            setPosts(offlineData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 usePosts: Fetching from database...');

        // モバイル環境に最適化されたタイムアウト付きAPIリクエスト
        const controller = new AbortController();
        const timeoutDuration = isMobileDevice ? 15000 : 10000; // モバイルでは15秒
        const timeoutId = setTimeout(() => {
          console.warn('📱 usePosts: Request timeout, aborting...');
          controller.abort();
        }, timeoutDuration);

        try {
          let query = supabase
            .from('posts')
            .select(
              `
              *,
              profiles:profiles(name, avatar_url),
              categories:categories(name_ja, icon, color)
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

          clearTimeout(timeoutId);

          if (error) {
            console.error('📱 usePosts: Database error:', error);
            
            // モバイルでのネットワークエラーに対する寛容な処理
            if (isMobileDevice) {
              const cachedData = cache.get(cacheKey);
              if (cachedData) {
                console.log('📱 usePosts: Using cached data due to mobile network error');
                setPosts(cachedData);
                setLoading(false);
                setIsRefreshing(false);
                setIsCached(true);
                return;
              }
            }
            
            throw error;
          }

          const postsWithDetails = (data || []).map(post => ({
            ...post,
            likes_count: post.likes_count || 0,
            comments_count: post.comments_count || 0,
          }));

          setPosts(postsWithDetails);
          setLoading(false);
          setIsRefreshing(false);

          // データをキャッシュに保存
          cache.set(cacheKey, postsWithDetails);
          console.log('📱 usePosts: Data fetched and cached successfully', {
            postsCount: postsWithDetails.length,
            type: type || 'all',
            categoryId: categoryId || 'all',
          });
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof Error && err.name === 'AbortError') {
            console.warn(
              '📱 usePosts: Request timeout (mobile network issue), using cached data'
            );
            // タイムアウトの場合はキャッシュデータを使用
            const cachedData = cache.get(cacheKey);
            if (cachedData) {
              console.log('📱 usePosts: Recovered from timeout using cache');
              setPosts(cachedData);
              setLoading(false);
              setIsRefreshing(false);
              setIsCached(true);
              return;
            } else {
              // キャッシュもない場合は空の配列で初期化
              console.log('📱 usePosts: No cache available, showing empty state');
              setPosts([]);
              setLoading(false);
              setIsRefreshing(false);
              setError('ネットワーク接続が不安定です。しばらく時間をおいてから再度お試しください。');
              return;
            }
          }

          // ネットワークエラーの場合はキャッシュデータを使用
          if (
            err instanceof Error &&
            (err.message.includes('network') ||
              err.message.includes('fetch') ||
              err.message.includes('timeout'))
          ) {
            console.warn(
              '📱 usePosts: Network error, using cached data if available'
            );
            const cachedData = cache.get(cacheKey);
            if (cachedData) {
              setPosts(cachedData);
              setLoading(false);
              setIsRefreshing(false);
              return;
            }
          }

          console.error('📱 usePosts: Fetch error:', err);
          setError(
            err instanceof Error ? err.message : '投稿の読み込みに失敗しました'
          );
          setLoading(false);
          setIsRefreshing(false);
        }
      } catch (err) {
        console.error('❌ Error loading posts:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');

        // エラー時はキャッシュからフォールバック
        const fallbackData = cache.getOfflineData(cacheKey);
        if (fallbackData) {
          console.log('📱 usePosts: Using cached data as fallback', {
            postsCount: fallbackData.length,
          });
          setPosts(fallbackData);
        }
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [cacheKey, cache, canFetchData, categoryId, type]
  );

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
        const updatedPosts = [postWithCounts, ...posts];
        setPosts(updatedPosts);

        // キャッシュも更新
        cache.set(cacheKey, updatedPosts);
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
      const updatedPosts = posts.map(post =>
        post.id === postId ? { ...post, status: data.status } : post
      );
      setPosts(updatedPosts);

      // キャッシュも更新
      cache.set(cacheKey, updatedPosts);

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
      const updatedPosts = posts.map(post =>
        post.id === postId ? (data as unknown as Post) : post
      );
      setPosts(updatedPosts);

      // キャッシュも更新
      cache.set(cacheKey, updatedPosts);

      return data as unknown as Post;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update post');
    }
  };

  const deletePost = async (postId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      // Remove from local state
      const updatedPosts = posts.filter(post => post.id !== postId);
      setPosts(updatedPosts);

      // キャッシュも更新
      cache.set(cacheKey, updatedPosts);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete post');
    }
  };

  return {
    posts,
    loading,
    error,
    isRefreshing,
    createPost,
    updatePostStatus,
    updatePost,
    deletePost,
    refetch: () => loadPosts(true),
    isCached,
    cacheAge,
  };
}
