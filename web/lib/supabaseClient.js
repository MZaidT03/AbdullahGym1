import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Helper to check if credentials are provided
export const isSupabaseConfigured = () => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.length > 0 &&
    !supabaseUrl.includes('YOUR_SUPABASE_URL') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.length > 0 &&
    !supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );
};

// Singleton client instance
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

// Secondary client for creating new member accounts without corrupting active admin session
export const createSecondaryAuthClient = () => {
  return createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
};

export default supabase;
