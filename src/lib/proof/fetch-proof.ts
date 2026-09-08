import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ProofPageMock, ProofPeriod } from '@/lib/mock/proof-mock';
import {
  buildEmptyProofPage,
  buildProofPageDataFromStats,
} from '@/lib/proof/build-proof-page-data';
import { fetchProofStatsRows } from '@/lib/proof/fetch-proof-stats';

const PROOF_MAIN_PERIOD: ProofPeriod = '30d';

function createProofSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase env missing for proof page');
  }

  const noStoreFetch: typeof fetch = (input, init) => fetch(input, { ...init, cache: 'no-store' });

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: noStoreFetch },
  });
}

/**
 * Proof main data. Keep this proof_stats-only so the page never falls back to
 * an expensive raw signal_cycles scan in production.
 */
export async function fetchProofPageData(): Promise<ProofPageMock> {
  const period = PROOF_MAIN_PERIOD;

  if (process.env.NEXT_PUBLIC_PROOF_FORCE_EMPTY === '1') {
    return buildEmptyProofPage(period);
  }

  try {
    const supabase = createProofSupabaseClient();
    const statsRows = await fetchProofStatsRows(supabase);
    return buildProofPageDataFromStats(statsRows, period);
  } catch (err) {
    console.error('[proof] fetchProofPageData failed:', err);
    const empty = buildEmptyProofPage(period);
    return {
      ...empty,
      header: {
        ...empty.header,
        generatedAtLabel: 'Fetch failed',
        headline: 'Unable to load performance data',
        subtitle: 'Please try again shortly',
      },
    };
  }
}
