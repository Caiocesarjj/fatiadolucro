import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  TrendingUp,
  TrendingDown,
  Package,
  Calculator,
  DollarSign,
  ArrowUpRight,
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
}

interface ChartData {
  month: string;
  receitas: number;
  despesas: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalIngredients: 0,
    totalRecipes: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
  });
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const [ingredientsRes, recipesRes, transactionsRes] = await Promise.all([
        supabase.from("ingredients").select("id", { count: "exact" }),
        supabase.from("recipes").select("id", { count: "exact" }),
        supabase.from("transactions").select("*"),
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
      });

      // Generate chart data for the last 6 months
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
      const mockChartData = months.map((month) => ({
        month,
        receitas: Math.floor(Math.random() * 5000) + 1000,
        despesas: Math.floor(Math.random() * 3000) + 500,
      }));
      setChartData(mockChartData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const statCards = [
    {
      title: "Ingredientes",
      value: stats.totalIngredients,
      icon: Package,
      color: "primary" as const,
      suffix: "",
    },
    {
      title: "Receitas",
      value: stats.totalRecipes,
      icon: Calculator,
      color: "primary" as const,
      suffix: "",
    },
    {
      title: "Receita Total",
      value: stats.totalRevenue,
      icon: TrendingUp,
      color: "success" as const,
      isCurrency: true,
    },
    {
      title: "Despesas",
      value: stats.totalExpenses,
      icon: TrendingDown,
      color: "warning" as const,
      isCurrency: true,
    },
  ];

  return (
    <AppLayout title="Início">
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`card-metric-${stat.color}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold mt-1">
                        {stat.isCurrency
                          ? formatCurrency(stat.value)
                          : stat.value}
                      </p>
                    </div>
                    <div
                      className={`p-3 rounded-xl ${
                        stat.color === "success"
                          ? "bg-success-light"
                          : stat.color === "warning"
                          ? "bg-warning/10"
                          : "bg-primary-light"
                      }`}
                    >
                      <stat.icon
                        className={`h-5 w-5 ${
                          stat.color === "success"
                            ? "text-success"
                            : stat.color === "warning"
                            ? "text-warning"
                            : "text-primary"
                        }`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Receitas vs Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis
                        tickFormatter={(value) =>
                          `R$ ${(value / 1000).toFixed(0)}k`
                        }
                        className="text-xs"
                      />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="receitas"
                        name="Receitas"
                        fill="hsl(var(--success))"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="despesas"
                        name="Despesas"
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Profit Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-success" />
                  Lucro Líquido
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col justify-center h-[calc(100%-80px)]">
                <div className="text-center">
                  <p
                    className={`text-4xl font-bold ${
                      stats.netProfit >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {formatCurrency(stats.netProfit)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {stats.netProfit >= 0
                      ? "Seu negócio está no positivo! 🎉"
                      : "Atenção: revise suas despesas"}
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total Receitas
                    </span>
                    <span className="font-medium text-success">
                      {formatCurrency(stats.totalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Total Despesas
                    </span>
                    <span className="font-medium text-destructive">
                      {formatCurrency(stats.totalExpenses)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
