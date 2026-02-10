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

// Use the helper to get keys, falling back to placeholders if missing
const supabaseUrl = getEnv('VITE_SUPABASE_URL') || 'https://eqdzqkyldkfckptholdk.supabase.co';
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZHpxa3lsZGtmY2twdGhvbGRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NjUzODIsImV4cCI6MjA4NjE0MTM4Mn0.9KRvj9Saw4Zg_fCBzpoTbV9pJUOSnERAdbczrtJCvb0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);