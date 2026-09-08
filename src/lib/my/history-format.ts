// /my history display formatters + entry/exit chart deeplink builder.
import type { Position } from '@/lib/my/types'

export function formatSymbolPair(symbol: string): string {
  const quoteCurrencies = ['USDT', 'USDC', 'BUSD', 'USD', 'BTC', 'ETH', 'BNB']
  for (const quote of quoteCurrencies) {
    if (symbol.endsWith(quote)) {
      return `${symbol.slice(0, -quote.length)}/${quote}`
    }
  }
  return symbol
}

export function assetLabel(symbol: string): string {
  return formatSymbolPair(symbol)
}

export function fmtPrice(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 1) return n.toFixed(2)
  return n.toFixed(4)
}

/** 초 → "3일 4시간" / "12시간" / "45분" */
export function fmtHold(sec: number): string {
  if (sec < 60) return `${Math.max(0, Math.floor(sec))}초`
  const days = Math.floor(sec / 86400)
  const hours = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`
  return `${minutes}분`
}

/** 손익금: +$1,450 / -$255 */
export function fmtUsd(v: number): string {
  const sign = v > 0 ? '+' : v < 0 ? '-' : ''
  return `${sign}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

/** 손익률: +2.31% */
export function fmtPct(v: number): string {
  return `${v > 0 ? '+' : ''}${v.toFixed(2)}%`
}

export function fmtDateTime(iso: string | null, locale = 'ko-KR'): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')

  return locale.startsWith('ko')
    ? `${year}.${month}.${day} ${hour}:${minute}`
    : `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 진입·청산 구간이 표시된 1분봉 차트로 이동하는 딥링크 (QR/버튼 공통).
 * tradeId를 함께 넘겨, 캔들이 너무 오래돼 차트를 못 그릴 때 저장된 청산 캡쳐로 대체할 수 있게 한다.
 */
export function chartDeepLink(row: Position): string {
  const params = new URLSearchParams({ symbol: row.symbol, tradeId: row.id })
  const entryMs = row.openedAt ? new Date(row.openedAt).getTime() : NaN
  const exitMs = row.closedAt ? new Date(row.closedAt).getTime() : NaN
  if (Number.isFinite(entryMs)) params.set('entryTime', String(entryMs))
  if (Number.isFinite(exitMs)) params.set('exitTime', String(exitMs))
  const path = row.barInterval === '10m' ? '/chart10m' : '/chart1m'
  return `${path}?${params.toString()}`
}

/** QR에 심는 절대 URL. SSR 중에는 origin을 알 수 없으므로 상대경로로 폴백. */
export function chartDeepLinkAbsolute(row: Position): string {
  const path = chartDeepLink(row)
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}
