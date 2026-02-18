import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription, isPremiumPlan } from "./useSubscription";
import { useTrial } from "./useTrial";

export interface FreemiumLimits {
  recipes: number;
  clients: number;
  ingredients: number;
  orders: number;
  shopping_lists: number;
  catalog: number;
}

const FREE_LIMITS: FreemiumLimits = {
  recipes: 5,
  clients: 10,
  ingredients: 15,
  orders: 10,
  shopping_lists: 3,
  catalog: 3,
};

// Modules blocked for free users (after trial)
const PREMIUM_MODULES = ["catalogo", "inteligencia", "financeiro"];

export type FreemiumModule = keyof FreemiumLimits;

interface ModuleCounts {
  recipes: number;
  clients: number;
  ingredients: number;
  orders: number;
  shopping_lists: number;
  catalog: number;
}

export const useFreemiumLimits = () => {
  const { user } = useAuth();
  const { planType } = useSubscription();
  const { isInTrial, trialDaysLeft, loading: trialLoading } = useTrial();
  const [counts, setCounts] = useState<ModuleCounts>({
    recipes: 0,
    clients: 0,
    ingredients: 0,
    orders: 0,
    shopping_lists: 0,
    catalog: 0,
  });

  const hasFullAccess = isPremiumPlan(planType) || isInTrial;

  const fetchCounts = useCallback(async () => {
    if (!user) return;

    const [recipesRes, clientsRes, ingredientsRes, ordersRes, shoppingRes] = await Promise.all([
      supabase.from("recipes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("clients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("ingredients").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("shopping_list_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    setCounts({
      recipes: recipesRes.count || 0,
      clients: clientsRes.count || 0,
      ingredients: ingredientsRes.count || 0,
      orders: ordersRes.count || 0,
      shopping_lists: shoppingRes.count || 0,
      catalog: recipesRes.count || 0,
    });
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const canCreate = (module: FreemiumModule): boolean => {
    if (hasFullAccess) return true;
    return counts[module] < FREE_LIMITS[module];
  };

  const isModuleLocked = (moduleName: string): boolean => {
    if (hasFullAccess) return false;
    return PREMIUM_MODULES.includes(moduleName);
  };

  const getLimit = (module: FreemiumModule): number => FREE_LIMITS[module];
  const getCount = (module: FreemiumModule): number => counts[module];

  const getLimitLabel = (module: FreemiumModule): string => {
    const labels: Record<FreemiumModule, string> = {
      recipes: "receitas",
      clients: "clientes",
      ingredients: "ingredientes",
      orders: "encomendas",
      shopping_lists: "itens na lista de compras",
      catalog: "itens no catálogo",
    };
    return labels[module];
  };

  return {
    canCreate,
    isModuleLocked,
    getLimit,
    getCount,
    getLimitLabel,
    planType,
    hasFullAccess,
    isInTrial,
    trialDaysLeft,
    trialLoading,
    refreshCounts: fetchCounts,
    FREE_LIMITS,
  };
};
