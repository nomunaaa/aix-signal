import { http, HttpResponse, delay } from 'msw';
import type { PulseApiResponse, PulseApiSignal } from '@/types/signal';
import {
  buildRealisticPulseApiResponse,
  calcDiscount,
  calcPnL,
  getRealisticClosedSignals,
  mockBasePriceRow,
  mockSparkline24h,
} from '@/lib/mock/realistic-data';
import pulseEdge from '../fixtures/pulse.edge.json';
import pulseEmpty from '../fixtures/pulse.empty.json';

const API_BASE = '';

type PulseFixture = PulseApiResponse;

/**
 * MSW `/api/signals/pulse` 시나리오
 * - `basic` | `realistic`: `buildRealisticPulseApiResponse()` — 할인·PnL은 `realistic-data`와 정합
 * - `empty` | `edge`: JSON 픽스처 + (edge만) `withExtendedFields` 합성 오버레이
 * - 히트맵·스케일 현실감 QA는 **`basic` / `realistic`** 권장. `edge`는 스트레스/결측 UI 검증용.
 */

/** 고정 지연 — MSW 응답이 시드/스냅샷과 어긋나지 않도록 */
function fakerDelay() {
  return 180;
}

function withExtendedFields(payload: PulseFixture): PulseFixture {
  const signals = (payload.signals ?? []).map((signal, index) => {
    const base: Pick<PulseApiSignal, 'section_fields' | 'extra_signal' | 'remaining_time'> = {
      extra_signal: index % 3 === 0 ? null : 'AI 보조신호',
      remaining_time: 30 + index * 7,
      section_fields: signal.section_fields ?? {},
    };

    if (signal.section === 'TREND_DISCOUNT') {
      const dcaFired = index % 5 === 0 || index % 5 === 2;
      const band = mockBasePriceRow(signal.symbol);
      const high24 = band?.dailyRange[1] ?? signal.current_price * 1.04;
      const low24 = band?.dailyRange[0] ?? signal.current_price * 0.96;
      const disc = calcDiscount(signal.entry_price, signal.current_price, signal.direction);
      return {
        ...signal,
        ...base,
        section_fields: {
          ...base.section_fields,
          discount_price: signal.current_price,
          discount_rate: disc.percent,
          additional_entry_price: signal.entry_price * (signal.direction === 'long' ? 0.997 : 1.003),
          additional_discount_amount: 12.4,
          discount_gain_percent: 0.8,
          short_trend: signal.direction === 'long' ? 'up' : 'down',
          long_trend: signal.direction === 'long' ? 'up' : 'down',
          high_24h: high24,
          low_24h: low24,
          price_change_pct_24h: index % 3 === 0 ? 6.2 : index % 3 === 1 ? 2.4 : 0.5,
          additional_entry_pending: index % 4 === 1,
          avg_cycle_time: 24 + (index % 6) * 18,
          sparkline_24h: mockSparkline24h(signal.current_price, index),
          additional_buy_count: dcaFired ? (index % 5 === 0 ? 2 : 1) : 0,
          additional_entry_time: dcaFired
            ? new Date(Date.now() - (12 + index) * 60_000).toISOString()
            : undefined,
        },
      };
    }

    if (signal.section === 'TREND_TP') {
      const partialFired = index % 5 === 0 || index % 5 === 3;
      const band = mockBasePriceRow(signal.symbol);
      const high24 = band?.dailyRange[1] ?? signal.current_price * 1.03;
      const low24 = band?.dailyRange[0] ?? signal.current_price * 0.97;
      const pnl = calcPnL(signal.entry_price, signal.current_price, signal.direction);
      return {
        ...signal,
        ...base,
        section_fields: {
          ...base.section_fields,
          partial_close_price: signal.current_price * 1.002,
          locked_profit_amount: 18.2,
          locked_profit_percent: Math.abs(pnl.percent) > 0.05 ? pnl.percent : 1.5,
          short_trend: signal.direction === 'long' ? 'up' : 'down',
          long_trend: signal.direction === 'long' ? 'up' : 'down',
          high_24h: high24,
          low_24h: low24,
          price_change_pct_24h: index % 4 === 0 ? 5.5 : 2.1,
          partial_exit_pending: index % 5 === 2,
          avg_cycle_time: 40 + (index % 4) * 22,
          sparkline_24h: mockSparkline24h(signal.current_price, index + 17),
          partial_exit_time: partialFired
            ? new Date(Date.now() - (8 + index) * 60_000).toISOString()
            : undefined,
        },
      };
    }

    if (signal.section === 'NON_TREND_SHORT' || signal.section === 'NON_TREND_LONG') {
      const shortTrend = signal.direction === 'long' ? 'down' : 'up';
      const longTrend = signal.direction === 'long' ? 'up' : 'up';
      const band = mockBasePriceRow(signal.symbol);
      const high24 = band?.dailyRange[1] ?? signal.current_price * 1.06;
      const low24 = band?.dailyRange[0] ?? signal.current_price * 0.94;
      return {
        ...signal,
        ...base,
        section_fields: {
          ...base.section_fields,
          short_trend: shortTrend,
          long_trend: longTrend,
          nontrend_duration: 21 + index,
          volatility: index % 2 ? 'MID' : 'HIGH',
          high_24h: high24,
          low_24h: low24,
          price_change_pct_24h: index % 3 === 0 ? 6.2 : index % 3 === 1 ? 3.0 : 0.45,
          avg_cycle_time: 55 + (index % 5) * 12,
          sparkline_24h: mockSparkline24h(signal.current_price, index + 33),
        },
      };
    }

    if (signal.section === 'WAITING_ENTRY') {
      return {
        ...signal,
        ...base,
        section_fields: {
          ...base.section_fields,
          pnl_1d_amount: 14.1,
          pnl_1d_percent: 0.43,
          pnl_7d_amount: 55.2,
          pnl_7d_percent: 1.11,
          last_close_time: signal.section_time,
          today_signal_count: 3,
          avg_cycle_time: 42,
        },
      };
    }

    if (signal.section === 'CLOSED_RECENT') {
      return {
        ...signal,
        ...base,
        section_fields: {
          ...base.section_fields,
          close_price: signal.current_price,
          invest_pnl_amount: signal.profit_amount,
          invest_pnl_percent: signal.profit_rate,
          cycle_time: 37,
        },
      };
    }

    return { ...signal, ...base };
  });

  return { ...payload, signals: signals as PulseApiSignal[] };
}

export const signalHandlers = [
  http.get(`${API_BASE}/api/signals/pulse`, async ({ request }) => {
    await delay(fakerDelay());

    const url = new URL(request.url);
    const scenario = url.searchParams.get('scenario') ?? 'basic';
    const strategy = url.searchParams.get('strategy') ?? 'S1';
    const stream = url.searchParams.get('stream');
    const symbolExact = url.searchParams.get('symbol');
    const searchQ = url.searchParams.get('search');
    const directionFilter = url.searchParams.get('direction');

    const selected =
      scenario === 'basic' || scenario === 'realistic'
        ? buildRealisticPulseApiResponse()
        : scenario === 'empty'
          ? (JSON.parse(JSON.stringify(pulseEmpty)) as PulseFixture)
          : scenario === 'edge'
            ? (JSON.parse(JSON.stringify(pulseEdge)) as PulseFixture)
            : buildRealisticPulseApiResponse();
    const filtered = scenario === 'edge' ? withExtendedFields(selected) : selected;

    filtered.strategy_id = strategy;
    filtered.as_of = new Date().toISOString();
    if (stream === 'wave') {
      filtered.signals = filtered.signals.slice(0, Math.max(1, Math.floor(filtered.signals.length * 0.65)));
    }
    filtered.signals = filtered.signals.filter((s) => {
      const symbolPass = symbolExact
        ? s.symbol === symbolExact
        : searchQ
          ? s.symbol.toLowerCase().includes(searchQ.toLowerCase())
          : true;
      const directionPass = directionFilter ? s.direction === directionFilter : true;
      return symbolPass && directionPass;
    });

    return HttpResponse.json(filtered);
  }),

  http.get(`${API_BASE}/api/signals/pulse/history`, async ({ request }) => {
    await delay(fakerDelay());
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const allClosed = getRealisticClosedSignals();
    const start = (page - 1) * limit;

    return HttpResponse.json({
      items: allClosed.slice(start, start + limit),
      total: allClosed.length,
      page,
      totalPages: Math.max(1, Math.ceil(allClosed.length / limit)),
    });
  }),

  // Phase 1: dev 플래시 방지용 auth mock endpoints
  http.get(`${API_BASE}/api/auth/session`, async () => {
    await delay(40);
    return HttpResponse.json({
      session: { user: { id: 'dev-user', email: 'dev@aixsignal.local' }, expiresAt: Date.now() + 3_600_000 },
    });
  }),
  http.get(`${API_BASE}/api/auth/me`, async () => {
    await delay(40);
    return HttpResponse.json({ id: 'dev-user', email: 'dev@aixsignal.local', nickname: 'MSW User' });
  }),
  http.get(`${API_BASE}/auth/session`, async () => {
    await delay(40);
    return HttpResponse.json({ authenticated: true, user: { id: 'dev-user' } });
  }),
];
