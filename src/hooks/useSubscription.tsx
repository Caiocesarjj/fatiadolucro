 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "./useAuth";
 
interface SubscriptionData {
  planType: "free" | "pro" | "vip";
  canCreateRecipe: boolean;
  recipeCount: number;
  loading: boolean;
}

const FREE_RECIPE_LIMIT = 3;
const LOCKED_MODULES_FOR_FREE = ["financeiro", "encomendas", "catalogo"];

export const isPremiumPlan = (planType: string): boolean => {
  return planType === "pro" || planType === "vip";
};
 
 export const useSubscription = (): SubscriptionData => {
   const { user } = useAuth();
   const [planType, setPlanType] = useState<"free" | "pro" | "vip">("free");
   const [recipeCount, setRecipeCount] = useState(0);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     if (user) {
       fetchSubscriptionData();
     } else {
       setLoading(false);
     }
   }, [user]);
 
   const fetchSubscriptionData = async () => {
     try {
       const [profileRes, recipesRes] = await Promise.all([
         supabase
           .from("profiles")
           .select("plan_type")
           .eq("user_id", user!.id)
           .maybeSingle(),
         supabase
           .from("recipes")
           .select("id", { count: "exact" })
           .eq("user_id", user!.id),
       ]);
 
        if (profileRes.data) {
          setPlanType(profileRes.data.plan_type as "free" | "pro" | "vip");
        }
 
       setRecipeCount(recipesRes.count || 0);
     } catch (error) {
       if (import.meta.env.DEV) console.error("Error fetching subscription data:", error);
     } finally {
       setLoading(false);
     }
   };
 
   const canCreateRecipe = isPremiumPlan(planType) || recipeCount < FREE_RECIPE_LIMIT;
 
   return { planType, canCreateRecipe, recipeCount, loading };
 };
 
export const isModuleLockedForFree = (moduleName: string, planType: "free" | "pro" | "vip"): boolean => {
  if (isPremiumPlan(planType)) return false;
  return LOCKED_MODULES_FOR_FREE.includes(moduleName);
};
 
 export const FREE_RECIPE_LIMIT_VALUE = FREE_RECIPE_LIMIT;