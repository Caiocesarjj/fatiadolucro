import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { useSubscription } from "@/hooks/useSubscription";
import {
  Save, Plus, Trash2, User, Palette, Store, Truck, Calculator, Crown, Lock,
  DollarSign, Clock, Info, MessageCircle, Headset, Mail, ShieldCheck, Smartphone, Loader2 as Loader2Icon,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ReferralCodeSection } from "@/components/settings/ReferralCodeSection";

interface Profile {
  store_name: string | null;
  logo_url: string | null;
}

interface Platform {
  id: string;
  name: string;
  fee_percentage: number;
  is_active: boolean;
  color: string;
}

const Configuracoes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { planType } = useSubscription();
  const navigate = useNavigate();
  const isPro = planType === "pro";

  const [profile, setProfile] = useState<Profile>({ store_name: "", logo_url: "" });
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [newPlatform, setNewPlatform] = useState({ name: "", fee: "" });
  const [loading, setLoading] = useState(true);

  // Theme state
  const [primaryColor, setPrimaryColor] = useState("#10B981");

  // Pricing state
  const [fixedCosts, setFixedCosts] = useState("");
  const [salaryGoal, setSalaryGoal] = useState("");
  const [workHoursPerDay, setWorkHoursPerDay] = useState("8");
  const [workDaysPerMonth, setWorkDaysPerMonth] = useState("22");
  const [variableCostRate, setVariableCostRate] = useState("10");
  const [savingPricing, setSavingPricing] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // MFA state
  const [mfaEnrolling, setMfaEnrolling] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState("");
  const [mfaVerifying, setMfaVerifying] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(true);
  const [mfaUnenrolling, setMfaUnenrolling] = useState(false);

  // Pricing calculations
  const totalMonthlyGoal = (parseFloat(fixedCosts.replace(",", ".")) || 0) + (parseFloat(salaryGoal.replace(",", ".")) || 0);
  const hoursPerMonth = (parseFloat(workHoursPerDay) || 8) * (parseFloat(workDaysPerMonth) || 22);
  const minutesPerMonth = hoursPerMonth * 60;
  const hourlyRate = hoursPerMonth > 0 ? totalMonthlyGoal / hoursPerMonth : 0;
  const minuteRate = minutesPerMonth > 0 ? totalMonthlyGoal / minutesPerMonth : 0;

  useEffect(() => {
    const savedColor = localStorage.getItem("fatia-lucro-primary-color");
    if (savedColor) setPrimaryColor(savedColor);
  }, []);

  const applyPrimaryColor = (color: string) => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0; let s = 0; const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    const hue = Math.round(h * 360);
    const saturation = Math.round(s * 100);
    const lightness = Math.round(l * 100);
    document.documentElement.style.setProperty("--primary", `${hue} ${saturation}% ${lightness}%`);
    document.documentElement.style.setProperty("--primary-hover", `${hue} ${saturation}% ${Math.max(lightness - 6, 0)}%`);
    document.documentElement.style.setProperty("--primary-light", `${hue} ${Math.max(saturation - 8, 0)}% 92%`);
    document.documentElement.style.setProperty("--primary-glow", `${hue} ${saturation}% ${Math.min(lightness + 6, 100)}%`);
    document.documentElement.style.setProperty("--ring", `${hue} ${saturation}% ${lightness}%`);
    document.documentElement.style.setProperty("--sidebar-primary", `${hue} ${saturation}% ${lightness}%`);
  };

  const handleSaveTheme = () => {
    localStorage.setItem("fatia-lucro-primary-color", primaryColor);
    applyPrimaryColor(primaryColor);
    toast({ title: "Tema atualizado!" });
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [profileRes, platformsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle(),
        supabase.from("platforms").select("*").order("name"),
      ]);
      if (profileRes.data) {
        setProfile({ store_name: profileRes.data.store_name || "", logo_url: profileRes.data.logo_url || "" });
        if (profileRes.data.fixed_costs) setFixedCosts(String(profileRes.data.fixed_costs).replace(".", ","));
        if (profileRes.data.salary_goal) setSalaryGoal(String(profileRes.data.salary_goal).replace(".", ","));
        if (profileRes.data.work_hours_per_day) setWorkHoursPerDay(String(profileRes.data.work_hours_per_day));
        if (profileRes.data.work_days_per_month) setWorkDaysPerMonth(String(profileRes.data.work_days_per_month));
        if (profileRes.data.variable_cost_rate !== null && profileRes.data.variable_cost_rate !== undefined) setVariableCostRate(String(profileRes.data.variable_cost_rate));
      }
      setPlatforms(platformsRes.data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase.from("profiles").update({ store_name: profile.store_name, logo_url: profile.logo_url }).eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const handleUpdatePlatform = async (platform: Platform) => {
    try {
      const { error } = await supabase.from("platforms").update({ name: platform.name, fee_percentage: platform.fee_percentage, is_active: platform.is_active, color: platform.color }).eq("id", platform.id);
      if (error) throw error;
      toast({ title: "Plataforma atualizada!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const handleAddPlatform = async () => {
    if (!newPlatform.name || !newPlatform.fee) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha nome e taxa da plataforma." });
      return;
    }
    try {
      const { error } = await supabase.from("platforms").insert({ user_id: user!.id, name: newPlatform.name, fee_percentage: parseFloat(newPlatform.fee.replace(",", ".")) });
      if (error) throw error;
      toast({ title: "Plataforma adicionada!" });
      setNewPlatform({ name: "", fee: "" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const handleDeletePlatform = async (id: string) => {
    if (!confirm("Deseja excluir esta plataforma?")) return;
    try {
      const { error } = await supabase.from("platforms").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Plataforma excluída!" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const handleSavePricing = async () => {
    setSavingPricing(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          fixed_costs: parseFloat(fixedCosts.replace(",", ".")) || 0,
          salary_goal: parseFloat(salaryGoal.replace(",", ".")) || 0,
          work_hours_per_day: parseFloat(workHoursPerDay) || 8,
          work_days_per_month: parseFloat(workDaysPerMonth) || 22,
          minute_rate: minuteRate,
          variable_cost_rate: parseFloat(variableCostRate) || 10,
        } as any)
        .eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Configurações de precificação salvas!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    } finally {
      setSavingPricing(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "A senha deve ter no mínimo 6 caracteres" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ variant: "destructive", title: "As senhas não coincidem" });
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Senha alterada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao alterar senha", description: mapErrorToUserMessage(error) });
    } finally {
      setSavingPassword(false);
    }
  };

  // Check MFA status on mount
  useEffect(() => {
    const checkMfa = async () => {
      try {
        const { data, error } = await supabase.auth.mfa.listFactors();
        if (!error && data?.totp && data.totp.length > 0) {
          const verified = data.totp.find((f: any) => f.status === "verified");
          setMfaEnabled(!!verified);
        }
      } catch {}
      setMfaLoading(false);
    };
    checkMfa();
  }, []);

  const handleEnrollMfa = async () => {
    setMfaEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw error;
      setMfaQrCode(data.totp.qr_code);
      setMfaFactorId(data.id);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao ativar 2FA", description: error.message });
    } finally {
      setMfaEnrolling(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (!mfaFactorId || mfaVerifyCode.length !== 6) {
      toast({ variant: "destructive", title: "Digite o código de 6 dígitos" });
      return;
    }
    setMfaVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: mfaVerifyCode,
      });
      if (verifyError) throw verifyError;
      toast({ title: "Autenticação de dois fatores ativada com sucesso!" });
      setMfaEnabled(true);
      setMfaQrCode(null);
      setMfaFactorId(null);
      setMfaVerifyCode("");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Código inválido", description: error.message });
    } finally {
      setMfaVerifying(false);
    }
  };

  const handleUnenrollMfa = async () => {
    setMfaUnenrolling(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f: any) => f.status === "verified");
      if (verified) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: verified.id });
        if (error) throw error;
        setMfaEnabled(false);
        toast({ title: "2FA desativado com sucesso" });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao desativar 2FA", description: error.message });
    } finally {
      setMfaUnenrolling(false);
    }
  };

  const whatsappNumber = "5511999999999";
  const whatsappMessage = encodeURIComponent("Olá! Quero fazer o upgrade para o plano PRO do Fatia do Lucro.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <AppLayout title="Configurações">
      <div className="max-w-2xl">
        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
            <TabsTrigger value="perfil" className="text-xs sm:text-sm">Perfil</TabsTrigger>
            <TabsTrigger value="seguranca" className="text-xs sm:text-sm">Segurança</TabsTrigger>
            <TabsTrigger value="precificacao" className="text-xs sm:text-sm">Precificação</TabsTrigger>
            <TabsTrigger value="personalizacao" className="text-xs sm:text-sm relative">
              Cores
              {!isPro && <Lock className="h-3 w-3 ml-1 inline-block" />}
            </TabsTrigger>
            <TabsTrigger value="plataformas" className="text-xs sm:text-sm">Plataformas</TabsTrigger>
            <TabsTrigger value="assinatura" className="text-xs sm:text-sm">Plano</TabsTrigger>
          </TabsList>

          {/* ====== PERFIL ====== */}
          <TabsContent value="perfil">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Perfil da Confeitaria
                  </CardTitle>
                  <CardDescription>Informações básicas do seu negócio</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="store_name">Nome da Confeitaria</Label>
                    <Input id="store_name" value={profile.store_name || ""} onChange={(e) => setProfile({ ...profile, store_name: e.target.value })} placeholder="Ex: Doces da Maria" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input id="email" value={user?.email || ""} disabled />
                    <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado</p>
                  </div>
                  <Button onClick={handleSaveProfile} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" />
                    Salvar Perfil
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="seguranca">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" />
                      Alterar Senha
                    </CardTitle>
                    <CardDescription>Defina uma nova senha para sua conta</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Nova Senha</Label>
                      <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                      <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={savingPassword} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                      <Save className="h-4 w-4 mr-2" />
                      {savingPassword ? "Salvando..." : "Alterar Senha"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>

              {/* MFA Section */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      Autenticação de Dois Fatores (2FA)
                    </CardTitle>
                    <CardDescription>
                      Adicione uma camada extra de segurança usando o Google Authenticator ou similar.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mfaLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    ) : mfaEnabled ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <ShieldCheck className="h-4 w-4" />
                          <span>2FA está ativado na sua conta</span>
                        </div>
                        <Button variant="destructive" onClick={handleUnenrollMfa} disabled={mfaUnenrolling}>
                          {mfaUnenrolling ? "Desativando..." : "Desativar 2FA"}
                        </Button>
                      </div>
                    ) : mfaQrCode ? (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Escaneie o QR Code abaixo com o Google Authenticator e digite o código de 6 dígitos.
                        </p>
                        <div className="flex justify-center">
                          <img src={mfaQrCode} alt="QR Code 2FA" className="w-48 h-48 border rounded-lg" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mfa-code">Código de Verificação</Label>
                          <Input
                            id="mfa-code"
                            value={mfaVerifyCode}
                            onChange={(e) => setMfaVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                          />
                        </div>
                        <Button onClick={handleVerifyMfa} disabled={mfaVerifying || mfaVerifyCode.length !== 6} className="w-full">
                          {mfaVerifying ? "Verificando..." : "Confirmar"}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={handleEnrollMfa} disabled={mfaEnrolling} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                        {mfaEnrolling ? (
                          <><Loader2Icon className="h-4 w-4 animate-spin mr-2" />Ativando...</>
                        ) : (
                          <><Smartphone className="h-4 w-4 mr-2" />Ativar Autenticação de Dois Fatores</>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>

          {/* ====== PRECIFICAÇÃO (UNIFIED) ====== */}
          <TabsContent value="precificacao">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Configuração de Precificação
                  </CardTitle>
                  <CardDescription>
                    Calcule o valor do seu minuto de trabalho e configure os custos variáveis. Esses valores são usados automaticamente na calculadora de receitas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Labor inputs */}
                  <div>
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Mão de Obra</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fixedCosts" className="flex items-center gap-2">
                          Custos Fixos Mensais (R$)
                          <span className="relative group">
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                              São contas que você paga todo mês, independente de vender ou não.
                            </span>
                          </span>
                        </Label>
                        <Input id="fixedCosts" value={fixedCosts} onChange={(e) => setFixedCosts(e.target.value)} placeholder="Ex: Aluguel, Internet, MEI, IPTU" className="input-currency" />
                        <p className="text-xs text-muted-foreground">NÃO inclua Gás/Luz aqui — eles são cobertos pela taxa variável abaixo.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="salaryGoal">Meta de Salário (R$)</Label>
                        <Input id="salaryGoal" value={salaryGoal} onChange={(e) => setSalaryGoal(e.target.value)} placeholder="Ex: 3000,00" className="input-currency" />
                        <p className="text-xs text-muted-foreground">Quanto você quer tirar de lucro por mês</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workHours">Horas de Trabalho por Dia</Label>
                        <Input id="workHours" type="number" value={workHoursPerDay} onChange={(e) => setWorkHoursPerDay(e.target.value)} placeholder="8" className="input-currency" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="workDays">Dias de Trabalho por Mês</Label>
                        <Input id="workDays" type="number" value={workDaysPerMonth} onChange={(e) => setWorkDaysPerMonth(e.target.value)} placeholder="22" className="input-currency" />
                      </div>
                    </div>
                  </div>

                  {/* Variable cost rate */}
                  <div className="border-t pt-5">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Custos Variáveis</h3>
                    <div className="space-y-2">
                      <Label htmlFor="variableCostRate" className="flex items-center gap-2">
                        Taxa de Gastos Variáveis (Gás, Luz, Limpeza)
                        <span className="relative group">
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                            Porcentagem adicionada para cobrir gastos que variam conforme a produção.
                          </span>
                        </span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input id="variableCostRate" type="number" value={variableCostRate} onChange={(e) => setVariableCostRate(e.target.value)} placeholder="10" className="w-24 input-currency" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Porcentagem aplicada sobre os ingredientes na calculadora para cobrir gastos que variam com a produção.</p>
                    </div>
                  </div>

                  {/* Results */}
                  <div className="border-t pt-5">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-3">Resultados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-1">Meta Mensal Total</p>
                        <p className="text-2xl font-bold text-foreground">{formatCurrency(totalMonthlyGoal)}</p>
                      </div>
                      <div className="p-4 bg-primary-light rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-1">Valor por Hora</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(hourlyRate)}</p>
                      </div>
                      <div className="p-4 bg-success-light rounded-lg text-center">
                        <p className="text-sm text-muted-foreground mb-1">Valor por Minuto</p>
                        <p className="text-2xl font-bold text-success">{formatCurrency(minuteRate)}</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium">Como usar na Calculadora:</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ao criar uma receita, adicione o tempo de preparo em minutos. Multiplique pelo valor do minuto ({formatCurrency(minuteRate)}) para obter o custo de mão de obra.
                      </p>
                      <div className="mt-3 p-3 bg-muted/30 rounded text-sm">
                        <strong>Exemplo:</strong> Receita com 30 minutos de preparo = 30 × {formatCurrency(minuteRate)} = {formatCurrency(minuteRate * 30)} de mão de obra
                      </div>
                    </div>
                  </div>

                  {/* Single save button */}
                  <Button onClick={handleSavePricing} disabled={savingPricing} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                    <Save className="h-4 w-4 mr-2" />
                    {savingPricing ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ====== PERSONALIZAÇÃO (PRO) ====== */}
          <TabsContent value="personalizacao">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={!isPro ? "opacity-75" : ""}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Tema e Cores
                    {!isPro && (
                      <span className="ml-2 inline-flex items-center gap-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                        <Crown className="h-3 w-3" /> PRO
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>Personalize a cor principal do sistema</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isPro ? (
                    <div className="text-center py-6">
                      <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">A personalização de cores está disponível no plano PRO.</p>
                      <Button onClick={() => navigate("/planos")} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                        <Crown className="h-4 w-4 mr-2" />
                        Fazer Upgrade
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="space-y-2 flex-1">
                          <Label htmlFor="primary-color">Cor Principal</Label>
                          <div className="flex items-center gap-3 flex-wrap">
                            <input id="primary-color" type="color" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); applyPrimaryColor(e.target.value); }} className="w-12 h-12 rounded cursor-pointer border-0" />
                            <Input value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) applyPrimaryColor(e.target.value); }} placeholder="#10B981" className="w-32 font-mono" />
                            <div className="flex gap-2">
                              {["#10B981", "#ea90c9", "#3b82f6", "#f59e0b", "#8b5cf6"].map((color) => (
                                <button key={color} onClick={() => { setPrimaryColor(color); applyPrimaryColor(color); }} className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground/20 transition-colors" style={{ backgroundColor: color }} title={color} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <Button onClick={handleSaveTheme} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                        <Save className="h-4 w-4 mr-2" />
                        Salvar Tema
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ====== PLATAFORMAS ====== */}
          <TabsContent value="plataformas">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Plataformas de Venda
                  </CardTitle>
                  <CardDescription>Configure as taxas de cada plataforma de delivery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {platforms.map((platform) => (
                      <div key={platform.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg flex-wrap">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: platform.color || "#10B981" }}>
                          {platform.name.toLowerCase().includes("balcão") ? <Store className="h-4 w-4 text-white" /> : <Truck className="h-4 w-4 text-white" />}
                        </div>
                        <Input value={platform.name} onChange={(e) => setPlatforms(platforms.map((p) => p.id === platform.id ? { ...p, name: e.target.value } : p))} className="flex-1 min-w-[120px]" />
                        <div className="flex items-center gap-2">
                          <Input type="number" value={platform.fee_percentage} onChange={(e) => setPlatforms(platforms.map((p) => p.id === platform.id ? { ...p, fee_percentage: parseFloat(e.target.value) || 0 } : p))} className="w-20 input-currency" />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <input type="color" value={platform.color || "#10B981"} onChange={(e) => setPlatforms(platforms.map((p) => p.id === platform.id ? { ...p, color: e.target.value } : p))} className="w-8 h-8 rounded cursor-pointer border-0" />
                        <Button variant="outline" size="sm" onClick={() => handleUpdatePlatform(platform)}><Save className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlatform(platform.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Adicionar Nova Plataforma</Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Input value={newPlatform.name} onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })} placeholder="Nome da plataforma" className="flex-1 min-w-[120px]" />
                      <div className="flex items-center gap-2">
                        <Input value={newPlatform.fee} onChange={(e) => setNewPlatform({ ...newPlatform, fee: e.target.value })} placeholder="Taxa" className="w-20 input-currency" />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                      <Button onClick={handleAddPlatform} className="bg-primary hover:bg-primary-hover text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* ====== ASSINATURA ====== */}
          <TabsContent value="assinatura">
            <div className="space-y-6">
              <ReferralCodeSection />
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-primary" />
                      Seu Plano
                    </CardTitle>
                    <CardDescription>Gerencie sua assinatura</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary-light/20">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {isPro ? <Crown className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-muted-foreground" />}
                        </div>
                        <div>
                          <p className="font-semibold text-lg">Plano {isPro ? "PRO" : "Grátis"}</p>
                          <p className="text-sm text-muted-foreground">{isPro ? "Acesso completo a todos os recursos" : "Recursos limitados — faça upgrade para crescer"}</p>
                        </div>
                      </div>
                    </div>
                    {!isPro && (
                      <div className="space-y-3">
                        <Button onClick={() => navigate("/planos")} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground">
                          <Crown className="h-4 w-4 mr-2" />
                          Ver Planos e Fazer Upgrade
                        </Button>
                        <Button variant="outline" className="w-full" asChild>
                          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Falar com Suporte
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Headset className="h-5 w-5 text-primary" />
                      Suporte & Ajuda
                    </CardTitle>
                    <CardDescription>Estamos aqui para ajudar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <a href="mailto:contato.fatiadolucro@gmail.com" className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground">Fale Conosco</h3>
                        <p className="text-sm text-muted-foreground">Dúvidas, problemas ou sugestões? Mande um e-mail.</p>
                        <p className="text-sm text-primary font-medium mt-1 select-all">contato.fatiadolucro@gmail.com</p>
                      </div>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
