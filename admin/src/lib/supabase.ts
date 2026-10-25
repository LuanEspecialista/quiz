import { createClient } from "@supabase/supabase-js";

// These values are injected by the production build environment; never hardcode credentials here.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error(
    "VITE_SUPABASE_URL não foi encontrada. Verifique o arquivo .env."
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_ANON_KEY não foi encontrada. Verifique o arquivo .env."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
