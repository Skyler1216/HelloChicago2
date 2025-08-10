import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Auth helpers
export const signUp = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
      },
    },
  });

  if (error) throw error;

  // Create profile
  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      name,
      email,
      is_approved: false, // Require admin approval for new users
      role: 'user',
    });

    if (profileError) throw profileError;
  }

  return data;
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
};

export const signOut = async () => {
  // Clear storage first
  if (typeof window !== 'undefined') {
    localStorage.clear();
    sessionStorage.clear();
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('SignOut error:', error.message);
  }
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getProfile = async (userId: string) => {
  if (!userId) {
    console.error('❌ No userId provided to getProfile');
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('📝 Profile not found for user:', userId);
      }
      return null;
    }
    console.error('❌ Error getting profile:', error);
    return null;
  }

  return data;
};
