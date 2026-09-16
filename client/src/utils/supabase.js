import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in client/.env');
}

// Browser client: used only for login / sign up. Store data goes through the API server.
export const supabase = createClient(supabaseUrl, supabaseKey);
