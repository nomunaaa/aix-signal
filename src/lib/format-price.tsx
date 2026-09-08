import type { ReactNode } from 'react';

/** `tableCell`: AG Grid 등 밀집 표 — 아래첨자 없이 한 줄 소수만 사용 */
export type FormatPriceOptions = {
  variant?: 'default' | 'tableCell';
};

export type FormatPriceResult = {
  /**
   * 정렬·비교·툴팁용. `$` 없음. 음수면 `-` 접두어.
   * 극소가는 유니코드 아래첨자 숫자(₀₁₂…)로 선행 0 개수 표기.
   */
  text: string;
  /** React 셀용. `<sub>`로 선행 0 개수 표기(3개 이상일 때만). `$` 포함. */
  jsx: ReactNode;
};

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'] as const;

function toSubscriptInt(n: number): string {
  if (!Number.isFinite(n) || n < 0) return String(n);
  return String(n)
    .split('')
    .map((ch) => SUBSCRIPT_DIGITS[Number(ch)] ?? ch)
    .join('');
}

function trimFracZeros(s: string): string {
  if (!s.includes('.')) return s;
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

function formatAbsBody(v: number, opts?: FormatPriceOptions): { text: string; jsx: ReactNode } {
  const tableCell = opts?.variant === 'tableCell';
  if (v === 0) {
    return {
      text: '0.00',
      jsx: <span className="price-cell font-mono tabular-nums">$0.00</span>,
    };
  }

  if (v >= 1) {
    const body =
      v >= 1000
        ? v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : v.toFixed(2);
    return {
      text: body,
      jsx: <span className="price-cell font-mono tabular-nums">${body}</span>,
    };
  }

  const fixed = trimFracZeros(v.toFixed(20));
  const m = /^0\.(0+)([1-9]\d*)$/.exec(fixed);
  const leadingZeros = m ? m[1].length : 0;
  const tail = m ? m[2] : '';

  /**
   * 극소가: 소수 아래 0이 3개 이상이면 기본은 아래첨자(CMC식).
   * tableCell에서는 한 줄 소수만 사용해 "0.0·835" 오독 방지.
   */
  if (m && leadingZeros >= 3 && !tableCell) {
    const significand = tail.slice(0, 4);
    const subUnicode = toSubscriptInt(leadingZeros);
    const text = `0.0${subUnicode}${significand}`;
    return {
      text,
      jsx: (
        <span className="price-cell font-mono tabular-nums">
          $0.0
          <sub className="price-cell-sub relative bottom-[-2px] mx-px align-baseline text-[9px] text-zinc-500">
            {leadingZeros}
          </sub>
          {significand}
        </span>
      ),
    };
  }

  /**
   * tableCell: `0.0` 뒤에 0이 이어지면(소수 둘째 자리 이후 선행 0 ≥ 2) 과학 표기로 스캔성 확보.
   */
  if (m && leadingZeros >= 2 && tableCell) {
    const exp = trimFracZeros(v.toExponential(2));
    return {
      text: exp,
      jsx: <span className="price-cell font-mono tabular-nums">${exp}</span>,
    };
  }

  /**
   * 0 < v < 1 — 승수(자릿수)별 소수 자릿수 (Coinbase·Coinglass류: 큰 소수는 덜, 작은 가격은 더).
   */
  let places = 4;
  if (v >= 0.1) places = 4;
  else if (v >= 0.01) places = 5;
  else if (v >= 0.0001) places = 6;
  else places = 8;
  const body = trimFracZeros(v.toFixed(Math.min(places, 12)));
  return {
    text: body,
    jsx: <span className="price-cell font-mono tabular-nums">${body}</span>,
  };
}

/**
 * 트레이딩 UI용 가격 포맷 (CoinGlass / Coinbase / CMC 스타일).
 * - 1 이상: 2소수(천 단위 콤마는 1,000 이상).
 * - 1 미만: 가격 크기에 따라 4~8소수(불필요한 끝 0 제거).
 * - 소수 아래 선행 0이 **3개 이상**이면 아래첨자 + 유효숫자.
 * - `tableCell`: 선행 소수 0이 **2개 이상**이면 과학 표기(예: `8.35e-5`).
 * - `text`에는 `$` 없음(템플릿에서 `$${text}` 결합).
 */
export function formatPrice(price: number, options?: FormatPriceOptions): FormatPriceResult {
  if (!Number.isFinite(price)) {
    const dash = '\u2014';
    return { text: dash, jsx: dash };
  }
  if (price === 0) {
    return { text: '0.00', jsx: formatAbsBody(0, options).jsx };
  }

  const neg = price < 0;
  const inner = formatAbsBody(Math.abs(price), options);

  if (!neg) {
    return { text: inner.text, jsx: inner.jsx };
  }

  return {
    text: `-${inner.text}`,
    jsx: <span className="price-cell font-mono tabular-nums">-{inner.jsx}</span>,
  };
}

/** 레거시 `@/lib/formatPrice` 등: `$` 포함 단일 문자열 */
export function formatPriceWithDollar(price: number, options?: FormatPriceOptions): string {
  const { text } = formatPrice(price, options);
  if (text === '\u2014') return text;
  if (text.startsWith('-')) return `-$${text.slice(1)}`;
  return `$${text}`;
}

export function formatPriceWithFixedDecimals(price: number, fractionDigits = 4): string {
  if (!Number.isFinite(price)) return '\u2014';
  const digits = Number.isFinite(fractionDigits)
    ? Math.min(12, Math.max(0, Math.floor(fractionDigits)))
    : 4;
  const sign = price < 0 ? '-' : '';
  const body = Math.abs(price).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${sign}$${body}`;
}

function trimDollarFraction(value: string, minFractionDigits = 2): string {
  const [whole, fraction] = value.split('.');
  if (!fraction) return value;
  const trimmed = fraction.replace(/0+$/, '');
  const normalized =
    trimmed.length < minFractionDigits
      ? fraction.slice(0, minFractionDigits).padEnd(minFractionDigits, '0')
      : trimmed;
  return `${whole}.${normalized}`;
}

function fixedDollarBody(value: number, fractionDigits: number): string {
  const digits = Number.isFinite(fractionDigits)
    ? Math.min(12, Math.max(0, Math.floor(fractionDigits)))
    : 2;
  return Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatAbsDollarAmountWithDollar(value: number, fractionDigits?: number): string {
  const abs = Math.abs(value);
  if (fractionDigits !== undefined) return `$${fixedDollarBody(abs, fractionDigits)}`;
  if (!Number.isFinite(abs) || abs === 0) return '$0.00';
  if (abs >= 1000) {
    return `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (abs >= 1) return `$${abs.toFixed(2)}`;

  const decimals = abs >= 0.01 ? 4 : abs >= 0.0001 ? 6 : 8;
  return `$${trimDollarFraction(abs.toFixed(decimals))}`;
}

export function formatDollarAmount(
  value: number,
  options: { fractionDigits?: number } = {}
): string {
  if (!Number.isFinite(value)) return '\u2014';
  const sign = value < 0 ? '-' : '';
  return `${sign}${formatAbsDollarAmountWithDollar(value, options.fractionDigits)}`;
}

export function formatSignedDollarAmount(
  value: number,
  options: { positiveSign?: boolean; fractionDigits?: number } = {}
): string {
  if (!Number.isFinite(value)) return '\u2014';
  if (value === 0) return formatDollarAmount(0, { fractionDigits: options.fractionDigits });
  const sign = value < 0 ? '-' : options.positiveSign ? '+' : '';
  return `${sign}${formatAbsDollarAmountWithDollar(value, options.fractionDigits)}`;
}
