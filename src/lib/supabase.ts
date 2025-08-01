import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase config:', {
  url: supabaseUrl ? 'Set' : 'Missing',
  key: supabaseAnonKey ? 'Set' : 'Missing'
});

// Create a dummy client if environment variables are missing
let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - using mock client');
  // Create a mock client that returns empty results
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      update: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) })
    })
  };
} else {
  supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}

export { supabase };

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
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name,
        email,
        is_approved: false,
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
  const { error } = await supabase.auth.signOut();
  // Always clear local storage to ensure clean logout
  localStorage.clear();
  sessionStorage.clear();
  
  // Only throw error if it's not a session-related error
  if (error && 
      error.message !== 'Session from session_id claim in JWT does not exist' &&
      error.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
    console.warn('Logout warning:', error.message);
  }
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};