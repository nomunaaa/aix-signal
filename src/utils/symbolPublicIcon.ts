/**
 * Public-folder symbol icons: `/public/symbols/{BASE}.svg` or `.png`
 * (BASE = quote-stripped id, e.g. BTCUSDT → BTC, 1000PEPEUSDT → 1000PEPE).
 */

const QUOTE_SUFFIXES = ['USDT', 'USD', 'USDC', 'BUSD', 'EUR', 'BTC', 'ETH'] as const;
const PUBLIC_SYMBOL_ICON_FILES = new Map<string, string>([
  ['AAVE', '/symbols/AAVE.svg'],
  ['ADA', '/symbols/ADA.svg'],
  ['ALGO', '/symbols/ALGO.svg'],
  ['APT', '/symbols/APT.svg'],
  ['ARB', '/symbols/ARB.svg'],
  ['ATOM', '/symbols/ATOM.svg'],
  ['AVAX', '/symbols/AVAX.svg'],
  ['BNB', '/symbols/BNB.svg'],
  ['BTC', '/symbols/BTC.svg'],
  ['DOGE', '/symbols/DOGE.svg'],
  ['DOT', '/symbols/DOT.svg'],
  ['ETC', '/symbols/ETC.svg'],
  ['ETH', '/symbols/ETH.svg'],
  ['FIL', '/symbols/FIL.svg'],
  ['HBTC', '/symbols/HBTC.svg'],
  ['ICP', '/symbols/ICP.svg'],
  ['INJ', '/symbols/INJ.svg'],
  ['LDO', '/symbols/LDO.svg'],
  ['LINK', '/symbols/LINK.svg'],
  ['LTC', '/symbols/LTC.svg'],
  ['MATIC', '/symbols/MATIC.svg'],
  ['NEAR', '/symbols/NEAR.svg'],
  ['OP', '/symbols/OP.svg'],
  ['SOL', '/symbols/SOL.svg'],
  ['STX', '/symbols/STX.svg'],
  ['SUI', '/symbols/SUI.svg'],
  ['TRX', '/symbols/TRX.svg'],
  ['UNI', '/symbols/UNI.svg'],
  ['VET', '/symbols/VET.svg'],
  ['XLM', '/symbols/XLM.svg'],
  ['XRP', '/symbols/XRP.svg'],
]);

/** Stable file/id for icon filenames. */
export function getSymbolIconBaseId(symbol: string): string {
  if (!symbol) return 'UNKNOWN';

  // Strip hyphen, colon, underscore. Written as alternation on purpose so the
  // literal does not form a bracket-class-with-colon shape that Tailwind's JIT
  // content scanner would try to emit as an arbitrary-property utility rule
  // (which produced invalid CSS like an empty `-` declaration on Vercel).
  let base = symbol.trim().replace(/-|:|_/g, '').toUpperCase();
  const slash = base.indexOf('/');
  if (slash > 0) {
    base = base.slice(0, slash);
  }
  for (const q of QUOTE_SUFFIXES) {
    if (base.endsWith(q) && base !== q) {
      base = base.slice(0, base.length - q.length);
      break;
    }
  }
  const id = base.replace(/[^A-Z0-9]/g, '');
  return id || 'UNKNOWN';
}

/** Short label when no image is available (max 3 chars). */
export function getCryptoInitialsForSymbol(symbol: string): string {
  const id = getSymbolIconBaseId(symbol);
  const letters = id.replace(/[^A-Z]/g, '');
  return (letters || symbol[0] || '?').slice(0, 3).toUpperCase();
}

/** 선물 티커용: 1000PEPE → PEPE 등 로컬 아이콘 파일명과 맞추기 (1000000을 1000보다 먼저 처리) */
function iconFilenameBaseVariants(baseId: string): string[] {
  const u = baseId.toUpperCase().replace(/[^A-Z0-9]/g, '') || 'UNKNOWN';
  const seen = new Set<string>();
  const add = (id: string) => {
    if (id && !seen.has(id)) seen.add(id);
  };
  add(u);
  if (u.startsWith('1000000') && u.length > 7) {
    add(u.slice(7));
  } else if (u.startsWith('1000') && u.length > 4) {
    add(u.slice(4));
  }
  return [...seen];
}

/** Try in order until one file exists (caller uses <img onError> or Image()). */
export function getPublicSymbolIconCandidates(baseId: string): readonly string[] {
  const out: string[] = [];
  const push = (u: string) => {
    if (!out.includes(u)) out.push(u);
  };
  for (const id of iconFilenameBaseVariants(baseId)) {
    const found = PUBLIC_SYMBOL_ICON_FILES.get(id.toUpperCase());
    if (found) push(found);
  }
  return out;
}
