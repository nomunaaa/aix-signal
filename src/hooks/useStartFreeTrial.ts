import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionErrorMessage } from "@/lib/functionErrorMessage";
import { usePlanSettings } from "@/hooks/usePlanSettings";

export function useStartFreeTrial() {
  const { session, refreshSubscription } = useAuth();
  const { getPlanSetting } = usePlanSettings();
  const [isStarting, setIsStarting] = useState(false);

  const startFreeTrial = async (): Promise<boolean> => {
    if (!session) return false;
    setIsStarting(true);
    try {
      const { error } = await supabase.functions.invoke("start-trial", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      await refreshSubscription();
      toast.success(`${getPlanSetting('pro').trialDays}일 무료체험이 시작되었습니다!`);
      return true;
    } catch (err) {
      toast.error(await getFunctionErrorMessage(err, "무료체험 시작에 실패했습니다"));
      return false;
    } finally {
      setIsStarting(false);
    }
  };

  return { startFreeTrial, isStarting };
}
