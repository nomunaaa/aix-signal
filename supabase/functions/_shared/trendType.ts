/**
 * trendType 분류 로직 (백엔드 전용)
 * 신호 발생 시점에 단 한 번 계산되는 정적 정보
 */

export type TrendTypeGrade = 'S' | 'A' | 'B' | 'C' | 'D';

export interface TrendContext {
  longTrend: 'up' | 'down' | 'neutral';
  shortTrend: 'up' | 'down' | 'neutral';
  direction: 'long' | 'short';
}

/**
 * 18개 시나리오 매트릭스 기반 trendType 등급 분류
 * 
 * @param context - 추세 및 방향 정보
 * @returns S, A, B, C, D 등급
 */
export function classifyTrendType(context: TrendContext): TrendTypeGrade {
  const { longTrend, shortTrend, direction } = context;

  // === LONG 신호 분류 (9가지 케이스) ===
  if (direction === 'long') {
    // S등급: 장기↑ + 단기↑ (완벽한 상승 추세)
    if (longTrend === 'up' && shortTrend === 'up') {
      return 'S';
    }
    
    // A등급: 장기↑ + 단기보합 (상승 추세 유지)
    if (longTrend === 'up' && shortTrend === 'neutral') {
      return 'A';
    }
    
    // B등급: 장기보합 + 단기↑ (단기 모멘텀)
    if (longTrend === 'neutral' && shortTrend === 'up') {
      return 'B';
    }
    
    // C등급: 장기보합 + 단기보합 OR 장기↑ + 단기↓ (약한 신호)
    if (
      (longTrend === 'neutral' && shortTrend === 'neutral') ||
      (longTrend === 'up' && shortTrend === 'down')
    ) {
      return 'C';
    }
    
    // D등급: 장기↓ (하락 추세 속 롱 진입 - 위험)
    if (longTrend === 'down') {
      return 'D';
    }
  }

  // === SHORT 신호 분류 (9가지 케이스) ===
  if (direction === 'short') {
    // S등급: 장기↓ + 단기↓ (완벽한 하락 추세)
    if (longTrend === 'down' && shortTrend === 'down') {
      return 'S';
    }
    
    // A등급: 장기↓ + 단기보합 (하락 추세 유지)
    if (longTrend === 'down' && shortTrend === 'neutral') {
      return 'A';
    }
    
    // B등급: 장기보합 + 단기↓ (단기 하락 모멘텀)
    if (longTrend === 'neutral' && shortTrend === 'down') {
      return 'B';
    }
    
    // C등급: 장기보합 + 단기보합 OR 장기↓ + 단기↑ (약한 신호)
    if (
      (longTrend === 'neutral' && shortTrend === 'neutral') ||
      (longTrend === 'down' && shortTrend === 'up')
    ) {
      return 'C';
    }
    
    // D등급: 장기↑ (상승 추세 속 숏 진입 - 위험)
    if (longTrend === 'up') {
      return 'D';
    }
  }

  // 기본값 (정의되지 않은 케이스 방어)
  return 'C';
}

/**
 * trendType 등급별 설명 반환
 */
export function getTrendTypeDescription(grade: TrendTypeGrade): string {
  const descriptions: Record<TrendTypeGrade, string> = {
    S: '완벽한 추세 일치 - 최고 신뢰도',
    A: '강한 추세 지지 - 높은 신뢰도',
    B: '단기 모멘텀 - 중간 신뢰도',
    C: '약한 신호 - 신중한 접근 필요',
    D: '역추세 진입 - 고위험',
  };
  return descriptions[grade];
}

/**
 * trendType 등급별 신뢰도 점수 (0-100)
 */
export function getTrendTypeConfidence(grade: TrendTypeGrade): number {
  const confidenceMap: Record<TrendTypeGrade, number> = {
    S: 95,
    A: 85,
    B: 70,
    C: 55,
    D: 35,
  };
  return confidenceMap[grade];
}
