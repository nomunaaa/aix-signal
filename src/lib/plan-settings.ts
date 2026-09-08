import { PLAN_CATALOG, PLAN_CODES, normalizePlanCode, type PlanCode } from '@/config/plans';

export type RuntimePlanSettings = {
  planCode: PlanCode;
  displayName: string;
  monthlyPriceCents: number;
  monthlyPrice: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  updatedAt: string | null;
};

export type PlanSettingsMap = Record<PlanCode, RuntimePlanSettings>;

export function defaultPlanSetting(planCode: PlanCode): RuntimePlanSettings {
  const entry = PLAN_CATALOG[planCode];
  const monthlyPriceCents = Math.round(entry.monthlyPrice * 100);

  return {
    planCode,
    displayName: entry.name,
    monthlyPriceCents,
    monthlyPrice: monthlyPriceCents / 100,
    currency: 'USD',
    trialDays: 3,
    isActive: true,
    updatedAt: null,
  };
}

export const DEFAULT_PLAN_SETTINGS = PLAN_CODES.reduce((settings, planCode) => {
  settings[planCode] = defaultPlanSetting(planCode);
  return settings;
}, {} as PlanSettingsMap);

export function normalizePlanSettingRow(row: any): RuntimePlanSettings {
  const planCode = normalizePlanCode(row?.plan_code);
  const fallback = DEFAULT_PLAN_SETTINGS[planCode];
  const monthlyPriceCents = Number(row?.monthly_price_cents ?? fallback.monthlyPriceCents);
  const trialDays = Number(row?.trial_days ?? fallback.trialDays);
  const currency = String(row?.currency ?? fallback.currency).trim().toUpperCase();

  return {
    planCode,
    displayName: String(row?.display_name ?? fallback.displayName),
    monthlyPriceCents: Number.isFinite(monthlyPriceCents)
      ? Math.max(0, Math.round(monthlyPriceCents))
      : fallback.monthlyPriceCents,
    monthlyPrice: Number.isFinite(monthlyPriceCents)
      ? Math.max(0, Math.round(monthlyPriceCents)) / 100
      : fallback.monthlyPrice,
    currency: /^[A-Z]{3}$/.test(currency) ? currency : fallback.currency,
    trialDays: Number.isFinite(trialDays)
      ? Math.min(365, Math.max(0, Math.round(trialDays)))
      : fallback.trialDays,
    isActive: row?.is_active !== false,
    updatedAt: row?.updated_at ?? null,
  };
}

export function mergePlanSettings(rows: any[] | null | undefined): PlanSettingsMap {
  const merged: PlanSettingsMap = {
    free: { ...DEFAULT_PLAN_SETTINGS.free },
    pro: { ...DEFAULT_PLAN_SETTINGS.pro },
  };

  for (const row of rows ?? []) {
    const setting = normalizePlanSettingRow(row);
    merged[setting.planCode] = setting;
  }

  return merged;
}

export function formatPlanMoney(cents: number, currency: string) {
  const safeCents = Number.isFinite(cents) ? Math.max(0, Math.round(cents)) : 0;
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: safeCurrency,
    minimumFractionDigits: safeCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: safeCents % 100 === 0 ? 0 : 2,
  }).format(safeCents / 100);
}
