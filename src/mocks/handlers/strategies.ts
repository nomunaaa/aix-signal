import { http, HttpResponse, delay } from 'msw';
import { createStrategyStats } from '../factories/strategyFactory';

const API_BASE = '';

export const strategyHandlers = [
  /**
   * GET /api/strategies/stats
   *
   * [LIVE API 메모]
   * - Supabase: view 'strategy_performance_30d'
   * - 30일 rolling window, 매 5분 갱신
   */
  http.get(`${API_BASE}/api/strategies/stats`, async () => {
    await delay(200);
    return HttpResponse.json(createStrategyStats());
  }),

  /**
   * GET /api/strategies/:id/simulation
   *
   * [LIVE API 메모]
   * - Supabase Edge Function: /functions/v1/simulate
   */
  http.get(`${API_BASE}/api/strategies/:id/simulation`, async ({ params, request }) => {
    await delay(300);
    const url = new URL(request.url);
    const capital = parseFloat(url.searchParams.get('capital') || '10000');
    const strategyId = params.id as string;

    const multipliers: Record<string, number> = {
      oneshot: 1.0,
      safe: 1.3,
      deep: 1.6,
      full: 2.1,
    };
    const mult = multipliers[strategyId] || 1.0;
    const returnRate = 4.2 * mult + (Math.random() - 0.5) * 2;

    return HttpResponse.json({
      strategyId,
      capital,
      finalCapital: +(capital * (1 + returnRate / 100)).toFixed(2),
      estimatedReturn: +returnRate.toFixed(2),
      estimatedPnl: +(capital * returnRate / 100).toFixed(2),
      totalTrades: Math.floor(Math.random() * 400) + 100,
      winRate: +(68 + Math.random() * 15).toFixed(1),
      maxDrawdown: +(-3 - Math.random() * 10).toFixed(2),
      profitFactor: +(1.2 + Math.random() * 0.8).toFixed(2),
    });
  }),
];
