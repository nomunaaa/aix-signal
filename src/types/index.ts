/**
 * 전역 타입 정의
 * 프로젝트 전체에서 공통으로 사용되는 타입들을 중앙화
 */

// ============= 공통 유틸리티 타입 =============

/**
 * 선택적 클래스명을 받는 컴포넌트의 기본 Props
 */
export interface BaseComponentProps {
  className?: string;
}

/**
 * 자식 요소를 받는 컴포넌트의 기본 Props
 */
export interface WithChildren {
  children?: React.ReactNode;
}

/**
 * 클릭 핸들러를 받는 컴포넌트의 기본 Props
 */
export interface WithOnClick {
  onClick?: () => void;
}

// ============= 인증 관련 타입 =============

/**
 * 인증 모달 탭 타입
 */
export type AuthTab = "signin" | "signup";

/**
 * 인증 관련 콜백 Props
 */
export interface AuthCallbackProps {
  onOpenAuth?: (tab?: AuthTab) => void;
}

// ============= 차트 관련 공통 타입 =============

/**
 * 시간 프리셋 타입
 */
export type TimePreset = '4h' | '12h' | '1d' | '3d' | '7d' | '30d';

/**
 * OHLCV 캔들 데이터
 */
export interface CandleData {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  trendShort?: 'up' | 'down' | 'neutral';  // 단기 추세
  trendLong?: 'up' | 'down' | 'neutral';   // 장기 추세
}

/**
 * 차트 데이터 포인트
 */
export interface ChartDataPoint {
  time: number;
  value: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

/**
 * 스파크라인 데이터 포인트
 */
export interface SparkDataPoint {
  t: string; // ISO8601 timestamp
  v: number; // value
  marker?: 'entry' | 'exit' | 'switch';
}

// ============= 시그널 관련 타입 =============

/**
 * 시그널 방향
 */
export type SignalDirection = 'long' | 'short';

/**
 * 시그널 상태
 */
export type SignalStatus = 'OPEN' | 'CLOSED' | 'WATCHLIST';

/**
 * 시그널 이벤트 타입
 */
export type SignalEvent = 'ENTRY' | 'EXIT' | 'STOP' | 'ALC_EXIT';

/**
 * 시그널 라벨
 */
export type SignalLabel = 'VALID_ENTRY' | 'POSITIONING' | 'EDGE';

/**
 * 시그널 마커
 */
export interface SignalMarker {
  time: number;
  type: SignalEvent;
  side: 'Long' | 'Short';
  price: number;
  vesScore?: number;
  reason?: string;
}

// ============= 포지션 관련 타입 =============

/**
 * 포지션 출처
 */
export type PositionOrigin = 'API' | 'CSV' | '수동';

/**
 * 거래소 타입
 */
export type ExchangeType = 'binance' | 'bybit' | 'okx' | 'upbit';

// ============= 알림 관련 타입 =============

/**
 * 알림 채널
 */
export type NotificationChannel = 'web_push' | 'mobile' | 'telegram';

/**
 * 알림 프리셋
 */
export type AlertPreset = 'conservative' | 'balanced' | 'aggressive';

/**
 * DND 시간대
 */
export interface DNDTimeRange {
  start: string; // HH:mm
  end: string; // HH:mm
}

// ============= 구독 플랜 관련 타입 =============

/**
 * 구독 플랜 타입
 */
export type SubscriptionPlan = 'Free' | 'Pro';

/**
 * 플랜 정보
 */
export interface Plan {
  name: SubscriptionPlan;
  price: string;
  originalPrice?: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  popular: boolean;
}

// ============= 피드 관련 타입 =============

/**
 * 피드 아이템 타입
 */
export type FeedItemType = 'signal' | 'theme' | 'position';

// ============= API 응답 타입 =============

/**
 * 기본 API 응답 타입
 */
 
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 페이지네이션 정보
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/**
 * 페이지네이션된 API 응답
 */
 
export interface PaginatedAPIResponse<T = any> extends APIResponse<T> {
  pagination?: PaginationInfo;
}

// ============= 날짜/시간 관련 타입 =============

/**
 * 날짜 범위
 */
export interface DateRange {
  start: Date | string;
  end: Date | string;
}

/**
 * 타임스탬프 타입 (밀리초)
 */
export type Timestamp = number;

// ============= 테마 관련 타입 =============

/**
 * 다크/라이트 모드
 */
export type ThemeMode = 'light' | 'dark' | 'system';

// ============= 정렬 관련 타입 =============

/**
 * 정렬 방향
 */
export type SortDirection = 'asc' | 'desc';

/**
 * 정렬 옵션
 */
export interface SortOption<T = string> {
  field: T;
  direction: SortDirection;
}

// ============= 필터 관련 타입 =============

/**
 * 기본 필터 옵션
 */
 
export interface FilterOption<T = any> {
  label: string;
  value: T;
  enabled: boolean;
}

// ============= 웹훅 관련 타입 =============

/**
 * 트렌드 웹훅 데이터
 */
export interface TrendWebhook {
  symbol: string;
  period: string;
  timestamp: number;
  metadata: {
    source: string;
    indicator_name: 'trend_long' | 'trend_short';
  };
}

/**
 * 볼륨 웹훅 데이터
 */
export interface VolatilityWebhook {
  symbol: string;
  period: string;
  timestamp: number;
  metadata: {
    source: string;
    indicator_name: 'volatility';
    level?: 'low' | 'mid' | 'high';
  };
}

/**
 * 시그널 웹훅 데이터
 */
export interface SignalWebhook {
  type: 'entry' | 'exit';
  direction: 'long' | 'short';
  symbol: string;
  price: number;
  timestamp: string;
  metadata: {
    source: string;
    strategy_name: string;
    confidence?: number;
  };
}

/**
 * 웹훅 메시지 유니온 타입
 */
export type WebhookMessage = TrendWebhook | VolatilityWebhook | SignalWebhook;

// ============= 내보내기 =============

export type {
  // 도메인별 타입은 각 도메인 폴더의 types.ts에서 관리
  // 여기서는 전역적으로 사용되는 공통 타입만 정의
};
