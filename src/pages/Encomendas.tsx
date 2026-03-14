import { useState, useEffect } from "react";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardList,
  Calendar,
  List,
  ChevronLeft,
  ChevronRight,
  FileDown,
} from "lucide-react";
import { ExportPdfDialog } from "@/components/encomendas/ExportPdfDialog";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, addMonths, subMonths } from "date-fns";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { UpgradeModal } from "@/components/UpgradeModal";
import { ptBR } from "date-fns/locale";

type OrderStatus = "pending" | "in_production" | "ready" | "delivered" | "cancelled";

interface Order {
  id: string;
  client_id: string | null;
  delivery_date: string;
  status: OrderStatus;
  total_amount: number;
  description: string | null;
  notes: string | null;
  clients?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  in_production: "Em Produção",
  ready: "Pronto",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_production: "bg-blue-100 text-blue-800",
  ready: "bg-green-100 text-green-800",
  delivered: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const Encomendas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { canCreate, getLimit, getCount } = useFreemiumLimits();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    delivery_date: format(new Date(), "yyyy-MM-dd"),
    status: "pending" as OrderStatus,
    total_amount: "",
    description: "",
    notes: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [ordersRes, clientsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*, clients(name)")
          .order("delivery_date", { ascending: true }),
        supabase.from("clients").select("id, name").order("name"),
      ]);

      setOrders(ordersRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.delivery_date) {
      toast({
        variant: "destructive",
        title: "Campo obrigatório",
        description: "Preencha a data de entrega.",
      });
      return;
    }

    try {
      const orderData = {
        user_id: user!.id,
        client_id: form.client_id || null,
        delivery_date: form.delivery_date,
        status: form.status,
        total_amount: form.total_amount ? parseFloat(form.total_amount.replace(",", ".")) : 0,
        description: form.description || null,
        notes: form.notes || null,
      };

      if (editingId) {
        const { error } = await supabase
          .from("orders")
          .update(orderData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Encomenda atualizada!" });
      } else {
        const { error } = await supabase.from("orders").insert(orderData);

        if (error) throw error;
        toast({ title: "Encomenda adicionada!" });
      }

      resetForm();
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const handleEdit = (order: Order) => {
    setForm({
      client_id: order.client_id || "",
      delivery_date: order.delivery_date,
      status: order.status,
      total_amount: order.total_amount.toString().replace(".", ","),
      description: order.description || "",
      notes: order.notes || "",
    });
    setEditingId(order.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta encomenda?")) return;

    try {
      const { error } = await supabase.from("orders").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Encomenda excluída!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);

      if (error) throw error;
      toast({ title: "Status atualizado!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const resetForm = () => {
    setForm({
      client_id: "",
      delivery_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      total_amount: "",
      description: "",
      notes: "",
    });
    setEditingId(null);
    setDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Calendar helpers
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const parseDeliveryDate = (dateStr: string) => {
    const datePart = dateStr.split("T")[0]; // Handle both "2026-02-18" and "2026-02-18T00:00:00+00:00"
    const [year, month, day] = datePart.split("-").map(Number);
    return new Date(year, month - 1, day);
  };

  const getOrdersForDate = (date: Date) => {
    return orders.filter((order) => {
      const orderDate = parseDeliveryDate(order.delivery_date);
      return isSameDay(orderDate, date);
    });
  };

  const upcomingOrders = orders
    .filter((order) => {
      const orderDate = parseDeliveryDate(order.delivery_date);
      return (
        order.status !== "delivered" &&
        order.status !== "cancelled" &&
        orderDate >= new Date(new Date().setHours(0, 0, 0, 0))
      );
    })
    .slice(0, 10);

  return (
    <AppLayout title="Encomendas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowExport(true)}>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  if (!editingId && !canCreate("orders")) {
                    setShowUpgrade(true);
                    return;
                  }
                  resetForm();
                }}
                className="hidden md:flex bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Encomenda
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Encomenda" : "Nova Encomenda"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Select
                    value={form.client_id}
                    onValueChange={(value) => setForm({ ...form, client_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_date">Data de Entrega *</Label>
                    <Input
                      id="delivery_date"
                      type="date"
                      value={form.delivery_date}
                      onChange={(e) =>
                        setForm({ ...form, delivery_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="total_amount">Valor Total (R$)</Label>
                     <Input
                      id="total_amount"
                      value={form.total_amount}
                      onChange={(e) =>
                        setForm({ ...form, total_amount: e.target.value })
                      }
                      placeholder="Ex: 150,00"
                      className="input-currency"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value: OrderStatus) =>
                      setForm({ ...form, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
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
                    placeholder="Ex: 20 brigadeiros + bolo de chocolate"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ex: Entregar às 15h"
                    rows={2}
                  />
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
                    {editingId ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <Calendar className="h-4 w-4" />
              Calendário
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-1">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                      (day) => (
                        <div
                          key={day}
                          className="text-center text-sm font-medium text-muted-foreground py-2"
                        >
                          {day}
                        </div>
                      )
                    )}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                      <div key={`empty-${i}`} />
                    ))}
                    {monthDays.map((day) => {
                      const dayOrders = getOrdersForDate(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={`min-h-[44px] sm:min-h-[80px] p-1 border rounded-lg aspect-square sm:aspect-auto ${
                            isToday(day)
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          } ${
                            !isSameMonth(day, currentMonth)
                              ? "opacity-50"
                              : ""
                          }`}
                        >
                          <div
                            className={`text-sm font-medium mb-1 ${
                              isToday(day) ? "text-primary" : ""
                            }`}
                          >
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1">
                            {dayOrders.slice(0, 2).map((order) => (
                              <div
                                key={order.id}
                                className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer ${
                                  STATUS_COLORS[order.status]
                                }`}
                                onClick={() => handleEdit(order)}
                              >
                                {order.clients?.name || order.description || "Encomenda"}
                              </div>
                            ))}
                            {dayOrders.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayOrders.length - 2} mais
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          <TabsContent value="list">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Próximas Encomendas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <SkeletonList count={5} variant="list" />
                  ) : upcomingOrders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma encomenda pendente</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-medium">
                                {order.clients?.name || "Sem cliente"}
                              </span>
                              <Badge className={STATUS_COLORS[order.status]}>
                                {STATUS_LABELS[order.status]}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {order.description}
                            </p>
                            <p className="text-sm mt-1">
                              <span className="text-muted-foreground">Entrega:</span>{" "}
                              {format(parseDeliveryDate(order.delivery_date), "dd/MM/yyyy", { locale: ptBR })}
                              {" • "}
                              <span className="font-medium">
                                {formatCurrency(order.total_amount)}
                              </span>
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Select
                              value={order.status}
                              onValueChange={(value: OrderStatus) =>
                                handleStatusChange(order.id, value)
                              }
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_LABELS).map(
                                  ([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                      {label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(order)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(order.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
      <Button
        onClick={() => {
          if (!canCreate("orders")) {
            setShowUpgrade(true);
            return;
          }
          resetForm();
          setEditingId(null);
          setDialogOpen(true);
        }}
        className="fab bg-primary hover:bg-primary/90 text-primary-foreground md:hidden"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
      <ExportPdfDialog
        open={showExport}
        onOpenChange={setShowExport}
        orders={orders}
        currentMonth={currentMonth}
      />
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        type="module_locked"
        moduleName={`Encomendas (${getCount("orders")}/${getLimit("orders")})`}
      />
    </AppLayout>
  );
};

export default Encomendas;
