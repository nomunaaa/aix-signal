import { faker } from '@faker-js/faker';

export interface MockStrategyStats {
  id: string;
  name: string;
  nameEn: string;
  winRate: number;
  returnRate: number;
  sharpeRatio: number;
  totalTrades: number;
  maxDrawdown: number;
}

/**
 * 전략별 통계 생성
 *
 * 핵심: 전략이 복잡할수록 성과가 좋아지는 현실적 경향 반영
 * - oneshot: 기본 성과
 * - safe: 승률 높음 (확정 수익으로 손실 회피)
 * - deep: 수익률 높음 (평단 낮춰서 수익 극대화)
 * - full: 승률 + 수익률 모두 최고
 */
export function createStrategyStats(): MockStrategyStats[] {
  const jitter = (base: number, range: number) =>
    +(base + faker.number.float({ min: -range, max: range, fractionDigits: 1 })).toFixed(1);

  return [
    {
      id: 'oneshot',
      name: '원샷',
      nameEn: 'One Shot',
      winRate: jitter(72, 2),
      returnRate: jitter(4.2, 0.8),
      sharpeRatio: jitter(1.1, 0.2),
      totalTrades: faker.number.int({ min: 800, max: 1200 }),
      maxDrawdown: jitter(-8.5, 1.5),
    },
    {
      id: 'safe',
      name: '세이프',
      nameEn: 'Safe Play',
      winRate: jitter(78, 2),
      returnRate: jitter(6.3, 1.0),
      sharpeRatio: jitter(1.4, 0.2),
      totalTrades: faker.number.int({ min: 800, max: 1200 }),
      maxDrawdown: jitter(-5.2, 1.0),
    },
    {
      id: 'deep',
      name: '딥바이',
      nameEn: 'Deep Buy',
      winRate: jitter(69, 2),
      returnRate: jitter(8.7, 1.5),
      sharpeRatio: jitter(1.2, 0.2),
      totalTrades: faker.number.int({ min: 800, max: 1200 }),
      maxDrawdown: jitter(-12.3, 2.0),
    },
    {
      id: 'full',
      name: '풀옵션',
      nameEn: 'Full Option',
      winRate: jitter(81, 2),
      returnRate: jitter(11.2, 1.5),
      sharpeRatio: jitter(1.8, 0.3),
      totalTrades: faker.number.int({ min: 800, max: 1200 }),
      maxDrawdown: jitter(-7.1, 1.5),
    },
  ];
}
