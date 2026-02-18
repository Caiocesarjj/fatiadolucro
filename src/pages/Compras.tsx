import { useState, useEffect } from "react";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ShoppingCart, Check, Pencil, Store, PackagePlus } from "lucide-react";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { UpgradeModal } from "@/components/UpgradeModal";

interface ShoppingListItem {
  id: string;
  ingredient_id: string;
  quantity_needed: number;
  checked: boolean;
  notes: string | null;
  ingredients: {
    name: string;
    brand: string | null;
    price_paid: number;
    package_size: number;
    unit_type: "weight" | "unit";
    cost_per_unit: number;
    store: string | null;
  };
}

interface Ingredient {
  id: string;
  name: string;
  brand: string | null;
  price_paid: number;
  package_size: number;
  unit_type: "weight" | "unit";
  cost_per_unit: number;
  store: string | null;
}

const Compras = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingListItem | null>(null);
  const [groupByStore, setGroupByStore] = useState(false);
  const { canCreate, getLimit, getCount } = useFreemiumLimits();
  const [showUpgrade, setShowUpgrade] = useState(false);

  const [form, setForm] = useState({
    ingredient_id: "",
    quantity_needed: "",
    store: "",
    price_paid: "",
    notes: "",
  });

  const [creatingIngredient, setCreatingIngredient] = useState(false);
  const [newIngForm, setNewIngForm] = useState({
    name: "",
    brand: "",
    price_paid: "",
    package_size: "",
    unit_type: "weight" as "weight" | "unit" | "volume",
  });

  const [editForm, setEditForm] = useState({
    store: "",
    price_paid: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [itemsRes, ingredientsRes] = await Promise.all([
        supabase
          .from("shopping_list_items")
          .select("*, ingredients(name, brand, price_paid, package_size, unit_type, cost_per_unit, store)")
          .eq("user_id", user!.id)
          .order("checked", { ascending: true }),
        supabase.from("ingredients").select("*").order("name"),
      ]);

      if (itemsRes.error) {
        if (import.meta.env.DEV) console.error("Error fetching shopping list:", itemsRes.error);
        toast({ variant: "destructive", title: "Erro ao carregar lista", description: mapErrorToUserMessage(itemsRes.error) });
      }

      setItems(itemsRes.data || []);
      setIngredients(ingredientsRes.data || []);
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.ingredient_id || !form.quantity_needed) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Selecione um ingrediente e informe a quantidade.",
      });
      return;
    }

    try {
      // Update ingredient store/price if changed
      if (form.store || form.price_paid) {
        const updateData: Record<string, any> = {};
        if (form.store) updateData.store = form.store;
        if (form.price_paid) updateData.price_paid = parseFloat(form.price_paid.replace(",", "."));
        
        await supabase.from("ingredients").update(updateData).eq("id", form.ingredient_id);
      }

      const { error } = await supabase.from("shopping_list_items").insert({
        user_id: user!.id,
        ingredient_id: form.ingredient_id,
        quantity_needed: parseFloat(form.quantity_needed.replace(",", ".")),
        notes: form.notes || null,
      } as any);

      if (error) throw error;

      toast({ title: "Item adicionado à lista!" });
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

  const handleEditSave = async () => {
    if (!editingItem) return;

    try {
      const updateData: Record<string, any> = {};
      if (editForm.store !== undefined) updateData.store = editForm.store || null;
      if (editForm.price_paid) updateData.price_paid = parseFloat(editForm.price_paid.replace(",", "."));

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from("ingredients")
          .update(updateData)
          .eq("id", editingItem.ingredient_id);
        if (error) throw error;
      }

      toast({ title: "Ingrediente atualizado!" });
      setEditDialogOpen(false);
      setEditingItem(null);
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const openEditDialog = (item: ShoppingListItem) => {
    setEditingItem(item);
    setEditForm({
      store: item.ingredients.store || "",
      price_paid: item.ingredients.price_paid.toString().replace(".", ","),
    });
    setEditDialogOpen(true);
  };

  const handleToggleCheck = async (item: ShoppingListItem) => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ checked: !item.checked } as any)
        .eq("id", item.id);

      if (error) throw error;

      // Optimistic update for instant feedback
      setItems(prev =>
        prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i)
      );
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Item removido!" });
      fetchData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const handleClearChecked = async () => {
    if (!confirm("Deseja remover todos os itens marcados?")) return;

    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("checked", true)
        .eq("user_id", user!.id);

      if (error) throw error;
      toast({ title: "Itens removidos!" });
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
    setForm({ ingredient_id: "", quantity_needed: "", store: "", price_paid: "", notes: "" });
    setCreatingIngredient(false);
    setNewIngForm({ name: "", brand: "", price_paid: "", package_size: "", unit_type: "weight" });
    setDialogOpen(false);
  };

  const handleCreateIngredient = async () => {
    if (!newIngForm.name || !newIngForm.price_paid || !newIngForm.package_size) {
      toast({ variant: "destructive", title: "Preencha nome, preço e tamanho da embalagem." });
      return;
    }
    const pricePaid = parseFloat(newIngForm.price_paid.replace(",", "."));
    const packageSize = parseFloat(newIngForm.package_size.replace(",", "."));
    const costPerUnit = pricePaid / (packageSize || 1);

    const { data, error } = await supabase.from("ingredients").insert({
      user_id: user!.id,
      name: newIngForm.name.trim(),
      brand: newIngForm.brand.trim() || null,
      price_paid: pricePaid,
      package_size: packageSize,
      unit_type: newIngForm.unit_type,
      cost_per_unit: costPerUnit,
    }).select("id").single();

    if (error) {
      toast({ variant: "destructive", title: "Erro ao criar ingrediente", description: mapErrorToUserMessage(error) });
      return;
    }

    toast({ title: "Ingrediente criado!" });
    const newIng = { id: data.id, name: newIngForm.name.trim(), brand: newIngForm.brand.trim() || null, price_paid: pricePaid, package_size: packageSize, unit_type: newIngForm.unit_type, cost_per_unit: costPerUnit, store: null };
    setIngredients(prev => [...prev, newIng as any].sort((a, b) => a.name.localeCompare(b.name)));
    setForm({ ...form, ingredient_id: data.id, price_paid: newIngForm.price_paid, store: "" });
    setCreatingIngredient(false);
    setNewIngForm({ name: "", brand: "", price_paid: "", package_size: "", unit_type: "weight" });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateEstimatedCost = (item: ShoppingListItem) => {
    return item.ingredients.price_paid * item.quantity_needed;
  };

  const checkedItems = items.filter((item) => item.checked);
  const uncheckedItems = items.filter((item) => !item.checked);

  const totalChecked = checkedItems.reduce((sum, item) => sum + calculateEstimatedCost(item), 0);
  const totalUnchecked = uncheckedItems.reduce((sum, item) => sum + calculateEstimatedCost(item), 0);
  const totalEstimated = totalChecked + totalUnchecked;

  const selectedIngredient = ingredients.find((i) => i.id === form.ingredient_id);

  // When selecting an ingredient, pre-fill store and price
  const handleIngredientChange = (value: string) => {
    const ing = ingredients.find(i => i.id === value);
    setForm({
      ...form,
      ingredient_id: value,
      store: ing?.store || "",
      price_paid: ing?.price_paid ? ing.price_paid.toString().replace(".", ",") : "",
    });
  };

  // Group items by store
  const groupItemsByStore = (itemsList: ShoppingListItem[]) => {
    const groups: Record<string, ShoppingListItem[]> = {};
    itemsList.forEach(item => {
      const store = item.ingredients.store || "Sem Loja";
      if (!groups[store]) groups[store] = [];
      groups[store].push(item);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      if (a === "Sem Loja") return 1;
      if (b === "Sem Loja") return -1;
      return a.localeCompare(b);
    });
  };

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ variant: "destructive", title: "Erro", description: "Permita pop-ups para gerar o PDF" });
      return;
    }

    const listHTML = `
      <!DOCTYPE html>
      <html>
      <head>
         <title>Lista de Compras - Fatia do Lucro</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #10B981; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; }
          .total { font-size: 18px; font-weight: bold; margin-top: 20px; text-align: right; }
          .checked { text-decoration: line-through; opacity: 0.5; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Lista de Compras</h1>
        <table>
          <thead>
            <tr>
              <th>Ingrediente</th>
              <th>Qtd</th>
              <th>Custo Est.</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(item => `
              <tr class="${item.checked ? 'checked' : ''}">
                <td>${item.ingredients.name}${item.ingredients.brand ? ` (${item.ingredients.brand})` : ''}</td>
                <td>${item.quantity_needed}x ${item.ingredients.unit_type === 'weight' ? `(${item.ingredients.package_size}g)` : 'un'}</td>
                <td>${formatCurrency(calculateEstimatedCost(item))}</td>
                <td>${item.checked ? '✓' : 'Pendente'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p class="total">Total Estimado: ${formatCurrency(totalEstimated)}</p>
        <script>window.print();</script>
      </body>
      </html>
    `;

    printWindow.document.write(listHTML);
    printWindow.document.close();
  };

  const exportToExcel = () => {
    const csvContent = [
      ["Ingrediente", "Marca", "Quantidade", "Unidade", "Custo Estimado", "Status"].join(";"),
      ...items.map(item => [
        item.ingredients.name,
        item.ingredients.brand || "",
        item.quantity_needed,
        item.ingredients.unit_type === "weight" ? `pacote ${item.ingredients.package_size}g` : "un",
        calculateEstimatedCost(item).toFixed(2).replace(".", ","),
        item.checked ? "Comprado" : "Pendente"
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lista-compras.csv";
    link.click();

    toast({ title: "Lista exportada para Excel!" });
  };

  const renderItem = (item: ShoppingListItem, isChecked: boolean) => (
    <div
      key={item.id}
      className={`flex items-center gap-3 p-3 rounded-lg ${isChecked ? 'bg-muted/30 opacity-60' : 'bg-muted/50'}`}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => handleToggleCheck(item)}
      />
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${isChecked ? 'line-through' : ''}`}>
          {item.ingredients.name}
          {item.ingredients.brand && (
            <span className="text-muted-foreground ml-1">({item.ingredients.brand})</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {item.quantity_needed}x
          {item.ingredients.unit_type === "weight"
            ? ` (${item.ingredients.package_size}g cada)`
            : " un"}
          {item.ingredients.store && (
            <span className="ml-1">· {item.ingredients.store}</span>
          )}
        </p>
        {item.notes && (
          <p className="text-xs text-muted-foreground/70 italic mt-0.5">📝 {item.notes}</p>
        )}
      </div>
      {!isChecked && (
        <div className="text-right shrink-0">
          <p className="font-medium text-primary">
            {formatCurrency(calculateEstimatedCost(item))}
          </p>
          <p className="text-xs text-muted-foreground">estimado</p>
        </div>
      )}
      <div className="flex gap-1 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} className="h-8 w-8">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8">
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );

  const renderItemsList = () => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Lista de compras vazia</p>
          <p className="text-sm">Clique em "Adicionar Item" para começar</p>
        </div>
      );
    }

    if (groupByStore) {
      const grouped = groupItemsByStore(items);
      return (
        <div className="space-y-4">
          {grouped.map(([storeName, storeItems]) => {
            const storeUnchecked = storeItems.filter(i => !i.checked);
            const storeChecked = storeItems.filter(i => i.checked);
            return (
              <div key={storeName} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <Store className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">{storeName}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({storeUnchecked.length} pendentes)
                  </span>
                </div>
                {storeUnchecked.map(item => renderItem(item, false))}
                {storeChecked.map(item => renderItem(item, true))}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {uncheckedItems.map(item => renderItem(item, false))}
        {checkedItems.length > 0 && (
          <>
            <div className="border-t my-4" />
            <p className="text-sm text-muted-foreground mb-2">Comprados</p>
            {checkedItems.map(item => renderItem(item, true))}
          </>
        )}
      </div>
    );
  };

  return (
    <AppLayout title="Lista de Compras">
      <div className="space-y-6 pb-36">
        {/* Totals Bar */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-muted/40">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Total Estimado</p>
              <p className="text-lg font-bold">{formatCurrency(totalEstimated)}</p>
            </CardContent>
          </Card>
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Já Comprado</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(totalChecked)}</p>
            </CardContent>
          </Card>
          <Card className="bg-destructive/10 border-destructive/20">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">Falta Pagar</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(totalUnchecked)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Header */}
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="flex items-center gap-2 mr-2">
              <Switch checked={groupByStore} onCheckedChange={setGroupByStore} />
              <Label className="text-sm cursor-pointer" onClick={() => setGroupByStore(!groupByStore)}>
                Agrupar por Loja
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            {checkedItems.length > 0 && (
              <Button variant="outline" size="sm" onClick={handleClearChecked}>
                <Check className="h-4 w-4 mr-2" />
                Limpar ({checkedItems.length})
              </Button>
            )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => {
                  if (!canCreate("shopping_lists")) {
                    setShowUpgrade(true);
                    return;
                  }
                }}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar à Lista</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Ingrediente *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setCreatingIngredient(!creatingIngredient)}
                    >
                      <PackagePlus className="h-3.5 w-3.5 mr-1" />
                      {creatingIngredient ? "Selecionar existente" : "Criar novo"}
                    </Button>
                  </div>

                  {creatingIngredient ? (
                    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                      <Input
                        value={newIngForm.name}
                        onChange={(e) => setNewIngForm({ ...newIngForm, name: e.target.value })}
                        placeholder="Nome do ingrediente *"
                      />
                      <Input
                        value={newIngForm.brand}
                        onChange={(e) => setNewIngForm({ ...newIngForm, brand: e.target.value })}
                        placeholder="Marca (opcional)"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={newIngForm.unit_type} onValueChange={(v: any) => setNewIngForm({ ...newIngForm, unit_type: v })}>
                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weight">Peso (g)</SelectItem>
                              <SelectItem value="unit">Unidade</SelectItem>
                              <SelectItem value="volume">Volume (ml)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Embalagem *</Label>
                          <Input
                            value={newIngForm.package_size}
                            onChange={(e) => setNewIngForm({ ...newIngForm, package_size: e.target.value })}
                            placeholder="1000"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Preço *</Label>
                          <Input
                            value={newIngForm.price_paid}
                            onChange={(e) => setNewIngForm({ ...newIngForm, price_paid: e.target.value })}
                            placeholder="12,90"
                            className="h-9"
                          />
                        </div>
                      </div>
                      <Button type="button" size="sm" onClick={handleCreateIngredient} className="w-full">
                        Criar Ingrediente
                      </Button>
                    </div>
                  ) : (
                    <Select
                      value={form.ingredient_id}
                      onValueChange={handleIngredientChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ingrediente" />
                      </SelectTrigger>
                      <SelectContent>
                        {ingredients.map((ingredient) => (
                          <SelectItem key={ingredient.id} value={ingredient.id}>
                            {ingredient.name}
                            {ingredient.brand && ` (${ingredient.brand})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantidade *{" "}
                    {selectedIngredient && (
                      <span className="text-muted-foreground">
                        ({selectedIngredient.unit_type === "weight"
                          ? `pacotes de ${selectedIngredient.package_size}g`
                          : "unidades"})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    value={form.quantity_needed}
                    onChange={(e) => setForm({ ...form, quantity_needed: e.target.value })}
                    placeholder="Ex: 2"
                    className="input-currency"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="store">Loja</Label>
                    <Input
                      id="store"
                      value={form.store}
                      onChange={(e) => setForm({ ...form, store: e.target.value })}
                      placeholder="Ex: Atacadão"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço (R$)</Label>
                    <Input
                      id="price"
                      value={form.price_paid}
                      onChange={(e) => setForm({ ...form, price_paid: e.target.value })}
                      placeholder="Ex: 12,90"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Observação</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Ex: cor vermelha, sem glúten..."
                    className="min-h-[60px] resize-none"
                  />
                </div>

                {selectedIngredient && form.quantity_needed && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Custo Estimado:</p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(
                        (form.price_paid
                          ? parseFloat(form.price_paid.replace(",", "."))
                          : selectedIngredient.price_paid) *
                          parseFloat(form.quantity_needed.replace(",", ".") || "0")
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground">
                    Adicionar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Shopping List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" />
                Itens da Lista
                <span className="text-muted-foreground font-normal text-sm">
                  ({uncheckedItems.length} pendentes)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>{renderItemsList()}</CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar {editingItem?.ingredients.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Loja</Label>
              <Input
                value={editForm.store}
                onChange={(e) => setEditForm({ ...editForm, store: e.target.value })}
                placeholder="Ex: Atacadão"
              />
            </div>
            <div className="space-y-2">
              <Label>Preço (R$)</Label>
              <Input
                value={editForm.price_paid}
                onChange={(e) => setEditForm({ ...editForm, price_paid: e.target.value })}
                placeholder="Ex: 12,90"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button onClick={handleEditSave} className="flex-1 bg-primary hover:bg-primary-hover text-primary-foreground">
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        type="module_locked"
        moduleName={`Lista de Compras (${getCount("shopping_lists")}/${getLimit("shopping_lists")})`}
      />
    </AppLayout>
  );
};

export default Compras;
