import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useBilingualText } from '@/hooks/useBilingualText';

const FAQ_ITEMS = [
  {
    q: 'LDR만 보라는 이유는 무엇인가요?',
    qEn: 'Why focus on LDR?',
    a: '승률 대신 하방 침투를 보정하는 손실 방어율이 의사결정에 유효합니다. 승률은 시그널 플랫폼에서 조작이 가능하므로(형편없는 수익으로 청산 + 즉시 손절) 신뢰할 수 없습니다. LDR은 시그널 이후 예측 구간에서 가격이 손익분기점 아래로 내려가지 않은 비율을 측정하여 더 신뢰할 수 있는 지표입니다.',
    aEn: 'Loss defense rate is more useful than win rate because it accounts for downside intrusion. Win rate can be manipulated by closing tiny gains and immediately stopping losses, so it is less reliable. LDR measures how often price stays above breakeven during the forecast window after a signal.',
  },
  {
    q: 'ALC 예외 알림이 필요한가요?',
    qEn: 'Do I need ALC exception alerts?',
    a: 'DND(방해금지) 중에도 리스크 이벤트(ALC_EXIT)는 통과시켜 손실을 줄입니다. Active Loss Canceling은 추세 이탈·역추세 조짐을 감지해 긴급 청산 결정을 제시하므로, 수면 중이라도 이 알림만은 받는 것이 손실 방어에 효과적입니다.',
    aEn: 'Yes. Risk events such as ALC_EXIT can bypass DND to reduce losses. Active Loss Canceling detects trend breaks or counter-trend signs and suggests emergency exits, so keeping this alert on can help protect against downside moves.',
  },
  {
    q: 'PnL 계산은 어떻게 하나요?',
    qEn: 'How is PnL calculated?',
    a: '롱(LONG): (청산가 - 진입가), 숏(SHORT): (진입가 - 청산가) 기준으로 계산합니다. 수수료와 슬리피지는 제외된 순수 가격차 기반입니다. EXIT 수신 시 미매칭 최신 ENTRY와 자동으로 매칭하여 PnL_PROFIT 또는 PnL_LOSS 행이 생성됩니다.',
    aEn: 'LONG uses exit price minus entry price. SHORT uses entry price minus exit price. Fees and slippage are excluded. When an EXIT arrives, it is matched with the latest unmatched ENTRY and creates a PNL_PROFIT or PNL_LOSS row.',
  },
  {
    q: '프리셋은 어떻게 선택하나요?',
    qEn: 'How should I choose a preset?',
    a: 'Conservative(신중): 30개 종목 중 약 10개만 알림, 고신뢰도 시그널만 전송하여 하루 평균 3-5건의 알림을 받습니다. Balanced(균형): 30개 중 약 18개 알림, 기본 설정으로 하루 평균 10-12건의 알림을 받습니다. Aggressive(적극): 30개 전체 알림, 모든 시그널을 수신하여 하루 평균 20-25건의 알림을 받습니다. 초보자는 Balanced를 권장하며, 경험이 쌓이면 자신의 투자 스타일에 맞게 조정할 수 있습니다.',
    aEn: 'Conservative sends alerts for about 10 of 30 symbols and prioritizes high-confidence signals, averaging 3-5 alerts per day. Balanced covers about 18 symbols and is the recommended default, averaging 10-12 alerts per day. Aggressive covers all 30 symbols and all signals, averaging 20-25 alerts per day. Balanced is a good starting point.',
  },
  {
    q: '채널 우선순위는 무엇인가요?',
    qEn: 'What is channel priority?',
    a: '알림은 앱 내 알림 센터와, "브라우저 알림"을 켜둔 경우 브라우저 데스크톱 알림으로 전달됩니다. DND와 즐겨찾기 설정을 조정해 필요한 시그널만 받을 수 있습니다.',
    aEn: 'Alerts are delivered to the in-app notification center, and as browser desktop notifications too if you enable "Browser notifications" above. You can tune DND and favorites to receive only the signals you need.',
  },
];

export const AlertsFAQ = memo(function AlertsFAQ() {
  const { isKo, tr } = useBilingualText();

  return (
    <Card className="glass-subtle p-6">
      <h2 className="text-2xl font-bold mb-6">{tr('자주 묻는 질문', 'FAQ')}</h2>
      <Accordion type="single" collapsible className="space-y-2">
        {FAQ_ITEMS.map((item, idx) => (
          <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="text-left font-semibold">{isKo ? item.q : item.qEn}</span>
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed">
              {isKo ? item.a : item.aEn}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
});
