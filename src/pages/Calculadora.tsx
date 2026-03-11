import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { mapErrorToUserMessage } from "@/lib/errorHandler";
import {
  Calculator as CalcIcon,
  Plus,
  Minus,
  DollarSign,
  TrendingUp,
  Lightbulb,
  Store,
  Truck,
  Package,
  RotateCcw,
  Cake,
  ArrowLeft,
  Flame,
  Info,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSubscription, FREE_RECIPE_LIMIT_VALUE } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { motion } from "framer-motion";

type YieldUnit = "unit" | "weight" | "volume";

interface Recipe {
  id: string;
  name: string;
  yield_amount: number;
  labor_cost: number;
  total_cost?: number;
  yield_unit?: YieldUnit;
}

const yieldUnitLabel = (unit: YieldUnit) => {
  if (unit === "weight") return "g";
  if (unit === "volume") return "ml";
  return "un";
};

const yieldUnitNameSingular = (unit: YieldUnit) => {
  if (unit === "weight") return "Grama";
  if (unit === "volume") return "Mililitro";
  return "Unidade";
};

interface Ingredient {
  id: string;
  name: string;
  unit_type: "weight" | "unit" | "volume";
  cost_per_unit: number;
}

interface Platform {
  id: string;
  name: string;
  fee_percentage: number;
  is_active: boolean;
}

interface RecipeAsIngredient {
  recipeId: string;
  quantity: number;
}

interface RecipeItem {
  ingredientId: string;
  quantity: number;
}

interface PlatformResult {
  name: string;
  icon: React.ReactNode;
  fee: number;
  feeAmount: number;
  sellingPrice: number;
  netProfit: number;
  margin: number;
}

const Calculadora = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<RecipeItem[]>([]);
  const [laborCost, setLaborCost] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [yieldAmount, setYieldAmount] = useState("");
  const [yieldUnit, setYieldUnit] = useState<YieldUnit>("unit");
  const [targetPrice, setTargetPrice] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [recipeName, setRecipeName] = useState("");
  const [suggestedMarkup, setSuggestedMarkup] = useState("100");
  const [chosenSalePrice, setChosenSalePrice] = useState<number | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipes, setSelectedRecipes] = useState<RecipeAsIngredient[]>([]);
  const [inputMode, setInputMode] = useState<"ingredient" | "recipe">("ingredient");
  const { canCreateRecipe, recipeCount, planType } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [minuteRate, setMinuteRate] = useState(0);
  const [variableCostRate, setVariableCostRate] = useState(10);
  const [laborAutoCalculated, setLaborAutoCalculated] = useState(false);
  // Quick-add ingredient state
  const [showNewIngredient, setShowNewIngredient] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngUnitType, setNewIngUnitType] = useState<"weight" | "unit" | "volume">("weight");
  const [newIngPackageSize, setNewIngPackageSize] = useState("");
  const [newIngPricePaid, setNewIngPricePaid] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Load recipe data when editing
  useEffect(() => {
    if (editId && user && ingredients.length > 0) {
      loadRecipeForEdit(editId);
    }
  }, [editId, user, ingredients]);

  const loadRecipeForEdit = async (recipeId: string) => {
    const { data: recipe, error } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    if (error || !recipe) {
      toast({ variant: "destructive", title: "Receita não encontrada" });
      return;
    }

    setRecipeName(recipe.name);
    setYieldAmount(String(recipe.yield_amount || ""));
    setYieldUnit((recipe as any).yield_unit || "unit");
    setLaborCost(recipe.labor_cost ? String(recipe.labor_cost).replace(".", ",") : "");
    setPrepTime(recipe.prep_time_minutes ? String(recipe.prep_time_minutes) : "");
    setTargetPrice(recipe.target_sale_price ? String(recipe.target_sale_price).replace(".", ",") : "");

    // Load recipe items
    const { data: items } = await supabase
      .from("recipe_items")
      .select("ingredient_id, quantity")
      .eq("recipe_id", recipeId);

    if (items) {
      setSelectedIngredients(
        items.map((item) => ({
          ingredientId: item.ingredient_id,
          quantity: item.quantity,
        }))
      );
    }

    // Load sub-recipes (graceful if table doesn't exist)
    try {
      const { data: subData } = await supabase
        .from("recipe_recipe_items" as any)
        .select("sub_recipe_id, quantity")
        .eq("recipe_id", recipeId);

      if (subData && (subData as any[]).length > 0) {
        setSelectedRecipes(
          (subData as any[]).map((item: any) => ({
            recipeId: item.sub_recipe_id,
            quantity: item.quantity,
          }))
        );
      }
    } catch {
      // Table may not exist on external DB
    }
  };

  const fetchData = async () => {
    const [ingredientsRes, platformsRes, recipesRes, profileRes] = await Promise.all([
      supabase.from("ingredients").select("id, name, unit_type, cost_per_unit").order("name"),
      supabase.from("platforms").select("*").eq("is_active", true).order("name"),
      supabase.from("recipes").select("id, name, yield_amount, labor_cost, yield_unit").order("name"),
      supabase.from("profiles").select("minute_rate, variable_cost_rate").eq("user_id", user!.id).maybeSingle(),
    ]);

    setIngredients(ingredientsRes.data || []);
    setPlatforms(platformsRes.data || []);

    // Load pricing settings
    if (profileRes.data) {
      setMinuteRate((profileRes.data as any).minute_rate || 0);
      setVariableCostRate((profileRes.data as any).variable_cost_rate ?? 10);
    }
    
    // Calculate total cost for each recipe
    if (recipesRes.data) {
      const recipesWithCost = await Promise.all(
        recipesRes.data.map(async (recipe) => {
          const { data: items } = await supabase
            .from("recipe_items")
            .select("quantity, ingredients(cost_per_unit)")
            .eq("recipe_id", recipe.id);
          
          const ingredientsCost = items?.reduce((total, item) => {
            const costPerUnit = (item.ingredients as any)?.cost_per_unit || 0;
            return total + costPerUnit * item.quantity;
          }, 0) || 0;
          
          return {
            ...recipe,
            total_cost: ingredientsCost + recipe.labor_cost,
          };
        })
      );
      setRecipes(recipesWithCost);
    }
    
    // Select first platform by default
    if (platformsRes.data?.length) {
      setSelectedPlatforms(platformsRes.data.map((p) => p.id));
    }
  };

  const addRecipeAsIngredient = () => {
    if (recipes.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem receitas",
        description: "Cadastre receitas primeiro para criar combos.",
      });
      return;
    }
    setSelectedRecipes([
      { recipeId: recipes[0].id, quantity: 1 },
      ...selectedRecipes,
    ]);
  };

  const removeRecipeAsIngredient = (index: number) => {
    setSelectedRecipes(selectedRecipes.filter((_, i) => i !== index));
  };

  const updateRecipeAsIngredient = (
    index: number,
    field: "recipeId" | "quantity",
    value: string | number
  ) => {
    const updated = [...selectedRecipes];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedRecipes(updated);
  };

  const addIngredient = () => {
    if (ingredients.length === 0) {
      toast({
        variant: "destructive",
        title: "Sem ingredientes",
        description: "Cadastre ingredientes primeiro na página de Ingredientes.",
      });
      return;
    }
    setSelectedIngredients([
      { ingredientId: ingredients[0].id, quantity: 0 },
      ...selectedIngredients,
    ]);
    // Auto-focus the new top row's select after render
    setTimeout(() => {
      const container = document.querySelector('[data-ingredient-list]');
      const firstSelect = container?.querySelector('select');
      firstSelect?.focus();
    }, 50);
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (
    index: number,
    field: "ingredientId" | "quantity",
    value: string | number
  ) => {
    const updated = [...selectedIngredients];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedIngredients(updated);
  };

  // Auto-calculate labor cost when prep time changes
  useEffect(() => {
    if (minuteRate > 0 && prepTime) {
      const autoLabor = (parseInt(prepTime) || 0) * minuteRate;
      setLaborCost(autoLabor.toFixed(2).replace(".", ","));
      setLaborAutoCalculated(true);
    } else if (!prepTime) {
      setLaborAutoCalculated(false);
    }
  }, [prepTime, minuteRate]);

  // Calculations
  const calculations = useMemo(() => {
    const ingredientsCost = selectedIngredients.reduce((total, item) => {
      const ingredient = ingredients.find((i) => i.id === item.ingredientId);
      if (!ingredient) return total;
      return total + ingredient.cost_per_unit * item.quantity;
    }, 0);

    // Add cost from selected recipes (combos)
    const recipesCost = selectedRecipes.reduce((total, item) => {
      const recipe = recipes.find((r) => r.id === item.recipeId);
      if (!recipe || !recipe.total_cost) return total;
      const unitCost = recipe.total_cost / recipe.yield_amount;
      return total + unitCost * item.quantity;
    }, 0);

    const labor = parseFloat(laborCost.replace(",", ".")) || 0;
    const yield_ = parseInt(yieldAmount) || 1;
    const price = parseFloat(targetPrice.replace(",", ".")) || 0;

    // Hidden costs (variable costs on ingredients + recipes)
    const materialsCost = ingredientsCost + recipesCost;
    const hiddenCosts = materialsCost * (variableCostRate / 100);

    const totalRecipeCost = materialsCost + labor + hiddenCosts;
    const unitCost = totalRecipeCost / yield_;

    return {
      ingredientsCost,
      recipesCost,
      laborCost: labor,
      hiddenCosts,
      totalRecipeCost,
      unitCost,
      yield: yield_,
      targetPrice: price,
    };
  }, [selectedIngredients, ingredients, selectedRecipes, recipes, laborCost, yieldAmount, targetPrice, variableCostRate]);

  // Suggested price calculation — base price WITHOUT platform fees
  const suggestedPrice = useMemo(() => {
    const markup = parseFloat(suggestedMarkup) || 100;
    return calculations.unitCost * (1 + markup / 100);
  }, [calculations.unitCost, suggestedMarkup]);

  // Auto-sync markup result → targetPrice
  useEffect(() => {
    if (suggestedPrice > 0 && calculations.unitCost > 0) {
      setTargetPrice(suggestedPrice.toFixed(2).replace(".", ","));
    }
  }, [suggestedPrice, calculations.unitCost]);

  // Platform results — use suggestedPrice directly for immediate display
  const effectiveTargetPrice = suggestedPrice > 0 ? suggestedPrice : calculations.targetPrice;

  const platformResults = useMemo<PlatformResult[]>(() => {
    if (!effectiveTargetPrice || effectiveTargetPrice <= 0) return [];

    return platforms
      .filter((p) => selectedPlatforms.includes(p.id))
      .map((platform) => {
        const divisor = 1 - platform.fee_percentage / 100;
        const sellingPrice = divisor > 0 ? effectiveTargetPrice / divisor : 0;
        const feeAmount = sellingPrice - effectiveTargetPrice;
        const netProfit = effectiveTargetPrice - calculations.unitCost;
        const margin = sellingPrice > 0 
          ? (netProfit / sellingPrice) * 100 
          : 0;

        return {
          name: platform.name,
          icon: platform.name.toLowerCase().includes("balcão") ? (
            <Store className="h-5 w-5" />
          ) : (
            <Truck className="h-5 w-5" />
          ),
          fee: platform.fee_percentage,
          feeAmount,
          sellingPrice,
          netProfit,
          margin,
        };
      });
  }, [platforms, selectedPlatforms, effectiveTargetPrice, calculations.unitCost]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatUnitCost = (value: number) => formatCurrency(value);

  const resetRecipe = () => {
    setRecipeName("");
    setSelectedIngredients([]);
    setSelectedRecipes([]);
    setLaborCost("");
    setPrepTime("");
    setYieldAmount("");
    setYieldUnit("unit");
    setTargetPrice("");
    setInputMode("ingredient");
    toast({ title: "Campos limpos para nova receita!" });
  };

  const handleSaveRecipe = async () => {
    if (!editId && !canCreateRecipe && planType === "free") {
      setShowUpgradeModal(true);
      return;
    }

    if (!recipeName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome obrigatório",
        description: "Digite um nome para a receita.",
      });
      return;
    }

    try {
      const recipeData = {
        name: recipeName,
        yield_amount: calculations.yield,
        yield_unit: yieldUnit,
        labor_cost: calculations.laborCost,
        target_sale_price: chosenSalePrice ?? calculations.targetPrice,
        prep_time_minutes: parseInt(prepTime) || 0,
      };

      let recipeId: string;

      if (editId) {
        // UPDATE existing recipe
        const { error: recipeError } = await supabase
          .from("recipes")
          .update(recipeData)
          .eq("id", editId);

        if (recipeError) throw recipeError;
        recipeId = editId;

        // Delete old ingredients then re-insert
        await supabase.from("recipe_items").delete().eq("recipe_id", editId);
        // Try delete sub-recipes (table may not exist)
        try { await supabase.from("recipe_recipe_items" as any).delete().eq("recipe_id", editId); } catch {}
      } else {
        // INSERT new recipe
        const { data: recipe, error: recipeError } = await supabase
          .from("recipes")
          .insert({ ...recipeData, user_id: user!.id } as any)
          .select()
          .single();

        if (recipeError) throw recipeError;
        recipeId = recipe.id;
      }

      // Save ingredients
      if (selectedIngredients.length > 0) {
        const recipeItems = selectedIngredients.map((item) => ({
          recipe_id: recipeId,
          ingredient_id: item.ingredientId,
          quantity: item.quantity,
        }));

        const { error: itemsError } = await supabase
          .from("recipe_items")
          .insert(recipeItems);

        if (itemsError) throw itemsError;
      }

      // Save sub-recipes (produtos prontos) - graceful if table doesn't exist
      if (selectedRecipes.length > 0) {
        try {
          const subRecipeItems = selectedRecipes.map((item) => ({
            recipe_id: recipeId,
            sub_recipe_id: item.recipeId,
            quantity: item.quantity,
          }));

          await supabase
            .from("recipe_recipe_items" as any)
            .insert(subRecipeItems);
        } catch {
          // Table may not exist on external DB
        }
      }

      toast({ title: editId ? "Receita atualizada com sucesso!" : "Receita salva com sucesso!" });
      navigate("/receitas");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: mapErrorToUserMessage(error),
      });
    }
  };

  const handleQuickAddIngredient = async () => {
    if (!newIngName.trim()) {
      toast({ variant: "destructive", title: "Nome obrigatório" });
      return;
    }
    const packageSize = parseFloat(newIngPackageSize.replace(",", ".")) || 1;
    const pricePaid = parseFloat(newIngPricePaid.replace(",", ".")) || 0;
    const costPerUnit = packageSize > 0 ? pricePaid / packageSize : 0;

    const { data, error } = await supabase
      .from("ingredients")
      .insert({
        name: newIngName.trim(),
        unit_type: newIngUnitType,
        package_size: packageSize,
        price_paid: pricePaid,
        cost_per_unit: costPerUnit,
        user_id: user!.id,
      } as any)
      .select("id, name, unit_type, cost_per_unit")
      .single();

    if (error) {
      toast({ variant: "destructive", title: "Erro ao criar ingrediente", description: mapErrorToUserMessage(error) });
      return;
    }

    setIngredients((prev) => [...prev, data as Ingredient]);
    setSelectedIngredients([{ ingredientId: data.id, quantity: 0 }, ...selectedIngredients]);
    setShowNewIngredient(false);
    setNewIngName("");
    setNewIngPackageSize("");
    setNewIngPricePaid("");
    toast({ title: "Ingrediente criado e adicionado!" });
  };

  return (
    <>
    <AppLayout title={editId ? "Editar Receita" : "Calculadora de Receitas"}>
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/receitas")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Receitas
        </Button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Inputs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipe Name */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <CalcIcon className="h-5 w-5 text-primary" />
                  Nova Receita
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 items-end">
                  <div className="flex-1 space-y-2">
                  <Label htmlFor="recipeName">Nome da Receita</Label>
                  <Input
                    id="recipeName"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="Ex: Brownie Tradicional"
                  />
                  </div>
                  <Button
                    variant="outline"
                    onClick={resetRecipe}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Nova Receita
                  </Button>
                </div>
                {planType === "free" && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {recipeCount}/{FREE_RECIPE_LIMIT_VALUE} receitas no plano grátis
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Ingredients Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Ingredientes e Embalagens
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {/* Ingredientes */}
                <div className="pb-3 border-b mb-3 grid grid-cols-2 sm:flex gap-2">
                  <Button onClick={addIngredient} size="sm" variant="outline" className="sm:flex-1">
                    <Plus className="h-4 w-4 mr-1" />
                    Ingrediente
                  </Button>
                  <Button onClick={addRecipeAsIngredient} size="sm" variant="outline" className="sm:flex-1">
                    <Cake className="h-4 w-4 mr-1" />
                    Produto Pronto
                  </Button>
                  <Dialog open={showNewIngredient} onOpenChange={setShowNewIngredient}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="secondary" className="col-span-2 sm:shrink-0">
                        <Plus className="h-4 w-4 mr-1" />
                        Criar Novo
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-sm">
                      <DialogHeader>
                        <DialogTitle>Novo Ingrediente</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={newIngName}
                            onChange={(e) => setNewIngName(e.target.value)}
                            placeholder="Ex: Farinha de Trigo"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de Medida</Label>
                          <Select value={newIngUnitType} onValueChange={(v) => setNewIngUnitType(v as any)}>
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
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Tamanho Emb. ({newIngUnitType === "weight" ? "g" : newIngUnitType === "volume" ? "ml" : "un"})</Label>
                            <Input
                              value={newIngPackageSize}
                              onChange={(e) => setNewIngPackageSize(e.target.value)}
                              placeholder="Ex: 1000"
                              inputMode="decimal"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Preço Pago (R$)</Label>
                            <Input
                              value={newIngPricePaid}
                              onChange={(e) => setNewIngPricePaid(e.target.value)}
                              placeholder="Ex: 5,90"
                              inputMode="decimal"
                            />
                          </div>
                        </div>
                        <Button onClick={handleQuickAddIngredient} className="w-full">
                          Salvar e Adicionar à Receita
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 'min(500px, 40dvh)' }} data-ingredient-list>
                  {selectedIngredients.length === 0 && selectedRecipes.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Clique em "Ingrediente" ou "Produto Pronto" para começar
                    </p>
                  )}

                  {/* Ingredientes */}
                  {selectedIngredients.map((item, index) => {
                    const ingredient = ingredients.find((i) => i.id === item.ingredientId);
                    const itemCost = ingredient && item.quantity > 0 ? ingredient.cost_per_unit * item.quantity : 0;
                    return (
                      <div key={`ing-${index}`} className="p-3 bg-muted/50 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={item.ingredientId}
                            onChange={(e) => updateIngredient(index, "ingredientId", e.target.value)}
                            className="flex-1 bg-background border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                          >
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>{ing.name}</option>
                            ))}
                          </select>
                          <Button variant="ghost" size="icon" onClick={() => removeIngredient(index)} className="h-10 w-10 shrink-0">
                            <Minus className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 pl-1">
                          <Input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                            placeholder="Qtd"
                            className="w-24 input-currency h-10"
                            inputMode="decimal"
                          />
                          <span className="text-sm text-muted-foreground">
                            {ingredient?.unit_type === "weight" ? "g" : ingredient?.unit_type === "volume" ? "ml" : "un"}
                          </span>
                          {itemCost > 0 && (
                            <span className="ml-auto text-sm text-primary font-semibold">{formatCurrency(itemCost)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Produtos Prontos (sub-receitas) */}
                  {selectedRecipes.map((item, index) => {
                    const recipe = recipes.find((r) => r.id === item.recipeId);
                    const unitCost = recipe ? (recipe.total_cost || 0) / recipe.yield_amount : 0;
                    const itemCost = unitCost * item.quantity;
                    return (
                      <div key={`rec-${index}`} className="p-3 bg-primary/5 rounded-xl space-y-2 border border-primary/20">
                        <div className="flex items-center gap-2">
                          <Cake className="h-4 w-4 text-primary shrink-0" />
                          <select
                            value={item.recipeId}
                            onChange={(e) => updateRecipeAsIngredient(index, "recipeId", e.target.value)}
                            className="flex-1 bg-background border rounded-lg px-3 py-2.5 text-sm min-h-[44px]"
                          >
                            {recipes.map((rec) => (
                              <option key={rec.id} value={rec.id}>{rec.name}</option>
                            ))}
                          </select>
                          <Button variant="ghost" size="icon" onClick={() => removeRecipeAsIngredient(index)} className="h-10 w-10 shrink-0">
                            <Minus className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 pl-1">
                          <Input
                            type="number"
                            value={item.quantity || ""}
                            onChange={(e) => updateRecipeAsIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                            placeholder="Qtd"
                            className="w-24 input-currency h-10"
                            inputMode="decimal"
                          />
                          <span className="text-sm text-muted-foreground">
                            {yieldUnitLabel((recipe?.yield_unit as YieldUnit) || "unit")}
                          </span>
                          {recipe && (
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatCurrency(unitCost)}/{yieldUnitLabel((recipe?.yield_unit as YieldUnit) || "unit")}
                            </span>
                          )}
                          {itemCost > 0 && (
                            <span className="ml-auto text-sm text-primary font-semibold">{formatCurrency(itemCost)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Labor and Yield */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
             <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prepTime" className="flex items-center gap-1">
                      Tempo de Preparo (min)
                    </Label>
                    <Input
                      id="prepTime"
                      type="number"
                      value={prepTime}
                      onChange={(e) => setPrepTime(e.target.value)}
                      placeholder="Ex: 30"
                      className="input-currency"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laborCost">Mão de Obra (R$)</Label>
                    <Input
                      id="laborCost"
                      value={laborCost}
                      onChange={(e) => {
                        setLaborCost(e.target.value);
                        setLaborAutoCalculated(false);
                      }}
                      placeholder="Ex: 15,00"
                      className="input-currency"
                    />
                    {laborAutoCalculated && minuteRate > 0 && (
                      <p className="text-xs text-primary font-medium">
                        ✨ Calculado automático: {formatCurrency(minuteRate)}/min
                      </p>
                    )}
                    {!laborAutoCalculated && (
                      <p className="text-xs text-muted-foreground">
                        {minuteRate > 0 ? "Editado manualmente" : "Configure o custo/min em Configurações"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yieldAmount">Rendimento</Label>
                    <div className="flex gap-2">
                      <Input
                        id="yieldAmount"
                        type="number"
                        value={yieldAmount}
                        onChange={(e) => setYieldAmount(e.target.value)}
                        placeholder={yieldUnit === "unit" ? "Ex: 12" : yieldUnit === "weight" ? "Ex: 1000" : "Ex: 500"}
                        className="flex-1"
                      />
                      <Select value={yieldUnit} onValueChange={(v) => setYieldUnit(v as YieldUnit)}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unit">UN</SelectItem>
                          <SelectItem value="weight">g</SelectItem>
                          <SelectItem value="volume">ml</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Quanto a receita rende em {yieldUnit === "unit" ? "unidades" : yieldUnit === "weight" ? "gramas" : "mililitros"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Markup Suggestion */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-primary/30">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-warning" />
                  Sugestão de Preço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="markup">Markup Desejado (%)</Label>
                  <Input
                    id="markup"
                    type="number"
                    value={suggestedMarkup}
                    onChange={(e) => setSuggestedMarkup(e.target.value)}
                    className="input-currency"
                  />
                </div>
                <div className="bg-primary-light rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Preço Base de Venda (Sem taxas)
                  </p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(suggestedPrice)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatUnitCost(calculations.unitCost)} + {suggestedMarkup}% de markup
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pricing — Platforms */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Precificação por Plataforma
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Valor Líquido Desejado</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(parseFloat(targetPrice.replace(",", ".")) || 0)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground max-w-[180px] text-right">
                    Preenchido automaticamente pelo markup acima
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Plataformas</Label>
                  <div className="flex flex-wrap gap-4">
                    {platforms.map((platform) => (
                      <div key={platform.id} className="flex items-center gap-2">
                        <Checkbox
                          id={platform.id}
                          checked={selectedPlatforms.includes(platform.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPlatforms([...selectedPlatforms, platform.id]);
                            } else {
                              setSelectedPlatforms(
                                selectedPlatforms.filter((id) => id !== platform.id)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={platform.id}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {platform.name} ({platform.fee_percentage}%)
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Inline platform results */}
                {platformResults.length > 0 && (
                  <div className="space-y-3 pt-2">
                    {platformResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${
                          result.netProfit > 0
                            ? "border-success/30 bg-success-light"
                            : "border-destructive/30 bg-destructive/5"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          {result.icon}
                          <span className="font-medium">{result.name}</span>
                          <span className="badge-primary ml-auto">
                            {result.fee}% taxa
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Venda por</span>
                            <span className="text-lg font-bold text-primary">
                              {formatCurrency(result.sellingPrice)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Taxa ({result.fee}%)
                            </span>
                            <span className="text-destructive">
                              -{formatCurrency(result.feeAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Você recebe</span>
                            <span>{formatCurrency(effectiveTargetPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Lucro</span>
                            <span
                              className={`font-semibold ${
                                result.netProfit > 0
                                  ? "text-success"
                                  : "text-destructive"
                              }`}
                            >
                              {formatCurrency(result.netProfit)} ({result.margin.toFixed(1)}%)
                            </span>
                          </div>
                          <Button
                            variant={chosenSalePrice === result.sellingPrice ? "default" : "outline"}
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => {
                              setChosenSalePrice(result.sellingPrice);
                              toast({ title: `Preço de ${result.name} selecionado para salvar!` });
                            }}
                          >
                            {chosenSalePrice === result.sellingPrice ? "✓ Preço selecionado" : "Usar este preço"}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Cost Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Resumo de Custos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ingredientes</span>
                  <span className="font-mono">
                    {formatCurrency(calculations.ingredientsCost)}
                  </span>
                </div>
                {calculations.recipesCost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Produtos Prontos</span>
                    <span className="font-mono">
                      {formatCurrency(calculations.recipesCost)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mão de Obra</span>
                  <span className="font-mono">
                    {formatCurrency(calculations.laborCost)}
                  </span>
                </div>
                {calculations.hiddenCosts > 0 && (
                  <div className="flex justify-between items-center p-2 rounded-md bg-warning/10 border border-warning/20">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-warning" />
                      Gastos Variáveis ({variableCostRate}%)
                    </span>
                    <span className="font-mono text-warning font-medium">
                      {formatCurrency(calculations.hiddenCosts)}
                    </span>
                  </div>
                )}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Custo Total</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(calculations.totalRecipeCost)}
                    </span>
                  </div>
                </div>
                <div className="bg-primary-light rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Custo por {yieldUnitNameSingular(yieldUnit)}</span>
                    <span className="text-xl font-bold text-primary">
                      {formatUnitCost(calculations.unitCost)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Baseado em {calculations.yield} {yieldUnitLabel(yieldUnit)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* (Platform cards and Markup suggestion moved to left column) */}

          {/* Save Button */}
          <Button
            onClick={handleSaveRecipe}
            className="w-full bg-primary hover:bg-primary-hover text-primary-foreground"
            size="lg"
          >
            Salvar Receita
          </Button>
        </div>
      </div>
    </AppLayout>
    <UpgradeModal
      open={showUpgradeModal}
      onOpenChange={setShowUpgradeModal}
      type="recipe_limit"
    />
    </>
  );
};

export default Calculadora;
