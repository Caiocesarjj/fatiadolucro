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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
      return new Response(JSON.stringify({ valid: false, error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      console.error("Auth error:", authError?.message);
      return new Response(JSON.stringify({ valid: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (!code) {
      return new Response(JSON.stringify({ valid: false, error: "Código inválido" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Validating coupon code:", code);

    const { data: coupon, error: queryError } = await supabase
      .from("coupons")
      .select("code, value, type, is_active, valid_until")
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

    console.log("Coupon result:", JSON.stringify(coupon));

    if (!coupon) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      return new Response(JSON.stringify({ valid: false, error: "Cupom expirado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        valid: true,
        type: coupon.type,
        value: coupon.value,
        discount: coupon.value,
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
