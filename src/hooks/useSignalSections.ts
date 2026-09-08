/**
 * useSignalSections Hook
 * 6개 섹션별 시그널 데이터 + Narrative Headlines 생성
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type SectionType = 
  | 'trend_entry'   // Trend - Valid Entry
  | 'trend_pos'     // Trend - Profit Taking
  | 'ct_entry'      // CounterTrend - Valid Entry
  | 'ct_pos'        // CounterTrend - Profit Taking
  | 'new'           // New Signals
  | 'closed';       // Closed Positions

export interface SectionSignal {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  price: number;
  entryTime: number;
  pnl?: number;        // Profit Taking 섹션용
  pnlPct?: number;     // %
  discount?: number;   // Valid Entry 섹션용 (%)
  conf: number;
}

export interface SignalSection {
  type: SectionType;
  signals: SectionSignal[];
  topAsset: SectionSignal | null;
  headline: string | null;
}

export interface SignalSectionsData {
  sections: {
    trendEntry: SignalSection;
    trendProfit: SignalSection;
    ctEntry: SignalSection;
    ctProfit: SignalSection;
    newSignals: SignalSection;
    closed: SignalSection;
  };
  headlines: {
    trendProfit: string | null;
    trendValid: string | null;
    ctProfit: string | null;
    ctValid: string | null;
  };
}

/**
 * 섹션별 Narrative Headline 생성
 */
function generateHeadline(
  section: SectionType,
  topAsset: SectionSignal | null
): string | null {
  if (!topAsset) return null;
  
  const symbol = topAsset.symbol.replace('USDT', '');
  const side = topAsset.side === 'LONG' ? '롱' : '숏';
  
  switch (section) {
    case 'trend_pos': {
      // Trend - Profit Taking
      const pnl = topAsset.pnlPct || 0;
      if (pnl > 10) {
        return `${symbol} ${side}이 추세를 타고 있습니다! (+${pnl.toFixed(1)}%) 🌊 추적 손절 고려하세요.`;
      } else {
        return `${symbol} ${side}, 꾸준한 수익 (+${pnl.toFixed(1)}%) - 저항선 주시하세요.`;
      }
    }
    
    case 'trend_entry': {
      // Trend - Valid Entry (Discount)
      const discount = topAsset.discount || 0;
      return `${symbol} ${side} 되돌림 기회! ${discount.toFixed(1)}% 할인 중입니다.`;
    }
    
    case 'ct_pos': {
      // CounterTrend - Profit Taking
      const pnl = topAsset.pnlPct || 0;
      return `${symbol} ${side} 역추세 공격 성공! (+${pnl.toFixed(1)}%) ⚡ 빠른 청산 권장합니다.`;
    }
    
    case 'ct_entry': {
      // CounterTrend - Valid Entry
      return `${symbol} ${side}이 반전 구간에 접근 중입니다.`;
    }
    
    default:
      return null;
  }
}

/**
 * 섹션별 Top Asset 찾기
 */
function findTopAsset(
  signals: SectionSignal[],
  section: SectionType
): SectionSignal | null {
  if (signals.length === 0) return null;
  
  // Profit Taking 섹션: PnL 기준 정렬
  if (section === 'trend_pos' || section === 'ct_pos') {
    const sorted = [...signals].sort((a, b) => (b.pnlPct || 0) - (a.pnlPct || 0));
    return sorted[0];
  }
  
  // Valid Entry 섹션: Discount 기준 정렬
  if (section === 'trend_entry' || section === 'ct_entry') {
    const sorted = [...signals].sort((a, b) => (b.discount || 0) - (a.discount || 0));
    return sorted[0];
  }
  
  // 나머지: 신뢰도 기준
  const sorted = [...signals].sort((a, b) => b.conf - a.conf);
  return sorted[0];
}

/**
 * useSignalSections Hook
 * 
 * @returns 6개 섹션 데이터 + 4개 Narrative Headlines
 */
export function useSignalSections() {
  const [data, setData] = useState<SignalSectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Edge Function 연결 실패 시 재시도 중단 (배포 안 된 환경 대응)
  const [disabled, setDisabled] = useState(false);
  const [failCount, setFailCount] = useState(0);

  useEffect(() => {
    if (disabled) return;

    fetchSections();

    // 30초마다 자동 갱신
    const interval = setInterval(() => {
      if (!disabled) fetchSections();
    }, 30000);
    return () => clearInterval(interval);
  }, [disabled]);

  async function fetchSections() {
    try {
      setLoading(true);

      // track-signal-positions Edge Function 호출
      const { data: positionsData, error: fetchError } = await supabase.functions.invoke(
        'track-signal-positions',
        { body: {} }
      );

      if (fetchError) throw fetchError;

      const rawSections = positionsData?.sections || {};

      // 각 섹션 데이터 파싱
      const sections = {
        trendEntry: parseSection('trend_entry', rawSections.trend_entry?.positions || []),
        trendProfit: parseSection('trend_pos', rawSections.trend_pos?.positions || []),
        ctEntry: parseSection('ct_entry', rawSections.ct_entry?.positions || []),
        ctProfit: parseSection('ct_pos', rawSections.ct_pos?.positions || []),
        newSignals: parseSection('new', rawSections.new?.positions || []),
        closed: parseSection('closed', rawSections.closed?.positions || []),
      };

      // Headlines 생성
      const headlines = {
        trendProfit: sections.trendProfit.headline,
        trendValid: sections.trendEntry.headline,
        ctProfit: sections.ctProfit.headline,
        ctValid: sections.ctEntry.headline,
      };

      setData({ sections, headlines });
      setError(null);
      setFailCount(0);
    } catch (err) {
      const newCount = failCount + 1;
      setFailCount(newCount);

      // FunctionsFetchError 3회 연속 실패 시 폴링 중단 (Edge Function 미배포 환경)
      if (newCount >= 3 && String(err).includes('FunctionsFetchError')) {
        console.warn('[useSignalSections] Edge Function 연결 불가 - 폴링 중단 (track-signal-positions 미배포 또는 네트워크 오류)');
        setDisabled(true);
      } else if (newCount <= 1) {
        // 첫 번째 실패만 로그 출력
        console.warn('[useSignalSections] Edge Function 호출 실패:', err);
      }
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }

  return { data, loading, error, refetch: fetchSections };
}

/**
 * 섹션 데이터 파싱
 */
 
function parseSection(type: SectionType, rawPositions: any[]): SignalSection {
  const signals: SectionSignal[] = rawPositions.map(pos => ({
    id: pos.id || `${pos.symbol}-${pos.entry_time}`,
    symbol: pos.symbol,
    side: pos.side,
    price: pos.price || 0,
    entryTime: pos.entry_time ? new Date(pos.entry_time).getTime() / 1000 : 0,
    pnl: pos.pnl,
    pnlPct: pos.pnl_pct,
    discount: pos.discount_pct,
    conf: pos.confidence || 70,
  }));
  
  const topAsset = findTopAsset(signals, type);
  const headline = generateHeadline(type, topAsset);
  
  return {
    type,
    signals,
    topAsset,
    headline,
  };
}

