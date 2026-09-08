/**
 * 색상 상수 및 유틸리티
 */

// 색상 상수
export const COLORS = {
  BLUE: '#2f80ed',      // 하락 추세
  GRAY: '#9aa0a6',      // 중립/비추세 (초기값 또는 승계 불가 시)
  RED: '#eb5757',       // 상승 추세
  YELLOW: '#f2c94c',    // 변동성 중간
} as const;

/**
 * 장기추세 색상 결정
 * @param value -100(하락), 0(중립), 100(상승)
 * @param lastColor 이전 색상 (승계용)
 * @returns 색상 코드
 */
export function getLongTrendColor(value: number | null | undefined, lastColor?: string): string {
  if (value === null || value === undefined) {
    // 이전 색상이 있으면 승계, 없으면 회색
    return lastColor || COLORS.GRAY;
  }
  if (value < 0) return COLORS.BLUE;
  if (value === 0) return COLORS.GRAY;
  return COLORS.RED;
}

/**
 * 단기추세 색상 결정
 * @param value -100(하락), 0(중립), 100(상승)
 * @param lastColor 이전 색상 (승계용)
 * @returns 색상 코드
 */
export function getShortTrendColor(value: number | null | undefined, lastColor?: string): string {
  if (value === null || value === undefined) {
    // 이전 색상이 있으면 승계, 없으면 회색
    return lastColor || COLORS.GRAY;
  }
  if (value < 0) return COLORS.BLUE;
  if (value === 0) return COLORS.GRAY;
  return COLORS.RED;
}

/**
 * 변동성 색상 결정
 * @param value -200(낮음), 0(중간), 200(높음)
 * @param lastColor 이전 색상 (승계용)
 * @returns 색상 코드
 */
export function getVolColor(value: number | null | undefined, lastColor?: string): string {
  if (value === null || value === undefined) {
    // 이전 색상이 있으면 승계, 없으면 회색
    return lastColor || COLORS.GRAY;
  }
  if (value < 0) return COLORS.GRAY;
  if (value === 0) return COLORS.YELLOW;
  return COLORS.RED;
}
