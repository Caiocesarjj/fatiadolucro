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
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Pencil,
  PiggyBank,
  BarChart3,
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";

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
  client_id: string | null;
  invoice_number: string | null;
  platforms?: { name: string; color: string } | null;
  clients?: { name: string } | null;
}

interface Platform {
  id: string;
  name: string;
  fee_percentage: number;
  color: string;
}

interface Client {
  id: string;
  name: string;
}

// Brand colors for platforms
const getPlatformColor = (name: string, customColor?: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes("ifood")) return "#EA1D2C";
  if (lowerName.includes("99food") || lowerName.includes("99 food")) return "#F7D200";
  if (lowerName.includes("balcão") || lowerName.includes("venda direta")) return "#10B981";
  return customColor || "#10B981";
};

const Financeiro = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [form, setForm] = useState({
    type: "revenue" as "revenue" | "expense",
    entry_type: "direct_sale" as "direct_sale" | "transfer" | "profit_withdrawal",
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
          .select("*, platforms(name, color), clients(name)")
          .order("transaction_date", { ascending: false }),
        supabase.from("platforms").select("*").order("name"),
        supabase.from("clients").select("id, name").order("name"),
      ]);

      setTransactions(transactionsRes.data || []);
      setPlatforms(platformsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching data:", error);
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

      // Only apply platform fee for direct sales
      if (form.type === "revenue" && form.platform_id && form.entry_type === "direct_sale") {
        const platform = platforms.find((p) => p.id === form.platform_id);
        if (platform) {
          platformFee = (amount * platform.fee_percentage) / 100;
        }
      }

      const transactionData = {
        user_id: user!.id,
        type: form.type,
        entry_type: form.type === "revenue" ? (form.entry_type as "direct_sale" | "transfer") : null,
        description: form.description,
        amount,
        platform_id: form.platform_id || null,
        client_id: form.client_id || null,
        invoice_number: form.invoice_number || null,
        platform_fee: platformFee,
        transaction_date: form.transaction_date,
      };

      if (editingTransaction) {
        const { error } = await supabase
          .from("transactions")
          .update(transactionData)
          .eq("id", editingTransaction.id);

        if (error) throw error;
        toast({ title: "Transação atualizada!" });
      } else {
        const { error } = await supabase.from("transactions").insert(transactionData);
        if (error) throw error;
        toast({ title: "Transação registrada!" });
      }

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

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setForm({
      type: transaction.type,
      entry_type: (transaction.entry_type as any) || "direct_sale",
      description: transaction.description,
      amount: transaction.amount.toString(),
      platform_id: transaction.platform_id || "",
      client_id: transaction.client_id || "",
      invoice_number: transaction.invoice_number || "",
      transaction_date: transaction.transaction_date,
    });
    setDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionToDelete);

      if (error) throw error;
      toast({ title: "Transação excluída!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
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
    setEditingTransaction(null);
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
      color: getPlatformColor(platform.name, platform.color),
    };
  }).filter((p) => p.count > 0);

  const totalRevenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((sum, t) => sum + Number(t.net_amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalWithdrawals = transactions
    .filter((t) => t.entry_type === "profit_withdrawal")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const netBalance = totalRevenue - totalExpenses;

  const revenueTransactions = transactions.filter((t) => t.type === "revenue");
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  return (
    <AppLayout title="Financeiro">
      <div className="space-y-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Movimentações
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="card-metric-success">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                          <p className="text-2xl font-bold text-success mt-1">{formatCurrency(totalRevenue)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-success-light">
                          <TrendingUp className="h-5 w-5 text-success" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <Card className="card-metric-warning">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                          <p className="text-2xl font-bold text-warning mt-1">{formatCurrency(totalExpenses)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-warning/10">
                          <TrendingDown className="h-5 w-5 text-warning" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <Card className="card-metric">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Retiradas</p>
                          <p className="text-2xl font-bold text-muted-foreground mt-1">{formatCurrency(totalWithdrawals)}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-muted">
                          <PiggyBank className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="card-metric-primary">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                          <p className={`text-2xl font-bold mt-1 ${netBalance >= 0 ? "text-success" : "text-destructive"}`}>
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
              </div>

              {/* Sales by Platform Chart */}
              {salesByPlatform.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Vendas por Plataforma
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={salesByPlatform} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} className="text-xs" />
                            <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                              contentStyle={{
                                backgroundColor: "hsl(var(--card))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                            />
                            <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                              {salesByPlatform.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      Transações
                    </CardTitle>
                    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                      <DialogTrigger asChild>
                        <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                          <Plus className="h-4 w-4 mr-2" />
                          Nova Transação
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select value={form.type} onValueChange={(value: "revenue" | "expense") => setForm({ ...form, type: value, platform_id: "" })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="revenue">
                                  <div className="flex items-center gap-2">
                                    <ArrowUpRight className="h-4 w-4 text-success" />
                                    Entrada (Receita)
                                  </div>
                                </SelectItem>
                                <SelectItem value="expense">
                                  <div className="flex items-center gap-2">
                                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                                    Saída (Despesa)
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {form.type === "revenue" && (
                            <div className="space-y-2">
                              <Label>Tipo de Entrada</Label>
                              <Select value={form.entry_type} onValueChange={(value: "direct_sale" | "transfer" | "profit_withdrawal") => setForm({ ...form, entry_type: value })}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="direct_sale">Venda Direta</SelectItem>
                                  <SelectItem value="transfer">Repasse</SelectItem>
                                  <SelectItem value="profit_withdrawal">
                                    <div className="flex items-center gap-2">
                                      <PiggyBank className="h-4 w-4" />
                                      Retirada de Lucro
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="description">Descrição</Label>
                            <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ex: Venda de 10 brownies" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="amount">Valor (R$)</Label>
                              <Input id="amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Ex: 80,00" className="input-currency" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="date">Data</Label>
                              <Input id="date" type="date" value={form.transaction_date} onChange={(e) => setForm({ ...form, transaction_date: e.target.value })} />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="invoice">Nº Nota/Pedido (opcional)</Label>
                            <Input id="invoice" value={form.invoice_number} onChange={(e) => setForm({ ...form, invoice_number: e.target.value })} placeholder="Ex: NF-001" />
                          </div>

                          {form.type === "revenue" && form.entry_type !== "profit_withdrawal" && (
                            <>
                              <div className="space-y-2">
                                <Label>Plataforma de Venda</Label>
                                <Select value={form.platform_id} onValueChange={(value) => setForm({ ...form, platform_id: value })}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Selecione a plataforma" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {platforms.map((platform) => (
                                      <SelectItem key={platform.id} value={platform.id}>
                                        <div className="flex items-center gap-2">
                                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getPlatformColor(platform.name, platform.color) }} />
                                          {platform.name}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Fonte (opcional)</Label>
                                <Select value={form.client_id} onValueChange={(value) => setForm({ ...form, client_id: value })}>
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
                            </>
                          )}

                          <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">Cancelar</Button>
                            <Button type="submit" className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground">Salvar</Button>
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
                      <TabsTrigger value="revenue">Entradas</TabsTrigger>
                      <TabsTrigger value="expenses">Saídas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                      <TransactionTable transactions={transactions} formatCurrency={formatCurrency} onEdit={handleEdit} onDelete={handleDeleteClick} getPlatformColor={getPlatformColor} />
                    </TabsContent>
                    <TabsContent value="revenue">
                      <TransactionTable transactions={revenueTransactions} formatCurrency={formatCurrency} onEdit={handleEdit} onDelete={handleDeleteClick} getPlatformColor={getPlatformColor} />
                    </TabsContent>
                    <TabsContent value="expenses">
                      <TransactionTable transactions={expenseTransactions} formatCurrency={formatCurrency} onEdit={handleEdit} onDelete={handleDeleteClick} getPlatformColor={getPlatformColor} />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-semibold mb-2">Relatórios em Breve</h3>
                  <p className="text-muted-foreground">
                    Esta funcionalidade estará disponível em uma próxima atualização.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>

        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Excluir Transação"
          description="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
          confirmText="Excluir"
          onConfirm={handleDeleteConfirm}
          variant="destructive"
        />
      </div>
    </AppLayout>
  );
};

interface TransactionTableProps {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => void;
  getPlatformColor: (name: string, customColor?: string) => string;
}

const TransactionTable = ({ transactions, formatCurrency, onEdit, onDelete, getPlatformColor }: TransactionTableProps) => {
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
            <TableHead className="w-[80px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="table-row-hover">
              <TableCell>
                {format(new Date(transaction.transaction_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {transaction.type === "revenue" ? (
                    transaction.entry_type === "profit_withdrawal" ? (
                      <PiggyBank className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    )
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-destructive" />
                  )}
                  <span>{transaction.description}</span>
                  {transaction.invoice_number && (
                    <span className="text-xs text-muted-foreground">#{transaction.invoice_number}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {transaction.platforms ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getPlatformColor(transaction.platforms.name, transaction.platforms.color) }}
                    />
                    <span>{transaction.platforms.name}</span>
                  </div>
                ) : "-"}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(transaction.amount)}
              </TableCell>
              <TableCell className="text-right font-mono text-destructive">
                {transaction.platform_fee ? `-${formatCurrency(transaction.platform_fee)}` : "-"}
              </TableCell>
              <TableCell className={`text-right font-mono font-medium ${transaction.type === "revenue" ? "text-success" : "text-destructive"}`}>
                {transaction.type === "revenue" ? formatCurrency(transaction.net_amount) : `-${formatCurrency(transaction.amount)}`}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(transaction)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(transaction.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default Financeiro;
