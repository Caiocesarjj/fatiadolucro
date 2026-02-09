import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ASAAS_API_URL = "https://www.asaas.com/api/v3";
const PRICE_FULL = 19.90;
const PRICE_REFERRED = 14.99;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.user.id;
    const ASAAS_API_KEY = Deno.env.get("ASAAS_API_KEY")!;

    const body = await req.json();
    const { billingType, cpfCnpj, name, email, mobilePhone, creditCard, creditCardHolderInfo, referralCode } = body;

    console.log("Creating subscription for user:", userId, "billingType:", billingType);

    // 1. Determine price based on referral status
    const { data: profile } = await supabase
      .from("profiles")
      .select("asaas_customer_id, referred_by")
      .eq("user_id", userId)
      .maybeSingle();

    let isReferred = !!profile?.referred_by;

    // If not yet referred but a referral code was provided, try to apply it
    if (!isReferred && referralCode) {
      const { data: affiliate } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", referralCode)
        .maybeSingle();

      if (affiliate && affiliate.user_id !== userId) {
        await supabase
          .from("profiles")
          .update({ referred_by: affiliate.user_id })
          .eq("user_id", userId);
        isReferred = true;
        console.log("Applied referral code at checkout:", referralCode);
      }
    }

    const subscriptionValue = isReferred ? PRICE_REFERRED : PRICE_FULL;
    console.log("Subscription value:", subscriptionValue, "isReferred:", isReferred);

    // 2. Get or create Asaas customer
    let customerId = profile?.asaas_customer_id;

    if (!customerId) {
      console.log("Creating new Asaas customer...");
      const customerRes = await fetch(`${ASAAS_API_URL}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: ASAAS_API_KEY,
        },
        body: JSON.stringify({
          name,
          email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          mobilePhone: mobilePhone?.replace(/\D/g, ""),
        }),
      });

      const customerData = await customerRes.json();
      console.log("Asaas customer response:", JSON.stringify(customerData));

      if (!customerRes.ok || !customerData.id) {
        return new Response(
          JSON.stringify({ error: "Erro ao criar cliente no Asaas", details: customerData }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      customerId = customerData.id;

      await supabase
        .from("profiles")
        .update({ asaas_customer_id: customerId })
        .eq("user_id", userId);
    }

    // 3. Create subscription
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDueDate = tomorrow.toISOString().split("T")[0];

    const subscriptionPayload: Record<string, unknown> = {
      customer: customerId,
      billingType,
      value: subscriptionValue,
      cycle: "MONTHLY",
      nextDueDate,
      description: `Assinatura Fatia do Lucro PRO${isReferred ? " (Indicação)" : ""}`,
    };

    if (billingType === "CREDIT_CARD" && creditCard) {
      subscriptionPayload.creditCard = creditCard;
      subscriptionPayload.creditCardHolderInfo = creditCardHolderInfo;
    }

    console.log("Creating Asaas subscription...");
    const subRes = await fetch(`${ASAAS_API_URL}/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: ASAAS_API_KEY,
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const subData = await subRes.json();
    console.log("Asaas subscription response:", JSON.stringify(subData));

    if (!subRes.ok || !subData.id) {
      return new Response(
        JSON.stringify({ error: "Erro ao criar assinatura", details: subData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save subscription info
    await supabase
      .from("profiles")
      .update({
        subscription_id: subData.id,
        subscription_status: "pending",
        subscription_cycle: "MONTHLY",
      })
      .eq("user_id", userId);

    // If credit card, activate immediately
    if (billingType === "CREDIT_CARD" && subData.status === "ACTIVE") {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          plan_type: "pro",
        })
        .eq("user_id", userId);
    }

    // Get first payment for invoice URL
    let invoiceUrl = null;
    try {
      const paymentsRes = await fetch(
        `${ASAAS_API_URL}/subscriptions/${subData.id}/payments`,
        {
          headers: { access_token: ASAAS_API_KEY },
        }
      );
      const paymentsData = await paymentsRes.json();
      if (paymentsData.data?.[0]) {
        invoiceUrl = paymentsData.data[0].invoiceUrl;
      }
    } catch (e) {
      console.error("Error fetching invoice:", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscriptionId: subData.id,
        status: subData.status,
        invoiceUrl,
        billingType,
        value: subscriptionValue,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
