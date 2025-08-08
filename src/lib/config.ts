// Environment variable validation
const requiredEnvVars = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  VITE_MAPBOX_ACCESS_TOKEN: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN,
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.warn('⚠️ Missing environment variables:', missingEnvVars.join(', '));
  console.warn(
    'Please check your .env.local file and ensure all required variables are set.'
  );
}

export const config = {
  supabase: {
    url: requiredEnvVars.VITE_SUPABASE_URL || '',
    anonKey: requiredEnvVars.VITE_SUPABASE_ANON_KEY || '',
  },
  mapbox: {
    accessToken: requiredEnvVars.VITE_MAPBOX_ACCESS_TOKEN || '',
  },
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

// Validate configuration
export const validateConfig = () => {
  const errors: string[] = [];

  if (!config.supabase.url) {
    errors.push('VITE_SUPABASE_URL is required');
  }

  if (!config.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is required');
  }

  if (!config.mapbox.accessToken) {
    errors.push('VITE_MAPBOX_ACCESS_TOKEN is required');
  }

  if (errors.length > 0) {
    console.error('❌ Configuration errors:', errors);
    return false;
  }

  return true;
};
