import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface SpotReviewItem {
  id: string;
  user_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  user_name?: string | null;
  user_avatar_url?: string | null;
}

// Fallback row type for legacy table shape
interface ReviewRow {
  id: string;
  user_id: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  profiles?: {
    name?: string | null;
    avatar_url?: string | null;
  } | null;
}

export function useSpotReviews(spotId: string | null) {
  const [reviews, setReviews] = useState<SpotReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    if (!spotId) {
      setReviews([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      let { data, error } = await supabase
        .from('spot_ratings')
        .select(
          `id, user_id, rating, comment, created_at, profiles:user_id ( name, avatar_url )`
        )
        .eq('spot_id', spotId)
        .order('created_at', { ascending: false });

      if (error) {
        // fallback: singular table name
        const res = await supabase
          .from('spot_rating')
          .select(
            `id, user_id, rating, comment, created_at, profiles:user_id ( name, avatar_url )`
          )
          .eq('spot_id', spotId)
          .order('created_at', { ascending: false });
        data = (res.data as unknown as ReviewRow[]) ?? null;
        error = res.error;
      }

      if (error) throw error;

      const mapped: SpotReviewItem[] = (data || []).map((row: ReviewRow) => ({
        id: row.id,
        user_id: row.user_id,
        rating: row.rating,
        comment: row.comment,
        created_at: row.created_at,
        user_name: row.profiles?.name ?? null,
        user_avatar_url: row.profiles?.avatar_url ?? null,
      }));
      setReviews(mapped);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '口コミの取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotId]);

  return { reviews, loading, error, refetch: fetchReviews };
}
