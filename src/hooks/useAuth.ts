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

  useEffect(() => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    console.log('🔄 useAuth: Starting initialization');
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session error:', error);
          setLoading(false);
          setInitialized(true);
          return;
        }

        console.log('📋 Initial session:', session?.user?.id || 'No session');
        
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
          setLoading(false);
        }
      }
    );

    // Force completion after timeout
    const timeout = setTimeout(() => {
      if (!initialized) {
        console.warn('⏰ Auth timeout - forcing completion');
        setLoading(false);
        setInitialized(true);
      }
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const loadUserProfile = async (userId: string) => {
    if (profileLoadingRef.current) {
      console.log('⚠️ Profile loading already in progress, skipping');
      return;
    }

    profileLoadingRef.current = true;
    
    try {
      console.log('👤 Loading profile for user:', userId);
      
      const profileData = await getProfile(userId);
      
      if (profileData) {
        console.log('✅ Profile loaded:', profileData.name, 'approved:', profileData.is_approved);
        setProfile(profileData);
      } else {
        console.log('⚠️ No profile found, creating new one');
        
        // Create profile if it doesn't exist
        const { data: createdProfile, error } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            name: user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
            email: user?.email || '',
            is_approved: true, // Auto-approve new users
            role: 'user'
          })
          .select()
          .single();

        if (!error && createdProfile) {
          console.log('✅ Profile created:', createdProfile.name);
          setProfile(createdProfile);
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

  console.log('🎯 Auth state:', {
    hasUser: !!user,
    hasProfile: !!profile,
    isApproved,
    loading,
    initialized
  });

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    isApproved,
  };
}