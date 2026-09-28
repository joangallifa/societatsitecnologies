import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Falten VITE_SUPABASE_URL i/o VITE_SUPABASE_ANON_KEY. Defineix-les a .env (local) o com a variables del build a GitHub Actions."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const ADMIN_EMAIL = "jgallifa@umanresa.cat";
