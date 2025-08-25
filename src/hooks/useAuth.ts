import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';
import { useFailsafe } from './useFailsafe';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface CachedAuthState {
  user: User | null;
  profile: Profile | null;
  timestamp: number;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // フェイルセーフ機能を追加
  const failsafe = useFailsafe({
    name: 'useAuth',
    timeout: 8000, // 8秒でタイムアウト
    onTimeout: () => {
      console.warn('📱 Auth: Timeout reached, attempting recovery');
      // キャッシュから復元を試行
      if (restoreFromCache()) {
        console.log('📱 Auth: Recovered from cache after timeout');
      } else {
        console.log('📱 Auth: No cache available, setting default state');
        setLoading(false);
      }
    },
  });

  const initializationRef = useRef(false);
  const profileLoadingRef = useRef(false);
  const authStateChangingRef = useRef(false);

  // キャッシュからの復元
  const restoreFromCache = () => {
    try {
      const cached = localStorage.getItem('auth_state_cache');
      if (cached) {
        const data: CachedAuthState = JSON.parse(cached);
        const age = Date.now() - data.timestamp;

        // 24時間以内のキャッシュは有効
        if (age < 24 * 60 * 60 * 1000) {
          console.log('📱 Auth: Restored from cache', {
            age: Math.round(age / 1000) + 's',
          });
          setUser(data.user);
          setProfile(data.profile);
          setLoading(false);
          return true;
        }
      }
    } catch (error) {
      console.warn('📱 Auth: Cache restore failed:', error);
    }
    return false;
  };

  // キャッシュに保存
  const saveToCache = (user: User | null, profile: Profile | null) => {
    try {
      const cacheData: CachedAuthState = {
        user,
        profile,
        timestamp: Date.now(),
      };
      localStorage.setItem('auth_state_cache', JSON.stringify(cacheData));
    } catch (error) {
      console.warn('📱 Auth: Cache save failed:', error);
    }
  };

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    failsafe.startLoading();

    // まずキャッシュから復元を試行
    if (restoreFromCache()) {
      // キャッシュから復元できた場合、バックグラウンドで最新データを取得
      failsafe.stopLoading();
      setTimeout(async () => {
        try {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user) {
            const profileData = await getProfile(session.user.id);
            if (profileData) {
              setProfile(profileData);
              saveToCache(session.user, profileData);
            }
          }
        } catch (error) {
          console.warn('📱 Auth: Background refresh failed:', error);
        }
      }, 100);
      return;
    }

    const initializeAuth = async () => {
      try {
        console.log('📱 Auth: Starting initialization');

        // タイムアウト付きでセッション取得
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session timeout')), 5000)
        );

        const {
          data: { session },
          error,
        } = (await Promise.race([sessionPromise, timeoutPromise])) as {
          data: { session: { user?: { id: string } } | null };
          error: { message?: string } | null;
        };

        if (error) {
          console.error('❌ Session error:', error);
          failsafe.handleError(error);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('📱 Auth: User session found');
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          console.log('📱 Auth: No user session');
        }

        setLoading(false);
        failsafe.stopLoading();
        console.log('📱 Auth: Initialization completed');
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        failsafe.handleError(
          error instanceof Error
            ? error
            : new Error('Auth initialization failed')
        );
        setLoading(false);
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // 同時に複数の認証状態変更が発生しないように制御
      if (authStateChangingRef.current) {
        console.log('📱 Auth state change in progress, skipping:', event);
        return;
      }

      authStateChangingRef.current = true;

      try {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          // 初期化時以外はローディング表示しない（バックグラウンド更新）
          await loadUserProfile(session.user.id);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user);
          // トークン更新時はローディング不要、プロファイルがない場合のみ読み込み
          if (!profile) {
            await loadUserProfile(session.user.id);
          }
        }
      } finally {
        authStateChangingRef.current = false;
      }
    });

    // Force completion after timeout
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('📱 Auth: Final timeout reached, forcing completion');
        failsafe.forceComplete();
        setLoading(false);
      }
    }, 10000); // 10秒に延長（モバイル環境を考慮）

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserProfile = async (userId: string) => {
    if (profileLoadingRef.current) {
      return;
    }

    profileLoadingRef.current = true;

    try {
      // タイムアウト付きでプロフィール取得
      const profilePromise = getProfile(userId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Profile timeout')), 8000)
      );

      const profileData = (await Promise.race([
        profilePromise,
        timeoutPromise,
      ])) as Profile | null;

      if (profileData) {
        setProfile(profileData);
      } else {
        // Create profile if it doesn't exist
        const { data: createdProfile, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name: 'User', // Default name, can be updated later
            email: '', // Will be updated when user is available
            is_approved: false, // Require admin approval for new users
            role: 'user',
          })
          .select()
          .single();

        if (!error && createdProfile) {
          // Update profile with user information if available
          if (user?.email) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                name:
                  user.user_metadata?.name ||
                  user.email.split('@')[0] ||
                  'User',
                email: user.email,
              })
              .eq('id', userId);

            if (!updateError) {
              setProfile({
                ...createdProfile,
                name:
                  user.user_metadata?.name ||
                  user.email.split('@')[0] ||
                  'User',
                email: user.email,
              });
            } else {
              console.error('❌ Failed to update profile:', updateError);
              setProfile(createdProfile);
            }
          } else {
            setProfile(createdProfile);
          }
        } else {
          console.error('❌ Failed to create profile:', error);
        }
      }

      // プロフィール取得後にキャッシュに保存
      if (user) {
        saveToCache(user, profile);
      }
    } catch (error) {
      console.error('❌ Profile loading error:', error);
    } finally {
      profileLoadingRef.current = false;
    }
  };

  const isAuthenticated = !!user;
  const isApproved = profile?.is_approved ?? false;

  // プロフィール更新機能
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!profile) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;

      // 状態を更新
      setProfile(data);

      // キャッシュも更新
      if (user) {
        saveToCache(user, data);
      }
      return true;
    } catch (error) {
      console.error('❌ Profile update error:', error);
      return false;
    }
  };

  // プロフィールの再読み込み
  const reloadProfile = async () => {
    if (user) {
      await loadUserProfile(user.id);
    }
  };

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isApproved,
    updateProfile,
    reloadProfile,
  };
}
