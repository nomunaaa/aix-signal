import { normalizeTradingCategory } from '@/lib/trading-category';
import type { Signal, ClosedSignal } from '../types/pulse.types';
import type { FeedSignal } from './section';

/**
 * 시그널 하나를 가리키는 차트 경로를 만든다. History(청산된 사이클)는 그 사이클이
 * 실제로 열려 있던 진입~청산 구간의 차트로 바로 이동하도록 entryTime/exitTime을
 * 심는다 — Chart1m/5m/10m/15m가 이미 지원하는 딥링크 파라미터이며(/history 페이지
 * QR 링크와 동일한 방식), open 시그널은 closedAt이 없으므로 이 분기를 타지 않아
 * 기존 동작이 그대로 유지된다.
 */
export function chartPathForSignal(signal: FeedSignal): string {
  const barinterval = (signal as Signal | ClosedSignal).barinterval;
  const basePath = barinterval === '10m' ? '/chart10m' : '/chart1m';
  const symbol = signal.symbol.trim().toUpperCase();
  const params = new URLSearchParams({ symbol });
  const tradingCategory = normalizeTradingCategory(
    (signal as Signal | ClosedSignal).tradingCategory
  );
  if (tradingCategory) params.set('tradingCategory', tradingCategory);

  // entryTime은 열린 시그널(엔트리만 있음)과 청산된 시그널(엔트리+청산 모두 있음)
  // 둘 다에 심는다 — 열린 시그널을 클릭해도 "지금 이 순간"이 아니라 그 시그널이
  // 실제로 발생한 진입 시점의 차트로 이동해야 한다. exitTime은 청산된 시그널일
  // 때만 추가로 심는다.
  const closed = signal as Partial<ClosedSignal>;
  if (closed.enteredAt) {
    const entryMs = new Date(closed.enteredAt).getTime();
    if (Number.isFinite(entryMs)) {
      params.set('entryTime', String(entryMs));
      if (closed.closedAt) {
        const exitMs = new Date(closed.closedAt).getTime();
        if (Number.isFinite(exitMs)) {
          params.set('exitTime', String(exitMs));
        }
      }
    }
  }

  return `${basePath}?${params.toString()}`;
}

/** chartPathForSignal의 절대 URL 버전 — QR 코드 등 외부에서 열 수 있는 링크가 필요할 때 사용. */
export function chartAbsoluteLinkForSignal(signal: FeedSignal): string {
  const path = chartPathForSignal(signal);
  if (typeof window === 'undefined') return path;
  return `${window.location.origin}${path}`;
}
