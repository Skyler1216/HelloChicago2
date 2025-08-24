import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const initializationRef = useRef(false);
  const profileLoadingRef = useRef(false);
  const authStateChangingRef = useRef(false);

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          setInitialized(true);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        }

        setInitialized(true);
        setLoading(false);
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setLoading(false);
        setInitialized(true);
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
          if (initialized) {
            await loadUserProfile(session.user.id);
          } else {
            setLoading(true);
            await loadUserProfile(session.user.id);
            setLoading(false);
          }
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
    const timeout = setTimeout(() => {
      if (!initialized) {
        setLoading(false);
        setInitialized(true);
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserProfile = async (userId: string) => {
    if (profileLoadingRef.current) {
      return;
    }

    profileLoadingRef.current = true;

    try {
      const profileData = await getProfile(userId);

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
