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
    const supabaseUrl = Deno.env.get("VITE_SUPABASE_URL") || Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("EXTERNAL_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ valid: false, error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ valid: false, error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = typeof body.code === "string" ? body.code.trim().toUpperCase().slice(0, 50) : "";
    const shouldApply = body.apply === true;
    const targetUserId = typeof body.user_id === "string" ? body.user_id : null;

    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: "Código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData?.user) {
        if (shouldApply) {
          return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        authenticatedUserId = userData.user.id;
      }
    } else if (shouldApply && !targetUserId) {
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: coupon, error: queryError } = await supabase
      .from("coupons")
      .select("code, value, type, is_active, valid_until, usage_count")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    if (queryError) {
      console.error("Query error:", JSON.stringify(queryError));
      return new Response(JSON.stringify({ valid: false, error: "Erro interno" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!coupon) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "Cupom expirado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let usageCount = coupon.usage_count || 0;
    let applied = false;
    let planType: "vip" | null = null;

    const applyUserId = authenticatedUserId || targetUserId;

    if (shouldApply && applyUserId) {
      if (coupon.type === "vip_access") {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ plan_type: "vip" })
          .eq("user_id", applyUserId);

        if (profileError) {
          console.error("Profile update error:", JSON.stringify(profileError));
          return new Response(JSON.stringify({ valid: false, error: "Erro ao aplicar cupom VIP" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        planType = "vip";
      }

      const { error: usageError } = await supabase
        .from("coupons")
        .update({ usage_count: usageCount + 1 })
        .eq("code", code);

      if (usageError) {
        console.error("Coupon usage update error:", JSON.stringify(usageError));
        return new Response(JSON.stringify({ valid: false, error: "Erro ao registrar uso do cupom" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      usageCount += 1;
      applied = true;
    }

    return new Response(
      JSON.stringify({
        valid: true,
        type: coupon.type,
        value: coupon.value,
        discount: coupon.value,
        usage_count: usageCount,
        applied,
        plan_type: planType,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Validate coupon error:", error?.message || error);
    return new Response(JSON.stringify({ valid: false, error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
