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
import { Gift, Loader2, Check } from "lucide-react";
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
    try {
      const { data } = await supabase
        .from("profiles")
        .select("referred_by, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!data) return;

      // Already has a referral
      if (data.referred_by) {
        setVisible(false);
        return;
      }

      // Check if account is less than 7 days old
      const createdAt = new Date(data.created_at);
      const now = new Date();
      const diffDays = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      setVisible(diffDays <= 7);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error checking referral visibility:", error);
    } finally {
      setCheckingVisibility(false);
    }
  };

  const handleRedeem = async () => {
    const validation = validateReferralCode(code);
    if (!validation.valid) {
      toast({ variant: "destructive", title: (validation as { valid: false; error: string }).error });
      return;
    }

    setLoading(true);
    try {
      // Find owner of the code
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

      // Don't allow self-referral
      if (affiliate.user_id === user!.id) {
        toast({ variant: "destructive", title: "Você não pode usar seu próprio código." });
        return;
      }

      // Update referred_by
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
            Código de Indicação
          </CardTitle>
          <CardDescription>
            Você tem um código de indicação? Resgate seu desconto vitalício de R$ 14,99/mês (ao invés de R$ 19,90).
            Válido até 7 dias após a criação da conta.
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
            Resgatar Desconto
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};
