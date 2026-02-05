import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Transaction {
  id: string;
  type: "revenue" | "expense";
  entry_type: "direct_sale" | "transfer" | null;
  description: string;
  amount: number;
  platform_id: string | null;
  platform_fee: number | null;
  net_amount: number;
  transaction_date: string;
  client_id: string | null;
  invoice_number: string | null;
  platforms?: { name: string } | null;
  clients?: { name: string } | null;
}

interface Platform {
  id: string;
  name: string;
  fee_percentage: number;
}

interface Client {
  id: string;
  name: string;
}

const Financeiro = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    type: "revenue" as "revenue" | "expense",
    entry_type: "direct_sale" as "direct_sale" | "transfer",
    description: "",
    amount: "",
    platform_id: "",
    client_id: "",
    invoice_number: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [transactionsRes, platformsRes, clientsRes] = await Promise.all([
        supabase
          .from("transactions")
          .select("*, platforms(name), clients(name)")
          .order("transaction_date", { ascending: false }),
        supabase.from("platforms").select("*").order("name"),
        supabase.from("clients").select("id, name").order("name"),
      ]);

      setTransactions(transactionsRes.data || []);
      setPlatforms(platformsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.description || !form.amount) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha descrição e valor.",
      });
      return;
    }

    try {
      const amount = parseFloat(form.amount.replace(",", "."));
      let platformFee = 0;

      // Only apply platform fee for direct sales (Venda Direta), not for transfers (Repasse)
      if (form.type === "revenue" && form.platform_id && form.entry_type === "direct_sale") {
        const platform = platforms.find((p) => p.id === form.platform_id);
        if (platform) {
          platformFee = (amount * platform.fee_percentage) / 100;
        }
      }

      const { error } = await supabase.from("transactions").insert({
        user_id: user!.id,
        type: form.type,
        entry_type: form.type === "revenue" ? form.entry_type : null,
        description: form.description,
        amount,
        platform_id: form.platform_id || null,
        client_id: form.client_id || null,
        invoice_number: form.invoice_number || null,
        platform_fee: platformFee,
        transaction_date: form.transaction_date,
      });

      if (error) throw error;

      toast({ title: "Transação registrada!" });
      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir esta transação?")) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Transação excluída!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const resetForm = () => {
    setForm({
      type: "revenue",
      entry_type: "direct_sale",
      description: "",
      amount: "",
      platform_id: "",
      client_id: "",
      invoice_number: "",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
    });
    setDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calculate sales by platform for chart
  const salesByPlatform = platforms.map((platform) => {
    const platformTransactions = transactions.filter(
      (t) => t.type === "revenue" && t.platform_id === platform.id
    );
    const total = platformTransactions.reduce(
      (sum, t) => sum + Number(t.net_amount || 0),
      0
    );
    return {
      name: platform.name,
      total,
      count: platformTransactions.length,
    };
  }).filter((p) => p.count > 0);

  const totalRevenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((sum, t) => sum + Number(t.net_amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalRevenue - totalExpenses;

  const revenueTransactions = transactions.filter((t) => t.type === "revenue");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="card-metric-success">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Receitas
                    </p>
                    <p className="text-2xl font-bold text-success mt-1">
                      {formatCurrency(totalRevenue)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-success-light">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="card-metric-warning">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Despesas
                    </p>
                    <p className="text-2xl font-bold text-warning mt-1">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-warning/10">
                    <TrendingDown className="h-5 w-5 text-warning" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="card-metric-primary">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Saldo
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        netBalance >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {formatCurrency(netBalance)}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary-light">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sales by Platform Chart */}
          {salesByPlatform.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="md:col-span-3"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendas por Plataforma</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {salesByPlatform.map((platform) => {
                      const maxTotal = Math.max(...salesByPlatform.map((p) => p.total));
                      const percentage = maxTotal > 0 ? (platform.total / maxTotal) * 100 : 0;
                      return (
                        <div key={platform.name} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{platform.name}</span>
                            <span className="text-muted-foreground">
                              {platform.count} vendas · {formatCurrency(platform.total)}
                            </span>
                          </div>
                          <div className="h-3 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Transações
                </CardTitle>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Transação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nova Transação</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={form.type}
                          onValueChange={(value: "revenue" | "expense") =>
                            setForm({ ...form, type: value, platform_id: "" })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="revenue">
                              <div className="flex items-center gap-2">
                                <ArrowUpRight className="h-4 w-4 text-success" />
                                Receita (Venda)
                              </div>
                            </SelectItem>
                            <SelectItem value="expense">
                              <div className="flex items-center gap-2">
                                <ArrowDownRight className="h-4 w-4 text-destructive" />
                                Despesa
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                          id="description"
                          value={form.description}
                          onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                          }
                          placeholder="Ex: Venda de 10 brownies"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Valor (R$)</Label>
                          <Input
                            id="amount"
                            value={form.amount}
                            onChange={(e) =>
                              setForm({ ...form, amount: e.target.value })
                            }
                            placeholder="Ex: 80,00"
                            className="input-currency"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="date">Data</Label>
                          <Input
                            id="date"
                            type="date"
                            value={form.transaction_date}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                transaction_date: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="invoice">Nº Nota/Pedido (opcional)</Label>
                        <Input
                          id="invoice"
                          value={form.invoice_number}
                          onChange={(e) =>
                            setForm({ ...form, invoice_number: e.target.value })
                          }
                          placeholder="Ex: NF-001"
                        />
                      </div>

                      {form.type === "revenue" && (
                        <>
                          <div className="space-y-2">
                            <Label>Tipo de Entrada</Label>
                            <Select
                              value={form.entry_type}
                              onValueChange={(value: "direct_sale" | "transfer") =>
                                setForm({ ...form, entry_type: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="direct_sale">
                                  Venda Direta (desconta taxa)
                                </SelectItem>
                                <SelectItem value="transfer">
                                  Repasse (sem desconto de taxa)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Plataforma de Venda</Label>
                            <Select
                              value={form.platform_id}
                              onValueChange={(value) =>
                                setForm({ ...form, platform_id: value })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione a plataforma" />
                              </SelectTrigger>
                              <SelectContent>
                                {platforms.map((platform) => (
                                  <SelectItem key={platform.id} value={platform.id}>
                                    {platform.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                              {form.entry_type === "direct_sale"
                                ? "A taxa será descontada automaticamente"
                                : "Nenhuma taxa será descontada (repasse)"}
                            </p>
                          </div>
                        </>
                      )}

                      <div className="space-y-2">
                        <Label>Cliente (opcional)</Label>
                        <Select
                          value={form.client_id}
                          onValueChange={(value) =>
                            setForm({ ...form, client_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetForm}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground"
                        >
                          Salvar
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="revenue">Receitas</TabsTrigger>
                  <TabsTrigger value="expenses">Despesas</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  <TransactionTable
                    transactions={transactions}
                    formatCurrency={formatCurrency}
                    onDelete={handleDelete}
                  />
                </TabsContent>
                <TabsContent value="revenue">
                  <TransactionTable
                    transactions={revenueTransactions}
                    formatCurrency={formatCurrency}
                    onDelete={handleDelete}
                  />
                </TabsContent>
                <TabsContent value="expenses">
                  <TransactionTable
                    transactions={expenseTransactions}
                    formatCurrency={formatCurrency}
                    onDelete={handleDelete}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

interface TransactionTableProps {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  onDelete: (id: string) => void;
}

const TransactionTable = ({
  transactions,
  formatCurrency,
  onDelete,
}: TransactionTableProps) => {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Plataforma</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-right">Taxa</TableHead>
            <TableHead className="text-right">Líquido</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="table-row-hover">
              <TableCell>
                {format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {transaction.type === "revenue" ? (
                    <ArrowUpRight className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                  {transaction.description}
                </div>
              </TableCell>
              <TableCell>{transaction.platforms?.name || "-"}</TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-destructive">
                {transaction.platform_fee
                  ? `-${formatCurrency(transaction.platform_fee)}`
                  : "-"}
              </TableCell>
              <TableCell
                className={`text-right font-mono font-medium ${
                  transaction.type === "revenue"
                    ? "text-success"
                    : "text-destructive"
                }`}
              >
                {transaction.type === "revenue"
                  ? formatCurrency(transaction.net_amount)
                  : `-${formatCurrency(transaction.amount)}`}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(transaction.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Financeiro;
