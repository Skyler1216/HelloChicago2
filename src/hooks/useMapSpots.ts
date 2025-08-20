import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import {
  MapSpot,
  MapSpotWithDetails,
  CreateMapSpotData,
  UpdateMapSpotData,
  CreateSpotRatingData,
  CreateSpotNoteData,
} from '../types/map';

export function useMapSpots() {
  const [spots, setSpots] = useState<MapSpotWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // スポット一覧を取得
  const fetchSpots = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('map_spots')
        .select(
          `
          *,
          category:categories(*),
          favorites:spot_favorites(count),
          ratings:spot_ratings(rating),
          user_rating:spot_ratings!inner(rating),
          user_favorite:spot_favorites!inner(id)
        `
        )
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // データを整形
      const formattedSpots: MapSpotWithDetails[] = (data || []).map(spot => ({
        ...spot,
        favorites_count: spot.favorites?.[0]?.count || 0,
        average_rating:
          spot.ratings?.length > 0
            ? spot.ratings.reduce(
                (sum: number, r: { rating: number }) => sum + r.rating,
                0
              ) / spot.ratings.length
            : 0,
        user_rating: spot.user_rating?.[0]?.rating,
        user_favorite: !!spot.user_favorite?.length,
      }));

      setSpots(formattedSpots);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'スポットの取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  // 新しいスポットを作成
  const createSpot = async (
    spotData: CreateMapSpotData
  ): Promise<MapSpot | null> => {
    if (!user) {
      setError('ユーザーが認証されていません');
      return null;
    }

    try {
      const { data, error: createError } = await supabase
        .from('map_spots')
        .insert({
          ...spotData,
          created_by: user.id,
        })
        .select()
        .single();

      if (createError) throw createError;

      // スポット一覧を更新
      await fetchSpots();
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'スポットの作成に失敗しました'
      );
      return null;
    }
  };

  // スポットを更新
  const updateSpot = async (
    spotId: string,
    updateData: UpdateMapSpotData
  ): Promise<boolean> => {
    if (!user) {
      setError('ユーザーが認証されていません');
      return false;
    }

    try {
      const { error: updateError } = await supabase
        .from('map_spots')
        .update(updateData)
        .eq('id', spotId)
        .eq('created_by', user.id);

      if (updateError) throw updateError;

      // スポット一覧を更新
      await fetchSpots();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'スポットの更新に失敗しました'
      );
      return false;
    }
  };

  // スポットを削除
  const deleteSpot = async (spotId: string): Promise<boolean> => {
    if (!user) {
      setError('ユーザーが認証されていません');
      return false;
    }

    try {
      const { error: deleteError } = await supabase
        .from('map_spots')
        .delete()
        .eq('id', spotId)
        .eq('created_by', user.id);

      if (deleteError) throw deleteError;

      // スポット一覧を更新
      await fetchSpots();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'スポットの削除に失敗しました'
      );
      return false;
    }
  };

  // お気に入りに追加/削除
  const toggleFavorite = async (spotId: string): Promise<boolean> => {
    if (!user) {
      setError('ユーザーが認証されていません');
      return false;
    }

    try {
      // 現在のお気に入り状態を確認
      const { data: existingFavorite } = await supabase
        .from('spot_favorites')
        .select('id')
        .eq('spot_id', spotId)
        .eq('user_id', user.id)
        .single();

      if (existingFavorite) {
        // お気に入りを削除
        const { error: deleteError } = await supabase
          .from('spot_favorites')
          .delete()
          .eq('id', existingFavorite.id);

        if (deleteError) throw deleteError;
      } else {
        // お気に入りを追加
        const { error: insertError } = await supabase
          .from('spot_favorites')
          .insert({
            spot_id: spotId,
            user_id: user.id,
          });

        if (insertError) throw insertError;
      }

      // スポット一覧を更新
      await fetchSpots();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'お気に入りの更新に失敗しました'
      );
      return false;
    }
  };

  // 評価を追加/更新
  const rateSpot = async (
    ratingData: CreateSpotRatingData
  ): Promise<boolean> => {
    if (!user) {
      setError('ユーザーが認証されていません');
      return false;
    }

    try {
      const { error: upsertError } = await supabase.from('spot_ratings').upsert(
        {
          ...ratingData,
          user_id: user.id,
        },
        {
          onConflict: 'spot_id,user_id',
        }
      );

      if (upsertError) throw upsertError;

      // スポット一覧を更新
      await fetchSpots();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '評価の更新に失敗しました');
      return false;
    }
  };

  // メモを追加
  const addNote = async (noteData: CreateSpotNoteData): Promise<boolean> => {
    if (!user) {
      setError('ユーザーが認証されていません');
      return false;
    }

    try {
      const { error: insertError } = await supabase.from('spot_notes').insert({
        ...noteData,
        user_id: user.id,
      });

      if (insertError) throw insertError;

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'メモの追加に失敗しました');
      return false;
    }
  };

  // 初期データを取得
  useEffect(() => {
    fetchSpots();
  }, []);

  return {
    spots,
    loading,
    error,
    createSpot,
    updateSpot,
    deleteSpot,
    toggleFavorite,
    rateSpot,
    addNote,
    refetch: fetchSpots,
  };
}
