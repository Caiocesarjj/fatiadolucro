import { useState, useEffect, useMemo, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  AlertTriangle,
  TrendingUp,
  Plus,
  Minus,
  DollarSign,
  Boxes,
  ArrowDownUp,
} from "lucide-react";
import { motion } from "framer-motion";
import { mapErrorToUserMessage } from "@/lib/errorHandler";

interface StockIngredient {
  id: string;
  name: string;
  brand: string | null;
  store: string | null;
  price_paid: number;
  package_size: number;
  unit_type: "weight" | "unit" | "volume";
  cost_per_unit: number | null;
  current_stock: number;
  minimum_stock: number;
}

const Estoque = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<StockIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "ok">("all");
  const [editingItem, setEditingItem] = useState<StockIngredient | null>(null);
  const [stockForm, setStockForm] = useState({ current_stock: "", minimum_stock: "" });
  const [adjustItem, setAdjustItem] = useState<StockIngredient | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [newIngredient, setNewIngredient] = useState({
    name: "",
    brand: "",
    unit_type: "weight" as "weight" | "unit" | "volume",
    package_size: "",
    price_paid: "",
    current_stock: "",
    minimum_stock: "",
  });

  useEffect(() => {
    if (user) fetchIngredients();
  }, [user]);

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("id, name, brand, store, price_paid, package_size, unit_type, cost_per_unit, current_stock, minimum_stock")
        .order("name");
      if (error) throw error;
      setIngredients((data as StockIngredient[]) || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const unitLabel = (type: string) =>
    type === "weight" ? "g" : type === "volume" ? "ml" : "un";

  const isLowStock = (item: StockIngredient) =>
    item.minimum_stock > 0 && item.current_stock <= item.minimum_stock;

  const filtered = useMemo(() => {
    return ingredients.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase());
      if (filter === "low") return matchesSearch && isLowStock(item);
      if (filter === "ok") return matchesSearch && !isLowStock(item);
      return matchesSearch;
    });
  }, [ingredients, searchTerm, filter]);

  const stats = useMemo(() => {
    const totalItems = ingredients.length;
    const lowStockCount = ingredients.filter(isLowStock).length;
    const totalValue = ingredients.reduce((sum, item) => {
      const costPerUnit = item.cost_per_unit || item.price_paid / item.package_size;
      return sum + costPerUnit * item.current_stock;
    }, 0);
    return { totalItems, lowStockCount, totalValue };
  }, [ingredients]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const handleUpdateStock = async () => {
    if (!editingItem) return;
    try {
      const { error } = await supabase
        .from("ingredients")
        .update({
          current_stock: parseFloat(stockForm.current_stock.replace(",", ".")) || 0,
          minimum_stock: parseFloat(stockForm.minimum_stock.replace(",", ".")) || 0,
        })
        .eq("id", editingItem.id);
      if (error) throw error;
      toast({ title: "Estoque atualizado!" });
      setEditingItem(null);
      fetchIngredients();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const handleAdjust = async (direction: "add" | "remove") => {
    if (!adjustItem || !adjustAmount) return;
    const amount = parseFloat(adjustAmount.replace(",", "."));
    if (isNaN(amount) || amount <= 0) return;

    const newStock =
      direction === "add"
        ? adjustItem.current_stock + amount
        : Math.max(0, adjustItem.current_stock - amount);

    try {
      const { error } = await supabase
        .from("ingredients")
        .update({ current_stock: newStock })
        .eq("id", adjustItem.id);
      if (error) throw error;
      toast({ title: direction === "add" ? "Estoque adicionado!" : "Estoque removido!" });
      setAdjustItem(null);
      setAdjustAmount("");
      fetchIngredients();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const handleAddIngredient = async () => {
    if (!user || !newIngredient.name.trim()) return;
    try {
      const packageSize = parseFloat(newIngredient.package_size.replace(",", ".")) || 1;
      const pricePaid = parseFloat(newIngredient.price_paid.replace(",", ".")) || 0;
      const costPerUnit = packageSize > 0 ? pricePaid / packageSize : 0;
      const { error } = await supabase.from("ingredients").insert({
        user_id: user.id,
        name: newIngredient.name.trim(),
        brand: newIngredient.brand.trim() || null,
        unit_type: newIngredient.unit_type,
        package_size: packageSize,
        price_paid: pricePaid,
        cost_per_unit: costPerUnit,
        current_stock: parseFloat(newIngredient.current_stock.replace(",", ".")) || 0,
        minimum_stock: parseFloat(newIngredient.minimum_stock.replace(",", ".")) || 0,
      });
      if (error) throw error;
      toast({ title: "Ingrediente adicionado!" });
      setShowAddDialog(false);
      setNewIngredient({ name: "", brand: "", unit_type: "weight", package_size: "", price_paid: "", current_stock: "", minimum_stock: "" });
      fetchIngredients();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: mapErrorToUserMessage(error) });
    }
  };

  const openEdit = (item: StockIngredient) => {
    setStockForm({
      current_stock: item.current_stock.toString().replace(".", ","),
      minimum_stock: item.minimum_stock.toString().replace(".", ","),
    });
    setEditingItem(item);
  };

  const stockPercentage = (item: StockIngredient) => {
    if (item.minimum_stock <= 0) return 100;
    const ratio = item.current_stock / (item.minimum_stock * 3);
    return Math.min(Math.max(ratio * 100, 0), 100);
  };

  return (
    <AppLayout title="Estoque Inteligente">
      <div className="space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 text-center">
              <Boxes className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-2xl font-bold">{stats.totalItems}</p>
              <p className="text-xs text-muted-foreground">Itens</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto text-amber-500 mb-1" />
              <p className="text-2xl font-bold text-amber-600">{stats.lowStockCount}</p>
              <p className="text-xs text-muted-foreground">Estoque Baixo</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-muted-foreground">Valor Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Add */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar ingrediente..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-11 h-12 rounded-2xl text-base"
              />
              {/* Suggestions dropdown */}
              {showSuggestions && searchTerm.length > 0 && (
                <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-card border rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                  {ingredients
                    .filter((i) =>
                      i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      i.brand?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .slice(0, 8)
                    .map((item) => (
                      <button
                        key={item.id}
                        className="w-full text-left px-4 py-3 hover:bg-accent/50 active:bg-accent flex items-center justify-between border-b border-border/30 last:border-0 transition-colors"
                        onClick={() => {
                          setSearchTerm(item.name);
                          setShowSuggestions(false);
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.brand && (
                            <p className="text-xs text-muted-foreground truncate">{item.brand}</p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">
                          {item.current_stock} {unitLabel(item.unit_type)}
                        </span>
                      </button>
                    ))}
                  {ingredients.filter((i) =>
                    i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    i.brand?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum ingrediente encontrado</p>
                  )}
                </div>
              )}
            </div>
            <Button size="icon" className="rounded-2xl h-12 w-12 shrink-0" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {(["all", "low", "ok"] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="rounded-xl text-xs px-4 h-9"
              >
                {f === "all" ? "Todos" : f === "low" ? "⚠️ Baixo" : "✅ OK"}
              </Button>
            ))}
          </div>
        </div>

        {/* Stock List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">
                {filter === "low" ? "Nenhum item com estoque baixo 🎉" : "Nenhum ingrediente encontrado"}
              </p>
              <p className="text-sm mt-1">
                {ingredients.length === 0
                  ? "Cadastre ingredientes primeiro em Ingredientes"
                  : "Tente outra busca"}
              </p>
            </div>
          ) : (
            filtered.map((item, index) => {
              const low = isLowStock(item);
              const pct = stockPercentage(item);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <Card
                    className={`rounded-2xl shadow-sm transition-all cursor-pointer active:scale-[0.98] ${
                      low ? "border-amber-300 bg-amber-50/50" : ""
                    }`}
                    onClick={() => openEdit(item)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-[15px] truncate">{item.name}</h3>
                            {low && (
                              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-700 bg-amber-100 shrink-0">
                                Baixo
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium">
                              {item.current_stock} {unitLabel(item.unit_type)}
                            </span>
                            {item.minimum_stock > 0 && (
                              <span className="text-xs text-muted-foreground">
                                / mín. {item.minimum_stock} {unitLabel(item.unit_type)}
                              </span>
                            )}
                          </div>
                          {/* Progress bar */}
                          <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pct < 33
                                  ? "bg-red-500"
                                  : pct < 66
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 rounded-xl shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdjustItem(item);
                          }}
                        >
                          <ArrowDownUp className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Estoque — {editingItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estoque Atual ({editingItem && unitLabel(editingItem.unit_type)})</Label>
              <Input
                value={stockForm.current_stock}
                onChange={(e) => setStockForm({ ...stockForm, current_stock: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Estoque Mínimo ({editingItem && unitLabel(editingItem.unit_type)})</Label>
              <Input
                value={stockForm.minimum_stock}
                onChange={(e) => setStockForm({ ...stockForm, minimum_stock: e.target.value })}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Você será alertado quando o estoque ficar abaixo desse valor.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditingItem(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleUpdateStock}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Adjust Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={() => { setAdjustItem(null); setAdjustAmount(""); }}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Ajustar — {adjustItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Atual: <span className="font-semibold text-foreground">{adjustItem?.current_stock} {adjustItem && unitLabel(adjustItem.unit_type)}</span>
            </p>
            <Input
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder={`Quantidade (${adjustItem && unitLabel(adjustItem.unit_type)})`}
              className="text-center text-lg"
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleAdjust("remove")}
              >
                <Minus className="h-4 w-4 mr-1" /> Retirar
              </Button>
              <Button
                className="h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
                onClick={() => handleAdjust("add")}
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Ingredient Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Ingrediente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input
                value={newIngredient.name}
                onChange={(e) => setNewIngredient({ ...newIngredient, name: e.target.value })}
                placeholder="Ex: Farinha de trigo"
              />
            </div>
            <div className="space-y-1">
              <Label>Marca</Label>
              <Input
                value={newIngredient.brand}
                onChange={(e) => setNewIngredient({ ...newIngredient, brand: e.target.value })}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo de Unidade</Label>
              <Select
                value={newIngredient.unit_type}
                onValueChange={(v) => setNewIngredient({ ...newIngredient, unit_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weight">Peso (g/kg)</SelectItem>
                  <SelectItem value="unit">Unidade (un)</SelectItem>
                  <SelectItem value="volume">Volume (ml/L)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Tam. Embalagem</Label>
                <Input
                  value={newIngredient.package_size}
                  onChange={(e) => setNewIngredient({ ...newIngredient, package_size: e.target.value })}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1">
                <Label>Preço Pago (R$)</Label>
                <Input
                  value={newIngredient.price_paid}
                  onChange={(e) => setNewIngredient({ ...newIngredient, price_paid: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Estoque Atual</Label>
                <Input
                  value={newIngredient.current_stock}
                  onChange={(e) => setNewIngredient({ ...newIngredient, current_stock: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Estoque Mínimo</Label>
                <Input
                  value={newIngredient.minimum_stock}
                  onChange={(e) => setNewIngredient({ ...newIngredient, minimum_stock: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleAddIngredient} disabled={!newIngredient.name.trim()}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Estoque;
