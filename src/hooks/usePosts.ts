import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useCache } from './useCache';
import { useAppLifecycle } from './useAppLifecycle';

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
  // キャッシュ状態を追加
  isCached: boolean;
  cacheAge: number;
}

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

  // キャッシュと App Lifecycle の管理
  const cache = useCache<Post[]>(`posts`, {
    ttl: 3 * 60 * 1000, // 3分のTTL
    priority: 8, // 投稿は高優先度
    staleWhileRevalidate: true,
  });

  const { canFetchData, shouldRefreshData } = useAppLifecycle({
    onAppVisible: () => {
      // アプリがフォアグラウンドに戻ったとき
      if (shouldRefreshData()) {
        console.log('📱 App visible: refreshing posts data');
        loadPosts(true); // 強制リフレッシュ
      }
    },
    refreshThreshold: 2 * 60 * 1000, // 2分以上非アクティブだったら再読み込み
  });

  useEffect(() => {
    loadPosts();
  }, [type, categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPosts = useCallback(
    async (forceRefresh = false) => {
      try {
        // キャッシュをチェック
        if (!forceRefresh) {
          const cachedPosts = cache.get(cacheKey);
          if (cachedPosts) {
            console.log('📱 usePosts: Cache hit', {
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

        console.log('📱 usePosts: Fetching from database...', {
          type: type || 'all',
          categoryId: categoryId || 'all',
        });
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

        // キャッシュに保存
        cache.set(cacheKey, postsWithCounts);
        console.log('📱 usePosts: Data cached successfully', {
          postsCount: postsWithCounts.length,
          cacheKey,
        });

        setPosts(postsWithCounts);
        setError(null); // エラーをクリア
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
