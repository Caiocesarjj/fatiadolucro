import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, FileText, FileSpreadsheet, TrendingUp, TrendingDown, PiggyBank, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import logo from "@/assets/logo.png";

interface Transaction {
  id: string;
  type: "revenue" | "expense";
  entry_type: "direct_sale" | "transfer" | "profit_withdrawal" | null;
  description: string;
  amount: number;
  platform_id: string | null;
  platform_fee: number | null;
  net_amount: number;
  transaction_date: string;
  platforms?: { name: string; color: string } | null;
}

interface Platform {
  id: string;
  name: string;
  fee_percentage: number;
  color: string;
}

interface ReportsTabProps {
  transactions: Transaction[];
  platforms: Platform[];
  formatCurrency: (value: number) => string;
  getPlatformColor: (name: string, customColor?: string) => string;
}

export const ReportsTab = ({ transactions, platforms, formatCurrency, getPlatformColor }: ReportsTabProps) => {
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const [showSummary, setShowSummary] = useState(true);
  const [showEntriesVsExpenses, setShowEntriesVsExpenses] = useState(true);
  const [showByPlatform, setShowByPlatform] = useState(true);
  const [showWithdrawals, setShowWithdrawals] = useState(true);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const d = parseISO(t.transaction_date);
      return isWithinInterval(d, { start: dateFrom, end: dateTo });
    });
  }, [transactions, dateFrom, dateTo]);

  const isRevenueTransaction = (t: Transaction) =>
    t.type === "revenue" || t.entry_type === "direct_sale" || t.entry_type === "transfer";

  const isExpenseTransaction = (t: Transaction) =>
    t.type === "expense" || t.entry_type === "profit_withdrawal";

  const getRevenueValue = (t: Transaction) => Number(t.net_amount ?? t.amount ?? 0);

  const stats = useMemo(() => {
    const revenue = filtered
      .filter((t) => isRevenueTransaction(t))
      .reduce((s, t) => s + getRevenueValue(t), 0);
    const expenses = filtered
      .filter((t) => isExpenseTransaction(t))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const withdrawals = filtered
      .filter((t) => t.entry_type === "profit_withdrawal")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const balance = revenue - expenses;
    return { revenue, expenses, withdrawals, balance };
  }, [filtered]);

  const platformData = useMemo(() => {
    return platforms
      .map((p) => {
        const pTxns = filtered.filter(
          (t) => isRevenueTransaction(t) && t.platform_id === p.id
        );
        const total = pTxns.reduce((s, t) => s + getRevenueValue(t), 0);
        return {
          name: p.name,
          total,
          count: pTxns.length,
          color: getPlatformColor(p.name, p.color),
        };
      })
      .filter((p) => p.count > 0);
  }, [filtered, platforms, getPlatformColor]);

  const periodLabel = `${format(dateFrom, "dd/MM/yyyy")} a ${format(dateTo, "dd/MM/yyyy")}`;

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const sections: string[] = [];

    if (showSummary) {
      sections.push(`
        <div class="section">
          <h2>Resumo Financeiro</h2>
          <div class="grid">
            <div class="metric green"><span>Receitas</span><strong>${formatCurrency(stats.revenue)}</strong></div>
            <div class="metric red"><span>Despesas</span><strong>${formatCurrency(stats.expenses)}</strong></div>
            <div class="metric gray"><span>Retiradas</span><strong>${formatCurrency(stats.withdrawals)}</strong></div>
            <div class="metric blue"><span>Saldo</span><strong>${formatCurrency(stats.balance)}</strong></div>
          </div>
        </div>
      `);
    }

    if (showEntriesVsExpenses) {
      const revTxns = filtered.filter((t) => isRevenueTransaction(t));
      const expTxns = filtered.filter((t) => isExpenseTransaction(t) && t.entry_type !== "profit_withdrawal");
      sections.push(`
        <div class="section">
          <h2>Entradas vs Saídas</h2>
          <table>
            <thead><tr><th>Tipo</th><th>Qtd</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>Entradas</td><td>${revTxns.length}</td><td>${formatCurrency(stats.revenue)}</td></tr>
              <tr><td>Saídas</td><td>${expTxns.length}</td><td>${formatCurrency(stats.expenses - stats.withdrawals)}</td></tr>
            </tbody>
          </table>
        </div>
      `);
    }

    if (showByPlatform && platformData.length > 0) {
      sections.push(`
        <div class="section">
          <h2>Vendas por Plataforma</h2>
          <table>
            <thead><tr><th>Plataforma</th><th>Vendas</th><th>Total</th></tr></thead>
            <tbody>
              ${platformData.map(p => `<tr><td>${p.name}</td><td>${p.count}</td><td>${formatCurrency(p.total)}</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      `);
    }

    if (showWithdrawals) {
      const wTxns = filtered.filter(t => t.entry_type === "profit_withdrawal");
      sections.push(`
        <div class="section">
          <h2>Retiradas de Lucro</h2>
          <table>
            <thead><tr><th>Data</th><th>Valor</th></tr></thead>
            <tbody>
              ${wTxns.length > 0 ? wTxns.map(t => `<tr><td>${format(parseISO(t.transaction_date), "dd/MM/yyyy")}</td><td>${formatCurrency(t.amount)}</td></tr>`).join("") : "<tr><td colspan='2'>Nenhuma retirada no período</td></tr>"}
            </tbody>
          </table>
          <p class="total">Total: ${formatCurrency(stats.withdrawals)}</p>
        </div>
      `);
    }

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Relatório - Fatia do Lucro</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
        .header { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #D4A574; padding-bottom: 16px; margin-bottom: 24px; }
        .header img { width: 50px; height: 50px; border-radius: 12px; }
        .header h1 { font-size: 22px; color: #8B6F47; }
        .header p { font-size: 13px; color: #888; }
        .section { margin-bottom: 28px; }
        .section h2 { font-size: 16px; color: #8B6F47; margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .metric { padding: 14px; border-radius: 8px; text-align: center; }
        .metric span { display: block; font-size: 11px; color: #777; margin-bottom: 4px; }
        .metric strong { font-size: 18px; }
        .green { background: #ecfdf5; color: #065f46; }
        .red { background: #fef2f2; color: #991b1b; }
        .gray { background: #f9fafb; color: #6b7280; }
        .blue { background: #eff6ff; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e5e7eb; padding: 10px 14px; text-align: left; font-size: 13px; }
        th { background: #f9fafb; font-weight: 600; }
        .total { text-align: right; font-weight: 700; margin-top: 8px; font-size: 14px; }
        @media print { body { padding: 0; } }
      </style></head>
      <body>
        <div class="header">
          <img src="${logo}" alt="Logo" />
          <div><h1>Fatia do Lucro — Relatório</h1><p>Período: ${periodLabel}</p></div>
        </div>
        ${sections.join("")}
        <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const exportCSV = () => {
    const rows = [
      ["Data", "Tipo", "Categoria", "Descrição", "Plataforma", "Valor", "Taxa", "Líquido"].join(";"),
      ...filtered.map(t => [
        format(parseISO(t.transaction_date), "dd/MM/yyyy"),
        isRevenueTransaction(t) ? "Entrada" : "Saída",
        t.entry_type === "direct_sale" ? "Venda Direta" : t.entry_type === "transfer" ? "Repasse" : t.entry_type === "profit_withdrawal" ? "Retirada" : "Despesa",
        t.description,
        t.platforms?.name || "",
        Number(t.amount).toFixed(2).replace(".", ","),
        Number(t.platform_fee || 0).toFixed(2).replace(".", ","),
        Number(t.net_amount ?? t.amount ?? 0).toFixed(2).replace(".", ","),
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-${format(dateFrom, "yyyy-MM-dd")}-a-${format(dateTo, "yyyy-MM-dd")}.csv`;
    link.click();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Date Range + Filters */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">De</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateFrom, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={(d) => d && setDateFrom(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs text-muted-foreground">Até</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateTo, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={(d) => d && setDateTo(d)} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={showSummary} onCheckedChange={setShowSummary} id="s1" />
              <Label htmlFor="s1" className="text-xs cursor-pointer">Resumo Financeiro</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showEntriesVsExpenses} onCheckedChange={setShowEntriesVsExpenses} id="s2" />
              <Label htmlFor="s2" className="text-xs cursor-pointer">Entradas vs Saídas</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showByPlatform} onCheckedChange={setShowByPlatform} id="s3" />
              <Label htmlFor="s3" className="text-xs cursor-pointer">Vendas por Plataforma</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showWithdrawals} onCheckedChange={setShowWithdrawals} id="s4" />
              <Label htmlFor="s4" className="text-xs cursor-pointer">Retiradas de Lucro</Label>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <Button onClick={exportPDF} className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground">
              <FileText className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button onClick={exportCSV} variant="outline" className="flex-1 border-primary text-primary hover:bg-primary/5">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {showSummary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-emerald-50/80 border-emerald-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-5 w-5 mx-auto text-emerald-600 mb-1" />
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-lg font-bold text-emerald-700">{formatCurrency(stats.revenue)}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50/80 border-red-200">
            <CardContent className="p-4 text-center">
              <TrendingDown className="h-5 w-5 mx-auto text-red-600 mb-1" />
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-red-700">{formatCurrency(stats.expenses)}</p>
            </CardContent>
          </Card>
          <Card className="bg-muted/40">
            <CardContent className="p-4 text-center">
              <PiggyBank className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground">Retiradas</p>
              <p className="text-lg font-bold">{formatCurrency(stats.withdrawals)}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`text-lg font-bold ${stats.balance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {formatCurrency(stats.balance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Entries vs Expenses Chart */}
      {showEntriesVsExpenses && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Entradas vs Saídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  { name: "Entradas", value: stats.revenue, fill: "hsl(var(--success))" },
                  { name: "Saídas", value: stats.expenses, fill: "hsl(var(--destructive))" },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: "Entradas", value: stats.revenue, fill: "hsl(var(--success))" },
                      { name: "Saídas", value: stats.expenses, fill: "hsl(var(--destructive))" },
                    ].map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales by Platform */}
      {showByPlatform && platformData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vendas por Plataforma</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={platformData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {platformData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawals */}
      {showWithdrawals && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-muted-foreground" />
              Retiradas de Lucro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.filter(t => t.entry_type === "profit_withdrawal").length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma retirada no período selecionado.</p>
            ) : (
              <div className="space-y-2">
                {filtered.filter(t => t.entry_type === "profit_withdrawal").map(t => (
                  <div key={t.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-sm">{format(parseISO(t.transaction_date), "dd/MM/yyyy")}</span>
                    <span className="font-semibold">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(stats.withdrawals)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {filtered.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="font-medium text-muted-foreground">Nenhuma transação no período selecionado</p>
            <p className="text-sm text-muted-foreground">Ajuste as datas para ver seus dados.</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};
