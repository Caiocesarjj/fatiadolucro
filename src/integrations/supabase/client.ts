import { createClient } from "@supabase/supabase-js";

// --- ÁREA DE EDIÇÃO MANUAL ---
// Apague o texto entre aspas e cole o seu do Supabase
const SUPABASE_URL = "https://weqxzfmghlrwrtnhbjue.supabase.co";
const SUPABASE_KEY = "sb_publishable_zM14tAsDx7JKyb-MM_uK5Q_KUS-nike";
// -----------------------------

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
