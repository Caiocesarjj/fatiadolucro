import { createClient } from "@supabase/supabase-js";

const EXTERNAL_URL = import.meta.env.VITE_SUPABASE_URL;
const EXTERNAL_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug temporário — mostra apenas os primeiros caracteres
if (import.meta.env.DEV) {
  console.log("[ExternalSupabase] URL:", EXTERNAL_URL || "⚠️ NÃO DEFINIDA");
  console.log("[ExternalSupabase] KEY:", EXTERNAL_KEY ? EXTERNAL_KEY.substring(0, 20) + "..." : "⚠️ NÃO DEFINIDA");
}

if (!EXTERNAL_URL || !EXTERNAL_KEY) {
  console.error("[ExternalSupabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas!");
}

export const externalSupabase = createClient(EXTERNAL_URL || "", EXTERNAL_KEY || "", {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
