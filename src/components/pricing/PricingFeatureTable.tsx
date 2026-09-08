import { Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { UNIFIED_FEATURES } from '@/config/pricing-plans';

/**
 * Pro 플랜 기능 비교표.
 * 라이트 모드에서 thead가 배경 없이 1px 실선만 있어 헤더로 읽히지 않았고,
 * Pro 열의 bg-primary/5가 표 전체에 옅은 분홍 물처럼 깔려 지저분했다.
 * → 헤더에 foreground 기반 표면(두 테마 공통)을 주고, Pro 열은 좌측 경계선으로 구분한다.
 */
export default function PricingFeatureTable() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-foreground/[0.04]">
                <th className="p-4 text-left text-xs font-semibold text-muted-foreground">기능</th>
                <th className="w-40 border-l border-border bg-primary/10 p-4 text-center text-sm font-bold text-primary dark:text-red-400">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody>
              {UNIFIED_FEATURES.map((feature) => (
                <tr
                  key={feature.text}
                  className="border-t border-border transition-colors hover:bg-foreground/[0.02]"
                >
                  <td className="p-4 text-sm text-foreground">{feature.text}</td>
                  <td className="border-l border-border bg-primary/[0.03] p-4 text-center text-sm font-semibold">
                    {feature.pro === false ? (
                      <X className="mx-auto h-4 w-4 text-muted-foreground/40" />
                    ) : feature.pro === true ? (
                      <Check className="mx-auto h-4 w-4 text-semantic-bull" />
                    ) : (
                      feature.pro
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
