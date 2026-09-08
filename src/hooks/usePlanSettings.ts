'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_PLAN_SETTINGS,
  mergePlanSettings,
  type PlanSettingsMap,
} from '@/lib/plan-settings';
import { normalizePlanCode } from '@/config/plans';
import { supabase } from '@/integrations/supabase/client';

export function usePlanSettings() {
  const [settings, setSettings] = useState<PlanSettingsMap>(DEFAULT_PLAN_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await (supabase as any).rpc(
        'admin_panel_plan_settings_public',
      );

      if (!active) return;

      if (rpcError) {
        setSettings(DEFAULT_PLAN_SETTINGS);
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      setSettings(mergePlanSettings(data ?? []));
      setLoading(false);
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  return {
    settings,
    loading,
    error,
    getPlanSetting: (plan: unknown) => settings[normalizePlanCode(plan)],
  };
}
