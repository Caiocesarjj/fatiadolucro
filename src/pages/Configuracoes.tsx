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
import { useSubscription } from "@/hooks/useSubscription";
import {
  Save,
  Plus,
  Trash2,
  User,
  Palette,
  Store,
  Truck,
  Calculator,
  Crown,
  Lock,
  DollarSign,
  Clock,
  Info,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

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

  const [profile, setProfile] = useState<Profile>({
    store_name: "",
    logo_url: "",
  });
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

  // Pricing calculations
  const totalMonthlyGoal = (parseFloat(fixedCosts.replace(",", ".")) || 0) + (parseFloat(salaryGoal.replace(",", ".")) || 0);
  const hoursPerMonth = (parseFloat(workHoursPerDay) || 8) * (parseFloat(workDaysPerMonth) || 22);
  const minutesPerMonth = hoursPerMonth * 60;
  const hourlyRate = hoursPerMonth > 0 ? totalMonthlyGoal / hoursPerMonth : 0;
  const minuteRate = minutesPerMonth > 0 ? totalMonthlyGoal / minutesPerMonth : 0;

  useEffect(() => {
    const savedColor = localStorage.getItem("fatia-lucro-primary-color");
    if (savedColor) {
      setPrimaryColor(savedColor);
    }
  }, []);

  const applyPrimaryColor = (color: string) => {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

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
        setProfile({
          store_name: profileRes.data.store_name || "",
          logo_url: profileRes.data.logo_url || "",
        });
      }

      setPlatforms(platformsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ store_name: profile.store_name, logo_url: profile.logo_url })
        .eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleUpdatePlatform = async (platform: Platform) => {
    try {
      const { error } = await supabase
        .from("platforms")
        .update({ name: platform.name, fee_percentage: platform.fee_percentage, is_active: platform.is_active, color: platform.color })
        .eq("id", platform.id);
      if (error) throw error;
      toast({ title: "Plataforma atualizada!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const handleAddPlatform = async () => {
    if (!newPlatform.name || !newPlatform.fee) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Preencha nome e taxa da plataforma." });
      return;
    }
    try {
      const { error } = await supabase.from("platforms").insert({
        user_id: user!.id,
        name: newPlatform.name,
        fee_percentage: parseFloat(newPlatform.fee.replace(",", ".")),
      });
      if (error) throw error;
      toast({ title: "Plataforma adicionada!" });
      setNewPlatform({ name: "", fee: "" });
      fetchData();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
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
      toast({ variant: "destructive", title: "Erro", description: error.message });
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const whatsappNumber = "5511999999999";
  const whatsappMessage = encodeURIComponent("Olá! Quero fazer o upgrade para o plano PRO do Fatia do Lucro.");
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <AppLayout title="Configurações">
      <div className="max-w-2xl">
        <Tabs defaultValue="perfil" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="perfil" className="text-xs sm:text-sm">Perfil</TabsTrigger>
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
                    <Input
                      id="store_name"
                      value={profile.store_name || ""}
                      onChange={(e) => setProfile({ ...profile, store_name: e.target.value })}
                      placeholder="Ex: Doces da Maria"
                    />
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

          {/* ====== PRECIFICAÇÃO ====== */}
          <TabsContent value="precificacao">
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-primary/30 bg-primary-light/30">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-primary-light">
                        <Info className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-1">Como funciona?</h3>
                        <p className="text-sm text-muted-foreground">
                          Calcule o valor do seu minuto de trabalho considerando seus custos fixos e sua meta de salário. Use esse valor para precificar o tempo de preparo das suas receitas.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      Custo do Seu Minuto
                    </CardTitle>
                    <CardDescription>Preencha os campos para calcular o valor do seu tempo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fixedCosts">Custos Fixos Mensais (R$)</Label>
                        <Input id="fixedCosts" value={fixedCosts} onChange={(e) => setFixedCosts(e.target.value)} placeholder="Ex: 500,00" className="input-currency" />
                        <p className="text-xs text-muted-foreground">Aluguel, luz, gás, embalagens fixas, etc.</p>
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
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-success" />
                      Resultados
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
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
                    <div className="mt-6 p-4 border rounded-lg">
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
                  </CardContent>
                </Card>
              </motion.div>
            </div>
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
                            <input
                              id="primary-color"
                              type="color"
                              value={primaryColor}
                              onChange={(e) => { setPrimaryColor(e.target.value); applyPrimaryColor(e.target.value); }}
                              className="w-12 h-12 rounded cursor-pointer border-0"
                            />
                            <Input
                              value={primaryColor}
                              onChange={(e) => { setPrimaryColor(e.target.value); if (/^#[0-9A-Fa-f]{6}$/.test(e.target.value)) applyPrimaryColor(e.target.value); }}
                              placeholder="#10B981"
                              className="w-32 font-mono"
                            />
                            <div className="flex gap-2">
                              {["#10B981", "#ea90c9", "#3b82f6", "#f59e0b", "#8b5cf6"].map((color) => (
                                <button
                                  key={color}
                                  onClick={() => { setPrimaryColor(color); applyPrimaryColor(color); }}
                                  className="w-8 h-8 rounded-full border-2 border-transparent hover:border-foreground/20 transition-colors"
                                  style={{ backgroundColor: color }}
                                  title={color}
                                />
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
                          {platform.name.toLowerCase().includes("balcão") ? (
                            <Store className="h-4 w-4 text-white" />
                          ) : (
                            <Truck className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <Input
                          value={platform.name}
                          onChange={(e) => setPlatforms(platforms.map((p) => p.id === platform.id ? { ...p, name: e.target.value } : p))}
                          className="flex-1 min-w-[120px]"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={platform.fee_percentage}
                            onChange={(e) => setPlatforms(platforms.map((p) => p.id === platform.id ? { ...p, fee_percentage: parseFloat(e.target.value) || 0 } : p))}
                            className="w-20 input-currency"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <input
                          type="color"
                          value={platform.color || "#10B981"}
                          onChange={(e) => setPlatforms(platforms.map((p) => p.id === platform.id ? { ...p, color: e.target.value } : p))}
                          className="w-8 h-8 rounded cursor-pointer border-0"
                        />
                        <Button variant="outline" size="sm" onClick={() => handleUpdatePlatform(platform)}>
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlatform(platform.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4">
                    <Label className="mb-2 block">Adicionar Nova Plataforma</Label>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Input
                        value={newPlatform.name}
                        onChange={(e) => setNewPlatform({ ...newPlatform, name: e.target.value })}
                        placeholder="Nome da plataforma"
                        className="flex-1 min-w-[120px]"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          value={newPlatform.fee}
                          onChange={(e) => setNewPlatform({ ...newPlatform, fee: e.target.value })}
                          placeholder="Taxa"
                          className="w-20 input-currency"
                        />
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
                        <p className="text-sm text-muted-foreground">
                          {isPro ? "Acesso completo a todos os recursos" : "Recursos limitados — faça upgrade para crescer"}
                        </p>
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
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Configuracoes;
