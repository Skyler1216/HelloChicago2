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

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      if (!mounted) return;

      try {
        console.log('Loading profile for user:', userId);
        const profileData = await getProfile(userId);
        if (mounted) {
          console.log('Profile loaded:', profileData);
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
        if (mounted) {
          setLoading(false);
        }
      }
    };

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('Session:', session?.user?.id || 'No session');
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setProfileLoaded(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id || 'No user');
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

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Check if there are any admin users in the system
  useEffect(() => {
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

    if (user && profileLoaded) {
      checkAdminUsers();
    }
  }, [user, profileLoaded]);

  return {
    user,
    profile,
    loading,
    profileLoaded,
    hasAdminUsers,
    isAuthenticated: !!user,
    isApproved: profileLoaded ? (profile?.is_approved ?? false) : false,
  };
}