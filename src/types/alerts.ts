/**
 * Alert 관련 타입 정의
 */

import { BaseComponentProps } from '@/types';

/**
 * 알림 프리셋
 */
export type NotifyPreset = 'Conservative' | 'Balanced' | 'Aggressive';

/**
 * 알림 채널
 */
export type NotifyChannel = '앱 내 알림(기본)';

/**
 * 포지션 방향
 */
export type Side = 'LONG' | 'SHORT';

/**
 * 액션 타입
 */
export type ActionType = 'ENTRY' | 'EXIT' | 'PNL_PROFIT' | 'PNL_LOSS' | 'ALC_EXIT';

/**
 * 알림 설정
 */
export interface AlertSettings {
  preset: NotifyPreset;
  channels: NotifyChannel[];
  favorites: string[];
  dnd: {
    enabled: boolean;
    start: string; // HH:mm
    end: string; // HH:mm
    timezone: string;
    exceptions: ActionType[];
  };
  channelPriority: NotifyChannel[];
}

/**
 * 48시간 요약 데이터
 */
export interface Summary48h {
  alc_exit: number;
  open: number;
  close: number;
  as_of?: string;
}

/**
 * 히스토리 진입 이벤트
 */
export interface HistoryEntry {
  ts: string;
  symbol: string;
  side: Side;
  price: number;
  type: 'ENTRY';
}

/**
 * 히스토리 청산 이벤트
 */
export interface HistoryExit {
  ts: string;
  symbol: string;
  side: Side;
  price: number;
  type: 'EXIT';
}

/**
 * 히스토리 PnL 이벤트
 */
export interface HistoryPnL {
  kind: 'PNL_PROFIT' | 'PNL_LOSS';
  abs: number;
  pct: number;
  ts: string;
}

/**
 * 히스토리 사이클 (ENTRY → PnL → EXIT 그룹)
 */
export interface HistoryCycle {
  entry: HistoryEntry;
  pnl?: HistoryPnL;
  exit?: HistoryExit;
}

/**
 * 히스토리 필터
 */
export interface HistoryFilters {
  symbols: string[];
  range: '24h' | '7d' | '1m' | '3m';
  side: 'LONG' | 'SHORT' | 'BOTH';
  action: ActionType[];
}

/**
 * 알림 행 Props
 */
export interface AlertRowProps extends BaseComponentProps {
  symbol: string;
  kind: 'entry' | 'exit' | 'info';
  price: number;
  ts: string;
}

/**
 * 즐겨찾기 토글 Props
 */
export interface FavoriteToggleProps extends BaseComponentProps {
  symbol: string;
  active: boolean;
  onToggle: (symbol: string) => void;
}

/**
 * Hero Section Props
 */
export interface HeroSectionProps extends BaseComponentProps {
  statusChips: string[];
}

/**
 * 히스토리 필터 Props
 */
export interface HistoryFiltersProps {
  filters: HistoryFilters;
  onFiltersChange: (filters: HistoryFilters) => void;
  onExportCSV: () => void;
}

/**
 * 히스토리 테이블 Props
 */
export interface HistoryTableProps {
  cycles: HistoryCycle[];
}

/**
 * 퀵스타트 위저드 Props
 */
export interface QuickStartWizardProps {
  onComplete: (settings: {
    preset: NotifyPreset;
    channels: NotifyChannel[];
    favorites: string[];
  }) => void | Promise<void>;
  allowedSymbols?: string[];
  initialSettings?: {
    preset?: NotifyPreset;
    channels?: NotifyChannel[];
    favorites?: string[];
  };
}

/**
 * 48시간 요약 Props
 */
export interface Summary48hProps {
  summary: Summary48h;
  favorites: string[];
  spark: Record<string, number[]>;
}

/**
 * DND 우선순위 패널 Props
 */
export interface DNDPriorityPanelProps {
  dndStart: string;
  dndEnd: string;
  onDNDChange: (start: string, end: string) => void;
  channelPriority: NotifyChannel[];
  onPriorityChange?: (priority: NotifyChannel[]) => void;
}
