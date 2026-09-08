'use client'

// 진입·청산 딥링크로 들어왔는데 캔들 데이터가 없어 차트를 그릴 수 없을 때 대신 보여주는 화면.
// 청산 당시 저장해 둔 캡쳐가 있으면 그 이미지를, 없으면 안내 문구만 표시한다.
import { useEffect, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import { fetchTradeCloseCapture, type TradeCapture } from '@/lib/my/tradeChartCapture'

interface Props {
  tradeId: string | null
}

export function TradeCaptureFallback({ tradeId }: Props) {
  const [capture, setCapture] = useState<TradeCapture | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    if (!tradeId) {
      setLoading(false)
      return
    }
    setLoading(true)
    fetchTradeCloseCapture(tradeId).then((result) => {
      if (cancelled) return
      setCapture(result)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [tradeId])

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/95 p-6 text-center">
      {loading ? (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      ) : capture ? (
        <>
          <p className="text-sm text-muted-foreground">
            차트 데이터가 오래되어 불러올 수 없습니다. 진입·청산 캡쳐 화면입니다.
          </p>
          {/* signed URL(만료 있음)이라 next/image 최적화 대상이 아니다 */}
          <img
            src={capture.url}
            alt="진입·청산 시점 차트 캡쳐"
            className="max-h-[70%] max-w-full rounded-lg border border-border object-contain"
          />
          {capture.capturedAt && (
            <p className="text-xs text-muted-foreground/70">
              캡쳐 시점: {new Date(capture.capturedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </>
      ) : (
        <>
          <ImageOff className="h-7 w-7 text-muted-foreground/60" />
          <p className="text-sm text-muted-foreground">
            차트 데이터가 오래되어 불러올 수 없고, 저장된 진입·청산 캡쳐도 없습니다.
          </p>
        </>
      )}
    </div>
  )
}
