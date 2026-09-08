'use client'

import { useState } from 'react'
import {
  LONG_SHORT_LABEL_KR,
  type LongShortScale,
  type RatingGaugeMock,
  type VolatilityScale,
} from '@/lib/mock/trend-v8-mock'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { getLongShortCellStyle, getVolatilityCellStyle } from '@/lib/trend-v8/scale-to-color'
import { indicatorSharePercentOfMaxRating } from '@/lib/trend-v8/indicator-rating-share'
import { cn } from '@/lib/utils'

function isVol(s: LongShortScale | VolatilityScale): s is VolatilityScale {
  return s === 'low' || s === 'mid' || s === 'high' || s === 'extreme'
}

function BadgeTooltipBody({ ind }: { ind: RatingGaugeMock['indicators'][0] }) {
  return (
    <div className="space-y-1 text-xs">
      <div className="font-medium">{ind.tooltip.title}</div>
      <div className="text-muted-foreground">{ind.tooltip.subtitle}</div>
      <div>
        <span className="text-muted-foreground">공식: </span>
        {ind.tooltip.formula}
      </div>
      <div>
        <span className="text-muted-foreground">현재: </span>
        <span className="font-medium">{ind.tooltip.currentValue}</span>
      </div>
      <div>
        <span className="text-muted-foreground">스케일: </span>
        {ind.tooltip.scaleExplain}
      </div>
      <div className="border-t border-border pt-1">{ind.tooltip.interpretation}</div>
    </div>
  )
}

export function IndicatorBadgeGrid({ indicators }: { indicators: RatingGaugeMock['indicators'] }) {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = openId ? indicators.find((x) => x.id === openId) : null

  if (isMobile) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {indicators.map((ind) => {
            const st = isVol(ind.scale) ? getVolatilityCellStyle(ind.scale) : getLongShortCellStyle(ind.scale)
            const scaleLabel = isVol(ind.scale) ? ind.displayLabel : LONG_SHORT_LABEL_KR[ind.scale as LongShortScale]
            const aria = `${ind.displayName} ${ind.displayLabel}. ${ind.tooltip.interpretation}`
            const pct = indicatorSharePercentOfMaxRating(ind.id)
            return (
              <button
                key={ind.id}
                type="button"
                aria-label={aria}
                className={cn(
                  'rounded-md border border-border/40 px-2 py-2 text-left text-[11px] font-medium transition-opacity active:opacity-90',
                )}
                style={{ backgroundColor: st.backgroundColor }}
                onClick={() => setOpenId(ind.id)}
              >
                <span className="block text-[9px] opacity-90" style={{ color: st.color }}>
                  {ind.displayName}
                </span>
                <span className="mt-0.5 block text-sm font-semibold tabular-nums text-black dark:text-white">
                  {pct.toFixed(1)}%
                </span>
                <span className="mt-0.5 block font-semibold" style={{ color: st.color }}>
                  {ind.displayLabel}
                </span>
                <span className="mt-0.5 block text-[9px] font-normal opacity-90" style={{ color: st.color }}>
                  {scaleLabel}
                </span>
              </button>
            )
          })}
        </div>
        <Sheet open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
          <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto">
            {selected ? (
              <>
                <SheetHeader className="text-left">
                  <SheetTitle className="text-base">{selected.tooltip.title}</SheetTitle>
                </SheetHeader>
                <div className="mt-3">
                  <BadgeTooltipBody ind={selected} />
                </div>
              </>
            ) : null}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5">
      {indicators.map((ind) => {
        const st = isVol(ind.scale) ? getVolatilityCellStyle(ind.scale) : getLongShortCellStyle(ind.scale)
        const scaleLabel = isVol(ind.scale) ? ind.displayLabel : LONG_SHORT_LABEL_KR[ind.scale as LongShortScale]
        const aria = `${ind.displayName} ${ind.displayLabel}. ${ind.tooltip.interpretation}`
        const pct = indicatorSharePercentOfMaxRating(ind.id)
        return (
          <Tooltip key={ind.id}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={aria}
                className={cn(
                  'rounded-md border border-border/40 px-2 py-2 text-left text-[11px] font-medium transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                )}
                style={{ backgroundColor: st.backgroundColor }}
              >
                <span className="block text-[9px] opacity-90" style={{ color: st.color }}>
                  {ind.displayName}
                </span>
                <span className="mt-0.5 block text-sm font-semibold tabular-nums text-black dark:text-white">
                  {pct.toFixed(1)}%
                </span>
                <span className="mt-0.5 block font-semibold" style={{ color: st.color }}>
                  {ind.displayLabel}
                </span>
                <span className="mt-0.5 block text-[9px] font-normal opacity-90" style={{ color: st.color }}>
                  {scaleLabel}
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <BadgeTooltipBody ind={ind} />
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}
