import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";

export interface FreemiumLimits {
  recipes: number;
  clients: number;
  ingredients: number;
  orders: number;
  shopping_lists: number;
  catalog: number;
}

const FREE_LIMITS: FreemiumLimits = {
  recipes: 3,
  clients: 15,
  ingredients: 30,
  orders: 5,
  shopping_lists: 3,
  catalog: 3,
};

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
  const [counts, setCounts] = useState<ModuleCounts>({
    recipes: 0,
    clients: 0,
    ingredients: 0,
    orders: 0,
    shopping_lists: 0,
    catalog: 0,
  });

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
      catalog: recipesRes.count || 0, // catalog uses recipes count
    });
  }, [user]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const canCreate = (module: FreemiumModule): boolean => {
    if (planType === "pro") return true;
    return counts[module] < FREE_LIMITS[module];
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
    getLimit,
    getCount,
    getLimitLabel,
    planType,
    refreshCounts: fetchCounts,
    FREE_LIMITS,
  };
};
