import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { TrialBanner } from "@/components/TrialBanner";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Calculator,
  DollarSign,
  ArrowUpRight,
  Plus,
  ChefHat,
  Target,
  Sparkles,
  Eye,
  EyeOff,
  CalendarDays,
  Settings,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { OnboardingWizard } from "@/components/OnboardingWizard";
import { PullToRefresh } from "@/components/PullToRefresh";

interface DashboardStats {
  totalIngredients: number;
  totalRecipes: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  salaryGoal: number;
  monthlyRevenue: number;
  monthlyExpenses: number;
}

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const HIDDEN_VALUE = "••••••";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isInTrial, trialDaysLeft, hasFullAccess, planType } = useFreemiumLimits();
  const [stats, setStats] = useState<DashboardStats>({
    totalIngredients: 0,
    totalRecipes: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    salaryGoal: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideValues, setHideValues] = useState(() => {
    return localStorage.getItem("fatia-hide-values") === "true";
  });

  // 1. Carrega dados do dashboard imediatamente (cache local)
  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  // 2. Sync com Mercado Pago imediatamente ao carregar
  useEffect(() => {
    if (!user || planType === "vip") return;
    const syncSubscription = async () => {
      console.log("[Sync] Iniciando sync_subscription_status para:", user.email);
      const { data, error } = await supabase.rpc("sync_subscription_status");
      console.log("[Sync] Resultado:", JSON.stringify({ data, error }));
      if (error) {
        console.error("[Sync] Erro:", error.message);
        return;
      }
      if (data?.plan_type === "pro" || data?.synced) {
        console.log("[Sync] Usuário é PRO — atualizando estado local");
        // Re-fetch dashboard data to reflect pro status
        fetchDashboardData();
      }
    };
    syncSubscription();
  }, [user, planType]);

  const fetchDashboardData = async () => {
    try {
      const [ingredientsRes, recipesRes, transactionsRes, profileRes] = await Promise.all([
        supabase.from("ingredients").select("id", { count: "exact" }),
        supabase.from("recipes").select("id", { count: "exact" }),
        supabase.from("transactions").select("*"),
        supabase.from("profiles").select("salary_goal").eq("user_id", user!.id).maybeSingle(),
      ]);

      const transactions = transactionsRes.data || [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const revenue = transactions
        .filter((t) => t.type === "revenue" || t.entry_type === "direct_sale" || t.entry_type === "transfer")
        .reduce((sum, t) => sum + Number(t.net_amount ?? t.amount ?? 0), 0);
      const expenses = transactions
        .filter((t) => t.type === "expense" || t.entry_type === "profit_withdrawal")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      const monthlyRevenue = transactions
        .filter((t) => {
          const d = new Date(t.transaction_date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
            (t.type === "revenue" || t.entry_type === "direct_sale" || t.entry_type === "transfer");
        })
        .reduce((sum, t) => sum + Number(t.net_amount ?? t.amount ?? 0), 0);
      const monthlyExpenses = transactions
        .filter((t) => {
          const d = new Date(t.transaction_date);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear &&
            (t.type === "expense" || t.entry_type === "profit_withdrawal");
        })
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalIngredients: ingredientsRes.count || 0,
        totalRecipes: recipesRes.count || 0,
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        salaryGoal: Number(profileRes.data?.salary_goal || 0),
        monthlyRevenue,
        monthlyExpenses,
      });

      // Chart data from transactions by month
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const chartNow = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(chartNow.getFullYear(), chartNow.getMonth() - i, 1);
        monthlyData[`${date.getFullYear()}-${date.getMonth()}`] = { receitas: 0, despesas: 0 };
      }
      transactions.forEach((t) => {
        const date = new Date(t.transaction_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyData[key]) {
          if (t.type === "revenue" || t.entry_type === "direct_sale" || t.entry_type === "transfer") {
            monthlyData[key].receitas += Number(t.net_amount ?? t.amount ?? 0);
          } else {
            monthlyData[key].despesas += Number(t.amount || 0);
          }
        }
      });
      setChartData(
        Object.entries(monthlyData).map(([key, data]) => ({
          month: months[Number(key.split("-")[1])],
          receitas: data.receitas,
          despesas: data.despesas,
        }))
      );
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const hasData =
    stats.totalIngredients > 0 ||
    stats.totalRecipes > 0 ||
    stats.totalRevenue > 0 ||
    stats.totalExpenses > 0;

  const statCards = [
    { title: "Ingredientes", value: stats.totalIngredients, icon: Package, color: "primary" as const },
    { title: "Receitas", value: stats.totalRecipes, icon: ChefHat, color: "primary" as const },
    { title: "Receita Total", value: stats.totalRevenue, icon: TrendingUp, color: "success" as const, isCurrency: true },
    { title: "Despesas", value: stats.totalExpenses, icon: TrendingDown, color: "warning" as const, isCurrency: true },
  ];

  return (
    <AppLayout title="Início">
      <OnboardingWizard />
      <PullToRefresh onRefresh={fetchDashboardData}>
      <div className="space-y-5">
        {/* Trial Banner */}
        {isInTrial && planType === "free" && <TrialBanner daysLeft={trialDaysLeft} />}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => navigate("/receitas")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-11 rounded-xl shrink-0 shadow-sm px-4"
            >
              <Plus className="h-4 w-4" /> Nova Receita
            </Button>
            <Button
              onClick={() => navigate("/ingredientes")}
              variant="outline"
              className="gap-2 h-11 rounded-xl shrink-0 px-4"
            >
              <Package className="h-4 w-4" /> Ingrediente
            </Button>
            <Button
              onClick={() => navigate("/inteligencia")}
              variant="outline"
              className="gap-2 h-11 rounded-xl shrink-0 px-4"
            >
              <Calculator className="h-4 w-4" /> Simuladores
            </Button>
          </div>
        </motion.div>

        {/* Onboarding State */}
        {!loading && !hasData && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-primary/20 bg-primary/5 rounded-2xl">
              <CardContent className="p-6 text-center space-y-4">
                <img src={logo} alt="Fatia do Lucro" className="h-8 w-8 mx-auto rounded-lg" />
                <h2 className="text-xl font-bold text-foreground">Bem-vindo ao Fatia do Lucro! 🎂</h2>

                {stats.salaryGoal === 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      Primeiro, configure sua <strong>precificação</strong> — defina seu salário-meta, dias e horas trabalhados para que o sistema calcule automaticamente o custo da mão-de-obra nas suas receitas.
                    </p>
                    <div className="flex flex-col gap-2.5 justify-center pt-1">
                      <Button onClick={() => navigate("/configuracoes")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 rounded-xl">
                        <Settings className="h-4 w-4" /> Configurar Precificação
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Passo 1 de 3 — Precificação → Ingredientes → Receitas
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                      ✅ Precificação configurada! Agora cadastre seus ingredientes e crie suas receitas para calcular custos e lucros.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                      <Button onClick={() => navigate("/ingredientes")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 rounded-xl">
                        <Package className="h-4 w-4" /> 2. Cadastrar Ingredientes
                      </Button>
                      <Button onClick={() => navigate("/receitas")} variant="outline" className="gap-2 h-12 rounded-xl">
                        <ChefHat className="h-4 w-4" /> 3. Criar Receitas
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid — 2x2 on mobile */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">Visão Geral</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => {
              const next = !hideValues;
              setHideValues(next);
              localStorage.setItem("fatia-hide-values", String(next));
            }}
          >
            {hideValues ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-bold mt-0.5 truncate">
                        {hideValues ? HIDDEN_VALUE : (stat.isCurrency ? formatCurrency(stat.value) : stat.value)}
                      </p>
                    </div>
                    <div className={`p-2 rounded-xl shrink-0 ${
                      stat.color === "success" ? "bg-success/10" : stat.color === "warning" ? "bg-warning/10" : "bg-primary/10"
                    }`}>
                      <stat.icon className={`h-4 w-4 ${
                        stat.color === "success" ? "text-success" : stat.color === "warning" ? "text-warning" : "text-primary"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Monthly Totals Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <span className="font-semibold text-sm text-foreground">Resumo do Mês</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Receitas</p>
                  <p className="text-lg font-bold text-success mt-0.5">
                    {hideValues ? HIDDEN_VALUE : formatCurrency(stats.monthlyRevenue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Despesas</p>
                  <p className="text-lg font-bold text-destructive mt-0.5">
                    {hideValues ? HIDDEN_VALUE : formatCurrency(stats.monthlyExpenses)}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Saldo do Mês</span>
                  <span className={`text-sm font-bold ${(stats.monthlyRevenue - stats.monthlyExpenses) >= 0 ? "text-success" : "text-destructive"}`}>
                    {hideValues ? HIDDEN_VALUE : formatCurrency(stats.monthlyRevenue - stats.monthlyExpenses)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Profit + Goal cards */}
        <div className="grid grid-cols-1 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-success/10">
                    <ArrowUpRight className="h-4 w-4 text-success" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">Lucro Líquido</span>
                </div>
                <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {hideValues ? HIDDEN_VALUE : formatCurrency(stats.netProfit)}
                </p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receitas</span>
                    <span className="text-success font-medium">{hideValues ? HIDDEN_VALUE : formatCurrency(stats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="text-destructive font-medium">{hideValues ? HIDDEN_VALUE : formatCurrency(stats.totalExpenses)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">Meta Mensal</span>
                </div>
                <p className="text-2xl font-bold text-primary">
                  {hideValues ? HIDDEN_VALUE : (stats.salaryGoal > 0 ? formatCurrency(stats.salaryGoal) : "Não definida")}
                </p>
                {stats.salaryGoal > 0 && (() => {
                  const monthlyProfit = stats.monthlyRevenue - stats.monthlyExpenses;
                  const pct = Math.min(100, Math.max(0, Math.round((monthlyProfit / stats.salaryGoal) * 100)));
                  return (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">
                          {hideValues ? "Progresso" : `${formatCurrency(monthlyProfit)} de ${formatCurrency(stats.salaryGoal)}`}
                        </span>
                        <span className="font-semibold">{pct}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className={`rounded-full h-2.5 transition-all duration-500 ${pct >= 100 ? "bg-success" : "bg-primary"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {pct >= 100 && (
                        <p className="text-xs text-success font-medium mt-1.5">🎉 Meta atingida!</p>
                      )}
                    </div>
                  );
                })()}
                {stats.salaryGoal === 0 && (
                  <Button variant="link" className="p-0 h-auto mt-2 text-primary text-sm" onClick={() => navigate("/configuracoes")}>
                    Definir meta →
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Chart */}
        {hasData && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="rounded-2xl shadow-sm">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Receitas vs Despesas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" tick={{ fontSize: 11 }} width={40} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                      <Bar dataKey="receitas" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </PullToRefresh>
    </AppLayout>
  );
};

export default Dashboard;
