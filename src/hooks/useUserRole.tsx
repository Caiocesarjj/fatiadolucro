import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface UserRoleData {
  isAdmin: boolean;
  isActive: boolean;
  allowedModules: string[];
  loading: boolean;
}

export const useUserRole = (): UserRoleData => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [allowedModules, setAllowedModules] = useState<string[]>(["all"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserRole();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchUserRole = async () => {
    try {
      // Run both queries in parallel instead of sequentially
      const [roleRes, profileRes] = await Promise.all([
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user!.id)
          .eq("role", "admin")
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("is_active, allowed_modules")
          .eq("user_id", user!.id)
          .maybeSingle(),
      ]);

      if (roleRes.error) {
        if (import.meta.env.DEV) console.error("Error checking admin role:", roleRes.error);
      }
      setIsAdmin(!!roleRes.data);

      if (profileRes.data) {
        setIsActive(profileRes.data.is_active ?? true);
        setAllowedModules((profileRes.data as any).allowed_modules ?? ["all"]);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, isActive, allowedModules, loading };
};

export const hasModuleAccess = (allowedModules: string[], moduleName: string): boolean => {
  return allowedModules.includes("all") || allowedModules.includes(moduleName);
};
