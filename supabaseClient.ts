import { createClient } from '@supabase/supabase-js';

// Helper to retrieve environment variables safely across different bundlers (Vite vs CRA)
const getEnv = (key: string) => {
  // Check import.meta.env (Vite standard)
  // We cast to any because TypeScript might not have vite/client types loaded
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  // Check process.env (Legacy/CRA)
  // We use typeof check to avoid ReferenceError if process is not defined
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Require explicit env vars to avoid accidental cross-environment connections
const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
