import { createClient } from "@supabase/supabase-js";

// Supabase configuration using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = `
    Missing Supabase environment variables!

    Please create a .env file in the frontend directory with:
    VITE_SUPABASE_URL=your_supabase_project_url_here
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

    You can find these values in your Supabase project dashboard.
  `;
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
