import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { formatSupabaseError, logError } from '../utils/errorHandler';

type ProfileDetails = Database['public']['Tables']['profile_details']['Row'];
type ProfileDetailsInsert =
  Database['public']['Tables']['profile_details']['Insert'];
type ProfileDetailsUpdate =
  Database['public']['Tables']['profile_details']['Update'];

interface UseProfileDetailsReturn {
  profileDetails: ProfileDetails | null;
  loading: boolean;
  error: string | null;
  updateProfileDetails: (updates: ProfileDetailsUpdate) => Promise<boolean>;
  createProfileDetails: (details: ProfileDetailsInsert) => Promise<boolean>;
  reload: () => Promise<void>;
  isCached: boolean;
  cacheAge: number;
  forceRefresh: () => Promise<void>;
}

// シンプルなグローバルキャッシュ（ページ切り替えで消えない）
const profileDetailsCache = new Map<
  string,
  {
    data: ProfileDetails;
    timestamp: number;
  }
>();

export function useProfileDetails(
  profileId: string | undefined
): UseProfileDetailsReturn {
  const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(
    null
  );
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
  const CACHE_TTL = isMobileDevice ? 2 * 60 * 60 * 1000 : 30 * 60 * 1000; // モバイル2時間、デスクトップ30分

  // キャッシュからデータを取得
  const getCachedData = useCallback(
    (id: string): ProfileDetails | null => {
      const cached = profileDetailsCache.get(id);
      if (!cached) return null;

      const now = Date.now();
      const age = now - cached.timestamp;

      // キャッシュが有効期限内かチェック
      if (age < CACHE_TTL) {
        setCacheAge(Math.floor(age / 1000));
        setIsCached(true);
        console.log('📱 useProfileDetails: Cache hit', {
          age: Math.floor(age / 1000) + 's',
          profileId: id,
        });
        return cached.data;
      }

      // 期限切れのキャッシュを削除
      profileDetailsCache.delete(id);
      return null;
    },
    [CACHE_TTL]
  );

  // キャッシュにデータを保存
  const setCachedData = useCallback((id: string, data: ProfileDetails) => {
    profileDetailsCache.set(id, {
      data,
      timestamp: Date.now(),
    });
    setIsCached(false);
    setCacheAge(0);
    console.log('📱 useProfileDetails: Data cached for profile:', id);
  }, []);

  // データ読み込み（キャッシュ優先）
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(profileId);
          if (cachedData) {
            console.log('📱 useProfileDetails: Using cached data immediately');
            setProfileDetails(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 useProfileDetails: Fetching from database...');
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
          const { data, error: fetchError } = await supabase
            .from('profile_details')
            .select('*')
            .eq('profile_id', profileId)
            .maybeSingle()
            .abortSignal(controller.signal);

          clearTimeout(timeoutId);

          if (fetchError) throw fetchError;

          setProfileDetails(data);

          // データをキャッシュに保存
          if (data) {
            setCachedData(profileId, data);
          }
        } catch (err) {
          clearTimeout(timeoutId);

          if (err instanceof Error && err.name === 'AbortError') {
            console.warn(
              '📱 useProfileDetails: Request timeout, using cached data'
            );
            const cachedData = getCachedData(profileId);
            if (cachedData) {
              setProfileDetails(cachedData);
              setLoading(false);
              return;
            }
          }
          throw err;
        }
      } catch (err) {
        logError(err, 'useProfileDetails.loadData');
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [profileId, getCachedData, setCachedData, isMobileDevice]
  );

  // 初期化時の処理
  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }

    // まずキャッシュをチェック
    const cachedData = getCachedData(profileId);
    if (cachedData) {
      console.log('📱 useProfileDetails: Initial load from cache');
      setProfileDetails(cachedData);
      setLoading(false);

      // バックグラウンドで更新（古いキャッシュの場合のみ）
      const now = Date.now();
      const cached = profileDetailsCache.get(profileId);
      if (cached && now - cached.timestamp > CACHE_TTL * 0.5) {
        console.log(
          '📱 useProfileDetails: Background refresh (cache is getting old)'
        );
        setTimeout(() => {
          loadData(true);
        }, 100);
      }
    } else {
      console.log('📱 useProfileDetails: Initial load from database');
      loadData();
    }
  }, [profileId, getCachedData, loadData, CACHE_TTL]);

  // 強制更新（キャッシュを無視）
  const forceRefresh = useCallback(async () => {
    await loadData(true);
  }, [loadData]);

  const createProfileDetails = async (
    details: ProfileDetailsInsert
  ): Promise<boolean> => {
    try {
      setError(null);

      const { data, error: insertError } = await supabase
        .from('profile_details')
        .insert(details)
        .select()
        .single();

      if (insertError) throw insertError;

      setProfileDetails(data);

      // 新しく作成されたデータをキャッシュに保存
      if (data && profileId) {
        setCachedData(profileId, data);
      }

      return true;
    } catch (err) {
      logError(err, 'useProfileDetails.createProfileDetails');
      setError(formatSupabaseError(err));
      return false;
    }
  };

  const updateProfileDetails = async (
    updates: ProfileDetailsUpdate
  ): Promise<boolean> => {
    if (!profileId) return false;

    try {
      setError(null);

      const { data, error: updateError } = await supabase
        .from('profile_details')
        .update(updates)
        .eq('profile_id', profileId)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfileDetails(data);

      // 更新されたデータをキャッシュに保存
      if (data) {
        setCachedData(profileId, data);
      }

      return true;
    } catch (err) {
      logError(err, 'useProfileDetails.updateProfileDetails');
      setError(formatSupabaseError(err));
      return false;
    }
  };

  const reload = async (): Promise<void> => {
    await loadData(true);
  };

  return {
    profileDetails,
    loading,
    error,
    updateProfileDetails,
    createProfileDetails,
    reload,
    isCached,
    cacheAge,
    forceRefresh,
  };
}

// プロフィール詳細情報のデフォルト値
export const getDefaultProfileDetails = (
  profileId: string
): ProfileDetailsInsert => ({
  profile_id: profileId,
  bio: null,
  location_area: null,
  interests: [],
  languages: [],
  arrival_date: null,
  family_structure: null,
  privacy_settings: {
    profile_visible: true,
    posts_visible: true,
    activity_visible: false,
    contact_allowed: true,
  },
});

// よく使われる選択肢の定数
export const LOCATION_AREAS = [
  'ダウンタウン',
  'ノースサイド',
  'サウスサイド',
  'ウエストサイド',
  '郊外（北部）',
  '郊外（南部）',
  '郊外（西部）',
  'その他',
] as const;

export const COMMON_INTERESTS = [
  '料理',
  '映画・ドラマ',
  '音楽',
  'スポーツ',
  'アート',
  '読書',
  '旅行',
  'ショッピング',
  'カフェ巡り',
  'アウトドア',
  'ゲーム',
  '写真',
  'ファッション',
  '語学学習',
  'その他',
] as const;

export const COMMON_LANGUAGES = [
  '日本語',
  '英語',
  '中国語',
  '韓国語',
  'スペイン語',
  'フランス語',
  'ドイツ語',
  'その他',
] as const;

export const FAMILY_STRUCTURES = [
  '一人暮らし',
  '夫婦',
  '夫婦+子供',
  '家族（3世代）',
  'シェアハウス',
  'ルームメイト',
  'その他',
] as const;
