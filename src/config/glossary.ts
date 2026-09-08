/**
 * 용어 사전 (Glossary)
 * 주요 페이지에서 툴팁으로 사용되는 용어 정의
 */

export type GlossaryKey = 
  | 'ai-x-signal'
  | 'point-to-line'
  | 'dual-trendline'
  | 'single-position'
  | 'alc'
  | 'ldr'
  | 'valid-entry'
  | 'positioning'
  | 'edge'
  | 'contra'
  | 'alignment-score'
  | 'rly'
  | 'snapshot'
  | 'snapshot-hash'
  | 'dnd'
  | 'preset'
  | 'channel-priority'
  | 'alc-event'
  | 'relative-time'
  | 'color-standard';

export const glossary: Record<GlossaryKey, { term: string; definition: string; termEn?: string; definitionEn?: string }> = {
  'ai-x-signal': {
    term: 'ONE 시그널™',
    definition: '25개 트레이딩 데스크, 700+ 전략, 100+ AI 노드가 합의해 내리는 하나의 단일 신호.',
  },
  'point-to-line': {
    term: 'Point-to-Line',
    definition: '"지금 사라"는 점이 아니라, 추세선 구간에서 어디서든 수익 실현이 가능한 선을 제공.',
  },
  'dual-trendline': {
    term: '듀얼 추세선(S-TL/L-TL)',
    definition: '단기선(S-TL)은 타이밍, 장기선(L-TL)은 방향을 보여 주는 두 개의 추세선.',
  },
  'single-position': {
    term: '단일 포지션 원칙',
    definition: '종목별로 OPEN 또는 CLOSE 한 가지 상태만 존재하며 목표가/손절가 나열은 하지 않음.',
    termEn: 'Single-position rule',
    definitionEn: 'Each symbol has only one OPEN or CLOSE state; target and stop lists are intentionally avoided.',
  },
  'alc': {
    term: 'ALC(Active Loss Canceling)',
    definition: '추세 이탈·역추세 조짐을 감지해 보유/청산/관망 결정을 제시하는 손실 상쇄 로직.',
    termEn: 'ALC (Active Loss Canceling)',
    definitionEn: 'A loss-control logic that detects trend breaks or counter-trend signs and suggests hold, exit, or observe decisions.',
  },
  'ldr': {
    term: 'LDR(손실 방어율)',
    definition: '시그널 이후 예측 구간에서 가격이 손익분기점 아래로 내려가지 않은 비율.',
    termEn: 'LDR (Loss Defense Rate)',
    definitionEn: 'The percentage of the forecast window after a signal where price does not move below breakeven.',
  },
  'valid-entry': {
    term: '유효진입(VALID_ENTRY)',
    definition: '추세가 유효한 상태에서 초기 진입가보다 유리한 가격대로 진입 가능함을 뜻함.',
  },
  'positioning': {
    term: '포지셔닝(POSITIONING)',
    definition: '실수익 구간 유지로 보유 지속이 합리적임을 뜻함.',
  },
  'edge': {
    term: '경계(EDGE)',
    definition: '추세 경계에 근접해 주의가 필요한 상태를 뜻함.',
  },
  'contra': {
    term: '역추세(CONTRA)',
    definition: '기존 추세와 반대 신호가 강해져 전략 재점검이 필요한 상태.',
  },
  'alignment-score': {
    term: 'Alignment Score',
    definition: '1h/4h/1D 등 멀티 타임프레임 방향 정렬 정도를 0–1로 수치화.',
  },
  'rly': {
    term: 'RLY',
    definition: '최근 구간의 상승 모멘텀 강도 지표(내부 산출).',
  },
  'snapshot': {
    term: '스냅샷',
    definition: '진입/청산 지점, 듀얼 라인, 라벨, 근거 요약을 담은 읽기 전용 차트 링크.',
  },
  'snapshot-hash': {
    term: '스냅샷 해시',
    definition: '스냅샷 위변조를 막는 무결성 확인 값.',
  },
  'dnd': {
    term: 'DND(방해금지)',
    definition: '지정 시간대에 알림을 큐에 저장 후 종료 시 요약으로 전달.',
    termEn: 'DND (Do Not Disturb)',
    definitionEn: 'During quiet hours, alerts are queued and summarized after the window ends.',
  },
  'preset': {
    term: '프리셋',
    definition: '알림 강도를 미리 정한 Conservative/Balanced/Aggressive 세트.',
    termEn: 'Preset',
    definitionEn: 'A predefined alert-intensity set: Conservative, Balanced, or Aggressive.',
  },
  'channel-priority': {
    term: '채널 우선순위',
    definition: '현재는 앱 내 알림 센터를 통해 시그널 알림을 전달합니다.',
    termEn: 'Channel priority',
    definitionEn: 'Signal alerts are currently delivered through the in-app notification center.',
  },
  'alc-event': {
    term: 'ALC 이벤트(HOLD/EXIT/OBSERVE)',
    definition: 'ALC가 감지한 보유/청산/관망 신호의 요약 라벨.',
  },
  'relative-time': {
    term: '상대시간/UTC',
    definition: '화면에는 "2시간 29분 전", 툴팁에는 UTC 절대시간을 함께 표기.',
  },
  'color-standard': {
    term: '색상 표준',
    definition: '녹색=상승, 빨강=하락(글로벌 표준).',
  },
};

/**
 * 용어 키로 정의 가져오기
 */
export const getGlossaryItem = (key: GlossaryKey) => {
  return glossary[key];
};
