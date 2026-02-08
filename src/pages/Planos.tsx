import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, MessageCircle, Crown, Lock, Sparkles, CreditCard, QrCode, FileText, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "@/hooks/use-toast";

type BillingType = "PIX" | "BOLETO" | "CREDIT_CARD";
type Step = "plans" | "info" | "payment";

const Planos = () => {
  const { user } = useAuth();
  const { planType } = useSubscription();
  const [step, setStep] = useState<Step>("plans");
  const [billingType, setBillingType] = useState<BillingType>("PIX");
  const [loading, setLoading] = useState(false);

  // User info
  const [name, setName] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [mobilePhone, setMobilePhone] = useState("");

  // Credit card
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCcv, setCardCcv] = useState("");
  const [cardPostalCode, setCardPostalCode] = useState("");

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

  const handleSelectPlan = (type: BillingType) => {
    setBillingType(type);
    setStep("info");
  };

  const handleSubmitInfo = () => {
    if (!name.trim() || !cpfCnpj.trim()) {
      toast({ title: "Preencha nome e CPF/CNPJ", variant: "destructive" });
      return;
    }
    if (billingType === "CREDIT_CARD") {
      setStep("payment");
    } else {
      handleCreateSubscription();
    }
  };

  const handleCreateSubscription = async () => {
    if (!user) {
      toast({ title: "Faça login para assinar", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        billingType,
        cpfCnpj,
        name,
        email: user.email,
        mobilePhone,
      };

      if (billingType === "CREDIT_CARD") {
        const [expMonth, expYear] = cardExpiry.split("/");
        payload.creditCard = {
          holderName: cardName,
          number: cardNumber.replace(/\s/g, ""),
          expiryMonth: expMonth,
          expiryYear: expYear,
          ccv: cardCcv,
        };
        payload.creditCardHolderInfo = {
          name,
          email: user.email,
          cpfCnpj: cpfCnpj.replace(/\D/g, ""),
          postalCode: cardPostalCode.replace(/\D/g, ""),
          phone: mobilePhone?.replace(/\D/g, ""),
        };
      }

      const { data, error } = await supabase.functions.invoke("create-asaas-subscription", {
        body: payload,
      });

      if (error) throw error;

      if (data?.invoiceUrl && billingType !== "CREDIT_CARD") {
        toast({
          title: "Assinatura criada!",
          description: "Abrindo link de pagamento...",
        });
        window.open(data.invoiceUrl, "_blank");
      } else if (billingType === "CREDIT_CARD") {
        toast({
          title: "Pagamento processado com sucesso!",
          description: "Seu plano PRO já está ativo.",
        });
      } else {
        toast({
          title: "Assinatura criada!",
          description: "Verifique seu e-mail para o link de pagamento.",
        });
      }

      setStep("plans");
    } catch (error: unknown) {
      console.error("Subscription error:", error);
      const msg = error instanceof Error ? error.message : "Erro ao criar assinatura";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/dashboard">Voltar ao Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <AnimatePresence mode="wait">
          {step === "plans" && (
            <motion.div key="plans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Faça o Upgrade!</h1>
                <p className="text-muted-foreground">Desbloqueie todos os recursos do Fatia do Lucro</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
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
                      <span className="text-3xl font-bold text-primary">R$ 9,99</span>
                      <span className="text-muted-foreground">/mês</span>
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

                    <p className="text-sm font-semibold text-center mt-6 mb-3 text-muted-foreground">Escolha a forma de pagamento:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => handleSelectPlan("PIX")}>
                        <QrCode className="h-5 w-5" />
                        <span className="text-xs">Pix</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => handleSelectPlan("BOLETO")}>
                        <FileText className="h-5 w-5" />
                        <span className="text-xs">Boleto</span>
                      </Button>
                      <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => handleSelectPlan("CREDIT_CARD")}>
                        <CreditCard className="h-5 w-5" />
                        <span className="text-xs">Cartão</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center mt-8">
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground underline">
                  Voltar ao Dashboard
                </Link>
              </div>
            </motion.div>
          )}

          {step === "info" && (
            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-md mx-auto">
              <Button variant="ghost" className="mb-4" onClick={() => setStep("plans")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle>Seus Dados</CardTitle>
                  <CardDescription>
                    Pagamento via {billingType === "PIX" ? "Pix" : billingType === "BOLETO" ? "Boleto" : "Cartão de Crédito"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome completo" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF ou CNPJ</Label>
                    <Input id="cpf" value={cpfCnpj} onChange={(e) => setCpfCnpj(e.target.value)} placeholder="000.000.000-00" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Celular (opcional)</Label>
                    <Input id="phone" value={mobilePhone} onChange={(e) => setMobilePhone(e.target.value)} placeholder="(11) 99999-9999" />
                  </div>
                  <Button className="w-full" onClick={handleSubmitInfo} disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {billingType === "CREDIT_CARD" ? "Próximo: Dados do Cartão" : "Gerar Link de Pagamento"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="max-w-md mx-auto">
              <Button variant="ghost" className="mb-4" onClick={() => setStep("info")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" /> Dados do Cartão
                  </CardTitle>
                  <CardDescription>R$ 9,99/mês • Cartão de Crédito</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Número do Cartão</Label>
                    <Input id="cardNumber" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardName">Nome no Cartão</Label>
                    <Input id="cardName" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="NOME COMO NO CARTÃO" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardExpiry">Validade</Label>
                      <Input id="cardExpiry" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/AAAA" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCcv">CVV</Label>
                      <Input id="cardCcv" value={cardCcv} onChange={(e) => setCardCcv(e.target.value)} placeholder="123" maxLength={4} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cardPostalCode">CEP</Label>
                    <Input id="cardPostalCode" value={cardPostalCode} onChange={(e) => setCardPostalCode(e.target.value)} placeholder="00000-000" />
                  </div>
                  <Button className="w-full" onClick={handleCreateSubscription} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Crown className="h-4 w-4 mr-2" />}
                    Pagar R$ 9,99 e Ativar PRO
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Planos;
