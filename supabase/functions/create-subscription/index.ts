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
    const userEmail = userData.user.email;

    const body = await req.json();
    const { price, title, coupon_code } = body;

    if (!price || !title) {
      return new Response(JSON.stringify({ error: "price e title são obrigatórios" }), {
        status: 400,
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

    let finalPrice = parseFloat(price);

    // Validate coupon if provided
    if (coupon_code) {
      const code = String(coupon_code).trim().toUpperCase();
      const { data: coupon } = await serviceClient
        .from("coupons")
        .select("id, code, type, value, is_active")
        .eq("code", code)
        .eq("is_active", true)
        .maybeSingle();

      if (coupon) {
        if (coupon.type === "percentage") {
          finalPrice = finalPrice * (1 - coupon.value / 100);
        }
        // Increment usage
        await serviceClient
          .from("coupons")
          .update({ usage_count: (coupon as any).usage_count ? (coupon as any).usage_count + 1 : 1 })
          .eq("id", coupon.id);
      }
    }

    // Ensure minimum
    if (finalPrice < 1) finalPrice = 1;
    finalPrice = Math.round(finalPrice * 100) / 100;

    // Create preapproval on Mercado Pago
    const mpPayload = {
      reason: title,
      payer_email: userEmail,
      auto_recurring: {
        frequency: 1,
        frequency_type: "days",
        transaction_amount: finalPrice,
        currency_id: "BRL",
      },
      back_url: "https://www.fatiadolucro.com.br/admin",
      status: "pending",
    };

    const mpResponse = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.mp_access_token}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error("MP error:", JSON.stringify(mpData));
      return new Response(JSON.stringify({ error: "Erro ao criar assinatura no Mercado Pago", details: mpData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save subscription_id to profile
    await serviceClient
      .from("profiles")
      .update({
        subscription_id: mpData.id,
        subscription_status: "pending",
      })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({
        init_point: mpData.init_point,
        subscription_id: mpData.id,
        final_price: finalPrice,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Create subscription error:", error);
    return new Response(JSON.stringify({ error: "Erro interno ao criar assinatura" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
