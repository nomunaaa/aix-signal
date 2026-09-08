/**
 * Deterministic 24h mini-series for sparkline when API has no OHLCV samples.
 * Used by Pulse `buildOpenRowData` and signal `SectionTable`.
 */

function hashSymbolSeed(symbol: string): number {
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function buildMockSparkline24h(symbol: string, center: number, len = 36): number[] {
  const seed = hashSymbolSeed(symbol);
  const out: number[] = [];
  let v = center * (0.998 + (seed % 40) / 10000);
  for (let i = 0; i < len; i++) {
    v += Math.sin((seed + i) * 0.42) * center * 0.0015 + ((seed + i * 3) % 5 - 2) * center * 0.00008;
    out.push(v);
  }
  return out;
}
