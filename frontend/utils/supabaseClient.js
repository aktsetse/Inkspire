import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://voxebzbfnvwibydrakea.supabase.co"
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZveGViemJmbnZ3aWJ5ZHJha2VhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTQ4MTg3OSwiZXhwIjoyMDY3MDU3ODc5fQ.mNwCwGG5SWpFDCHEGUg1I6NKUq0vburAtXqFNTgsN08'

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
