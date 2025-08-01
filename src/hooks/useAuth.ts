import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [hasAdminUsers, setHasAdminUsers] = useState<boolean | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;
    let profileLoadingInProgress = false;

    const loadProfile = async (userId: string) => {
      if (!mounted || profileLoadingInProgress) return;
      
      profileLoadingInProgress = true;
      
      try {
        const profileData = await getProfile(userId);
        if (mounted) {
          setProfile(profileData);
          setProfileLoaded(true);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        if (mounted) {
          setProfile(null);
          setProfileLoaded(true);
        }
      } finally {
        profileLoadingInProgress = false;
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Get initial session
    const initializeAuth = async () => {
      if (!mounted) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
        }
        
        setInitialized(true);
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event);
        
        setUser(session?.user ?? null);
        setProfileLoaded(false);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
        }
      }
    );

    // Timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted && !initialized) {
        console.warn('Auth initialization timeout - forcing completion');
        setLoading(false);
        setProfileLoaded(true);
        setInitialized(true);
      }
    }, 10000); // 10 second timeout

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  // Check if there are any admin users in the system
  useEffect(() => {
    if (!user || !profileLoaded) return;

    const checkAdminUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('is_approved', true)
          .limit(1);

        if (error) {
          console.error('Error checking admin users:', error);
          setHasAdminUsers(false);
          return;
        }
        
        setHasAdminUsers((data?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking admin users:', error);
        setHasAdminUsers(false);
      }
    };

    checkAdminUsers();
  }, [user, profileLoaded]);

  return {
    user,
    profile,
    loading: loading && !initialized,
    profileLoaded,
    hasAdminUsers,
    isAuthenticated: !!user,
    isApproved: profileLoaded ? (profile?.is_approved ?? false) : false,
  };
}