import { useState, useEffect, useRef } from 'react';
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

  const initializationRef = useRef(false);
  const profileLoadingRef = useRef(false);
  const mountedRef = useRef(true);

  // プロフィール読み込み関数
  const loadProfile = async (userId: string): Promise<Profile | null> => {
    if (profileLoadingRef.current) {
      return null;
    }

    profileLoadingRef.current = true;
    
    try {
      const profileData = await getProfile(userId);
      return profileData;
    } catch (error) {
      console.error('Error loading profile:', error);
      return null;
    } finally {
      profileLoadingRef.current = false;
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

  // 認証状態の更新（一度だけ実行）
  const updateAuthState = async (user: User | null) => {
    if (!mountedRef.current) return;
    
    if (!user) {
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

    // プロフィール読み込み
    const profile = await loadProfile(user.id);
    const hasAdmins = await checkAdminUsers();

    // プロフィールが存在しない場合は作成を試行
    let finalProfile = profile;
    if (!profile && mountedRef.current) {
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
        }
      } catch (error) {
        console.error('Error creating profile:', error);
      }
    }

    if (!mountedRef.current) return;

    // 最終的な認証状態を設定
    const isApproved = finalProfile?.is_approved ?? false;
    
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

  // 初期化（一度だけ実行）
  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    let initializationTimeout: NodeJS.Timeout;

    const initializeAuth = async () => {
      try {
        // セッション取得
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mountedRef.current) {
            setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
          }
          return;
        }

        await updateAuthState(session?.user || null);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mountedRef.current) {
          setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
        }
      }
    };

    // 初期化実行
    initializeAuth();

    // タイムアウト設定（5秒後に強制完了）
    initializationTimeout = setTimeout(() => {
      if (mountedRef.current && !authState.initialized) {
        console.warn('Auth initialization timeout - forcing completion');
        setAuthState(prev => ({ ...prev, loading: false, initialized: true }));
      }
    }, 5000);

    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;
        
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

        // サインイン時のみ状態を更新
        if (event === 'SIGNED_IN' && session?.user) {
          await updateAuthState(session.user);
        }
      }
    );

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
    };
  }, []); // 空の依存配列で一度だけ実行

  return {
    user: authState.user,
    profile: authState.profile,
    loading: authState.loading,
    profileLoaded: authState.initialized,
    hasAdminUsers: authState.hasAdminUsers,
    isAuthenticated: authState.isAuthenticated,
    isApproved: authState.isApproved,
  };
}