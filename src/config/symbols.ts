import { normalizePlanCode } from '@/config/plans';
import { PUBLIC_BROWSING } from '@/config/access';

/**
 * 종목 설정 및 정렬 유틸리티
 * 거래량 상위 5위를 먼저 정렬한 후 A-Z 순으로 정렬
 */

// ✅ 거래량 상위 5위 종목 (2024년 기준)
export const VOLUME_TOP5_SYMBOLS = [
  'BTCUSDT',  // 비트코인 - 거래량 1위
  'ETHUSDT',  // 이더리움 - 거래량 2위
  'SOLUSDT',  // 솔라나 - 거래량 3위
  'BNBUSDT',  // 바이낸스 코인 - 거래량 4위
  'XRPUSDT'   // 리플 - 거래량 5위
];

// ✅ 전체 30개 종목 리스트
export const ALL_SYMBOLS = [
  'ADAUSDT',  // 카르다노
  'APTUSDT',  // 앱토스
  'ARBUSDT',  // 아비트럼
  'ATOMUSDT', // 코스모스
  'AVAXUSDT', // 아발란체
  'BCHUSDT',  // 비트코인 캐시
  'BNBUSDT',  // 바이낸스 코인 (거래량 4위)
  'BTCUSDT',  // 비트코인 (거래량 1위)
  'DOGEUSDT', // 도지코인
  'DOTUSDT',  // 폴카닷
  'ETHUSDT',  // 이더리움 (거래량 2위)
  'FILUSDT',  // 파일코인
  'GALAUSDT', // 갈라
  'INJUSDT',  // 인젝티브
  'LDOUSDT',  // 리도 DAO
  'LINKUSDT', // 체인링크
  'LTCUSDT',  // 라이트코인
  'NEARUSDT', // 니어 프로토콜
  'OPUSDT',   // 옵티미즘
  'POLUSDT',  // 폴리곤
  'PYTHUSDT', // 파이스
  'SANDUSDT', // 샌드박스
  'SEIUSDT',  // 세이
  'SOLUSDT',  // 솔라나 (거래량 3위)
  'STXUSDT',  // 스택스
  'SUIUSDT',  // 수이
  'TONUSDT',  // 텔레그램
  'UNIUSDT',  // 유니스왑
  'XRPUSDT',  // 리플 (거래량 5위)
  'ZECUSDT'   // 지캐시
];

export const SYMBOL_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  BNB: 'BNB',
  XRP: 'XRP',
  ADA: 'Cardano',
  DOGE: 'Dogecoin',
  AVAX: 'Avalanche',
  DOT: 'Polkadot',
  LINK: 'Chainlink',
  LTC: 'Litecoin',
  ATOM: 'Cosmos',
  UNI: 'Uniswap',
  FIL: 'Filecoin',
  NEAR: 'NEAR Protocol',
  APT: 'Aptos',
  ARB: 'Arbitrum',
  OP: 'Optimism',
  SUI: 'Sui',
  INJ: 'Injective',
  SEI: 'Sei',
  STX: 'Stacks',
  BCH: 'Bitcoin Cash',
  GALA: 'Gala',
  LDO: 'Lido DAO',
  POL: 'Polygon Ecosystem Token',
  PYTH: 'Pyth Network',
  SAND: 'The Sandbox',
  TON: 'Toncoin',
  ZEC: 'Zcash',
};

/**
 * 거래량 상위 5위를 먼저 정렬한 후 A-Z 순으로 정렬된 종목 리스트 반환
 * @param symbols - 정렬할 종목 리스트 (기본값: ALL_SYMBOLS)
 * @returns 정렬된 종목 리스트
 */
export function getSortedSymbols(symbols: string[] = ALL_SYMBOLS): string[] {
  // 거래량 상위 5위 종목들
  const volumeTop5 = symbols.filter(symbol => VOLUME_TOP5_SYMBOLS.includes(symbol));
  
  // 나머지 종목들 (거래량 상위 5위 제외)
  const otherSymbols = symbols.filter(symbol => !VOLUME_TOP5_SYMBOLS.includes(symbol));
  
  // 거래량 상위 5위는 VOLUME_TOP5_SYMBOLS 순서대로 정렬
  const sortedVolumeTop5 = VOLUME_TOP5_SYMBOLS.filter(symbol => volumeTop5.includes(symbol));
  
  // 나머지 종목들은 A-Z 순으로 정렬
  const sortedOtherSymbols = otherSymbols.sort((a, b) => a.localeCompare(b));
  
  // 거래량 상위 5위 + 나머지 종목들 순서로 결합
  return [...sortedVolumeTop5, ...sortedOtherSymbols];
}

/**
 * 기본 정렬된 종목 리스트 반환 (거래량 상위 5위 + A-Z)
 */
export const SORTED_SYMBOLS = getSortedSymbols();

/**
 * 환경변수에서 종목 리스트를 가져오거나 기본값 사용
 */
export function getSymbolsFromEnv(): string[] {
  const envSymbols = process.env.NEXT_PUBLIC_SYMBOL_LIST;
  if (envSymbols) {
    const symbols = envSymbols.split(',').map((s: string) => s.trim()).filter(Boolean);
    return getSortedSymbols(symbols);
  }
  return SORTED_SYMBOLS;
}

/**
 * 구독 플랜에 따라 차트에서 볼 수 있는 종목 리스트 반환.
 * - free: no market data symbols
 * - pro: all symbols
 *
 * 이 함수 하나가 앱 전체의 "Upgrade required" 벽을 만든다. 차트(1m/5m/10m/15m,
 * 멀티차트), 트렌드 스캐너, SymbolHub, 실시간 브리핑이 모두 여기서 나온
 * 빈 배열을 보고 업그레이드 화면을 띄운다 — 10개 파일이 이 한 줄에 걸려 있다.
 *
 * PUBLIC_BROWSING이 켜져 있으면 free도 전체 종목을 받는다. 공개 열람의 목적이
 * "모든 화면을 볼 수 있게" 하는 것인데, 로그인하지 않은 방문자는 항상 free라
 * 여기서 빈 배열을 받으면 로그인 벽을 걷어내도 업그레이드 벽에 다시 막힌다.
 *
 * ⚠️ 이건 수익 경계선이다. 켜는 순간 비로그인 방문자뿐 아니라 **로그인한 free
 * 사용자도** Pro의 시세 데이터를 보게 된다. 유료 구분을 되살리려면
 * NEXT_PUBLIC_PUBLIC_BROWSING=0 으로 끄면 이 함수도 원래 동작으로 돌아온다.
 */
export function getAllowedSymbols(
  plan: unknown,
  symbols: string[] = getSymbolsFromEnv()
): string[] {
  const normalizedPlan = normalizePlanCode(plan);

  if (normalizedPlan === 'free' && !PUBLIC_BROWSING) {
    return [];
  }

  return symbols;
}

export function canAccessSymbol(
  plan: unknown,
  symbol: string | null | undefined,
  symbols: string[] = getSymbolsFromEnv()
): boolean {
  if (!symbol) return false;
  return getAllowedSymbols(plan, symbols).includes(symbol.trim().toUpperCase());
}

/**
 * 종목 정보 타입
 */
export interface SymbolInfo {
  symbol: string;
  name: string;
  isVolumeTop5: boolean;
  volumeRank?: number;
}

/**
 * 종목 정보 객체 생성
 */
export function getSymbolInfo(symbol: string): SymbolInfo {
  const volumeRank = VOLUME_TOP5_SYMBOLS.indexOf(symbol) + 1;
  return {
    symbol,
    name: symbol.replace('USDT', ''),
    isVolumeTop5: VOLUME_TOP5_SYMBOLS.includes(symbol),
    volumeRank: volumeRank > 0 ? volumeRank : undefined
  };
}

/**
 * 모든 종목의 정보 반환
 */
export function getAllSymbolsInfo(): SymbolInfo[] {
  return SORTED_SYMBOLS.map(getSymbolInfo);
}

/**
 * 거래량 상위 5위 종목 정보만 반환
 */
export function getVolumeTop5Info(): SymbolInfo[] {
  return VOLUME_TOP5_SYMBOLS.map(getSymbolInfo);
}
