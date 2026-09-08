/**
 * 오픈/대기 행의 LIVE(진행)·WAIT(대기) 판별 — KPI·필터·SignalStatePill 공통 (AIX-85)
 */

import type { ClosedSignal, Signal, WaitingSignal, SignalCycleUiState } from '../types/pulse.types';
import type { FeedSignal, OpenSignal } from './section';

export function resolveOpenSignalCycleUiState(signal: OpenSignal): SignalCycleUiState {
  const s = signal as Signal;
  if (s.signalState === 'LIVE' || s.signalState === 'WAIT') return s.signalState;
  if (signal.section === 'WAITING_ENTRY') return 'WAIT';
  return 'LIVE';
}

export function resolveWaitingSignalCycleUiState(w: WaitingSignal): SignalCycleUiState {
  if (w.signalState === 'LIVE' || w.signalState === 'WAIT') return w.signalState;
  return 'WAIT';
}

/** 청산 행은 UI 상태 없음 */
export function resolveFeedSignalCycleUiState(signal: FeedSignal): SignalCycleUiState | null {
  if ('exitPrice' in signal && (signal as ClosedSignal).exitPrice != null) return null;
  return resolveOpenSignalCycleUiState(signal as OpenSignal);
}
