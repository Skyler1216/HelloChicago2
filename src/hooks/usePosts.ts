import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
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
  isCached: boolean;
  cacheAge: number;
}

// シンプルなキャッシュ実装
interface CacheData {
  posts: Post[];
  timestamp: number;
  type: string;
  categoryId: string;
}

// グローバルキャッシュ（ページ切り替えで消えない）
const postsCache = new Map<string, CacheData>();

export function usePosts(
  type?: 'post' | 'consultation' | 'transfer',
  categoryId?: string
): UsePostsReturn {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);

  // キャッシュキーを生成
  const cacheKey = `posts_${type || 'all'}_${categoryId || 'all'}`;

  // モバイル環境の検出
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // キャッシュの有効期限（モバイルでは長めに設定）
  const CACHE_TTL = isMobileDevice ? 30 * 60 * 1000 : 15 * 60 * 1000; // モバイル30分、デスクトップ15分

  // キャッシュからデータを取得
  const getCachedData = useCallback(
    (key: string): Post[] | null => {
      const cached = postsCache.get(key);
      if (!cached) return null;

      const now = Date.now();
      const age = now - cached.timestamp;

      // キャッシュが有効期限内かチェック
      if (age < CACHE_TTL) {
        setCacheAge(Math.floor(age / 1000));
        setIsCached(true);
        console.log('📱 usePosts: Cache hit', {
          key,
          age: Math.floor(age / 1000) + 's',
          postsCount: cached.posts.length,
        });
        return cached.posts;
      }

      // 期限切れのキャッシュを削除
      postsCache.delete(key);
      return null;
    },
    [CACHE_TTL]
  );

  // キャッシュにデータを保存
  const setCachedData = useCallback(
    (key: string, data: Post[]) => {
      const cacheData: CacheData = {
        posts: data,
        timestamp: Date.now(),
        type: type || 'all',
        categoryId: categoryId || 'all',
      };

      postsCache.set(key, cacheData);
      setIsCached(false);
      setCacheAge(0);

      console.log('📱 usePosts: Data cached', {
        key,
        postsCount: data.length,
      });
    },
    [type, categoryId]
  );

  // データを読み込み
  const loadPosts = useCallback(
    async (forceRefresh = false) => {
      try {
        setError(null);

        // キャッシュをチェック（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(cacheKey);
          if (cachedData) {
            console.log('📱 usePosts: Using cached data immediately');
            setPosts(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 usePosts: Fetching from database...');
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
            .order('created_at', { ascending: false })
            .abortSignal(controller.signal);

          if (type) {
            query = query.eq('type', type);
          }

          if (categoryId) {
            query = query.eq('category_id', categoryId);
          }

          const { data, error } = await query;
          clearTimeout(timeoutId);

          if (error) throw error;

          // 投稿IDのリストを作成
          const postIds = (data || []).map(post => post.id);

          let postsWithDetails = data || [];

          // いいね数とコメント数を一括取得（投稿がある場合のみ）
          if (postIds.length > 0) {
            const [likesResult, commentsResult] = await Promise.all([
              supabase.from('likes').select('post_id').in('post_id', postIds),
              supabase
                .from('comments')
                .select('post_id')
                .in('post_id', postIds)
                .eq('is_approved', true),
            ]);

            // いいね数とコメント数をカウント
            const likesCountMap = new Map<string, number>();
            const commentsCountMap = new Map<string, number>();

            if (likesResult.data) {
              likesResult.data.forEach(like => {
                const count = likesCountMap.get(like.post_id) || 0;
                likesCountMap.set(like.post_id, count + 1);
              });
            }

            if (commentsResult.data) {
              commentsResult.data.forEach(comment => {
                const count = commentsCountMap.get(comment.post_id) || 0;
                commentsCountMap.set(comment.post_id, count + 1);
              });
            }

            // 投稿データにいいね数とコメント数を追加
            postsWithDetails = (data || []).map(post => ({
              ...post,
              likes_count: likesCountMap.get(post.id) || 0,
              comments_count: commentsCountMap.get(post.id) || 0,
            }));
          }

          setPosts(postsWithDetails);
          setLoading(false);

          // データをキャッシュに保存
          setCachedData(cacheKey, postsWithDetails);

          console.log('📱 usePosts: Data fetched and cached successfully', {
            postsCount: postsWithDetails.length,
            type: type || 'all',
          });
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof Error && err.name === 'AbortError') {
            console.warn('📱 usePosts: Request timeout, using cached data');
            const cachedData = getCachedData(cacheKey);
            if (cachedData) {
              setPosts(cachedData);
              setLoading(false);
              return;
            }
          }

          throw err;
        }
      } catch (err) {
        console.error('📱 usePosts: Load error:', err);
        setError(
          err instanceof Error ? err.message : '投稿の読み込みに失敗しました'
        );
        setLoading(false);
      }
    },
    [cacheKey, getCachedData, setCachedData, type, categoryId, isMobileDevice]
  );

  // 初期化時の処理
  useEffect(() => {
    // まずキャッシュをチェック
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('📱 usePosts: Initial load from cache');
      setPosts(cachedData);
      setLoading(false);

      // バックグラウンドで更新（古いキャッシュの場合のみ）
      const now = Date.now();
      const cached = postsCache.get(cacheKey);
      if (cached && now - cached.timestamp > CACHE_TTL * 0.5) {
        console.log('📱 usePosts: Background refresh (cache is getting old)');
        setTimeout(() => {
          setIsRefreshing(true);
          loadPosts(true).finally(() => setIsRefreshing(false));
        }, 100);
      }
    } else {
      console.log('📱 usePosts: Initial load from database');
      loadPosts();
    }
  }, [cacheKey, getCachedData, loadPosts, CACHE_TTL]);

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

      if (data.approved) {
        const postWithCounts = {
          ...data,
          likes_count: 0,
          comments_count: 0,
        };
        const updatedPosts = [postWithCounts, ...posts];
        setPosts(updatedPosts);
        setCachedData(cacheKey, updatedPosts);
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

      const updatedPosts = posts.map(post =>
        post.id === postId ? { ...post, status: data.status } : post
      );
      setPosts(updatedPosts);
      setCachedData(cacheKey, updatedPosts);

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

      const updatedPosts = posts.map(post =>
        post.id === postId ? (data as unknown as Post) : post
      );
      setPosts(updatedPosts);
      setCachedData(cacheKey, updatedPosts);

      return data as unknown as Post;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update post');
    }
  };

  const deletePost = async (postId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;

      const updatedPosts = posts.filter(post => post.id !== postId);
      setPosts(updatedPosts);
      setCachedData(cacheKey, updatedPosts);
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete post');
    }
  };

  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await loadPosts(true);
    setIsRefreshing(false);
  }, [loadPosts]);

  return {
    posts,
    loading,
    error,
    isRefreshing,
    createPost,
    updatePostStatus,
    updatePost,
    deletePost,
    refetch,
    isCached,
    cacheAge,
  };
}
