import { useState, useEffect } from "react";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Search, Filter, Group } from "lucide-react";
import { SkeletonList } from "@/components/ui/skeleton-list";
import { motion } from "framer-motion";
import { PullToRefresh } from "@/components/PullToRefresh";
import { undoableDelete } from "@/lib/undoDelete";
import { Switch } from "@/components/ui/switch";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { UpgradeModal } from "@/components/UpgradeModal";

interface Ingredient {
  id: string;
  name: string;
  brand: string | null;
  store: string | null;
  price_paid: number;
  package_size: number;
  unit_type: "weight" | "unit" | "volume";
  cost_per_unit: number;
}

const Ingredientes = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "weight" | "unit" | "volume">("all");
  const [filterStore, setFilterStore] = useState<string>("all");
  const [groupByStore, setGroupByStore] = useState(false);
  const { canCreate, getLimit, getCount } = useFreemiumLimits();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    store: "",
    price_paid: "",
    package_size: "",
    unit_type: "weight" as "weight" | "unit" | "volume",
  });

  useEffect(() => {
    if (user) fetchIngredients();
  }, [user]);

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching ingredients:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.price_paid || !form.package_size) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Preencha nome, preço e tamanho da embalagem.",
      });
      return;
    }

    try {
      const ingredientData = {
        user_id: user!.id,
        name: form.name,
        brand: form.brand || null,
        store: form.store || null,
        price_paid: parseFloat(form.price_paid.replace(",", ".")),
        package_size: parseFloat(form.package_size.replace(",", ".")),
        unit_type: form.unit_type,
      };

      if (editingId) {
        const { error } = await supabase
          .from("ingredients")
          .update(ingredientData)
          .eq("id", editingId);

        if (error) throw error;
        toast({ title: "Ingrediente atualizado!" });
      } else {
        const { error } = await supabase.from("ingredients").insert(ingredientData);

        if (error) throw error;
        toast({ title: "Ingrediente adicionado!" });
      }

      resetForm();
      fetchIngredients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setForm({
      name: ingredient.name,
      brand: ingredient.brand || "",
      store: ingredient.store || "",
      price_paid: ingredient.price_paid.toString().replace(".", ","),
      package_size: ingredient.package_size.toString().replace(".", ","),
      unit_type: ingredient.unit_type,
    });
    setEditingId(ingredient.id);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const ingredient = ingredients.find((i) => i.id === id);
    // Optimistically remove from UI
    setIngredients((prev) => prev.filter((i) => i.id !== id));

    undoableDelete({
      itemLabel: ingredient?.name || "Ingrediente",
      onDelete: async () => {
        const { error } = await supabase.from("ingredients").delete().eq("id", id);
        if (error) {
          fetchIngredients(); // Restore on error
          throw error;
        }
      },
      onUndo: () => {
        fetchIngredients(); // Restore
      },
    });
  };

  const resetForm = () => {
    setForm({
      name: "",
      brand: "",
      store: "",
      price_paid: "",
      package_size: "",
      unit_type: "weight",
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

  const formatCostPerUnit = (value: number, unitType: "weight" | "unit" | "volume") => {
    const formatted = value.toFixed(2).replace(".", ",");
    const unitLabel = unitType === "weight" ? "g" : unitType === "volume" ? "ml" : "un";
    return `R$ ${formatted}/${unitLabel}`;
  };

  // Get unique stores for filter
  const uniqueStores = [...new Set(ingredients.map((i) => i.store).filter(Boolean))];

  const filteredIngredients = ingredients.filter((ing) => {
    const matchesSearch =
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ing.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || ing.unit_type === filterType;
    const matchesStore = filterStore === "all" || ing.store === filterStore;
    return matchesSearch && matchesType && matchesStore;
  });

  // Group by store if enabled
  const groupedIngredients = groupByStore
    ? filteredIngredients.reduce((acc, ing) => {
        const store = ing.store || "Sem loja";
        if (!acc[store]) acc[store] = [];
        acc[store].push(ing);
        return acc;
      }, {} as Record<string, Ingredient[]>)
    : { "": filteredIngredients };

  return (
    <AppLayout title="Ingredientes">
      <PullToRefresh onRefresh={fetchIngredients}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ingredientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 rounded-xl"
              />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
              <Button
                  onClick={() => {
                    if (!editingId && !canCreate("ingredients")) {
                      setShowUpgrade(true);
                      return;
                    }
                    resetForm();
                  }}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground h-11 rounded-xl hidden md:flex"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Ingrediente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Ingrediente" : "Novo Ingrediente"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Ex: Farinha de Trigo"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand">Marca</Label>
                      <Input
                        id="brand"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        placeholder="Ex: Dona Benta"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="store">Loja</Label>
                      <Input
                        id="store"
                        value={form.store}
                        onChange={(e) => setForm({ ...form, store: e.target.value })}
                        placeholder="Ex: Assaí"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price_paid">Preço Pago (R$) *</Label>
                      <Input
                        id="price_paid"
                        value={form.price_paid}
                        onChange={(e) =>
                          setForm({ ...form, price_paid: e.target.value })
                        }
                        placeholder="Ex: 12,90"
                        className="input-currency"
                        inputMode="decimal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="package_size">Tamanho *</Label>
                      <Input
                        id="package_size"
                        value={form.package_size}
                        onChange={(e) =>
                          setForm({ ...form, package_size: e.target.value })
                        }
                        placeholder="Ex: 1000"
                        className="input-currency"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Tipo de Medida</Label>
                    <Select
                      value={form.unit_type}
                      onValueChange={(value: "weight" | "unit" | "volume") =>
                        setForm({ ...form, unit_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight">Peso (kg/g)</SelectItem>
                        <SelectItem value="unit">Unidade (un)</SelectItem>
                        <SelectItem value="volume">Volume (ml/L)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {form.unit_type === "weight"
                        ? "Informe o tamanho em gramas (ex: 1000 para 1kg)"
                        : form.unit_type === "volume"
                        ? "Informe o tamanho em ml (ex: 1000 para 1L)"
                        : "Informe a quantidade de unidades (ex: 12 para 1 dúzia)"}
                    </p>
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={filterType}
                onValueChange={(value: "all" | "weight" | "unit") =>
                  setFilterType(value)
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">Todos os tipos</SelectItem>
                   <SelectItem value="weight">Peso (kg/g)</SelectItem>
                   <SelectItem value="unit">Unidade (un)</SelectItem>
                   <SelectItem value="volume">Volume (ml/L)</SelectItem>
                 </SelectContent>
              </Select>
            </div>

            <Select
              value={filterStore}
              onValueChange={setFilterStore}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Loja" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as lojas</SelectItem>
                {uniqueStores.map((store) => (
                  <SelectItem key={store} value={store!}>
                    {store}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2 ml-auto">
              <Label htmlFor="group-store" className="text-sm text-muted-foreground">
                Agrupar por loja
              </Label>
              <Switch
                id="group-store"
                checked={groupByStore}
                onCheckedChange={setGroupByStore}
              />
            </div>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden space-y-2">
          {filteredIngredients.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">Nenhum ingrediente cadastrado</p>
              <p className="text-sm mt-1">Toque em + para começar</p>
            </div>
          ) : (
            filteredIngredients.map((ingredient, index) => (
              <motion.div
                key={ingredient.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className="rounded-2xl shadow-sm active:scale-[0.98] transition-transform">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-semibold text-[15px] truncate">{ingredient.name}</h3>
                          {ingredient.brand && (
                            <span className="text-xs text-muted-foreground shrink-0">{ingredient.brand}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm">
                          <span className="text-muted-foreground">
                            {formatCurrency(ingredient.price_paid)} · {ingredient.package_size}
                            {ingredient.unit_type === "weight" ? "g" : ingredient.unit_type === "volume" ? "ml" : " un"}
                          </span>
                          <span className="badge-success text-xs">
                            {formatCostPerUnit(ingredient.cost_per_unit, ingredient.unit_type)}
                          </span>
                        </div>
                        {ingredient.store && (
                          <p className="text-xs text-muted-foreground mt-0.5">{ingredient.store}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ingredient)} className="h-10 w-10 rounded-xl">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(ingredient.id)} className="h-10 w-10 rounded-xl">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="hidden md:block"
        >
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Lista de Ingredientes
                <span className="text-muted-foreground font-normal text-sm">
                  ({filteredIngredients.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredIngredients.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum ingrediente cadastrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Loja</TableHead>
                        <TableHead className="text-right">Preço</TableHead>
                        <TableHead className="text-right">Tamanho</TableHead>
                        <TableHead className="text-right">Custo/Unidade</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIngredients.map((ingredient) => (
                        <TableRow key={ingredient.id} className="table-row-hover">
                          <TableCell className="font-medium">{ingredient.name}</TableCell>
                          <TableCell>{ingredient.brand || "-"}</TableCell>
                          <TableCell>{ingredient.store || "-"}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(ingredient.price_paid)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {ingredient.package_size}
                            {ingredient.unit_type === "weight" ? "g" : ingredient.unit_type === "volume" ? "ml" : " un"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="badge-success">{formatCostPerUnit(ingredient.cost_per_unit, ingredient.unit_type)}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(ingredient)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(ingredient.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* FAB for mobile */}
        <Button
          onClick={() => {
            if (!canCreate("ingredients")) {
              setShowUpgrade(true);
              return;
            }
            resetForm();
            setDialogOpen(true);
          }}
          className="fab bg-primary hover:bg-primary/90 text-primary-foreground md:hidden"
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
      </PullToRefresh>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        type="module_locked"
        moduleName={`Ingredientes (${getCount("ingredients")}/${getLimit("ingredients")})`}
      />
    </AppLayout>
  );
};

export default Ingredientes;
