import { useState, useEffect } from 'react';
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
}

export function useProfileDetails(
  profileId: string | undefined
): UseProfileDetailsReturn {
  const [profileDetails, setProfileDetails] = useState<ProfileDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!profileId) {
        setLoading(false);
        return;
      }

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
      } catch (err) {
        logError(err, 'useProfileDetails.loadData');
        setError(formatSupabaseError(err));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [profileId]);

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
