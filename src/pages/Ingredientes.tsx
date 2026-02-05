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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Search, Filter, Group } from "lucide-react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

interface Ingredient {
  id: string;
  name: string;
  brand: string | null;
  store: string | null;
  price_paid: number;
  package_size: number;
  unit_type: "weight" | "unit";
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
  const [filterType, setFilterType] = useState<"all" | "weight" | "unit">("all");
  const [filterStore, setFilterStore] = useState<string>("all");
  const [groupByStore, setGroupByStore] = useState(false);

  const [form, setForm] = useState({
    name: "",
    brand: "",
    store: "",
    price_paid: "",
    package_size: "",
    unit_type: "weight" as "weight" | "unit",
  });

  useEffect(() => {
    if (user) fetchIngredients();
  }, [user]);

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase
        .from("ingredients")
        .select("*")
        .order("name");

      if (error) throw error;
      setIngredients(data || []);
    } catch (error) {
      console.error("Error fetching ingredients:", error);
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
        description: error.message,
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

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este ingrediente?")) return;

    try {
      const { error } = await supabase.from("ingredients").delete().eq("id", id);

      if (error) throw error;
      toast({ title: "Ingrediente excluído!" });
      fetchIngredients();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message,
      });
    }
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

  const formatCostPerUnit = (value: number, unitType: "weight" | "unit") => {
    const formatted = value.toFixed(2).replace(".", ",");
    return `R$ ${formatted}/${unitType === "weight" ? "g" : "un"}`;
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar ingredientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => resetForm()}
                  className="bg-primary hover:bg-primary-hover text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Ingrediente
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Editar Ingrediente" : "Novo Ingrediente"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="unit_type">Tipo de Medida</Label>
                    <Select
                      value={form.unit_type}
                      onValueChange={(value: "weight" | "unit") =>
                        setForm({ ...form, unit_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weight">Peso (kg/g)</SelectItem>
                        <SelectItem value="unit">Unidade (un)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {form.unit_type === "weight"
                        ? "Informe o tamanho em gramas (ex: 1000 para 1kg)"
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

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
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
                  <p className="text-sm">
                    Clique em "Novo Ingrediente" para começar
                  </p>
                </div>
              ) : groupByStore ? (
                <div className="space-y-6">
                  {Object.entries(
                    filteredIngredients.reduce((acc, ing) => {
                      const store = ing.store || "Sem loja";
                      if (!acc[store]) acc[store] = [];
                      acc[store].push(ing);
                      return acc;
                    }, {} as Record<string, Ingredient[]>)
                  ).map(([storeName, storeIngredients]) => (
                    <div key={storeName}>
                      <h3 className="font-semibold text-lg mb-3 pb-2 border-b flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        {storeName}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({storeIngredients.length} itens)
                        </span>
                      </h3>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nome</TableHead>
                              <TableHead>Marca</TableHead>
                              <TableHead className="text-right">Preço</TableHead>
                              <TableHead className="text-right">Tamanho</TableHead>
                              <TableHead className="text-right">Custo/Unidade</TableHead>
                              <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {storeIngredients.map((ingredient) => (
                              <TableRow key={ingredient.id} className="table-row-hover">
                                <TableCell className="font-medium">
                                  {ingredient.name}
                                </TableCell>
                                <TableCell>{ingredient.brand || "-"}</TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(ingredient.price_paid)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {ingredient.package_size}
                                  {ingredient.unit_type === "weight" ? "g" : " un"}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span className="badge-success">
                                    {formatCostPerUnit(
                                      ingredient.cost_per_unit,
                                      ingredient.unit_type
                                    )}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1 justify-end">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(ingredient)}
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDelete(ingredient.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
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
                        <TableHead className="text-right">
                          Custo/Unidade
                        </TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIngredients.map((ingredient) => (
                        <TableRow key={ingredient.id} className="table-row-hover">
                          <TableCell className="font-medium">
                            {ingredient.name}
                          </TableCell>
                          <TableCell>{ingredient.brand || "-"}</TableCell>
                          <TableCell>{ingredient.store || "-"}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(ingredient.price_paid)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {ingredient.package_size}
                            {ingredient.unit_type === "weight" ? "g" : " un"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="badge-success">
                              {formatCostPerUnit(
                                ingredient.cost_per_unit,
                                ingredient.unit_type
                              )}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(ingredient)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(ingredient.id)}
                              >
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
      </div>
    </AppLayout>
  );
};

export default Ingredientes;
