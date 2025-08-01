import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAdminUsers, setHasAdminUsers] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (userId: string) => {
      try {
        const profileData = await getProfile(userId);
        if (mounted) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error loading profile:', error);
        if (mounted) {
          setProfile(null);
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
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setUser(session?.user ?? null);

        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      // Handle sign out event specifically
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Check if there are any admin users in the system
  useEffect(() => {
    const checkAdminUsers = async () => {
      try {
        console.log('Checking for admin users...');
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

        console.log('Admin users found:', data?.length || 0);
        setHasAdminUsers((data?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking admin users:', error);
        setHasAdminUsers(false);
      }
    };

    if (user) {
      checkAdminUsers();
    }
  }, [user]);

  return {
    user,
    profile,
    loading,
    hasAdminUsers,
    isAuthenticated: !!user,
    isApproved: profile?.is_approved ?? false,
  };
}
