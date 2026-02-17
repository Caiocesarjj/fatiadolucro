import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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

interface DashboardStats {
  totalIngredients: number;
  totalRecipes: number;
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  salaryGoal: number;
}

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalIngredients: 0,
    totalRecipes: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    salaryGoal: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Carrega dados do dashboard imediatamente (cache local)
  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  // 2. Sync com Mercado Pago imediatamente ao carregar
  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [ingredientsRes, recipesRes, transactionsRes, profileRes] = await Promise.all([
        supabase.from("ingredients").select("id", { count: "exact" }),
        supabase.from("recipes").select("id", { count: "exact" }),
        supabase.from("transactions").select("*"),
        supabase.from("profiles").select("salary_goal").eq("user_id", user!.id).maybeSingle(),
      ]);

      const transactions = transactionsRes.data || [];
      const revenue = transactions
        .filter((t) => t.type === "revenue")
        .reduce((sum, t) => sum + Number(t.net_amount || 0), 0);
      const expenses = transactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);

      setStats({
        totalIngredients: ingredientsRes.count || 0,
        totalRecipes: recipesRes.count || 0,
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        salaryGoal: Number(profileRes.data?.salary_goal || 0),
      });

      // Chart data from transactions by month
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData[`${date.getFullYear()}-${date.getMonth()}`] = { receitas: 0, despesas: 0 };
      }
      transactions.forEach((t) => {
        const date = new Date(t.transaction_date);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyData[key]) {
          if (t.type === "revenue") monthlyData[key].receitas += Number(t.net_amount || 0);
          else monthlyData[key].despesas += Number(t.amount || 0);
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

  const hasData = stats.totalIngredients > 0 || stats.totalRecipes > 0;

  const statCards = [
    { title: "Ingredientes", value: stats.totalIngredients, icon: Package, color: "primary" as const },
    { title: "Receitas", value: stats.totalRecipes, icon: ChefHat, color: "primary" as const },
    { title: "Receita Total", value: stats.totalRevenue, icon: TrendingUp, color: "success" as const, isCurrency: true },
    { title: "Despesas", value: stats.totalExpenses, icon: TrendingDown, color: "warning" as const, isCurrency: true },
  ];

  return (
    <AppLayout title="Início">
      <div className="space-y-5">
        {/* Quick Actions — horizontal scrollable chips */}
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
                <div className="inline-flex p-3.5 rounded-2xl bg-primary/10 mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Bem-vindo ao Fatia do Lucro! 🎂</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Comece cadastrando seus ingredientes e receitas para calcular custos e lucros.
                </p>
                <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-1">
                  <Button onClick={() => navigate("/ingredientes")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 rounded-xl">
                    <Package className="h-4 w-4" /> 1. Cadastrar Ingredientes
                  </Button>
                  <Button onClick={() => navigate("/receitas")} variant="outline" className="gap-2 h-12 rounded-xl">
                    <ChefHat className="h-4 w-4" /> 2. Criar Receitas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid — 2x2 on mobile */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}>
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-lg font-bold mt-0.5 truncate">
                        {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
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
                  {formatCurrency(stats.netProfit)}
                </p>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Receitas</span>
                    <span className="text-success font-medium">{formatCurrency(stats.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Despesas</span>
                    <span className="text-destructive font-medium">{formatCurrency(stats.totalExpenses)}</span>
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
                  {stats.salaryGoal > 0 ? formatCurrency(stats.salaryGoal) : "Não definida"}
                </p>
                {stats.salaryGoal > 0 && stats.netProfit > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-semibold">{Math.min(100, Math.round((stats.netProfit / stats.salaryGoal) * 100))}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${Math.min(100, (stats.netProfit / stats.salaryGoal) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
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
                      <Bar dataKey="despesas" name="Despesas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
