/**
 * PULSE Stream™ — 포맷터 유틸리티
 *
 * 가격, 퍼센트, PnL, 시간 등의 표시 형식을 통일한다.
 * cn() 은 shadcn이 설치한 @/lib/utils.ts 를 그대로 re-export.
 */

export { cn } from '@/lib/utils';

import { formatPrice as formatPriceCore, formatSignedDollarAmount } from '@/lib/format-price';

/**
 * 가격 포맷 (문자열, `$` 없음)
 * - `$\`{formatPrice(v)}\`` 처럼 접두 `$`를 붙이는 호출부용
 * - 음수 부호는 제거(호출부에서 부호·색 처리)
 */
export function formatPrice(value: number): string {
  if (!Number.isFinite(value)) return '\u2014';
  const t = formatPriceCore(value).text;
  return t.startsWith('-') ? t.slice(1) : t;
}

/**
 * 퍼센트 포맷
 * - 양수: "+1.23%" (text-trading-long 클래스)
 * - 음수: "-1.23%" (text-trading-short 클래스)
 * - 0: "0.00%"
 */
export function formatPercent(value: number, fractionDigits = 2): string {
  const sign = value > 0 ? '+' : '';
  const digits = Number.isFinite(fractionDigits)
    ? Math.min(12, Math.max(0, Math.floor(fractionDigits)))
    : 2;
  return `${sign}${value.toFixed(digits)}%`;
}

/** 게이트·요약 카드용 누적 PnL (USD), 부호 + 콤마 */
export function formatUsdSignedPnL(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(Math.round(value));
  return `${sign}$${abs.toLocaleString('en-US')}`;
}

/** className helper for percent coloring (bull/bear). */
export function percentColorClass(value: number): string {
  return value > 0 ? 'text-trading-long' : value < 0 ? 'text-trading-short' : 'text-text-secondary';
}

/**
 * PnL 포맷
 * - 양수: "+$123.45" (초록)
 * - 음수: "-$123.45" (빨강)
 */
export function formatPnl(value: number): { text: string; className: string } {
  const text = formatSignedDollarAmount(value, { positiveSign: true });
  const className =
    value > 0 ? 'text-trading-long' : value < 0 ? 'text-trading-short' : 'text-text-secondary';
  return { text, className };
}

/**
 * 보유 시간 포맷 (초 단위 입력)
 * - 60초 미만: "45초"
 * - 60분 미만: "3분 20초"
 * - 24시간 미만: "2시간 30분"
 * - 24시간 이상: "1일 3시간"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}초`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const secs = Math.floor(seconds % 60);
    return secs > 0 ? `${minutes}분 ${secs}초` : `${minutes}분`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}일 ${remainHours}시간` : `${days}일`;
}

/**
 * 보유 시간 포맷 (총 분)
 * - 비정상·음수: "—"
 * - 60분 미만: "32분"
 * - 60분 이상 24시간 미만: "2시간 30분"
 * - 24시간 이상: "1일 3시간"
 */
export function formatHoldingTime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '\u2014';
  if (minutes < 60) {
    return `${Math.floor(minutes)}분`;
  }
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
  }
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`;
}

/**
 * 진입 시각 → 상대 시간 포맷
 * - "방금 전", "3분 전", "1시간 전" 등
 */
export function formatEntryTime(isoString: string): string {
  const now = Date.now();
  const entry = new Date(isoString).getTime();
  const diffMs = now - entry;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}일 전`;
}

/**
 * 경과 시간(초) → 상대 시간 포맷
 * - "45초 전", "3분 전", "2시간 15분 전", "1일 3시간 전"
 */
export function formatElapsedTime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes === 0 ? `${hours}시간 전` : `${hours}시간 ${remainingMinutes}분 전`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours === 0 ? `${days}일 전` : `${days}일 ${remainingHours}시간 전`;
}

/**
 * 심볼 문자열 → 베이스/쿼트 쌍 포맷
 * - "BTCUSDT" → "BTC/USDT"
 */
export function formatSymbolPair(symbol: string): string {
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB'];
  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      return `${symbol.slice(0, -quote.length)}/${quote}`;
    }
  }
  return symbol;
}

/**
 * 절대 타임스탬프 포맷
 * - "06/22 03:22" (MM/DD HH:mm)
 * 진입시간, 청산시간에 사용
 */
export function formatTimestamp(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || isNaN(date.getTime())) return '\u2014';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day} ${hours}:${minutes}`;
}

/** 기존 라벨(예: `18분`, `1시간 30분`) → 통일된 보유시간 문자열 */
export function formatHoldDurationFromLabel(label: string | undefined | null): string {
  if (!label || !String(label).trim()) return '\u2014';
  const s = String(label).trim();
  let days = 0;
  let hours = 0;
  let mins = 0;
  const dm = s.match(/(\d+)\s*일/);
  const hm = s.match(/(\d+)\s*시간/);
  const mm = s.match(/(\d+)\s*분/);
  if (dm) days += parseInt(dm[1], 10);
  if (hm) hours += parseInt(hm[1], 10);
  if (mm) mins += parseInt(mm[1], 10);
  if (!dm && !hm && !mm) {
    const onlyMin = s.match(/^(\d+)\s*분$/);
    if (onlyMin) mins = parseInt(onlyMin[1], 10);
  }
  if (days === 0 && hours === 0 && mins === 0 && /^\d+$/.test(s)) mins = parseInt(s, 10);
  return formatHoldingTime(days * 1440 + hours * 60 + mins);
}

/**
 * 상대 시간 포맷 (전 접미사 포함)
 * - "3분전", "11시간 30분전", "2일 3시간전"
 * 추가진입시간, 비추세 추세변경시간에 사용
 */
export function formatRelativeAgo(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || isNaN(date.getTime())) return '\u2014';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return '방금';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금전';
  if (minutes < 60) return `${minutes}분전`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours < 24) {
    return remainMin > 0 ? `${hours}시간 ${remainMin}분전` : `${hours}시간전`;
  }
  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  return remainHours > 0 ? `${days}일 ${remainHours}시간전` : `${days}일전`;
}

/**
 * 마지막 업데이트 시각 → 상대 시간 라벨
 * - "32초 전 갱신", "5분 전 갱신"
 */
export function formatLastUpdated(d: Date | undefined | null): string {
  if (!d || typeof d.getTime !== 'function') return '—';
  const ms = d.getTime();
  if (!Number.isFinite(ms)) return '—';
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return `${sec}초 전 갱신`;
  const min = Math.floor(sec / 60);
  return `${min}분 전 갱신`;
}

/** 신호 발생 시각 기준 경과 — `2d 3h`, `2h 15m`, `45m` (스펙: *d *h *m) */
export function formatElapsedFromIso(createdAt: string | Date | undefined | null): string {
  if (!createdAt) return '\u2014';
  const t = typeof createdAt === 'string' ? new Date(createdAt).getTime() : createdAt.getTime();
  if (!Number.isFinite(t)) return '\u2014';
  const diff = Date.now() - t;
  if (diff < 0) return '0m';
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export type FreshnessGrade = 'fresh' | 'normal' | 'stale';

export function getFreshness(signalCreatedAt: string | Date): { grade: FreshnessGrade } {
  const minutes = (Date.now() - new Date(signalCreatedAt).getTime()) / 60000;
  if (minutes <= 30) return { grade: 'fresh' };
  if (minutes <= 60) return { grade: 'normal' };
  return { grade: 'stale' };
}

/** 툴팁용 — "32분 전 발생" */
export function formatMinutesSince(iso: string | Date): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return '';
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return '방금 발생';
  if (m < 60) return `${m}분 전 발생`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전 발생`;
  const d = Math.floor(m / (60 * 24));
  return `${d}일 전 발생`;
}
