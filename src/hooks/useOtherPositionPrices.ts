/**
 * 차트에서 현재 보고 있지 않은 다른 모의매매 오픈 포지션들의 현재가를 주기적으로 가져온다.
 * 활성 심볼은 차트 자체의 실시간 가격 피드를 쓰므로 이 훅의 대상이 아니다.
 */
import { useEffect, useMemo, useState } from 'react';
import { useSymbolStore } from '@/stores/symbolStore';

const POLL_INTERVAL_MS = 5000;

export function useOtherPositionPrices(symbols: readonly string[]): Record<string, number> {
  const fetchBinancePrices = useSymbolStore((s) => s.fetchBinancePrices);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const symbolsKey = useMemo(() => [...new Set(symbols)].sort().join(','), [symbols]);

  useEffect(() => {
    const list = symbolsKey ? symbolsKey.split(',') : [];
    if (list.length === 0) {
      setPrices({});
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const result = await fetchBinancePrices(list);
        if (cancelled) return;
        setPrices((prev) => {
          const next = { ...prev };
          result.forEach((data, symbol) => {
            next[symbol] = data.price;
          });
          return next;
        });
      } catch {
        // 실패 시 마지막으로 받은 값을 유지한다.
      }
    };

    void poll();
    const timerId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timerId);
    };
  }, [symbolsKey, fetchBinancePrices]);

  return prices;
}
