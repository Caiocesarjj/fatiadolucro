import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const TRIAL_DAYS = 7;

interface TrialData {
  isInTrial: boolean;
  trialDaysLeft: number;
  trialExpired: boolean;
  loading: boolean;
}

export const useTrial = (): TrialData => {
  const { user } = useAuth();
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setCreatedAt(data?.created_at ?? null);
        setLoading(false);
      });
  }, [user]);

  if (!createdAt || loading) {
    return { isInTrial: false, trialDaysLeft: 0, trialExpired: false, loading };
  }

  const msElapsed = Date.now() - new Date(createdAt).getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);
  const daysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));
  const isInTrial = daysLeft > 0;

  return {
    isInTrial,
    trialDaysLeft: daysLeft,
    trialExpired: !isInTrial,
    loading,
  };
};
