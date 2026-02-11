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
      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Error checking admin role:", roleError);
      }
      setIsAdmin(!!roleData);

      // Get profile data for is_active and allowed_modules
      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_active, allowed_modules")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (profileData) {
        setIsActive(profileData.is_active ?? true);
        setAllowedModules(profileData.allowed_modules ?? ["all"]);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, isActive, allowedModules, loading };
};

export const hasModuleAccess = (allowedModules: string[], moduleName: string): boolean => {
  return allowedModules.includes("all") || allowedModules.includes(moduleName);
};
