import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Plus, Trash2, ShoppingCart, Check } from "lucide-react";
import { FileText, FileSpreadsheet } from "lucide-react";
import { motion } from "framer-motion";

interface ShoppingListItem {
  id: string;
  ingredient_id: string;
  quantity_needed: number;
  is_checked: boolean;
  ingredients: {
    name: string;
    brand: string | null;
    price_paid: number;
    package_size: number;
    unit_type: "weight" | "unit";
    cost_per_unit: number;
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
}

const Compras = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({
    ingredient_id: "",
    quantity_needed: "",
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [itemsRes, ingredientsRes] = await Promise.all([
        supabase
          .from("shopping_list_items")
          .select("*, ingredients(name, brand, price_paid, package_size, unit_type, cost_per_unit)")
          .order("is_checked", { ascending: true }),
        supabase.from("ingredients").select("*").order("name"),
      ]);

      setItems(itemsRes.data || []);
      setIngredients(ingredientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
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
      const { error } = await supabase.from("shopping_list_items").insert({
        user_id: user!.id,
        ingredient_id: form.ingredient_id,
        quantity_needed: parseFloat(form.quantity_needed.replace(",", ".")),
      });

      if (error) throw error;

      toast({ title: "Item adicionado à lista!" });
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

  const handleToggleCheck = async (item: ShoppingListItem) => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ is_checked: !item.is_checked })
        .eq("id", item.id);

      if (error) throw error;
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
        description: error.message,
      });
    }
  };

  const handleClearChecked = async () => {
    if (!confirm("Deseja remover todos os itens marcados?")) return;

    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .delete()
        .eq("is_checked", true)
        .eq("user_id", user!.id);

      if (error) throw error;
      toast({ title: "Itens removidos!" });
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
      ingredient_id: "",
      quantity_needed: "",
    });
    setDialogOpen(false);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calculateEstimatedCost = (item: ShoppingListItem) => {
    // Calculate based on cost per unit * quantity needed
    return item.ingredients.cost_per_unit * item.quantity_needed;
  };

  const totalEstimated = items
    .filter((item) => !item.is_checked)
    .reduce((sum, item) => sum + calculateEstimatedCost(item), 0);

  const checkedItems = items.filter((item) => item.is_checked);
  const uncheckedItems = items.filter((item) => !item.is_checked);

  const selectedIngredient = ingredients.find((i) => i.id === form.ingredient_id);

  const exportToPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Permita pop-ups para gerar o PDF",
      });
      return;
    }

    const listHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista de Compras - Doce e Lucro</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #ea90c9; margin-bottom: 20px; }
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
              <tr class="${item.is_checked ? 'checked' : ''}">
                <td>${item.ingredients.name}${item.ingredients.brand ? ` (${item.ingredients.brand})` : ''}</td>
                <td>${item.quantity_needed} ${item.ingredients.unit_type === 'weight' ? 'g' : 'un'}</td>
                <td>${formatCurrency(calculateEstimatedCost(item))}</td>
                <td>${item.is_checked ? '✓' : 'Pendente'}</td>
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
        item.ingredients.unit_type === "weight" ? "g" : "un",
        calculateEstimatedCost(item).toFixed(2).replace(".", ","),
        item.is_checked ? "Comprado" : "Pendente"
      ].join(";"))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "lista-compras.csv";
    link.click();

    toast({ title: "Lista exportada para Excel!" });
  };

  return (
    <AppLayout title="Lista de Compras">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={exportToPDF}>
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
            {checkedItems.length > 0 && (
              <Button variant="outline" onClick={handleClearChecked}>
                <Check className="h-4 w-4 mr-2" />
                Limpar Marcados ({checkedItems.length})
              </Button>
            )}
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary-hover text-primary-foreground">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adicionar à Lista</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Ingrediente *</Label>
                  <Select
                    value={form.ingredient_id}
                    onValueChange={(value) =>
                      setForm({ ...form, ingredient_id: value })
                    }
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Quantidade *{" "}
                    {selectedIngredient && (
                      <span className="text-muted-foreground">
                        ({selectedIngredient.unit_type === "weight" ? "gramas" : "unidades"})
                      </span>
                    )}
                  </Label>
                  <Input
                    id="quantity"
                    value={form.quantity_needed}
                    onChange={(e) =>
                      setForm({ ...form, quantity_needed: e.target.value })
                    }
                    placeholder={
                      selectedIngredient?.unit_type === "weight"
                        ? "Ex: 500"
                        : "Ex: 12"
                    }
                    className="input-currency"
                  />
                </div>

                {selectedIngredient && form.quantity_needed && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Custo Estimado:
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(
                        selectedIngredient.cost_per_unit *
                          parseFloat(form.quantity_needed.replace(",", ".") || "0")
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Baseado no último preço: {formatCurrency(selectedIngredient.price_paid)} por{" "}
                      {selectedIngredient.package_size}
                      {selectedIngredient.unit_type === "weight" ? "g" : " un"}
                    </p>
                  </div>
                )}

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
                    Adicionar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Shopping List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
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
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Lista de compras vazia</p>
                  <p className="text-sm">
                    Clique em "Adicionar Item" para começar
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Unchecked items */}
                  {uncheckedItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
                    >
                      <Checkbox
                        checked={item.is_checked}
                        onCheckedChange={() => handleToggleCheck(item)}
                      />
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.ingredients.name}
                          {item.ingredients.brand && (
                            <span className="text-muted-foreground ml-1">
                              ({item.ingredients.brand})
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity_needed}
                          {item.ingredients.unit_type === "weight" ? "g" : " un"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary">
                          {formatCurrency(calculateEstimatedCost(item))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          estimado
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}

                  {/* Checked items */}
                  {checkedItems.length > 0 && (
                    <>
                      <div className="border-t my-4" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Comprados
                      </p>
                      {checkedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg opacity-60"
                        >
                          <Checkbox
                            checked={item.is_checked}
                            onCheckedChange={() => handleToggleCheck(item)}
                          />
                          <div className="flex-1">
                            <p className="font-medium line-through">
                              {item.ingredients.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.quantity_needed}
                              {item.ingredients.unit_type === "weight" ? "g" : " un"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </CardContent>
            {uncheckedItems.length > 0 && (
              <CardFooter className="border-t bg-muted/30">
                <div className="w-full flex justify-between items-center py-2">
                  <span className="font-medium">Total Estimado:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalEstimated)}
                  </span>
                </div>
              </CardFooter>
            )}
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
};

export default Compras;
