import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../types/database';
import { useToast } from './useToast';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileDetails = Database['public']['Tables']['profile_details']['Row'];

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

  // 初期データの読み込み
  useEffect(() => {
    loadProfileData();
  }, [userId]);

  // プロフィールデータの読み込み
  const loadProfileData = useCallback(async () => {
    setLoading(true);
    setError(null);

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

      setState(prev => ({
        ...prev,
        profile: profileResult.data,
        profileDetails: detailsResult.data || null,
        lastSaved: new Date(),
      }));
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
  }, [userId, addToast]);

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
    [userId, state.profile, addToast]
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
    [userId, state.profileDetails, addToast]
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
    [updateProfile, updateProfileDetails, addToast]
  );

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

  return {
    // 状態
    ...state,
    loading,
    error,

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
  };
}
