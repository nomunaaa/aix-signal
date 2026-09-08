// 인사이트 페이지 날짜·레짐·숫자 포맷 (AIX-64)

import type { KairosLayerAgreement, MarketRegime } from '@/lib/mock/insights-mock'

const KST = 'Asia/Seoul'

/** "2026-04-20 09:00" KST */
export function formatDateTimeKST(iso: string): string {
  const d = new Date(iso)
  const s = d
    .toLocaleString('sv-SE', {
      timeZone: KST,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(' ', ' ')
  return s.slice(0, 16)
}

/** 경과 분 (최소 1) */
export function minutesAgoFromIso(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(1, Math.round(ms / 60_000))
}

/** 히어로 좌상단 라벨 */
export function formatKairosHeroRefreshLabel(iso: string): string {
  const line = formatDateTimeKST(iso)
  const min = minutesAgoFromIso(iso)
  return `KAIROS · ${line} KST · ${min}분 전`
}

/** 히스토리 좌측 "4/19 09:00" */
export function formatHistoryDateLabel(iso: string): string {
  const d = new Date(iso)
  return d
    .toLocaleString('ko-KR', {
      timeZone: KST,
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    .replace(/\s/g, ' ')
}

export function marketRegimeLabel(regime: MarketRegime): string {
  const m: Record<MarketRegime, string> = {
    surge: '급등',
    crash: '급락',
    strong_consolidation: '강보합',
    weak_consolidation: '약보합',
    sideways: '횡보',
    mixed: '혼조',
    watch: '관망',
  }
  return m[regime] ?? regime
}

export function volatilityLabel(v: 'low' | 'mid' | 'high'): string {
  if (v === 'low') return '저'
  if (v === 'high') return '고'
  return '중'
}

export function formatAlignmentPct(n: number): string {
  return `${Math.round(n)}%`
}

export function formatLongShortRatio(n: number): string {
  return n.toFixed(2)
}

export function formatSignedPercent(n: number, fractionDigits = 1): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(fractionDigits)}%`
}

/** KAIROS layer_agreement JSON → 짧은 한글 라벨 */
export function kairosLayerAgreementShortKo(a: KairosLayerAgreement): string {
  const m: Record<KairosLayerAgreement, string> = {
    external_bullish_internal_bullish: '외부·내부 상방 일치',
    external_bearish_internal_bearish: '외부·내부 하방 일치',
    divergence: '레이어 해석 차이',
    both_neutral: '중립·관망',
  }
  return m[a] ?? a
}
