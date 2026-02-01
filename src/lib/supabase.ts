import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!SUPABASE_URL) {
  throw new Error('Missing Supabase environment variable: VITE_SUPABASE_URL');
}
if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variable: VITE_SUPABASE_ANON_KEY');
}
