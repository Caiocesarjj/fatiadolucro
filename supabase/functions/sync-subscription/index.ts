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
    const mpAccessToken = Deno.env.get("MP_ACCESS_TOKEN");
    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: "MP_ACCESS_TOKEN não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const subscriptionId = body.subscription_id;

    if (!subscriptionId) {
      return new Response(
        JSON.stringify({ error: "subscription_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query Mercado Pago API
    console.log("Querying MP for subscription:", subscriptionId);
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${subscriptionId}`,
      { headers: { Authorization: `Bearer ${mpAccessToken}` } }
    );

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MP API error:", mpResponse.status, errText);
      return new Response(
        JSON.stringify({
          error: "Erro ao consultar Mercado Pago",
          mp_status_code: mpResponse.status,
          mp_error: errText,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mpData = await mpResponse.json();
    console.log("MP response status:", mpData.status, "payer:", mpData.payer_email);

    // Map MP status
    let plan_type = "free";
    let subscription_status = "inactive";

    if (mpData.status === "authorized") {
      plan_type = "pro";
      subscription_status = "active";
    } else if (mpData.status === "pending") {
      subscription_status = "pending";
    } else if (mpData.status === "cancelled" || mpData.status === "paused") {
      plan_type = "free";
      subscription_status = "inactive";
    }

    return new Response(
      JSON.stringify({
        success: true,
        mp_status: mpData.status,
        plan_type,
        subscription_status,
        next_payment_date: mpData.next_payment_date || null,
        manage_url: mpData.init_point || null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync subscription error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
