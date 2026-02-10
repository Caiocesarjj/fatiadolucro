import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ---------------------------------------------------------
// COLOQUE SEUS DADOS REAIS AQUI DENTRO DAS ASPAS:
// ---------------------------------------------------------
const SUPABASE_URL = "https://weqxzfmghlrwrtnhbjue.supabase.co"; // <--- Cole sua URL aqui
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // <--- Cole sua chave ANON KEY gigante aqui
// ---------------------------------------------------------

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
