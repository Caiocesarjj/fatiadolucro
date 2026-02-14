import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Get user's subscription_id
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.subscription_id) {
      return new Response(JSON.stringify({ error: "Nenhuma assinatura encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MP access token
    const { data: config } = await serviceClient
      .from("app_config")
      .select("mp_access_token")
      .limit(1)
      .maybeSingle();

    if (!config?.mp_access_token) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel on Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${profile.subscription_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.mp_access_token}`,
      },
      body: JSON.stringify({ status: "cancelled" }),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP cancel error:", JSON.stringify(mpData));
      return new Response(JSON.stringify({ error: "Erro ao cancelar no Mercado Pago", details: mpData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    await serviceClient
      .from("profiles")
      .update({ subscription_status: "cancelled" })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Assinatura cancelada com sucesso" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cancel subscription error:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao cancelar assinatura" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
