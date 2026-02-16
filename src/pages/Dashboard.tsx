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

  // 2. Sync com Mercado Pago em background, bem depois de montado
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      // Fire and forget — sem await, sem impacto na UI
      supabase.rpc("sync_subscription_status").then(({ data, error }) => {
        if (import.meta.env.DEV && error) console.error("Background sync error:", error);
        if (data?.synced && data?.plan_type === "pro") {
          if (import.meta.env.DEV) console.log("Subscription synced: user upgraded to PRO");
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
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
      <div className="space-y-6">
        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/receitas")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> Nova Receita
            </Button>
            <Button onClick={() => navigate("/ingredientes")} variant="outline" className="gap-2">
              <Package className="h-4 w-4" /> Novo Ingrediente
            </Button>
            <Button onClick={() => navigate("/inteligencia")} variant="outline" className="gap-2">
              <Calculator className="h-4 w-4" /> Simuladores
            </Button>
          </div>
        </motion.div>

        {/* Onboarding State */}
        {!loading && !hasData && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-8 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-primary/10 mx-auto">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">Bem-vindo ao Fatia do Lucro! 🎂</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Comece cadastrando seus ingredientes e receitas para calcular custos, lucros e gerenciar seu negócio de confeitaria.
                </p>
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                  <Button onClick={() => navigate("/ingredientes")} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                    <Package className="h-4 w-4" /> 1. Cadastrar Ingredientes
                  </Button>
                  <Button onClick={() => navigate("/receitas")} variant="outline" className="gap-2">
                    <ChefHat className="h-4 w-4" /> 2. Criar Receitas
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statCards.map((stat, index) => (
            <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
              <Card>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">{stat.title}</p>
                      <p className="text-lg md:text-2xl font-bold mt-1">
                        {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
                      </p>
                    </div>
                    <div className={`p-2 md:p-3 rounded-xl shrink-0 ${
                      stat.color === "success" ? "bg-success/10" : stat.color === "warning" ? "bg-warning/10" : "bg-primary/10"
                    }`}>
                      <stat.icon className={`h-4 w-4 md:h-5 md:w-5 ${
                        stat.color === "success" ? "text-success" : stat.color === "warning" ? "text-warning" : "text-primary"
                      }`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Profit Goal + Net Profit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <Card className="h-full">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Meta Mensal</span>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {stats.salaryGoal > 0 ? formatCurrency(stats.salaryGoal) : "Não definida"}
                </p>
                {stats.salaryGoal > 0 && stats.netProfit > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{Math.min(100, Math.round((stats.netProfit / stats.salaryGoal) * 100))}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="bg-primary rounded-full h-2.5 transition-all"
                        style={{ width: `${Math.min(100, (stats.netProfit / stats.salaryGoal) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {stats.salaryGoal === 0 && (
                  <Button variant="link" className="p-0 h-auto mt-2 text-primary" onClick={() => navigate("/configuracoes")}>
                    Definir meta nas configurações →
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="h-full">
              <CardContent className="p-6 flex flex-col justify-center h-full">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpRight className="h-5 w-5 text-success" />
                  <span className="font-semibold text-foreground">Lucro Líquido</span>
                </div>
                <p className={`text-3xl font-bold ${stats.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  {formatCurrency(stats.netProfit)}
                </p>
                <div className="mt-3 space-y-1 text-sm">
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
        </div>

        {/* Chart */}
        {hasData && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Receitas vs Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[260px] md:h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
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
