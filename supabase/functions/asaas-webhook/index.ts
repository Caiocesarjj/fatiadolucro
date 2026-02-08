import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify webhook token
    const webhookToken = req.headers.get("asaas-access-token");
    const expectedToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");

    if (!webhookToken || webhookToken !== expectedToken) {
      console.error("Invalid webhook token");
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { event, payment } = body;

    console.log("Asaas webhook event:", event, "payment:", JSON.stringify(payment));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const customerId = payment?.customer;
    if (!customerId) {
      console.error("No customer ID in webhook payload");
      return new Response(JSON.stringify({ error: "No customer ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event === "PAYMENT_RECEIVED" || event === "PAYMENT_CONFIRMED") {
      console.log("Activating subscription for customer:", customerId);
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          plan_type: "pro",
        })
        .eq("asaas_customer_id", customerId);

      if (error) console.error("Error updating profile:", error);
    } else if (event === "PAYMENT_OVERDUE") {
      console.log("Deactivating subscription for customer:", customerId);
      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_status: "inactive",
          plan_type: "free",
        })
        .eq("asaas_customer_id", customerId);

      if (error) console.error("Error updating profile:", error);
    }

    return new Response(JSON.stringify({ received: true }), {
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
