import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check for missing or placeholder values
const isPlaceholderUrl = !supabaseUrl || supabaseUrl.includes('your-supabase-url-here') || supabaseUrl.includes('placeholder');
const isPlaceholderKey = !supabaseAnonKey || supabaseAnonKey.includes('your-supabase-anon-key') || supabaseAnonKey.includes('placeholder');

if (isPlaceholderUrl || isPlaceholderKey) {
  console.warn('Supabase configuration contains placeholder values. Please update your .env file with actual Supabase credentials.');
  
  // Create a mock client that will show helpful error messages
  const mockSupabase = {
    auth: {
      signUp: () => Promise.reject(new Error('Please configure your Supabase credentials in the .env file')),
      signInWithPassword: () => Promise.reject(new Error('Please configure your Supabase credentials in the .env file')),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.reject(new Error('Please configure your Supabase credentials')) }) }),
      insert: () => Promise.reject(new Error('Please configure your Supabase credentials')),
      update: () => ({ eq: () => Promise.reject(new Error('Please configure your Supabase credentials')) }),
      delete: () => ({ eq: () => Promise.reject(new Error('Please configure your Supabase credentials')) })
    })
  };
  
  // Export mock client
  export const supabase = mockSupabase as any;
} else {
  // Validate URL format only if it's not a placeholder
  try {
    new URL(supabaseUrl);
    if (!supabaseUrl.includes('.supabase.co')) {
      throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Expected format: https://your-project-ref.supabase.co`);
    }
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Invalid Supabase URL format: ${supabaseUrl}. Expected format: https://your-project-ref.supabase.co`);
    }
    throw error;
  }
  
  // Create real Supabase client
  export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
}


// Auth helpers
export const signUp = async (email: string, password: string, name: string) => {
  try {
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
  } catch (error) {
    console.error('SignUp error:', error);
    throw new Error('Failed to create account. Please check your internet connection and try again.');
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    // Test connectivity first
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
      },
    });
    
    if (!response.ok) {
      throw new Error('Unable to connect to Supabase. Please check your configuration.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('SignIn error:', error);
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Network connection failed. Please check your internet connection and verify your Supabase URL is correct.');
      }
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Invalid email or password. Please check your credentials.');
      }
    }
    throw error;
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('SignOut warning:', error.message);
    }
    
    // Clear storage after successful signout
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  } catch (error) {
    console.warn('SignOut error:', error);
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