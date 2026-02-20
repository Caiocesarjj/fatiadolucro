import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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
      // No subscription to cancel on MP, just update local status
      await serviceClient
        .from("profiles")
        .update({ subscription_status: "cancelled", plan_type: "free" })
        .eq("user_id", userId);

      return new Response(
        JSON.stringify({ success: true, message: "Assinatura cancelada localmente (sem ID MP)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get MP access token - try secret first, then app_config fallback
    let mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");

    if (!mpAccessToken) {
      const { data: config } = await serviceClient
        .from("app_config")
        .select("mp_access_token")
        .limit(1)
        .maybeSingle();

      mpAccessToken = config?.mp_access_token || null;
    }

    if (!mpAccessToken) {
      return new Response(JSON.stringify({ error: "Mercado Pago não configurado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel on Mercado Pago
    console.log("Cancelling subscription on MP:", profile.subscription_id);
    const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${profile.subscription_id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccessToken}`,
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

    console.log("MP cancel success:", JSON.stringify(mpData));

    // Update profile
    await serviceClient
      .from("profiles")
      .update({ subscription_status: "cancelled", plan_type: "free" })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ success: true, message: "Assinatura cancelada com sucesso no Mercado Pago" }),
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
