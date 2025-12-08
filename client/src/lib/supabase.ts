import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zkzvhjcznesponulbfkv.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprenZoamN6bmVzcG9udWxiZmt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxODE3NjYsImV4cCI6MjA4MDc1Nzc2Nn0.v3LeWFlXSx-5mH9F269UJF1gvA594exsLtiznCXa9NA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
