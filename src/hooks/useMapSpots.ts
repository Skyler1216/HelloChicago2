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
  const { user } = useAuth();

  // スポット一覧を取得
  const fetchSpots = async () => {
    try {
      setLoading(true);
      setError(null);

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
      ).map((spot: MapSpotRow) => {
        // Normalize numeric fields coming from SQL DECIMAL as strings
        const lat =
          typeof spot.location_lat === 'string'
            ? parseFloat(spot.location_lat)
            : spot.location_lat;
        const lng =
          typeof spot.location_lng === 'string'
            ? parseFloat(spot.location_lng)
            : spot.location_lng;

        const agg = spotIdToAvg[spot.id];
        const avg = agg && agg.count > 0 ? agg.sum / agg.count : 0;

        const shaped: MapSpotWithDetails = {
          id: spot.id,
          name: spot.name,
          description: spot.description,
          category_id: spot.category_id,
          location_lat: lat,
          location_lng: lng,
          location_address: spot.location_address,
          created_by: spot.created_by,
          is_public: spot.is_public,
          created_at: spot.created_at,
          updated_at: spot.updated_at,
          favorites_count: 0,
          average_rating: avg,
          user_rating: undefined,
          user_favorite: false,
        };

        return shaped;
      });

      // 更新の抑制はしすぎない。ID順が同じでも内容が変わる（average_rating 等）ので差分比較
      setSpots(prev => {
        if (prev.length !== formattedSpots.length) return formattedSpots;
        for (let i = 0; i < prev.length; i++) {
          const a = prev[i];
          const b = formattedSpots[i];
          if (
            a.id !== b.id ||
            a.average_rating !== b.average_rating ||
            a.favorites_count !== b.favorites_count ||
            a.user_rating !== b.user_rating ||
            a.user_favorite !== b.user_favorite ||
            a.location_lat !== b.location_lat ||
            a.location_lng !== b.location_lng ||
            a.name !== b.name ||
            a.description !== b.description
          ) {
            return formattedSpots;
          }
        }
        return prev; // 実質変化なし
      });
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
