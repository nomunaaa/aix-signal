import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProofStatsAggregateRow } from '@/lib/proof/proof-buckets';

export const PROOF_STATS_SELECT_FIELDS =
  'scope,symbol,barinterval,trading_category,timeinterval,trend,category,entries,pnl_pct_sum,pnl_per_entry_notional_rate_sum,entry_leg_count_sum,win_count,loss_count,wins_pnl_pct_sum,wins_per_entry_notional_rate_sum,losses_pnl_pct_abs_sum,losses_per_entry_notional_rate_abs_sum,highest_profit_pct,highest_loss_pct,highest_profit_per_entry_notional_rate,highest_loss_per_entry_notional_rate,hold_sec_sum,updated_at';

const PAGE_SIZE = 1000;

function buildProofStatsRowsQuery(supabase: SupabaseClient, from: number) {
  return supabase
    .from('proof_stats')
    .select(PROOF_STATS_SELECT_FIELDS)
    .in('timeinterval', ['all_time', 'last_30d', 'last_3mo'])
    .order('scope', { ascending: true })
    .order('symbol', { ascending: true })
    .order('timeinterval', { ascending: true })
    .order('barinterval', { ascending: true })
    .order('trading_category', { ascending: true })
    .order('trend', { ascending: true })
    .order('category', { ascending: true })
    .range(from, from + PAGE_SIZE - 1);
}

export async function fetchProofStatsRows(
  supabase: SupabaseClient
): Promise<ProofStatsAggregateRow[]> {
  const rows: ProofStatsAggregateRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildProofStatsRowsQuery(supabase, from);
    if (error) throw error;

    const page = (data ?? []) as ProofStatsAggregateRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      return rows;
    }
  }
}
