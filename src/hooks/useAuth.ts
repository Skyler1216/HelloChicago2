import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, getProfile } from '../lib/supabase';
import { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('🔄 useAuth: Starting initialization');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          return;
        }

        console.log('📋 Initial session:', session?.user?.id || 'No session');
        
        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('❌ Get session error:', error);
        setLoading(false);
      }
    };

    // Load user profile
    const loadUserProfile = async (userId: string) => {
      try {
        console.log('👤 Loading profile for:', userId);
        const profileData = await getProfile(userId);
        
        if (profileData) {
          console.log('✅ Profile loaded:', profileData.name);
          setProfile(profileData);
        } else {
          console.log('⚠️ No profile found, creating new one');
          // Create profile if it doesn't exist
          const newProfile = {
            id: userId,
            name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
            email: user?.email || '',
            is_approved: true,
            role: 'user' as const
          };

          const { data: createdProfile, error } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (!error && createdProfile) {
            console.log('✅ Profile created:', createdProfile.name);
            setProfile(createdProfile);
          }
        }
      } catch (error) {
        console.error('❌ Profile loading error:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initialize
    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 Auth event:', event, session?.user?.id || 'No user');
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          setLoading(true);
          await loadUserProfile(session.user.id);
        }
      }
    );

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Force completion after 8 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('⏰ Auth timeout - forcing completion');
        setLoading(false);
      }
    }, 8000);

    return () => clearTimeout(timeout);
  }, [loading]);

  const isAuthenticated = !!user;
  const isApproved = profile?.is_approved ?? false;

  console.log('🎯 Auth state:', {
    hasUser: !!user,
    hasProfile: !!profile,
    isApproved,
    loading
  });

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isApproved,
  };
}