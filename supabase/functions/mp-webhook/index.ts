import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("MP Webhook received:", JSON.stringify(body));

    // Only process subscription_preapproval events
    if (body.type !== "subscription_preapproval") {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subscriptionId = body.data?.id;
    if (!subscriptionId) {
      console.error("No subscription id in payload");
      return new Response(JSON.stringify({ error: "No subscription id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get MP access token from app_config
    const { data: config, error: configError } = await supabase
      .from("app_config")
      .select("mp_access_token")
      .limit(1)
      .maybeSingle();

    if (configError || !config?.mp_access_token) {
      console.error("Failed to get mp_access_token:", configError);
      return new Response(JSON.stringify({ error: "MP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query Mercado Pago for current subscription status
    const mpResponse = await fetch(
      `https://api.mercadopago.com/preapproval/${subscriptionId}`,
      {
        headers: { Authorization: `Bearer ${config.mp_access_token}` },
      }
    );

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error("MP API error:", mpResponse.status, errText);
      return new Response(JSON.stringify({ error: "MP API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpData = await mpResponse.json();
    const mpStatus = mpData.status;
    console.log("MP subscription status:", mpStatus, "for id:", subscriptionId);

    let newStatus: string;
    if (mpStatus === "authorized") {
      newStatus = "active";
    } else if (mpStatus === "cancelled") {
      newStatus = "inactive";
    } else {
      console.log("Unhandled MP status:", mpStatus);
      return new Response(JSON.stringify({ received: true, status: mpStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ subscription_status: newStatus })
      .eq("subscription_id", subscriptionId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
    } else {
      console.log("Profile updated to", newStatus, "for subscription", subscriptionId);
    }

    return new Response(JSON.stringify({ received: true, new_status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
