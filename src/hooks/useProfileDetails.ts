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
  // キャッシュ関連の機能を追加
  isCached: boolean;
  cacheAge: number;
  forceRefresh: () => Promise<void>;
}

// キャッシュの設定
const CACHE_KEY_PREFIX = 'profile_details_cache_';
const CACHE_TTL = 8 * 60 * 60 * 1000; // 8時間に延長（プロフィール情報は変更頻度が低い）

interface CacheData {
  data: ProfileDetails;
  timestamp: number;
}

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

  // キャッシュからデータを取得
  const getCachedData = useCallback((id: string): ProfileDetails | null => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cached = localStorage.getItem(cacheKey);

      if (!cached) return null;

      const cacheData: CacheData = JSON.parse(cached);
      const now = Date.now();

      // キャッシュが有効期限切れかチェック
      if (now - cacheData.timestamp > CACHE_TTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      const age = Math.floor((now - cacheData.timestamp) / 1000);
      setCacheAge(age);
      setIsCached(true);

      console.log('📱 useProfileDetails: Cache hit', { age: age + 's' });
      return cacheData.data;
    } catch (err) {
      console.warn('📱 useProfileDetails: Cache read error', err);
      return null;
    }
  }, []);

  // データをキャッシュに保存
  const setCachedData = useCallback((id: string, data: ProfileDetails) => {
    try {
      const cacheKey = CACHE_KEY_PREFIX + id;
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };

      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      setIsCached(false);
      setCacheAge(0);

      console.log('📱 useProfileDetails: Data cached');
    } catch (err) {
      console.warn('📱 useProfileDetails: Cache write error', err);
    }
  }, []);

  // データ読み込み（キャッシュ優先）
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!profileId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // キャッシュから取得を試行（強制更新でない場合）
        if (!forceRefresh) {
          const cachedData = getCachedData(profileId);
          if (cachedData) {
            setProfileDetails(cachedData);
            setLoading(false);
            return;
          }
        }

        console.log('📱 useProfileDetails: Fetching from database...');

        const { data, error: fetchError } = await supabase
          .from('profile_details')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle();

        if (fetchError) throw fetchError;

        setProfileDetails(data);

        // データをキャッシュに保存
        if (data) {
          setCachedData(profileId, data);
        }
      } catch (err) {
        logError(err, 'useProfileDetails.loadData');
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    },
    [profileId, getCachedData, setCachedData]
  );

  useEffect(() => {
    loadData(false); // 初回はキャッシュ優先
  }, [loadData]);

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
      if (data) {
        setCachedData(profileId!, data);
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
    if (!profileId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profile_details')
        .select('*')
        .eq('profile_id', profileId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setProfileDetails(data);

      // データをキャッシュに保存
      if (data) {
        setCachedData(profileId, data);
      }
    } catch (err) {
      logError(err, 'useProfileDetails.updateProfileDetails');
      setError(formatSupabaseError(err));
    } finally {
      setLoading(false);
    }
  };

  return {
    profileDetails,
    loading,
    error,
    updateProfileDetails,
    createProfileDetails,
    reload,
    // キャッシュ関連の情報を追加
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
