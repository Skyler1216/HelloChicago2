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

// キャッシュの設定
const CACHE_KEY_PREFIX = 'map_spots_cache_';
const isMobileDevice =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
const CACHE_TTL = isMobileDevice ? 4 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000; // モバイル4時間、デスクトップ2時間

interface CacheData {
  data: MapSpotWithDetails[];
  timestamp: number;
  deviceId?: string;
}

// グローバルキャッシュ（ページ切り替えで消えない）
const mapSpotsCache = new Map<string, CacheData>();

export function useMapSpots() {
  const [spots, setSpots] = useState<MapSpotWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [cacheAge, setCacheAge] = useState(0);
  const { user } = useAuth();

  // デバイスIDを生成（簡易版）
  const getDeviceId = useCallback(() => {
    try {
      const existingId = localStorage.getItem('device_id');
      if (existingId) return existingId;

      const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', newId);
      return newId;
    } catch {
      return `fallback_${Date.now()}`;
    }
  }, []);

  // キャッシュからデータを取得
  const getCachedData = useCallback((): MapSpotWithDetails[] | null => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + 'all';
      const cached = mapSpotsCache.get(cacheKey);
      if (!cached) return null;

      const now = Date.now();
      const age = now - cached.timestamp;

      // キャッシュが有効期限内かチェック
      if (age < CACHE_TTL) {
        setCacheAge(Math.floor(age / 1000));
        setIsCached(true);
        console.log('📱 useMapSpots: Cache hit', {
          age: Math.floor(age / 1000) + 's',
          spotsCount: cached.data.length,
          device: isMobileDevice ? 'mobile' : 'desktop',
        });
        return cached.data;
      }

      // 期限切れのキャッシュを削除
      mapSpotsCache.delete(cacheKey);
      return null;
    } catch (err) {
      console.warn('📱 useMapSpots: Cache read error', err);
      return null;
    }
  }, []);

  // キャッシュにデータを保存
  const setCachedData = useCallback((data: MapSpotWithDetails[]) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + 'all';
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
        deviceId: getDeviceId(),
      };

      mapSpotsCache.set(cacheKey, cacheData);
      setIsCached(false);
      setCacheAge(0);

      console.log('📱 useMapSpots: Data cached', {
        spotsCount: data.length,
        device: isMobileDevice ? 'mobile' : 'desktop',
        deviceId: cacheData.deviceId,
      });
    } catch (err) {
      console.warn('📱 useMapSpots: Cache write error', err);
    }
  }, [getDeviceId]);

  // スポット一覧を取得（キャッシュ優先）
  const fetchSpots = useCallback(
    async (forceRefresh = false) => {
      try {
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData();
          if (cachedData) {
            console.log('📱 useMapSpots: Using cached data immediately');
            setSpots(cachedData);
            setLoading(false);
            console.log('📱 useMapSpots: Loading set to false (fetchSpots cache hit)');
            return;
          }
        }

        console.log('📱 useMapSpots: Fetching from database...');
        setLoading(true);

        // モバイル環境でのタイムアウト付きクエリ
        const controller = new AbortController();
        const timeoutDuration = isMobileDevice ? 15000 : 10000;

        const timeoutId = setTimeout(() => {
          console.warn('📱 useMapSpots: Query timeout, aborting...');
          controller.abort();
        }, timeoutDuration);

        try {
          // NOTE:
          // Nested relations to favorites/ratings can fail with RLS/privilege errors
          // on some environments (anon vs authenticated). To ensure spots render,
          // first fetch only base spot fields; derive aggregates separately if needed.
          const { data, error: fetchError } = await supabase
            .from('map_spots')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false })
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);

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
              .in('spot_id', spotIds)
              .abortSignal(controller.signal);
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
              favorites_count: 0,
              user_rating: undefined,
              user_favorite: false,
            };
          });

          setSpots(formattedSpots);

          // データをキャッシュに保存
          setCachedData(formattedSpots);

          console.log('📱 useMapSpots: Data fetched and cached successfully', {
            spotsCount: formattedSpots.length,
          });
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof Error && err.name === 'AbortError') {
            console.warn('📱 useMapSpots: Request aborted due to timeout');
            // タイムアウト時はキャッシュデータを使用
            const cachedData = getCachedData();
            if (cachedData) {
              setSpots(cachedData);
              setLoading(false);
              return;
            }
          }
          throw err;
        }
      } catch (err) {
        console.error('Failed to fetch map spots:', err);
        setError(
          err instanceof Error && err.name === 'AbortError'
            ? 'ネットワーク接続が不安定です。画面を下に引っ張って更新してください。'
            : err instanceof Error
            ? err.message
            : 'マップスポットの取得に失敗しました'
        );
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData]
  );

  // 初期化時の処理（キャッシュ優先）
  useEffect(() => {
    // まずキャッシュをチェック
    const cachedData = getCachedData();
    if (cachedData) {
      console.log('📱 useMapSpots: Initial load from cache');
      setSpots(cachedData);
      setLoading(false);

      // バックグラウンドで更新（古いキャッシュの場合のみ）
      const now = Date.now();
      const cached = mapSpotsCache.get(CACHE_KEY_PREFIX + 'all');
      if (cached && now - cached.timestamp > CACHE_TTL * 0.5) {
        console.log(
          '📱 useMapSpots: Background refresh (cache is getting old)'
        );
        setTimeout(() => {
          setIsRefreshing(true);
          fetchSpots(true).finally(() => setIsRefreshing(false));
        }, 100);
      }
    } else {
      console.log('📱 useMapSpots: Initial load from database');
      fetchSpots();
    }
  }, [getCachedData, fetchSpots, CACHE_TTL]);

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

      // スポット一覧を即時更新（キャッシュも更新）
      await fetchSpots(true);
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

      // スポット一覧を即時更新（キャッシュも更新）
      await fetchSpots(true);
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

      // スポット一覧を即時更新（キャッシュも更新）
      await fetchSpots(true);
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

      // スポット一覧を更新（キャッシュも更新）
      await fetchSpots(true);
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

  // 手動リフレッシュ
  const refetch = useCallback(async () => {
    setIsRefreshing(true);
    await fetchSpots(true);
    setIsRefreshing(false);
  }, [fetchSpots]);

  // 強制リセット機能
  const forceReset = useCallback(() => {
    console.log('📱 MapSpots: Force reset triggered');
    setLoading(false);
    setError(null);
  }, []);

  return {
    spots,
    loading,
    error,
    isRefreshing,
    createSpot,
    updateSpot,
    deleteSpot,
    toggleFavorite,
    rateSpot,
    addNote,
    refetch,
    forceReset,
    // キャッシュ関連の情報を追加
    isCached,
    cacheAge,
  };
}