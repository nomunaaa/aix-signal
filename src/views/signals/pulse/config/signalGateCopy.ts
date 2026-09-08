import { Zap, Waves, type LucideIcon } from 'lucide-react';
import type { SignalStreamId } from '../types/pulse.types';

export const STREAM_GATE_META: Record<
  SignalStreamId,
  {
    title: string;
    /** 제목 옆 텍스트 칩 (예: 1분 · 단기) */
    badges: readonly string[];
    tagline: string;
    detail: string;
    Icon: LucideIcon;
    accent: string;
  }
> = {
  pulse: {
    title: '펄스',
    badges: ['1분', '단기'],
    tagline: '1분마다 갱신 · 초단타에 맞춘 고빈도 시그널',
    detail:
      '1분봉에 맞춘 스트림입니다. 신호가 자주 들어와 짧은 호가·초단타에 익숙한 분께 맞고, 포지션을 오래 붙잡지 않는 스타일에 가깝습니다.',
    Icon: Zap,
    accent: 'hsl(47 96% 53%)',
  },
  wave: {
    title: '웨이브',
    badges: ['10분', '데이'],
    tagline: '10분마다 갱신 · 덜 촘촘해서 추세 보기 쉬움',
    detail:
      '10분봉에 맞춘 스트림입니다. 펄스보다 신호 간격이 넓어 잡음이 줄고, 방향을 가늠하기 쉬운 데이·스윙 성향에 가깝습니다.',
    Icon: Waves,
    accent: 'hsl(199 89% 48%)',
  },
};
