import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, CakeSlice } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { motion } from "framer-motion";

interface RecipeWithCost {
  id: string;
  name: string;
  yield_amount: number;
  labor_cost: number;
  target_sale_price: number | null;
  ingredientsCost: number;
}

const Receitas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<RecipeWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchRecipes();
  }, [user]);

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("recipes")
      .select("id, name, yield_amount, labor_cost, target_sale_price")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar receitas", description: error.message });
      setLoading(false);
      return;
    }

    // Fetch ingredient costs for each recipe
    const recipesWithCost = await Promise.all(
      (data || []).map(async (recipe) => {
        const { data: items } = await supabase
          .from("recipe_items")
          .select("quantity, ingredients(cost_per_unit)")
          .eq("recipe_id", recipe.id);

        const ingredientsCost = items?.reduce((total, item) => {
          const costPerUnit = (item.ingredients as any)?.cost_per_unit || 0;
          return total + costPerUnit * item.quantity;
        }, 0) || 0;

        return { ...recipe, ingredientsCost };
      })
    );

    setRecipes(recipesWithCost);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    // Delete recipe items first, then recipe
    await supabase.from("recipe_items").delete().eq("recipe_id", deleteId);
    const { error } = await supabase.from("recipes").delete().eq("id", deleteId);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: error.message });
    } else {
      toast({ title: "Receita excluída!" });
      setRecipes((prev) => prev.filter((r) => r.id !== deleteId));
    }
    setDeleteId(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const getTotalCost = (r: RecipeWithCost) => r.ingredientsCost + r.labor_cost;
  const getUnitCost = (r: RecipeWithCost) => getTotalCost(r) / (r.yield_amount || 1);
  const getProfit = (r: RecipeWithCost) => {
    if (!r.target_sale_price) return null;
    return r.target_sale_price - getUnitCost(r);
  };
  const getMargin = (r: RecipeWithCost) => {
    const profit = getProfit(r);
    if (profit === null || !r.target_sale_price || r.target_sale_price <= 0) return null;
    return (profit / r.target_sale_price) * 100;
  };

  return (
    <AppLayout title="Receitas">
      <div className="space-y-4">
        {/* Header with New Recipe button (desktop) */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {recipes.length} receita{recipes.length !== 1 ? "s" : ""} salva{recipes.length !== 1 ? "s" : ""}
          </p>
          <Button onClick={() => navigate("/calculadora")} className="hidden md:flex">
            <Plus className="h-4 w-4 mr-2" />
            Nova Receita
          </Button>
        </div>

        {/* Recipe List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-20" />
              </Card>
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CakeSlice className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Nenhuma receita salva</h3>
            <p className="text-muted-foreground text-sm mb-6">Comece agora criando sua primeira receita!</p>
            <Button onClick={() => navigate("/calculadora")}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe, index) => {
              const profit = getProfit(recipe);
              const margin = getMargin(recipe);
              return (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          {/* Top line */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">{recipe.name}</h3>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              Rende {recipe.yield_amount} un
                            </span>
                          </div>
                          {/* Middle line */}
                          <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                            <span className="text-muted-foreground">
                              Custo: {formatCurrency(getUnitCost(recipe))}
                            </span>
                            {recipe.target_sale_price && (
                              <span className="text-muted-foreground">
                                Venda: {formatCurrency(recipe.target_sale_price)}
                              </span>
                            )}
                            {margin !== null && (
                              <span className={`font-bold ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                                Lucro: {margin.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/calculadora?edit=${recipe.id}`)}
                            className="h-8 w-8"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(recipe.id)}
                            className="h-8 w-8 text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB for mobile */}
      <Button
        onClick={() => navigate("/calculadora")}
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg md:hidden z-40"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir receita?"
        description="Essa ação não pode ser desfeita. A receita e todos os seus ingredientes serão removidos."
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </AppLayout>
  );
};

export default Receitas;
