import { Clock, Star, TrendingUp, Users } from 'lucide-react';

/**
 * /pricing 신뢰 지표 4칸.
 * 라이트 모드에서 --muted가 --background와 같은 값(0 0% 96%)이라 bg-muted/50은
 * 완전히 투명하게 보였다 → bg-card + border로 실제 카드 표면을 준다.
 */
const STATS = [
  { value: '15,000+', label: '활성 사용자', icon: Users },
  { value: '89%', label: '수익 달성률', icon: TrendingUp },
  { value: '24/7', label: '실시간 모니터링', icon: Clock },
  { value: '4.8/5', label: '사용자 평점', icon: Star },
];

export default function PricingStats() {
  return (
    <div className="grid w-full max-w-[220px] justify-self-center gap-3 lg:h-full lg:grid-rows-4 lg:justify-self-end">
      {STATS.map(({ value, label, icon: Icon }) => (
        <div
          key={label}
          className="flex flex-col justify-center rounded-xl border border-border bg-card p-3.5 text-center shadow-sm"
        >
          <div className="mb-2 flex justify-center text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-xl font-bold">{value}</div>
          <div className="text-sm text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}
