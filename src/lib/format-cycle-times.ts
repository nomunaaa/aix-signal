/**
 * AIX-54: 대기중·히스토리 시간 표기 통일
 */

/** `MM/DD HH:MM` (로컬) */
export function formatMmDdSlashHm(value: Date | string | undefined): string {
  if (!value) return '\u2014';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '\u2014';
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}

/** 보유: `H시간 M분` (입력이 분만 있으면 `N분`만) */
export function formatHoldHmFromMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '\u2014';
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  if (h <= 0) return `${m}분`;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}
