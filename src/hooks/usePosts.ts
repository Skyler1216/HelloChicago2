import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
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

      setPosts(data || []);
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
        setPosts(prev => [data, ...prev]);
      }

      return data;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create post');
    }
  };

  return {
    posts,
    loading,
    error,
    createPost,
    refetch: loadPosts,
  };
}
