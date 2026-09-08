// partner_coupons 조회 — checkout-init 등 서버에서만 사용 (service role 클라이언트)
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.103.0";

export type PartnerCouponRow = {
  discount_percent_bps: number | null;
  discount_amount_cents: number | null;
  expires_at: string | null;
  max_uses: number | null;
  uses_count: number;
};

export async function lookupPartnerCouponByCode(
  supabase: SupabaseClient,
  rawCode: string,
): Promise<PartnerCouponRow | null> {
  const code = rawCode.trim();
  if (!code) return null;

  const { data, error } = await supabase
    .from("partner_coupons")
    .select("discount_percent_bps, discount_amount_cents, expires_at, max_uses, uses_count")
    .ilike("code", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as PartnerCouponRow;
  if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
  if (row.max_uses != null && row.uses_count >= row.max_uses) return null;
  return row;
}
