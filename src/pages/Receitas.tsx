import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import { Plus, Pencil, Trash2, CakeSlice, FileText, Lock, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { escapeHtml } from "@/lib/htmlEscape";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { motion } from "framer-motion";
import { PullToRefresh } from "@/components/PullToRefresh";
import { undoableDelete } from "@/lib/undoDelete";
import { useFreemiumLimits } from "@/hooks/useFreemiumLimits";
import { UpgradeModal } from "@/components/UpgradeModal";

interface RecipeWithCost {
  id: string;
  name: string;
  yield_amount: number;
  yield_unit: string;
  labor_cost: number;
  target_sale_price: number | null;
  ingredientsCost: number;
}

const yieldUnitLabel = (unit: string) => {
  if (unit === "weight") return "g";
  if (unit === "volume") return "ml";
  return "un";
};

const Receitas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [recipes, setRecipes] = useState<RecipeWithCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { canCreate, getLimit, getCount, refreshCounts, planType } = useFreemiumLimits();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [selectingForPdf, setSelectingForPdf] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleNewRecipe = () => {
    if (!canCreate("recipes")) {
      setShowUpgrade(true);
      return;
    }
    navigate("/calculadora");
  };

  useEffect(() => {
    if (user) fetchRecipes();
  }, [user]);

  const fetchRecipes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("recipes")
      .select("id, name, yield_amount, yield_unit, labor_cost, target_sale_price")
      .order("updated_at", { ascending: false });

    if (error) {
      toast({ variant: "destructive", title: "Erro ao carregar receitas", description: mapErrorToUserMessage(error) });
      setLoading(false);
      return;
    }

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

        // Calculate sub-recipe costs (graceful if table doesn't exist)
        let subRecipeCost = 0;
        try {
          const { data: subData } = await supabase
            .from("recipe_recipe_items" as any)
            .select("sub_recipe_id, quantity")
            .eq("recipe_id", recipe.id);

          if (subData && (subData as any[]).length > 0) {
            for (const sub of subData as any[]) {
              const { data: subItems } = await supabase
                .from("recipe_items")
                .select("quantity, ingredients(cost_per_unit)")
                .eq("recipe_id", sub.sub_recipe_id);
              
              const { data: subRecipe } = await supabase
                .from("recipes")
                .select("labor_cost, yield_amount")
                .eq("id", sub.sub_recipe_id)
                .single();

              const subIngCost = subItems?.reduce((t, i) => {
                return t + ((i.ingredients as any)?.cost_per_unit || 0) * i.quantity;
              }, 0) || 0;

              const subTotalCost = subIngCost + (subRecipe?.labor_cost || 0);
              const subUnitCost = subTotalCost / (subRecipe?.yield_amount || 1);
              subRecipeCost += subUnitCost * sub.quantity;
            }
          }
        } catch {
          // Table may not exist on external DB
        }

        return { ...recipe, ingredientsCost: ingredientsCost + subRecipeCost };
      })
    );

    setRecipes(recipesWithCost);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from("recipe_items").delete().eq("recipe_id", deleteId);
    const { error } = await supabase.from("recipes").delete().eq("id", deleteId);
    if (error) {
      toast({ variant: "destructive", title: "Erro ao excluir", description: mapErrorToUserMessage(error) });
    } else {
      toast({ title: "Receita excluída!" });
      setRecipes((prev) => prev.filter((r) => r.id !== deleteId));
    }
    setDeleteId(null);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const formatUnitCost = (value: number, _unit?: string) => formatCurrency(value);

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

  const isPro = planType === "pro" || planType === "vip";

  const startPdfSelection = () => {
    if (!isPro) {
      setShowUpgrade(true);
      return;
    }
    setSelectedIds(new Set(recipes.map(r => r.id)));
    setSelectingForPdf(true);
  };

  const toggleRecipeSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const cancelSelection = () => {
    setSelectingForPdf(false);
    setSelectedIds(new Set());
  };

  const generateRecipesPDF = async () => {
    if (selectedIds.size === 0) {
      toast({ variant: "destructive", title: "Selecione ao menos uma receita" });
      return;
    }
    setSelectingForPdf(false);

    toast({ title: "Gerando PDF..." });

    const selectedRecipes = recipes.filter(r => selectedIds.has(r.id));

    const detailedRecipes = await Promise.all(
      selectedRecipes.map(async (recipe) => {
        const { data: items } = await supabase
          .from("recipe_items")
          .select("quantity, ingredients(name, unit_type, cost_per_unit)")
          .eq("recipe_id", recipe.id);

        return {
          ...recipe,
          items: (items || []).map((item) => ({
            name: (item.ingredients as any)?.name || "—",
            unit_type: (item.ingredients as any)?.unit_type || "weight",
            quantity: item.quantity,
            cost_per_unit: (item.ingredients as any)?.cost_per_unit || 0,
            total: item.quantity * ((item.ingredients as any)?.cost_per_unit || 0),
          })),
        };
      })
    );

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast({ variant: "destructive", title: "Erro", description: "Permita pop-ups para gerar o PDF" });
      return;
    }

    const unitLabel = (type: string) => {
      if (type === "weight") return "g";
      if (type === "volume") return "ml";
      return "un";
    };

    const recipesHTML = detailedRecipes.map((r) => {
      const totalCost = getTotalCost(r);
      const unitCost = getUnitCost(r);
      const profit = getProfit(r);
      const margin = getMargin(r);

      return `
        <div class="recipe-card">
          <h2>${escapeHtml(r.name)}</h2>
          <div class="meta">
            Rendimento: <strong>${r.yield_amount} ${yieldUnitLabel((r as any).yield_unit || 'unit')}</strong> · 
            Mão de obra: <strong>${formatCurrency(r.labor_cost)}</strong>
            ${r.target_sale_price ? ` · Preço de venda: <strong>${formatCurrency(r.target_sale_price)}</strong>` : ""}
          </div>
          <table>
            <thead><tr><th>Ingrediente</th><th class="num">Qtd</th><th class="num">Custo Unit.</th><th class="num">Subtotal</th></tr></thead>
            <tbody>
              ${r.items.map(i => `<tr>
                <td>${escapeHtml(i.name)}</td>
                <td class="num">${i.quantity} ${unitLabel(i.unit_type)}</td>
                <td class="num">${formatCurrency(i.cost_per_unit)}</td>
                <td class="num">${formatCurrency(i.total)}</td>
              </tr>`).join("")}
            </tbody>
            <tfoot>
              <tr><td colspan="3">Custo dos ingredientes</td><td class="num">${formatCurrency(r.ingredientsCost)}</td></tr>
              <tr><td colspan="3">Mão de obra</td><td class="num">${formatCurrency(r.labor_cost)}</td></tr>
              <tr class="total"><td colspan="3">Custo Total</td><td class="num">${formatCurrency(totalCost)}</td></tr>
              <tr class="total"><td colspan="3">Custo Unitário (÷${r.yield_amount})</td><td class="num">${r.yield_unit === 'unit' ? formatCurrency(unitCost) : formatUnitCost(unitCost, r.yield_unit || 'unit')}/${yieldUnitLabel((r as any).yield_unit || 'unit')}</td></tr>
              ${profit !== null ? `<tr class="${profit >= 0 ? "positive" : "negative"}"><td colspan="3">Lucro Unitário</td><td class="num">${formatCurrency(profit)}</td></tr>` : ""}
              ${margin !== null ? `<tr class="${margin >= 0 ? "positive" : "negative"}"><td colspan="3">Margem</td><td class="num">${margin.toFixed(1)}%</td></tr>` : ""}
            </tfoot>
          </table>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Receitas Detalhadas</title>
<style>
  body{font-family:Arial,sans-serif;padding:20px;color:#333;max-width:800px;margin:0 auto}
  h1{text-align:center;color:#10B981;margin-bottom:4px}
  .subtitle{text-align:center;color:#888;font-size:13px;margin-bottom:30px}
  .recipe-card{border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px;page-break-inside:avoid}
  .recipe-card h2{margin:0 0 8px;font-size:18px;color:#111}
  .meta{font-size:13px;color:#666;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#f0fdf4;padding:8px;text-align:left;border-bottom:2px solid #10B981;font-weight:600}
  td{padding:6px 8px;border-bottom:1px solid #f0f0f0}
  .num{text-align:right}
  tfoot td{font-weight:600;border-top:1px solid #ddd}
  tr.total td{font-size:14px;background:#f9fafb}
  tr.positive td{color:#16a34a}
  tr.negative td{color:#dc2626}
  .footer{text-align:center;margin-top:30px;font-size:11px;color:#aaa}
  @media print{body{padding:0}.recipe-card{box-shadow:none;border:1px solid #ddd}}
</style></head><body>
  <h1>Receitas Detalhadas</h1>
  <p class="subtitle">Gerado em ${new Date().toLocaleDateString("pt-BR")} — ${detailedRecipes.length} receita${detailedRecipes.length !== 1 ? "s" : ""}</p>
  ${recipesHTML}
  <div class="footer">Fatia do Lucro — Plano PRO</div>
  <script>window.print();</script>
</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <AppLayout title="Receitas">
      <PullToRefresh onRefresh={fetchRecipes}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          {selectingForPdf ? (
            <>
              <p className="text-sm text-primary font-medium">
                {selectedIds.size} de {recipes.length} selecionada{selectedIds.size !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={cancelSelection}
                  variant="ghost"
                  size="sm"
                  className="h-10 rounded-xl"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  onClick={generateRecipesPDF}
                  size="sm"
                  className="h-10 rounded-xl"
                  disabled={selectedIds.size === 0}
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Gerar PDF ({selectedIds.size})
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {recipes.length} receita{recipes.length !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={startPdfSelection}
                  variant="outline"
                  className="hidden md:flex h-10 rounded-xl"
                  disabled={recipes.length === 0}
                >
                  {isPro ? (
                    <FileText className="h-4 w-4 mr-2" />
                  ) : (
                    <Lock className="h-4 w-4 mr-2" />
                  )}
                  Gerar PDF
                </Button>
                <Button onClick={handleNewRecipe} className="hidden md:flex h-10 rounded-xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Recipe List — card-based for mobile */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <CakeSlice className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">Nenhuma receita</h3>
            <p className="text-muted-foreground text-sm mb-6">Crie sua primeira receita agora!</p>
            <Button onClick={handleNewRecipe} className="h-12 rounded-xl px-6">
              <Plus className="h-4 w-4 mr-2" />
              Nova Receita
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-2.5">
            {recipes.map((recipe, index) => {
              const margin = getMargin(recipe);
              return (
                <motion.div
                  key={recipe.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card
                    className={`rounded-2xl shadow-sm transition-transform ${
                      selectingForPdf
                        ? selectedIds.has(recipe.id) ? "ring-2 ring-primary" : "opacity-50"
                        : "active:scale-[0.98]"
                    }`}
                    onClick={selectingForPdf ? () => toggleRecipeSelection(recipe.id) : undefined}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {selectingForPdf && (
                          <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedIds.has(recipe.id)
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground"
                          }`}>
                            {selectedIds.has(recipe.id) && <Check className="h-3.5 w-3.5" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <h3 className="font-semibold text-[15px] text-foreground truncate">{recipe.name}</h3>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {recipe.yield_amount} {yieldUnitLabel(recipe.yield_unit)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-sm">
                            <span className="text-muted-foreground">
                              {formatUnitCost(getUnitCost(recipe), recipe.yield_unit)}
                            </span>
                            {recipe.target_sale_price && (
                              <span className="text-muted-foreground">
                                → {formatCurrency(recipe.target_sale_price)}
                              </span>
                            )}
                            {margin !== null && (
                              <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${
                                margin >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                              }`}>
                                {margin.toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                        {!selectingForPdf && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/calculadora?edit=${recipe.id}`)}
                              className="h-10 w-10 rounded-xl"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(recipe.id)}
                              className="h-10 w-10 rounded-xl text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* FAB */}
      <Button
        onClick={handleNewRecipe}
        className="fab bg-primary hover:bg-primary/90 text-primary-foreground md:hidden"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        type="recipe_limit"
        moduleName={`Receitas (${getCount("recipes")}/${getLimit("recipes")})`}
      />

      <ConfirmationDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Excluir receita?"
        description="Essa ação não pode ser desfeita."
        confirmText="Excluir"
        onConfirm={handleDelete}
        variant="destructive"
      />
    </AppLayout>
  );
};

export default Receitas;
