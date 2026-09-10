import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// When the env vars are missing (e.g. local dev without a .env file), we
// still create *a* client with placeholder values so importing this module
// never crashes the whole app — App.jsx checks `isSupabaseConfigured` and
// shows a clear setup message instead of trying to use it.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key"
);

export const MEAL_IMAGE_BUCKET = "meal-images";
