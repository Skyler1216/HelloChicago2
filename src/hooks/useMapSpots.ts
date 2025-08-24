import { useState, useEffect, useCallback, useMemo } from 'react';
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

// Supabase row shapes with possible stringified numeric fields
type MapSpotRow = Omit<MapSpot, 'location_lat' | 'location_lng'> & {
  location_lat: number | string;
  location_lng: number | string;
};

type RatingRow = {
  spot_id: string;
  rating: number | string | null;
};

export function useMapSpots() {
  const [spots, setSpots] = useState<MapSpotWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceLoading, setForceLoading] = useState(false);
  const { user } = useAuth();

  // スポット一覧を取得
  const fetchSpots = async () => {
    try {
      setLoading(true);
      setError(null);
      setForceLoading(false);

      // NOTE:
      // Nested relations to favorites/ratings can fail with RLS/privilege errors
      // on some environments (anon vs authenticated). To ensure spots render,
      // first fetch only base spot fields; derive aggregates separately if needed.
      const { data, error: fetchError } = await supabase
        .from('map_spots')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // rating集計を別クエリで取得（RLSでspot_ratingsは閲覧可）
      const spotIds = ((data ?? []) as unknown as MapSpotRow[])
        .map(s => s.id)
        .filter(Boolean);
      let spotIdToAvg: Record<string, { sum: number; count: number }> = {};
      if (spotIds.length > 0) {
        const { data: ratings, error: ratingsError } = await supabase
          .from('spot_ratings')
          .select('spot_id, rating')
          .in('spot_id', spotIds);
        if (ratingsError) {
          // 集計に失敗しても表示は継続（平均は0）
          spotIdToAvg = {};
        } else {
          spotIdToAvg = ((ratings ?? []) as unknown as RatingRow[]).reduce(
            (
              acc: Record<string, { sum: number; count: number }>,
              r: RatingRow
            ) => {
              const sid = r.spot_id;
              const ratingVal = Number(r.rating ?? 0) || 0;
              if (!acc[sid]) acc[sid] = { sum: 0, count: 0 };
              acc[sid].sum += ratingVal;
              acc[sid].count += 1;
              return acc;
            },
            {}
          );
        }
      }

      // データを整形
      const formattedSpots: MapSpotWithDetails[] = (
        (data ?? []) as unknown as MapSpotRow[]
      ).map(spot => {
        const avgData = spotIdToAvg[spot.id] || { sum: 0, count: 0 };
        const averageRating =
          avgData.count > 0 ? avgData.sum / avgData.count : 0;

        return {
          ...spot,
          location_lat:
            typeof spot.location_lat === 'string'
              ? parseFloat(spot.location_lat)
              : spot.location_lat,
          location_lng:
            typeof spot.location_lng === 'string'
              ? parseFloat(spot.location_lng)
              : spot.location_lng,
          average_rating: Math.round(averageRating * 10) / 10,
          rating_count: avgData.count,
          favorites_count: 0, // デフォルト値として0を設定
          user_rating: undefined, // デフォルト値としてundefinedを設定
          user_favorite: false, // デフォルト値としてfalseを設定
        };
      });

      setSpots(formattedSpots);
    } catch (err) {
      console.error('Failed to fetch map spots:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'マップスポットの取得に失敗しました'
      );
    } finally {
      setLoading(false);
    }
  };

  // タイムアウト機能（無限ローディング防止）
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn(
          '📱 MapSpots: Loading timeout reached, forcing completion'
        );
        setForceLoading(true);
        setLoading(false);
        setError(
          'マップスポットの読み込みがタイムアウトしました。再試行してください。'
        );
      }
    }, 12000); // 12秒でタイムアウト

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // 強制リセット機能
  const forceReset = useCallback(() => {
    console.log('📱 MapSpots: Force reset triggered');
    setForceLoading(false);
    setError(null);
    setLoading(false);
  }, []);

  // ローディング状態の管理（タイムアウト機能付き）
  const effectiveLoading = useMemo(() => {
    if (forceLoading) return false;
    return loading;
  }, [forceLoading, loading]);

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

      // スポット一覧を即時更新（再取得）
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

      // スポット一覧を即時更新
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

      // スポット一覧を即時更新
      await fetchSpots();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'スポットの削除に失敗しました'
      );
      return false;
    }
  };

  // お気に入り機能はマップでは非対応（仕様明確化）。空実装を残して互換性維持。
  const toggleFavorite = async (): Promise<boolean> => {
    return false;
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
    loading: effectiveLoading,
    error,
    createSpot,
    updateSpot,
    deleteSpot,
    toggleFavorite,
    rateSpot,
    addNote,
    refetch: fetchSpots,
    forceReset,
  };
}
