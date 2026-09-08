/** Zone 4-1 KAIROS 코멘트 Mock — LLM 연동 전 (SRD-002) */

export function getKairosCommentMock(symbol: string): string {
  const base = symbol.replace('USDT', '');
  const seeds = [
    `${base}는 단기 저항대에서 롱·숏 비율이 균형을 이루고 있으며, 거래대금 유지 시 할인 진입 구간을 노릴 수 있습니다.`,
    `최근 변동성 확대 구간에서 ${base}의 펀딩·미결제약정 흐름이 안정적입니다. 추세 지속 시 분할 대응을 권장합니다.`,
    `${base} 관련 뉴스 톤은 중립~긍정으로, 단기 과열 시 익절 라인을 재점검하세요.`,
  ];
  let h = 0;
  for (let i = 0; i < symbol.length; i++) h = (h * 31 + symbol.charCodeAt(i)) | 0;
  return seeds[Math.abs(h) % seeds.length];
}
