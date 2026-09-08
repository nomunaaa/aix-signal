export type NewsSentiment = 'Bullish' | 'Bearish' | 'Neutral';

export interface SymbolNewsItem {
  id: string;
  symbol: string;
  title: string;
  source: string;
  minutesAgo: number;
  sentiment: NewsSentiment;
  llmComment: string;
  url: string;
}

const BASE: SymbolNewsItem[] = [
  {
    id: 'n-1',
    symbol: 'BTCUSDT',
    title: 'Bitcoin Surges Past $73,000 as Institutional Inflows Hit Record High',
    source: 'CoinDesk',
    minutesAgo: 25,
    sentiment: 'Bullish',
    llmComment:
      '기관 자금 유입이 사상 최고치를 기록하며 단기적으로 상승 압력이 강해질 것으로 보입니다. $75,000 저항선 돌파 시 추가 상승 여력이 있으나, 차익 실현 매물에 주의가 필요합니다.',
    url: 'https://www.coindesk.com/',
  },
  {
    id: 'n-2',
    symbol: 'BTCUSDT',
    title: 'BTC Funding Rates Cool as Leverage Resets Across Majors',
    source: 'The Block',
    minutesAgo: 52,
    sentiment: 'Neutral',
    llmComment:
      '펀딩비 하락은 과열 완화 신호로, 변동성 축소 구간에서 방향성 재확인이 필요합니다. 단기 롱·숏 밸런스가 맞춰지는지 지켜보는 편이 안전합니다.',
    url: 'https://www.theblock.co/',
  },
  {
    id: 'n-3',
    symbol: 'ETHUSDT',
    title: 'Ethereum Layer-2 Fees Drop 18% Week-over-Week',
    source: 'Decrypt',
    minutesAgo: 40,
    sentiment: 'Bullish',
    llmComment: 'L2 수수료 하락은 사용자 유입에 긍정적이며, ETH 베이스 레이어 수요와 결합될 때 상승 탄력이 커질 수 있습니다.',
    url: 'https://decrypt.co/',
  },
  {
    id: 'n-4',
    symbol: 'ETHUSDT',
    title: 'Spot ETH ETFs See Second Consecutive Day of Net Outflows',
    source: 'Bloomberg',
    minutesAgo: 110,
    sentiment: 'Bearish',
    llmComment: 'ETF 순유출은 단기 조정 압력으로 작용할 수 있으나, 구조적 흐름 판단에는 더 긴 샘플이 필요합니다.',
    url: 'https://www.bloomberg.com/',
  },
  {
    id: 'n-5',
    symbol: 'SOLUSDT',
    title: 'Solana DeFi TVL Climbs to Highest Level Since January',
    source: 'DefiLlama',
    minutesAgo: 33,
    sentiment: 'Bullish',
    llmComment: '온체인 유동성 회복은 네트워크 활동 반등과 동행하는 경우가 많아, 단기 모멘텀 쪽으로 해석됩니다.',
    url: 'https://defillama.com/',
  },
  {
    id: 'n-6',
    symbol: 'SOLUSDT',
    title: 'Network Congestion Returns After Memecoin Spike',
    source: 'CoinTelegraph',
    minutesAgo: 180,
    sentiment: 'Neutral',
    llmComment: '밈코인 급등 뒤에는 수수료·지연 증가가 따라오기 쉬워, 진입 타이밍에 보수적 접근이 필요합니다.',
    url: 'https://cointelegraph.com/',
  },
  {
    id: 'n-7',
    symbol: 'XRPUSDT',
    title: 'XRP Ledger Adds New AMM Patch in Latest Node Release',
    source: 'XRPL Labs',
    minutesAgo: 67,
    sentiment: 'Neutral',
    llmComment: '기술 업그레이드는 중기 펀더멘털에 기여할 수 있으나, 즉시 가격에 반영되지는 않을 수 있습니다.',
    url: 'https://xrpl.org/',
  },
  {
    id: 'n-8',
    symbol: 'BNBUSDT',
    title: 'BNB Chain Active Addresses Rise 9% in Seven Days',
    source: 'Artemis',
    minutesAgo: 19,
    sentiment: 'Bullish',
    llmComment: '활성 주소 증가는 생태계 관심 회복 신호로, 거래소 토큰 특성상 베타에 민감하니 BTC 흐름과 병행해 보세요.',
    url: 'https://app.artemis.xyz/',
  },
  {
    id: 'n-9',
    symbol: 'DOGEUSDT',
    title: 'Dogecoin Social Volume Spikes Ahead of Weekend',
    source: 'Santiment',
    minutesAgo: 95,
    sentiment: 'Bearish',
    llmComment: '소셜 과열은 역추세 지표로 쓰이는 경우가 많아, 단기 고점 구간에서는 분할 익절을 고려할 수 있습니다.',
    url: 'https://santiment.net/',
  },
  {
    id: 'n-10',
    symbol: 'ADAUSDT',
    title: 'Cardano Treasury Balance Hits New Milestone',
    source: 'IOHK Blog',
    minutesAgo: 210,
    sentiment: 'Bullish',
    llmComment: '재정 건전성은 장기 신뢰 요소이며, 단기 가격과는 시차를 두고 움직이는 편입니다.',
    url: 'https://iohk.io/',
  },
];

/** 종목별 10건 — 없는 심볼은 시드 기반으로 BASE 순환 */
export function newsItemsForSymbol(symbol: string): SymbolNewsItem[] {
  const sym = symbol.toUpperCase();
  const direct = BASE.filter((n) => n.symbol === sym);
  if (direct.length >= 10) return direct.slice(0, 10);
  let h = 0;
  for (let i = 0; i < sym.length; i++) h = (h * 31 + sym.charCodeAt(i)) | 0;
  const seed = Math.abs(h);
  const out: SymbolNewsItem[] = [...direct];
  let i = 0;
  while (out.length < 10) {
    const src = BASE[i % BASE.length]!;
    out.push({
      ...src,
      id: `${sym}-n-${out.length}`,
      symbol: sym,
      minutesAgo: 12 + ((seed + out.length * 17) % 400),
      title: `${sym.replace('USDT', '')} · ${src.title}`,
    });
    i++;
  }
  return out.slice(0, 10);
}

/** Zone4 등 레거시 import명 호환 */
export const getMockNewsForSymbol = newsItemsForSymbol;
