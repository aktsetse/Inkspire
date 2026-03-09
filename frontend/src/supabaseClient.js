import { createClient } from "@supabase/supabase-js";

// Supabase configuration using environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(`
    ⚠️  Supabase environment variables not configured!

    Please create a .env file in the frontend directory with:
    VITE_SUPABASE_URL=https://your-project-ref.supabase.co
    VITE_SUPABASE_ANON_KEY=your-anon-key-here

    Get these values from your Supabase project dashboard.
  `);

  // Create a mock client for development
  export const supabase = {
    auth: {
      signInWithPassword: () => Promise.reject(new Error("Supabase not configured")),
      signUp: () => Promise.reject(new Error("Supabase not configured")),
      signInWithOAuth: () => Promise.reject(new Error("Supabase not configured")),
      signOut: () => Promise.resolve(),
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  };
} else {
  export const supabase = createClient(supabaseUrl, supabaseAnonKey);
}
