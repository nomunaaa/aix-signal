// 모의매매 청산 캡쳐 저장/조회.
//
// 왜 필요한가: Binance klines 조회 창(1m 30일 / 5m 60일 / 10m 90일 / 15m 120일)을 넘어선
// 과거 거래는 진입·청산 차트를 다시 그릴 수 없다. 그래서 청산하는 순간의 차트를 PNG로 떠서
// 비공개 스토리지에 넣어 두고, 나중에 차트가 비면 그 캡쳐로 대체 표시한다.
import { supabase } from '@/integrations/supabase/client'

const BUCKET = 'trade-captures'
const SIGNED_URL_TTL_SEC = 60 * 60

function capturePath(userId: string, tradeId: string): string {
  return `${userId}/${tradeId}.png`
}

/** 청산 직후 호출. 실패해도 매매 자체에는 영향이 없으므로 조용히 false만 돌려준다. */
export async function uploadTradeCloseCapture(tradeId: string, blob: Blob): Promise<boolean> {
  try {
    const { data: userRes } = await supabase.auth.getUser()
    const userId = userRes?.user?.id
    if (!userId) return false

    const path = capturePath(userId, tradeId)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, { contentType: 'image/png', upsert: true })
    if (uploadError) {
      console.warn('[trade capture] upload failed', uploadError)
      return false
    }

    const { error: updateError } = await supabase
      .from('mock_trades')
      .update({ close_capture_path: path, close_capture_at: new Date().toISOString() })
      .eq('id', tradeId)
    if (updateError) {
      console.warn('[trade capture] row update failed', updateError)
      return false
    }
    return true
  } catch (err) {
    console.warn('[trade capture] upload exception', err)
    return false
  }
}

export interface TradeCapture {
  url: string
  capturedAt: string | null
}

/** 차트를 그릴 수 없을 때 대체 표시할 캡쳐. 없으면 null. */
export async function fetchTradeCloseCapture(tradeId: string): Promise<TradeCapture | null> {
  try {
    const { data, error } = await supabase
      .from('mock_trades')
      .select('close_capture_path, close_capture_at')
      .eq('id', tradeId)
      .maybeSingle()
    if (error || !data?.close_capture_path) return null

    const { data: signed, error: signError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(data.close_capture_path, SIGNED_URL_TTL_SEC)
    if (signError || !signed?.signedUrl) return null

    return { url: signed.signedUrl, capturedAt: data.close_capture_at ?? null }
  } catch {
    return null
  }
}
