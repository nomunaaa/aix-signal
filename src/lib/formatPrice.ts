/**
 * 가격·퍼센트·손익 포맷 (레거시 모듈)
 * 가격 본문은 `@/lib/format-price` 단일 구현을 사용한다.
 */
import { formatPrice as formatPriceBracket, formatPriceWithDollar } from "./format-price";

/**
 * 달러 포함 문자열 (카드·요약 등 Intl 스타일 대체)
 */
export function formatPrice(price: number): string {
  return formatPriceWithDollar(price);
}

/**
 * 달러 기호 없이 숫자만 포맷
 */
export function formatPriceNumber(price: number): string {
  return formatPriceBracket(price).text.replace(/^-/, "");
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * URL-safe 심볼 변환
 */
export function toUrlSafeSymbol(symbol: string): string {
  return symbol.replace(/\//g, "").toLowerCase();
}

/**
 * URL-safe 심볼을 원본으로 복원
 */
export function fromUrlSafeSymbol(urlSymbol: string): string {
  return urlSymbol.toUpperCase();
}

/**
 * 숫자에 천 단위 콤마 추가 (달러 기호 없음)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * 손익금 포맷팅 (색상 정보 포함)
 */
export function formatPnl(pnl: number, showSign: boolean = true): { text: string; color: string } {
  const formatted = formatPriceWithDollar(pnl);
  const text = showSign && pnl > 0 ? `+${formatted}` : formatted;

  const color =
    pnl > 0 ? "text-semantic-bull" : pnl < 0 ? "text-semantic-bear" : "text-semantic-neutral";

  return { text, color };
}

/**
 * 손익률 포맷팅 (색상 정보 포함)
 */
export function formatRoe(roe: number): { text: string; color: string } {
  const text = formatPercent(roe);
  const color =
    roe > 0 ? "text-semantic-bull" : roe < 0 ? "text-semantic-bear" : "text-semantic-neutral";
  return { text, color };
}
