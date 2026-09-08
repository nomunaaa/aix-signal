import { SYMBOL_STATS } from '@/lib/mock/realistic-data';

export interface WinLossPoint {
  win: boolean;
  pnlPct: number;
  dayLabel: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** 최근 10회 승패 + PnL% + 날짜 라벨 (목) */
export function winLossStripForSymbol(symbol: string): WinLossPoint[] {
  const sym = symbol.toUpperCase();
  const st = SYMBOL_STATS[sym] ?? SYMBOL_STATS.BTCUSDT;
  const seed = hash(sym);
  const out: WinLossPoint[] = [];
  for (let i = 0; i < 10; i++) {
    const w = ((seed + i * 13) % 100) < st.win_rate;
    const pnl = w
      ? +((0.5 + ((seed + i * 3) % 30) / 10) * (st.avg_pnl / 8)).toFixed(1)
      : +((-0.3 - ((seed + i * 5) % 18) / 10) * (st.avg_pnl / 6)).toFixed(1);
    const d = new Date();
    d.setDate(d.getDate() - i - ((seed + i) % 2));
    out.push({
      win: w,
      pnlPct: pnl,
      dayLabel: `${d.getMonth() + 1}/${d.getDate()}`,
    });
  }
  return out;
}
