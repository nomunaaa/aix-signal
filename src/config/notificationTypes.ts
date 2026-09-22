import type { NotificationAlertType } from '@/types/alerts';

/**
 * 알림 종류 목록 — 설정하는 곳(QuickStartWizard)과 설정 결과를 보여 주는 곳
 * (DNDPriorityPanel)이 같은 라벨을 써야 하므로 한 군데에서 관리한다.
 */
export const NOTIFICATION_TYPE_OPTIONS: {
  value: NotificationAlertType;
  labelKo: string;
  labelEn: string;
}[] = [
  { value: 'all', labelKo: '전체 알림', labelEn: 'All notifications' },
  {
    value: 'wave_pulse_same_time',
    labelKo: '웨이브·펄스 시그널이 동시에 발생했을 때',
    labelEn: 'When wave and pulse signals occur at the same time',
  },
  {
    value: 'trend_score_20',
    labelKo: '트렌드 스코어 20점 이상일 때',
    labelEn: 'When trend score is 20 points or higher',
  },
  { value: 'trading_1m', labelKo: '1분 트레이딩 알림', labelEn: '1-minute trading notification' },
  { value: 'trading_10m', labelKo: '10분 트레이딩 알림', labelEn: '10-minute trading notification' },
  { value: 'trend_signal', labelKo: '트렌드 시그널 알림', labelEn: 'Trend signal notification' },
];
