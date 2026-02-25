import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { validateReferralCode } from "@/lib/referralValidation";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { Gift, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export const ReferralCodeSection = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [checkingVisibility, setCheckingVisibility] = useState(true);
  const [redeemed, setRedeemed] = useState(false);

  useEffect(() => {
    if (user) checkVisibility();
  }, [user]);

  const checkVisibility = async () => {
    setVisible(true);
    setCheckingVisibility(false);
  };

  const handleRedeem = async () => {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast({ variant: "destructive", title: "Informe um código" });
      return;
    }

    setLoading(true);
    try {
      const normalizeCouponResult = (raw: any) => {
        const payload = Array.isArray(raw) ? raw[0] : raw;
        if (!payload) return null;

        const valid = Boolean(payload.valid ?? payload.is_valid ?? false);
        if (!valid) return { valid: false };

        return {
          valid: true,
          type: payload.type ?? (payload.vip_access ? "vip_access" : "percentage"),
        };
      };

      let couponResult: { valid: boolean; type?: string } | null = null;

      const { data: rpcCouponData, error: rpcCouponError } = await supabase.rpc(
        "validate_coupon",
        { coupon_code: normalizedCode } as any
      );

      if (!rpcCouponError) {
        couponResult = normalizeCouponResult(rpcCouponData);
      }

      if (!couponResult) {
        const { data: edgeCouponData, error: edgeCouponError } = await supabase.functions.invoke("validate-coupon", {
          body: { code: normalizedCode },
        });

        if (!edgeCouponError) {
          couponResult = normalizeCouponResult(edgeCouponData);
        }
      }

      if (couponResult?.valid) {
        let vipApplied = false;

        const { data: applyData, error: applyError } = await supabase.functions.invoke("validate-coupon", {
          body: { code: normalizedCode, apply: true },
        });

        if (!applyError && applyData?.plan_type === "vip") {
          vipApplied = true;
        }

        if (couponResult.type === "vip_access" && !vipApplied) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ plan_type: "vip" } as any)
            .eq("user_id", user!.id);

          if (!profileError) {
            vipApplied = true;
          }
        }

        setRedeemed(true);
        toast({
          title: vipApplied ? "👑 Você é VIP agora!" : "Cupom aplicado com sucesso!",
          description: vipApplied
            ? "Seu plano foi atualizado para VIP em todo o sistema."
            : "Seu cupom foi reconhecido e aplicado.",
        });
        return;
      }

      const validation = validateReferralCode(normalizedCode);
      if (!validation.valid) {
        toast({ variant: "destructive", title: "Código inválido", description: "Não encontramos um cupom ou código de indicação válido." });
        return;
      }

      // Find owner of the referral code
      const { data: affiliate, error: findError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", validation.code)
        .maybeSingle();

      if (findError) throw findError;

      if (!affiliate) {
        toast({ variant: "destructive", title: "Código inválido", description: "Não encontramos esse código de indicação." });
        return;
      }

      if (affiliate.user_id === user!.id) {
        toast({ variant: "destructive", title: "Você não pode usar seu próprio código." });
        return;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ referred_by: affiliate.user_id } as any)
        .eq("user_id", user!.id);

      if (updateError) throw updateError;

      setRedeemed(true);
      toast({
        title: "🎉 Desconto ativado com sucesso!",
        description: "Desconto de R$ 19,90 por R$ 14,99 ativado com sucesso!",
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  if (checkingVisibility || !visible || redeemed) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Código promocional ou indicação
          </CardTitle>
          <CardDescription>
            Use um cupom (inclusive VIP) a qualquer momento, ou um código de indicação para ativar benefícios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-code">Código</Label>
            <Input
              id="referral-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex: MARIA10"
              className="font-mono uppercase"
              maxLength={20}
            />
          </div>
          <Button onClick={handleRedeem} disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Gift className="h-4 w-4 mr-2" />}
            Resgatar código
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
