import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
      .select("subscription_id, subscription_status, plan_type")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.subscription_id) {
      return new Response(JSON.stringify({ error: "Nenhuma assinatura encontrada", plan_type: profile?.plan_type || "free" }), {
        status: 200,
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

    // Query Mercado Pago for current subscription status
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${profile.subscription_id}`,
      {
        headers: { Authorization: `Bearer ${config.mp_access_token}` },
      }
    );

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MP API error:", mpResponse.status, errText);
      return new Response(JSON.stringify({ error: "Erro ao consultar Mercado Pago" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();
    const mpStatus = mpData.status;
    console.log("MP subscription status:", mpStatus, "for user:", userId);

    // Map MP status to our status
    const updatePayload: Record<string, unknown> = {};

    if (mpStatus === "authorized") {
      updatePayload.subscription_status = "active";
      updatePayload.plan_type = "pro";
    } else if (mpStatus === "cancelled" || mpStatus === "paused") {
      updatePayload.subscription_status = "inactive";
      updatePayload.plan_type = "free";
    } else if (mpStatus === "pending") {
      updatePayload.subscription_status = "pending";
    }

    if (mpData.next_payment_date) {
      updatePayload.next_payment_date = mpData.next_payment_date;
    }
    if (mpData.init_point) {
      updatePayload.mp_manage_subscription_url = mpData.init_point;
    }

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update(updatePayload)
        .eq("user_id", userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mp_status: mpStatus,
        plan_type: (updatePayload.plan_type as string) || profile.plan_type,
        subscription_status: (updatePayload.subscription_status as string) || profile.subscription_status,
        next_payment_date: mpData.next_payment_date || null,
        manage_url: mpData.init_point || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync subscription error:", error);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
