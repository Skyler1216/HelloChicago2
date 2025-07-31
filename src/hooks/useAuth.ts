import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
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
        console.log('Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        console.log('Session:', session?.user?.id || 'No session');
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          console.log('No user session, setting loading to false');
          setLoading(false);
        }
        
        setInitialized(true);
        console.log('Auth initialization complete');
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          // Clear any corrupted session data
          try {
            await supabase.auth.signOut();
          } catch (signOutError) {
            console.error('Error signing out:', signOutError);
          }
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
        
        console.log('Auth state change:', event, session?.user?.id || 'No session');
        
        // Handle authentication errors by clearing session
        if (event === 'TOKEN_REFRESHED' && !session) {
          await supabase.auth.signOut();
        }
        
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Check if there are any admin users in the system
    const checkAdminUsers = async () => {
      try {
        console.log('Checking admin users...');
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('is_approved', true)
          .limit(1);

        if (error) throw error;
        const adminCount = (data?.length || 0);
        console.log('Admin users found:', adminCount);
        setHasAdminUsers(adminCount > 0);
      } catch (error) {
        console.error('Error checking admin users:', error);
        setHasAdminUsers(false);
      }
    };

    checkAdminUsers();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [user, profile]);

  // Re-check admin users when user changes
  useEffect(() => {
    const checkAdminUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin')
          .eq('is_approved', true)
          .limit(1);

        if (error) throw error;
        setHasAdminUsers((data?.length || 0) > 0);
      } catch (error) {
        console.error('Error checking admin users:', error);
        setHasAdminUsers(false);
      }
    };
    if (initialized) {
      checkAdminUsers();
    }
  }, [initialized, user]);

  return {
    user,
    profile,
    loading,
    hasAdminUsers,
    isAuthenticated: !!user,
    isApproved: profile?.is_approved ?? false,
  };
}