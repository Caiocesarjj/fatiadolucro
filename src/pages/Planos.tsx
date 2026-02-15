import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Crown, Lock, Loader2, Gift, AlertTriangle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { validateReferralCode } from "@/lib/referralValidation";
import { toast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

const PRICE_FULL = 19.90;
const PRICE_REFERRED = 14.99;

const Planos = () => {
  const { user } = useAuth();
  const { planType } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [hasReferral, setHasReferral] = useState(false);
  const [loadingReferral, setLoadingReferral] = useState(true);

  // Referral
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Subscription management
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const basePrice = hasReferral ? PRICE_REFERRED : PRICE_FULL;
  const currentPrice = couponApplied ? Math.max(basePrice * (1 - couponDiscount / 100), 1) : basePrice;
  const priceFormatted = currentPrice.toFixed(2).replace(".", ",");

  useEffect(() => {
    if (user) {
      checkReferral();
      checkSubscription();
    }
  }, [user]);

  const checkReferral = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("referred_by")
        .eq("user_id", user!.id)
        .maybeSingle();
      setHasReferral(!!data?.referred_by);
    } catch {
      // ignore
    } finally {
      setLoadingReferral(false);
    }
  };

  const checkSubscription = async () => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_id, subscription_status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (data) {
        setSubscriptionId(data.subscription_id);
        setSubscriptionStatus(data.subscription_status);
      }
    } catch {
      // ignore
    }
  };

  const handleApplyReferralCode = async () => {
    const code = referralCode.trim().toUpperCase();
    if (!code) {
      toast({ title: "Digite um código", variant: "destructive" });
      return;
    }
    setApplyingCode(true);
    try {
      // Step 1: Check coupons table FIRST
      const { data: couponData, error: couponError } = await supabase
        .rpc('validate_coupon', { coupon_code: code });

      if (!couponError && couponData?.valid && couponData.type === "percentage") {
        // It's a coupon — apply discount, no affiliate logic
        setCouponCode(code);
        setCouponDiscount(couponData.value);
        setCouponApplied(true);
        setShowReferralInput(false);
        toast({ title: `🎉 Cupom aplicado! ${couponData.value}% de desconto.` });
        return;
      }

      // Step 2: Not a coupon — check if it's an affiliate referral code
      const validation = validateReferralCode(code);
      if (!validation.valid) {
        toast({ title: (validation as { valid: false; error: string }).error, variant: "destructive" });
        return;
      }

      const { data: affiliate } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("referral_code", validation.code)
        .maybeSingle();

      if (!affiliate) {
        toast({ title: "Código inválido", variant: "destructive" });
        return;
      }
      if (affiliate.user_id === user!.id) {
        toast({ title: "Você não pode usar seu próprio código.", variant: "destructive" });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ referred_by: affiliate.user_id } as any)
        .eq("user_id", user!.id);
      if (error) throw error;

      setHasReferral(true);
      setShowReferralInput(false);
      toast({ title: "🎉 Desconto aplicado!", description: "Você pagará R$ 14,99/mês ao invés de R$ 19,90." });
    } catch (error: any) {
      toast({ title: error.message, variant: "destructive" });
    } finally {
      setApplyingCode(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: "Digite um cupom", variant: "destructive" });
      return;
    }
    setApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .rpc('validate_coupon', { coupon_code: couponCode.trim().toUpperCase() });
      if (error) throw error;
      if (data?.valid && data.type === "percentage") {
        setCouponDiscount(data.value);
        setCouponApplied(true);
        toast({ title: `🎉 Cupom aplicado! ${data.value}% de desconto.` });
      } else {
        toast({ title: "Cupom inválido ou expirado", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao validar cupom", variant: "destructive" });
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      toast({ title: "Faça login para assinar", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-mp-subscription', {
        body: {
          price: currentPrice,
          title: 'Assinatura Fatia do Lucro',
          coupon_code: couponApplied ? couponCode.trim().toUpperCase() : undefined,
        },
      });
      if (error) throw error;

      if (data?.init_point) {
        toast({ title: "Assinatura criada!", description: "Redirecionando para pagamento..." });
        setSubscriptionId(data.id || data.subscription_id);
        setSubscriptionStatus("pending");
        window.location.href = data.init_point;
      } else {
        toast({ title: "Erro: resposta sem link de pagamento", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: error.message || "Erro ao criar assinatura", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke("cancel-subscription");
      if (error) throw error;
      toast({ title: "Assinatura cancelada com sucesso." });
      setSubscriptionStatus("cancelled");
    } catch (error: any) {
      toast({ title: error.message || "Erro ao cancelar", variant: "destructive" });
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  const freeBenefits = [
    "Até 3 receitas",
    "Gestão de ingredientes",
    "Calculadora de custos",
    "Lista de compras",
  ];

  const proBenefits = [
    "Receitas ilimitadas",
    "Módulo Financeiro completo",
    "Gestão de Encomendas",
    "Catálogo/Vitrine digital",
    "Relatórios PDF e Excel",
    "CRM de Clientes",
    "Suporte prioritário",
  ];

  // Already PRO
  if (planType === "pro") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Você já é PRO! 🎉</CardTitle>
            <CardDescription>Aproveite todos os recursos ilimitados.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link to="/dashboard">Voltar ao Dashboard</Link>
            </Button>
            {subscriptionId && subscriptionStatus !== "cancelled" && (
              <>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowCancelDialog(true)}
                >
                  <XCircle className="h-4 w-4 mr-2" /> Cancelar Assinatura
                </Button>
                <ConfirmationDialog
                  open={showCancelDialog}
                  onOpenChange={setShowCancelDialog}
                  title="Cancelar Assinatura"
                  description="Tem certeza que deseja cancelar? Você perderá o acesso aos recursos PRO."
                  confirmText={cancelling ? "Cancelando..." : "Sim, cancelar"}
                  onConfirm={handleCancelSubscription}
                  variant="destructive"
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Has active subscription but not yet PRO (pending)
  const hasActiveSubscription = subscriptionId && subscriptionStatus !== "cancelled";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <AnimatePresence mode="wait">
          <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Lock className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Faça o Upgrade!</h1>
              <p className="text-muted-foreground">Desbloqueie todos os recursos do Fatia do Lucro</p>
            </div>

            {/* Test mode warning */}
            <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 rounded-lg p-3 mb-6 text-sm max-w-2xl mx-auto">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Modo de Teste: Cobrança Diária (Cancele após testar)</span>
            </div>

            {/* Active subscription card */}
            {hasActiveSubscription && (
              <Card className="max-w-md mx-auto mb-6 border-primary">
                <CardHeader className="text-center">
                  <CardTitle className="flex items-center justify-center gap-2">
                    <Crown className="h-5 w-5 text-primary" />
                    Assinatura {subscriptionStatus === "pending" ? "Pendente" : "Ativa"}
                  </CardTitle>
                  <CardDescription>
                    {subscriptionStatus === "pending"
                      ? "Seu pagamento está sendo processado. Assim que confirmado, o plano PRO será ativado."
                      : "Sua assinatura está ativa."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setShowCancelDialog(true)}
                  >
                    <XCircle className="h-4 w-4 mr-2" /> Cancelar Assinatura
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/dashboard">Voltar ao Dashboard</Link>
                  </Button>
                  <ConfirmationDialog
                    open={showCancelDialog}
                    onOpenChange={setShowCancelDialog}
                    title="Cancelar Assinatura"
                    description="Tem certeza que deseja cancelar? Você perderá o acesso aos recursos PRO."
                    confirmText={cancelling ? "Cancelando..." : "Sim, cancelar"}
                    onConfirm={handleCancelSubscription}
                    variant="destructive"
                  />
                </CardContent>
              </Card>
            )}

            {/* Plans grid - only show if no active subscription */}
            {!hasActiveSubscription && (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Free plan */}
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-xl">Plano Grátis</CardTitle>
                    <CardDescription>Para começar a organizar suas receitas</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">R$ 0</span>
                      <span className="text-muted-foreground">/mês</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {freeBenefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{b}</span>
                        </li>
                      ))}
                    </ul>
                    <Button variant="outline" className="w-full mt-6" asChild>
                      <Link to="/dashboard">Plano Atual</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* PRO plan */}
                <Card className="h-full border-primary relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                    RECOMENDADO
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Crown className="h-5 w-5 text-primary" />
                      Plano PRO
                    </CardTitle>
                    <CardDescription>Todas as ferramentas para crescer</CardDescription>
                    <div className="mt-4">
                      {hasReferral || couponApplied ? (
                        <div>
                          <span className="text-lg line-through text-muted-foreground mr-2">R$ {PRICE_FULL.toFixed(2).replace(".", ",")}</span>
                          <span className="text-3xl font-bold text-primary">R$ {priceFormatted}</span>
                          <span className="text-muted-foreground">/mês</span>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {hasReferral && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                <Gift className="h-3 w-3" /> Indicação
                              </span>
                            )}
                            {couponApplied && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                                🎟️ Cupom {couponDiscount}%
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="text-3xl font-bold text-primary">R$ {priceFormatted}</span>
                          <span className="text-muted-foreground">/mês</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {proBenefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-primary" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Referral code */}
                    {!hasReferral && !loadingReferral && (
                      <div className="mt-4">
                        {!showReferralInput ? (
                          <button
                            onClick={() => setShowReferralInput(true)}
                            className="text-xs text-primary underline hover:text-primary/80"
                          >
                            Tem um código de indicação?
                          </button>
                        ) : (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={referralCode}
                              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                              placeholder="Ex: MARIA10"
                              className="font-mono uppercase text-sm h-9"
                              maxLength={20}
                            />
                            <Button size="sm" onClick={handleApplyReferralCode} disabled={applyingCode} className="h-9">
                              {applyingCode ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Coupon code */}
                    {!couponApplied && (
                      <div className="mt-3">
                        <div className="flex gap-2">
                          <Input
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Cupom de desconto"
                            className="font-mono uppercase text-sm h-9"
                            maxLength={50}
                          />
                          <Button size="sm" variant="outline" onClick={handleApplyCoupon} disabled={applyingCoupon} className="h-9">
                            {applyingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aplicar"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Subscribe button */}
                    <Button className="w-full mt-6" onClick={handleSubscribe} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                      Assinar Agora • R$ {priceFormatted}/mês
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="text-center mt-8">
              <Link to="/dashboard" className="text-muted-foreground hover:text-foreground underline">
                Voltar ao Dashboard
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Planos;
