import type {
  ActionCard,
  ActionCategory,
  ActionRecommendationInput,
  ActionRecommendationResult,
  ActionRiskLevel,
} from '@/types/action-card';
import { getVolatilityType, type MockSignal } from '@/lib/mock/realistic-data';

function card(
  category: ActionCategory,
  label: string,
  detail: string,
  risk: ActionRiskLevel,
): ActionCard {
  return { category, label, detail, risk };
}

/** 단기·장기 불일치 유형 + 변동성 → 스펙 표 6행 매핑 */
export function resolveActionRecommendations(input: ActionRecommendationInput): ActionRecommendationResult {
  const { shortTrend, longTrend, volatility } = input;
  const chop = volatility === 'low' || volatility === 'none';

  const longMismatch = shortTrend === 'up' && longTrend === 'down';
  const shortMismatch = shortTrend === 'down' && longTrend === 'up';
  const bothConflict = longMismatch || shortMismatch;

  if (bothConflict) {
    if (longMismatch) {
      if (chop) {
        return {
          primary: card('WAIT', 'WAIT — 추세 확인될 때까지 대기', '단기·장기 방향 상충 · 횡보', 'LOW'),
          alternatives: [
            card('EXIT', 'EXIT — 손실 최소화 청산', '비추세 구간 방어', 'LOW'),
            card('META', 'META — 세이프(분할청산) 전환', '변동성 낮을 때 포지션 정리', 'MEDIUM'),
          ],
        };
      }
      return {
        primary: card('HEDGE', 'HEDGE — 반대 헤지', '등락장 · 장기 불일치', 'HIGH'),
        alternatives: [card('EXIT', 'EXIT — 즉시 청산', '급변 구간 손절 우선', 'HIGH')],
      };
    }

    if (shortMismatch) {
      if (chop) {
        return {
          primary: card('WAIT', 'WAIT — 단기 반전 대기', '단기 불일치 · 횡보', 'MEDIUM'),
          alternatives: [card('META', 'META — 세이프 전환', '분할 청산으로 리스크 축소', 'MEDIUM')],
        };
      }
      return {
        primary: card('EXIT', 'EXIT — 손절 후 재진입', '단기 불일치 · 등락', 'HIGH'),
        alternatives: [card('HEDGE', 'HEDGE — 부분 헤지', '노출 축소', 'HIGH')],
      };
    }
  }

  return {
    primary: card('WAIT', 'WAIT — 맥락 확인', '추세 정렬 대기', 'LOW'),
    alternatives: [],
  };
}

/** 심볼·목 시그널로 비추세 액션 권장 (Zone4) */
export function getActionRecommendationForSignal(
  symbol: string,
  signal: MockSignal,
): ActionRecommendationResult {
  return resolveActionRecommendations({
    shortTrend: signal.short_trend,
    longTrend: signal.long_trend,
    volatility: getVolatilityType(symbol),
  });
}

