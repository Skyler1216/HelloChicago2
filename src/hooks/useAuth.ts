import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  isApproved: boolean;
  hasAdminUsers: boolean | null;
  initialized: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
    isApproved: false,
    hasAdminUsers: null,
    initialized: false,
  });

  const [profileLoadingInProgress, setProfileLoadingInProgress] = useState(false);

  // プロフィール読み込み関数
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    if (profileLoadingInProgress) {
      console.log('Profile loading already in progress, skipping...');
      return null;
    }

    setProfileLoadingInProgress(true);
    
    try {
      console.log('Loading profile for user:', userId);
      const profileData = await getProfile(userId);
      console.log('Profile loaded:', profileData);
      return profileData;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    } finally {
      setProfileLoadingInProgress(false);
    }
  };

  // 管理者ユーザーの存在確認
  const checkAdminUsers = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .eq('is_approved', true)
        .limit(1);

      if (error) {
        console.error('Error checking admin users:', error);
        return false;
      }
      
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking admin users:', error);
      return false;
    }
  };

  // 認証状態の更新
  const updateAuthState = async (user: User | null) => {
    console.log('Updating auth state for user:', user?.id);
    
    if (!user) {
      // ユーザーがいない場合
      setAuthState({
        user: null,
        profile: null,
        loading: false,
        isAuthenticated: false,
        isApproved: false,
        hasAdminUsers: null,
        initialized: true,
      });
      return;
    }

    // ユーザーがいる場合、プロフィールを読み込む
    const profile = await loadProfile(user.id);
    const hasAdmins = await checkAdminUsers();

    // プロフィールが存在しない場合は作成を試行
    let finalProfile = profile;
    if (!profile) {
      console.log('Profile not found, attempting to create...');
      try {
        const newProfile = {
          id: user.id,
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          is_approved: true, // 新規ユーザーは自動承認
          role: 'user' as const
        };

        const { data: createdProfile, error } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (!error && createdProfile) {
          finalProfile = createdProfile;
          console.log('Profile created successfully:', createdProfile);
        }
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    }

    // 最終的な認証状態を設定
    const isApproved = finalProfile?.is_approved ?? false;
    
    console.log('Final auth state:', {
      userId: user.id,
      profileExists: !!finalProfile,
      isApproved,
      hasAdmins
    });

    setAuthState({
      user,
      profile: finalProfile,
      loading: false,
      isAuthenticated: true,
      isApproved,
      hasAdminUsers: hasAdmins,
      initialized: true,
    });
  };

  // 初期化
  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // セッション取得
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
          }
          return;
        }

        if (mounted) {
          await updateAuthState(session?.user || null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      }
    };

    // 初期化実行
    initializeAuth();

    // タイムアウト設定（10秒後に強制完了）
    initializationTimeout = setTimeout(() => {
      if (mounted && !authState.initialized) {
        console.warn('Auth initialization timeout - forcing completion');
        setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
      }
    }, 10000);

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        // サインアウト時は即座に状態をクリア
        if (event === 'SIGNED_OUT') {
          setAuthState({
            user: null,
            profile: null,
            loading: false,
            isAuthenticated: false,
            isApproved: false,
            hasAdminUsers: null,
            initialized: true,
          });
          return;
        }

        // その他の場合は通常の更新処理
        await updateAuthState(session?.user || null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, []); // 依存配列を空にして初回のみ実行

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    profileLoaded: authState.initialized && !profileLoadingInProgress,
    hasAdminUsers: authState.hasAdminUsers,
    isAuthenticated: authState.isAuthenticated,
    isApproved: authState.isApproved,
  };
}