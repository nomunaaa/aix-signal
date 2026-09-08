/**
 * Mock 모드 마스터 스위치 + 페이지별 세부 제어
 *
 * 우선순위:
 *   NEXT_PUBLIC_USE_MOCK (마스터) ⇒ 모든 페이지 Mock
 *   없으면 NEXT_PUBLIC_USE_MOCK_* (페이지별) 사용
 *
 * 서버/클라이언트 모두 안전 (NEXT_PUBLIC_ 접두사).
 */

const toBool = (v: string | undefined) => v === 'true' || v === '1';

export const USE_MOCK_MASTER = toBool(process.env.NEXT_PUBLIC_USE_MOCK);

export const USE_MOCK_TREND =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_TREND);

export const USE_MOCK_SIGNALS =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_SIGNALS);

export const USE_MOCK_SIGNAL_DETAIL =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_SIGNAL_DETAIL);

export const USE_MOCK_CHART =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_CHART);

export const USE_MOCK_MY =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_MY);

export const USE_MOCK_PROOF =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_PROOF);

export const USE_MOCK_MARKET_COMMENTARY =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_MARKET_COMMENTARY);

/** 인사이트/마켓 코멘터리 — 레거시 `NEXT_PUBLIC_USE_MOCK_INSIGHTS` 단독 켜기용 */
export const USE_MOCK_INSIGHTS =
  USE_MOCK_MASTER || toBool(process.env.NEXT_PUBLIC_USE_MOCK_INSIGHTS);
