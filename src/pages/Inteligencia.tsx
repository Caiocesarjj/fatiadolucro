import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  PercentIcon,
  Target,
  AlertTriangle,
  TrendingDown,
  BadgeDollarSign,
  Calculator,
  Info,
  ShoppingCart,
} from "lucide-react";
import { motion } from "framer-motion";

interface RecipeWithCost {
  id: string;
  name: string;
  yield_amount: number;
  labor_cost: number;
  target_sale_price: number | null;
  ingredientsCost: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Inteligencia = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [recipes, setRecipes] = useState<RecipeWithCost[]>([]);
  const [loading, setLoading] = useState(true);

  // Discount Simulator state
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");

  // Break-even state
  const [breakEvenRecipeId, setBreakEvenRecipeId] = useState("");
  const [autoFixedCosts, setAutoFixedCosts] = useState(0);
  const [editableFixedCosts, setEditableFixedCosts] = useState("");
  const [desiredProfit, setDesiredProfit] = useState("");

  // "E se eu vender?" state
  const [whatIfRecipeId, setWhatIfRecipeId] = useState("");
  const [whatIfDailyQty, setWhatIfDailyQty] = useState("");

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch recipes with ingredient costs
      const { data: recipesData } = await supabase
        .from("recipes")
        .select("id, name, yield_amount, labor_cost, target_sale_price")
        .eq("user_id", user!.id)
        .order("name");

      const recipesWithCost = await Promise.all(
        (recipesData || []).map(async (recipe) => {
          const { data: items } = await supabase
            .from("recipe_items")
            .select("quantity, ingredients(cost_per_unit)")
            .eq("recipe_id", recipe.id);

          const ingredientsCost =
            items?.reduce((total, item) => {
              const costPerUnit = (item.ingredients as any)?.cost_per_unit || 0;
              return total + costPerUnit * item.quantity;
            }, 0) || 0;

          return { ...recipe, ingredientsCost };
        })
      );

      setRecipes(recipesWithCost);

      // Fetch profile fixed_costs
      const { data: profile } = await supabase
        .from("profiles")
        .select("fixed_costs, salary_goal")
        .eq("user_id", user!.id)
        .maybeSingle();

      // Fetch current month expenses from transactions
      const now = new Date();
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, "0")}-${String(lastDay.getDate()).padStart(2, "0")}`;

      const { data: expenses } = await supabase
        .from("transactions")
        .select("amount")
        .eq("type", "expense")
        .gte("transaction_date", firstDay)
        .lte("transaction_date", lastDayStr);

      const totalExpenses = expenses?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

      // Use profile fixed_costs + current month expenses as auto fixed costs
      const profileFixed = Number(profile?.fixed_costs || 0);
      const total = profileFixed + totalExpenses;
      setAutoFixedCosts(total);
      setEditableFixedCosts(total.toFixed(2).replace(".", ","));

      if (profile?.salary_goal) {
        setDesiredProfit(String(profile.salary_goal).replace(".", ","));
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // ========== DISCOUNT SIMULATOR ==========
  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const discountCalc = useMemo(() => {
    if (!selectedRecipe || !selectedRecipe.target_sale_price) return null;

    const unitCost =
      (selectedRecipe.ingredientsCost + selectedRecipe.labor_cost) /
      (selectedRecipe.yield_amount || 1);
    const salePrice = selectedRecipe.target_sale_price;
    const currentProfit = salePrice - unitCost;
    const currentMargin = salePrice > 0 ? (currentProfit / salePrice) * 100 : 0;

    const disc = parseFloat(discountPercent.replace(",", ".")) || 0;
    const newPrice = salePrice * (1 - disc / 100);
    const newProfit = newPrice - unitCost;
    const newMargin = newPrice > 0 ? (newProfit / newPrice) * 100 : 0;

    return {
      unitCost,
      salePrice,
      currentProfit,
      currentMargin,
      newPrice,
      newProfit,
      newMargin,
      discountValue: disc,
    };
  }, [selectedRecipe, discountPercent]);

  // ========== BREAK-EVEN ==========
  const breakEvenRecipe = recipes.find((r) => r.id === breakEvenRecipeId);

  const breakEvenCalc = useMemo(() => {
    if (!breakEvenRecipe || !breakEvenRecipe.target_sale_price) return null;

    const unitCost =
      (breakEvenRecipe.ingredientsCost + breakEvenRecipe.labor_cost) /
      (breakEvenRecipe.yield_amount || 1);
    const salePrice = breakEvenRecipe.target_sale_price;
    const contributionMargin = salePrice - unitCost;

    if (contributionMargin <= 0) return { error: true as const, contributionMargin, unitCost, salePrice };

    const fixedCosts = parseFloat(editableFixedCosts.replace(",", ".")) || 0;
    const profit = parseFloat(desiredProfit.replace(",", ".")) || 0;
    const totalNeeded = fixedCosts + profit;
    const unitsNeeded = Math.ceil(totalNeeded / contributionMargin);
    const revenueNeeded = unitsNeeded * salePrice;

    return {
      error: false as const,
      unitCost,
      salePrice,
      contributionMargin,
      fixedCosts,
      profit,
      totalNeeded,
      unitsNeeded,
      revenueNeeded,
    };
  }, [breakEvenRecipe, editableFixedCosts, desiredProfit]);

  if (loading) {
    return (
      <AppLayout title="Simuladores">
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-32" />
            </Card>
          ))}
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Simuladores">
      <Tabs defaultValue="discount" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="discount" className="flex items-center gap-1 text-xs sm:text-sm">
            <PercentIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Simulador de</span> Descontos
          </TabsTrigger>
          <TabsTrigger value="breakeven" className="flex items-center gap-1 text-xs sm:text-sm">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Ponto de</span> Equilíbrio
          </TabsTrigger>
          <TabsTrigger value="whatif" className="flex items-center gap-1 text-xs sm:text-sm">
            <ShoppingCart className="h-4 w-4" />
            E se eu vender?
          </TabsTrigger>
        </TabsList>

        {/* ========== DISCOUNT SIMULATOR ========== */}
        <TabsContent value="discount">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PercentIcon className="h-5 w-5 text-primary" />
                  Simulador de Descontos
                </CardTitle>
                <CardDescription>
                  Descubra até quanto de desconto pode dar sem ter prejuízo.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Product Selection */}
                <div className="space-y-2">
                  <Label>Produto (Receita)</Label>
                  <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={recipes.length === 0 ? "Nenhuma receita cadastrada" : "Selecione um produto..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes
                        .filter((r) => r.target_sale_price && r.target_sale_price > 0)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} — {formatCurrency(r.target_sale_price!)}
                          </SelectItem>
                        ))}
                      {recipes.filter((r) => r.target_sale_price && r.target_sale_price > 0).length === 0 && recipes.length > 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          Suas receitas não têm preço de venda definido.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedRecipe && discountCalc && (
                  <>
                    {/* Current Values */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Preço Atual</p>
                        <p className="text-xl font-bold text-foreground">
                          {formatCurrency(discountCalc.salePrice)}
                        </p>
                      </div>
                      <div className="p-4 bg-muted/50 rounded-lg text-center">
                        <p className="text-xs text-muted-foreground mb-1">Lucro Atual</p>
                        <p className="text-xl font-bold text-success">
                          {formatCurrency(discountCalc.currentProfit)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {discountCalc.currentMargin.toFixed(1)}% de margem
                        </p>
                      </div>
                    </div>

                    {/* Discount Input */}
                    <div className="space-y-2">
                      <Label htmlFor="discount">Desconto (%)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="discount"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                          placeholder="Ex: 10"
                          className="w-32"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>

                    {/* Results */}
                    {discountCalc.discountValue > 0 && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-primary/5 rounded-lg text-center border border-primary/20">
                            <p className="text-xs text-muted-foreground mb-1">Novo Preço</p>
                            <p className="text-xl font-bold text-primary">
                              {formatCurrency(discountCalc.newPrice)}
                            </p>
                          </div>
                          <div
                            className={`p-4 rounded-lg text-center border ${
                              discountCalc.newProfit < 0
                                ? "bg-destructive/10 border-destructive/30"
                                : discountCalc.newMargin < 5
                                ? "bg-warning/10 border-warning/30"
                                : "bg-success/10 border-success/30"
                            }`}
                          >
                            <p className="text-xs text-muted-foreground mb-1">Novo Lucro</p>
                            <p
                              className={`text-xl font-bold ${
                                discountCalc.newProfit < 0
                                  ? "text-destructive"
                                  : discountCalc.newMargin < 5
                                  ? "text-warning"
                                  : "text-success"
                              }`}
                            >
                              {formatCurrency(discountCalc.newProfit)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {discountCalc.newMargin.toFixed(1)}% de margem
                            </p>
                          </div>
                        </div>

                        {/* Alerts */}
                        {discountCalc.newProfit < 0 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-5 w-5" />
                            <AlertTitle className="text-lg font-bold">
                              🚨 Venda com Prejuízo!
                            </AlertTitle>
                            <AlertDescription>
                              Com {discountCalc.discountValue}% de desconto, você perde{" "}
                              {formatCurrency(Math.abs(discountCalc.newProfit))} por unidade vendida.
                              O custo unitário é {formatCurrency(discountCalc.unitCost)}.
                            </AlertDescription>
                          </Alert>
                        )}

                        {discountCalc.newProfit >= 0 && discountCalc.newMargin < 5 && (
                          <Alert className="border-warning/50 bg-warning/10">
                            <AlertTriangle className="h-5 w-5 text-warning" />
                            <AlertTitle className="text-warning font-bold">
                              ⚠️ Margem Muito Baixa
                            </AlertTitle>
                            <AlertDescription className="text-warning">
                              Com apenas {discountCalc.newMargin.toFixed(1)}% de margem, qualquer
                              variação nos custos pode gerar prejuízo. Considere um desconto menor.
                            </AlertDescription>
                          </Alert>
                        )}

                        {/* Cost reference */}
                        <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 mb-1">
                            <Info className="h-4 w-4" />
                            <span className="font-medium">Referência de custo</span>
                          </div>
                          <p>
                            Custo unitário: {formatCurrency(discountCalc.unitCost)} (ingredientes +
                            mão de obra)
                          </p>
                          <p>
                            Desconto máximo sem prejuízo:{" "}
                            <span className="font-semibold text-foreground">
                              {(
                                ((discountCalc.salePrice - discountCalc.unitCost) /
                                  discountCalc.salePrice) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {recipes.filter((r) => r.target_sale_price && r.target_sale_price > 0).length ===
                  0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <BadgeDollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum produto com preço de venda</p>
                    <p className="text-sm">
                      Cadastre receitas com preço de venda para usar o simulador.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ========== BREAK-EVEN ========== */}
        <TabsContent value="breakeven">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Ponto de Equilíbrio
                </CardTitle>
                <CardDescription>
                  Calcule quantas unidades precisa vender para pagar as contas e tirar seu salário.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Fixed Costs (auto-filled) */}
                <div className="space-y-2">
                  <Label htmlFor="fixedCostsBreakeven" className="flex items-center gap-2">
                    Custo Fixo Total (R$)
                    <span className="relative group">
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-popover text-popover-foreground text-xs rounded-lg shadow-lg border opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        Somamos seus Custos Fixos (Ajustes) + Despesas do mês atual (Financeiro).
                        Edite se quiser simular outro valor.
                      </span>
                    </span>
                  </Label>
                  <Input
                    id="fixedCostsBreakeven"
                    value={editableFixedCosts}
                    onChange={(e) => setEditableFixedCosts(e.target.value)}
                    placeholder="0,00"
                    className="input-currency"
                  />
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      Valor automático: {formatCurrency(autoFixedCosts)}
                    </p>
                    {editableFixedCosts !==
                      autoFixedCosts.toFixed(2).replace(".", ",") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-6 px-2"
                        onClick={() =>
                          setEditableFixedCosts(
                            autoFixedCosts.toFixed(2).replace(".", ",")
                          )
                        }
                      >
                        Restaurar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Desired Profit */}
                <div className="space-y-2">
                  <Label htmlFor="desiredProfit">Lucro Desejado / Salário (R$)</Label>
                  <Input
                    id="desiredProfit"
                    value={desiredProfit}
                    onChange={(e) => setDesiredProfit(e.target.value)}
                    placeholder="Ex: 3000,00"
                    className="input-currency"
                  />
                  <p className="text-xs text-muted-foreground">
                    Quanto você quer tirar de lucro neste mês
                  </p>
                </div>

                {/* Product Selection */}
                <div className="space-y-2">
                  <Label>Produto Principal</Label>
                  <Select value={breakEvenRecipeId} onValueChange={setBreakEvenRecipeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={recipes.length === 0 ? "Nenhuma receita cadastrada" : "Selecione o produto..."} />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes
                        .filter((r) => r.target_sale_price && r.target_sale_price > 0)
                        .map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name} — {formatCurrency(r.target_sale_price!)}
                          </SelectItem>
                        ))}
                      {recipes.filter((r) => r.target_sale_price && r.target_sale_price > 0).length === 0 && recipes.length > 0 && (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                          Suas receitas não têm preço de venda definido.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Results */}
                {breakEvenRecipe && breakEvenCalc && (
                  <>
                    {breakEvenCalc.error ? (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-5 w-5" />
                        <AlertTitle>Margem negativa</AlertTitle>
                        <AlertDescription>
                          O custo unitário ({formatCurrency(breakEvenCalc.unitCost)}) é maior que o
                          preço de venda ({formatCurrency(breakEvenCalc.salePrice)}). Ajuste o preço
                          antes de calcular o ponto de equilíbrio.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {/* Main Result */}
                        <div className="p-6 bg-primary/5 rounded-xl border border-primary/20 text-center">
                          <p className="text-sm text-muted-foreground mb-2">
                            Você precisa vender
                          </p>
                          <p className="text-5xl font-bold text-primary">
                            {breakEvenCalc.unitsNeeded}
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            unidades de <span className="font-semibold text-foreground">{breakEvenRecipe.name}</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            para pagar todas as contas e tirar seu salário
                          </p>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Custos Fixos</p>
                            <p className="font-bold text-foreground">
                              {formatCurrency(breakEvenCalc.fixedCosts)}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Salário Desejado</p>
                            <p className="font-bold text-foreground">
                              {formatCurrency(breakEvenCalc.profit)}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Margem por Unidade</p>
                            <p className="font-bold text-success">
                              {formatCurrency(breakEvenCalc.contributionMargin)}
                            </p>
                          </div>
                          <div className="p-3 bg-muted/50 rounded-lg text-center">
                            <p className="text-xs text-muted-foreground">Faturamento Necessário</p>
                            <p className="font-bold text-primary">
                              {formatCurrency(breakEvenCalc.revenueNeeded)}
                            </p>
                          </div>
                        </div>

                        {/* Formula explanation */}
                        <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
                          <div className="flex items-center gap-2 mb-1">
                            <Calculator className="h-4 w-4" />
                            <span className="font-medium">Fórmula</span>
                          </div>
                          <p>
                            ({formatCurrency(breakEvenCalc.fixedCosts)} +{" "}
                            {formatCurrency(breakEvenCalc.profit)}) ÷{" "}
                            {formatCurrency(breakEvenCalc.contributionMargin)} ={" "}
                            <span className="font-semibold text-foreground">
                              {breakEvenCalc.unitsNeeded} unidades
                            </span>
                          </p>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {recipes.filter((r) => r.target_sale_price && r.target_sale_price > 0).length ===
                  0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Nenhum produto com preço de venda</p>
                    <p className="text-sm">
                      Cadastre receitas com preço de venda para calcular o ponto de equilíbrio.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* ========== E SE EU VENDER? ========== */}
        <TabsContent value="whatif">
          <WhatIfSimulator
            recipes={recipes}
            selectedRecipeId={whatIfRecipeId}
            setSelectedRecipeId={setWhatIfRecipeId}
            dailyQty={whatIfDailyQty}
            setDailyQty={setWhatIfDailyQty}
          />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

/* ========== "E se eu vender?" Sub-component ========== */
interface WhatIfProps {
  recipes: RecipeWithCost[];
  selectedRecipeId: string;
  setSelectedRecipeId: (id: string) => void;
  dailyQty: string;
  setDailyQty: (v: string) => void;
}

const WhatIfSimulator = ({ recipes, selectedRecipeId, setSelectedRecipeId, dailyQty, setDailyQty }: WhatIfProps) => {
  const recipe = recipes.find((r) => r.id === selectedRecipeId);
  const qty = parseInt(dailyQty) || 0;

  const calc = useMemo(() => {
    if (!recipe || !recipe.target_sale_price || qty <= 0) return null;
    const unitCost = (recipe.ingredientsCost + recipe.labor_cost) / (recipe.yield_amount || 1);
    const unitProfit = recipe.target_sale_price - unitCost;
    return {
      unitProfit,
      daily: { qty, profit: unitProfit * qty },
      weekly: { qty: qty * 7, profit: unitProfit * qty * 7 },
      monthly: { qty: qty * 30, profit: unitProfit * qty * 30 },
    };
  }, [recipe, qty]);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            E se eu vender...?
          </CardTitle>
          <CardDescription>
            Veja quanto pode lucrar vendendo uma quantidade fixa por dia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Produto (Receita)</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um produto..." />
                </SelectTrigger>
                <SelectContent>
                  {recipes
                    .filter((r) => r.target_sale_price && r.target_sale_price > 0)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name} — {formatCurrency(r.target_sale_price!)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyQty">Vendas por dia</Label>
              <Input
                id="dailyQty"
                type="number"
                min="1"
                value={dailyQty}
                onChange={(e) => setDailyQty(e.target.value)}
                placeholder="Ex: 10"
              />
            </div>
          </div>

          {calc && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Daily */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-5 text-center space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por Dia</p>
                    <p className="text-sm text-muted-foreground">{calc.daily.qty} unidades</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(calc.daily.profit)}</p>
                    <p className="text-xs text-muted-foreground">de lucro</p>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Weekly */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="p-5 text-center space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por Semana</p>
                    <p className="text-sm text-muted-foreground">{calc.weekly.qty} unidades</p>
                    <p className="text-2xl font-bold text-success">{formatCurrency(calc.weekly.profit)}</p>
                    <p className="text-xs text-muted-foreground">de lucro</p>
                  </CardContent>
                </Card>
              </motion.div>
              {/* Monthly */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
                <Card className="border-success/40 bg-success/10">
                  <CardContent className="p-5 text-center space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Por Mês</p>
                    <p className="text-sm text-muted-foreground">{calc.monthly.qty} unidades</p>
                    <p className="text-3xl font-extrabold text-success">{formatCurrency(calc.monthly.profit)}</p>
                    <p className="text-xs text-muted-foreground">de lucro projetado 🎉</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          )}

          {calc && (
            <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
              <div className="flex items-center gap-2 mb-1">
                <Info className="h-4 w-4" />
                <span className="font-medium">Detalhes do cálculo</span>
              </div>
              <p>Lucro unitário: {formatCurrency(calc.unitProfit)} (preço de venda − custo unitário)</p>
            </div>
          )}

          {recipes.filter((r) => r.target_sale_price && r.target_sale_price > 0).length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Nenhum produto com preço de venda</p>
              <p className="text-sm">Cadastre receitas com preço de venda para usar este simulador.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default Inteligencia;
