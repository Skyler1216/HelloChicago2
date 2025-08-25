import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useToast } from './useToast';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileDetails = Database['public']['Tables']['profile_details']['Row'];

// キャッシュ用のデータ型
interface ProfileCacheData {
  profile: Profile | null;
  profileDetails: ProfileDetails | null;
  timestamp: number;
}

interface SaveHistory {
  id: string;
  timestamp: Date;
  type: 'profile' | 'details' | 'both';
  changes: Record<string, unknown>;
  success: boolean;
  error?: string;
}

interface ProfileManagerState {
  profile: Profile | null;
  profileDetails: ProfileDetails | null;
  isDirty: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  saveHistory: SaveHistory[];
}

interface UpdateResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export function useProfileManager(userId: string) {
  const { addToast } = useToast();

  // 状態管理
  const [state, setState] = useState<ProfileManagerState>({
    profile: null,
    profileDetails: null,
    isDirty: false,
    hasUnsavedChanges: false,
    lastSaved: null,
    saveHistory: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forceLoading, setForceLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  // キャッシュの有効期限（モバイル対応）
  const isMobileDevice =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const CACHE_TTL = isMobileDevice ? 1 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000; // モバイルでは1時間、デスクトップでは2時間

  // キャッシュからデータを取得
  const getCachedProfileData = useCallback((): ProfileCacheData | null => {
    if (!userId) return null;

    try {
      const cacheKey = `profile_${userId}`;
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const data: ProfileCacheData = JSON.parse(cached);
      const now = Date.now();
      const age = now - data.timestamp;
      const isValid = age < CACHE_TTL;

      if (!isValid) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to read profile cache:', error);
      return null;
    }
  }, [userId, CACHE_TTL]); // CACHE_TTLを依存配列に追加

  // キャッシュにデータを保存
  const setCachedProfileData = useCallback(
    (data: Omit<ProfileCacheData, 'timestamp'>) => {
      if (!userId) return;

      try {
        const cacheKey = `profile_${userId}`;
        const cacheData: ProfileCacheData = {
          ...data,
          timestamp: Date.now(),
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        console.log('📱 ProfileManager: Data cached successfully', {
          profileId: data.profile?.id,
          hasDetails: !!data.profileDetails,
          timestamp: new Date(cacheData.timestamp).toISOString(),
        });
      } catch (error) {
        console.warn('Failed to write profile cache:', error);
      }
    },
    [userId]
  );

  // プロフィールデータの読み込み（キャッシュ優先）
  const loadProfileData = useCallback(
    async (forceRefresh = false) => {
      // ユーザーIDが無効な場合は何もしない
      if (!userId || userId.trim() === '' || userId.length < 36) {
        setLoading(false);
        setError(null);
        return;
      }

      // キャッシュが有効で、強制更新でない場合はキャッシュを使用
      if (!forceRefresh) {
        const cachedData = getCachedProfileData();
        if (cachedData) {
          setState(prev => ({
            ...prev,
            profile: cachedData.profile,
            profileDetails: cachedData.profileDetails,
            lastSaved: new Date(cachedData.timestamp),
          }));
          setLastFetchTime(cachedData.timestamp);
          setLoading(false);
          return;
        }
      }

      // キャッシュが無効または強制更新の場合はAPIから取得
      console.log('📱 ProfileManager: Fetching fresh data');
      setLoading(true);
      setError(null);
      setForceLoading(false);

      try {
        // プロフィール基本情報と詳細情報を並行して取得
        const [profileResult, detailsResult] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase
            .from('profile_details')
            .select('*')
            .eq('user_id', userId)
            .single(),
        ]);

        if (profileResult.error) throw profileResult.error;

        const newProfile = profileResult.data;
        const newProfileDetails = detailsResult.data || null;
        const now = Date.now();

        setState(prev => ({
          ...prev,
          profile: newProfile,
          profileDetails: newProfileDetails,
          lastSaved: new Date(),
        }));

        setLastFetchTime(now);

        // キャッシュに保存
        setCachedProfileData({
          profile: newProfile,
          profileDetails: newProfileDetails,
        });
      } catch (err) {
        console.error('Failed to load profile data:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'プロフィールデータの読み込みに失敗しました'
        );
        addToast('error', 'プロフィールデータの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    },
    [userId, addToast, getCachedProfileData, setCachedProfileData]
  );

  // タイムアウト機能（無限ローディング防止）
  useEffect(() => {
    if (!userId) return;

    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn(
          '📱 ProfileManager: Loading timeout reached, forcing completion'
        );
        setForceLoading(true);
        setLoading(false);
        setError(
          'プロフィールの読み込みがタイムアウトしました。再試行してください。'
        );
      }
    }, 10000); // 10秒でタイムアウト

    return () => clearTimeout(timeoutId);
  }, [userId, loading]);

  // 強制リセット機能
  const forceReset = useCallback(() => {
    console.log('📱 ProfileManager: Force reset triggered');
    setForceLoading(false);
    setError(null);
    setLoading(false);
  }, []);

  // ローディング状態の管理（タイムアウト機能付き）
  const effectiveLoading = useMemo(() => {
    if (forceLoading) return false;
    return loading;
  }, [forceLoading, loading]);

  // 保存履歴の追加
  const addToSaveHistory = useCallback(
    (
      type: 'profile' | 'details' | 'both',
      changes: Record<string, unknown>,
      success: boolean,
      error?: string
    ) => {
      const historyItem: SaveHistory = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        changes,
        success,
        error,
      };

      setState(prev => ({
        ...prev,
        saveHistory: [historyItem, ...prev.saveHistory.slice(0, 9)], // 最新10件を保持
      }));
    },
    []
  );

  // 初期データの読み込み
  useEffect(() => {
    if (userId && userId.trim() !== '' && userId.length >= 36) {
      // キャッシュチェックを直接実行（useCallbackの依存関係を回避）
      try {
        const cacheKey = `profile_${userId}`;
        const cached = localStorage.getItem(cacheKey);

        if (cached) {
          const data: ProfileCacheData = JSON.parse(cached);
          const now = Date.now();
          const age = now - data.timestamp;
          const isValid = age < CACHE_TTL;

          console.log('📱 ProfileManager: Cache check on mount', {
            age: Math.round(age / 1000) + 's',
            ttl: Math.round(CACHE_TTL / 1000) + 's',
            isValid,
            hasProfile: !!data.profile,
            hasDetails: !!data.profileDetails,
          });

          if (isValid) {
            console.log('📱 ProfileManager: Initial load from cache');
            setState(prev => ({
              ...prev,
              profile: data.profile,
              profileDetails: data.profileDetails,
              lastSaved: new Date(data.timestamp),
            }));
            setLastFetchTime(data.timestamp);
            setLoading(false);
            setError(null);
            return; // キャッシュから読み込んだ場合は終了
          } else {
            console.log('📱 ProfileManager: Cache expired, removing');
            localStorage.removeItem(cacheKey);
          }
        }
      } catch (error) {
        console.warn('Failed to read profile cache on mount:', error);
      }

      // キャッシュがない場合または期限切れの場合はAPIから取得
      console.log('📱 ProfileManager: Initial load from API');
      loadProfileData(true);
    } else {
      // ユーザーIDが無効な場合は初期状態にリセット
      setState({
        profile: null,
        profileDetails: null,
        isDirty: false,
        hasUnsavedChanges: false,
        lastSaved: null,
        saveHistory: [],
      });
      setLoading(false);
      setError(null);
      setLastFetchTime(0);
    }
  }, [userId, CACHE_TTL, loadProfileData]); // CACHE_TTLとloadProfileDataを依存配列に追加

  // プロフィール基本情報の更新
  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<UpdateResult> => {
      if (!state.profile) {
        return { success: false, error: 'プロフィールデータがありません' };
      }

      try {
        const updateData = {
          ...updates,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId)
          .select()
          .single();

        if (error) throw error;

        // 状態を更新
        setState(prev => ({
          ...prev,
          profile: data,
          isDirty: false,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));

        // 保存履歴に追加
        addToSaveHistory('profile', updates, true);

        return { success: true, data };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'プロフィールの更新に失敗しました';
        addToSaveHistory('profile', updates, false, errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [userId, state.profile, addToSaveHistory]
  );

  // プロフィール詳細情報の更新
  const updateProfileDetails = useCallback(
    async (updates: Partial<ProfileDetails>): Promise<UpdateResult> => {
      try {
        let result;

        if (state.profileDetails) {
          // 既存データの更新
          const { data, error } = await supabase
            .from('profile_details')
            .update(updates)
            .eq('user_id', userId)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // 新規データの作成
          const { data, error } = await supabase
            .from('profile_details')
            .insert({ user_id: userId, ...updates })
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        // 状態を更新
        setState(prev => ({
          ...prev,
          profileDetails: result,
          isDirty: false,
          hasUnsavedChanges: false,
          lastSaved: new Date(),
        }));

        // 保存履歴に追加
        addToSaveHistory('details', updates, true);

        return { success: true, data: result };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '詳細情報の更新に失敗しました';
        addToSaveHistory('details', updates, false, errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [userId, state.profileDetails, addToSaveHistory]
  );

  // 一括保存
  const saveAll = useCallback(
    async (updates: {
      profile?: Partial<Profile>;
      details?: Partial<ProfileDetails>;
    }): Promise<boolean> => {
      const results = await Promise.all([
        updates.profile
          ? updateProfile(updates.profile)
          : Promise.resolve({ success: true }),
        updates.details
          ? updateProfileDetails(updates.details)
          : Promise.resolve({ success: true }),
      ]);

      const allSuccess = results.every(r => r.success);

      if (allSuccess) {
        addToast('success', 'プロフィールが更新されました');
        addToSaveHistory('both', updates, true);
      } else {
        addToast('error', '一部の更新に失敗しました');
        addToSaveHistory('both', updates, false, '一部の更新に失敗しました');
      }

      return allSuccess;
    },
    [updateProfile, updateProfileDetails, addToast, addToSaveHistory]
  );

  // 変更のリセット
  const resetChanges = useCallback(() => {
    setState(prev => ({
      ...prev,
      isDirty: false,
      hasUnsavedChanges: false,
    }));
  }, []);

  // 保存履歴のクリア
  const clearSaveHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      saveHistory: [],
    }));
  }, []);

  // 特定の保存履歴の削除
  const removeSaveHistory = useCallback((historyId: string) => {
    setState(prev => ({
      ...prev,
      saveHistory: prev.saveHistory.filter(item => item.id !== historyId),
    }));
  }, []);

  // 変更の統計情報
  const changeStats = useMemo(() => {
    const totalChanges = state.saveHistory.length;
    const successfulChanges = state.saveHistory.filter(
      item => item.success
    ).length;
    const failedChanges = totalChanges - successfulChanges;
    const lastChange = state.saveHistory[0];

    return {
      totalChanges,
      successfulChanges,
      failedChanges,
      successRate:
        totalChanges > 0 ? (successfulChanges / totalChanges) * 100 : 0,
      lastChange,
    };
  }, [state.saveHistory]);

  // 自動保存の設定（オプション）
  const enableAutoSave = useCallback(
    (interval: number = 30000) => {
      const autoSaveInterval = setInterval(() => {
        if (state.hasUnsavedChanges && state.isDirty) {
          // 自動保存の実装（必要に応じて）
          console.log('Auto-save triggered');
        }
      }, interval);

      return () => clearInterval(autoSaveInterval);
    },
    [state.hasUnsavedChanges, state.isDirty]
  );

  // 手動更新（強制）
  const refresh = useCallback(() => {
    console.log('📱 ProfileManager: Manual refresh triggered');
    loadProfileData(true); // 強制更新
  }, [loadProfileData]);

  // キャッシュ情報を取得
  const getCacheInfo = useCallback(() => {
    const cachedData = getCachedProfileData();
    if (!cachedData) return null;

    const now = Date.now();
    const age = now - cachedData.timestamp;
    const isValid = age < CACHE_TTL;

    return {
      isStale: !isValid,
      age: Math.round(age / 1000), // 秒単位
      expiresIn: Math.round((CACHE_TTL - age) / 1000), // 秒単位
      lastUpdated: cachedData.timestamp,
    };
  }, [getCachedProfileData, CACHE_TTL]); // CACHE_TTLを依存配列に追加

  // キャッシュをクリア
  const clearCache = useCallback(() => {
    if (!userId) return;

    try {
      const cacheKey = `profile_${userId}`;
      localStorage.removeItem(cacheKey);
      console.log('📱 ProfileManager: Cache cleared');
    } catch (error) {
      console.warn('Failed to clear profile cache:', error);
    }
  }, [userId]);

  return {
    // 状態
    ...state,
    loading: effectiveLoading,
    error,
    lastFetchTime,

    // アクション
    updateProfile,
    updateProfileDetails,
    saveAll,
    resetChanges,

    // 履歴管理
    addToSaveHistory,
    clearSaveHistory,
    removeSaveHistory,

    // 統計情報
    changeStats,

    // ユーティリティ
    enableAutoSave,
    reload: loadProfileData,
    forceReset, // 強制リセット機能
    refresh, // 手動更新機能
    getCacheInfo, // キャッシュ情報を取得
    clearCache, // キャッシュをクリア
  };
}
