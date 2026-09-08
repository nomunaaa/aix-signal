import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { faIcon } from '@/lib/fontawesome';
import { Spark20 } from '@/components/wave-stream/Spark20';
import { useBilingualText } from '@/hooks/useBilingualText';
import { Summary48hProps } from '@/types/alerts';

export const Summary48h = memo(function Summary48h({ 
  summary, 
  favorites,
  spark,
}: Summary48hProps) {
  const { tr } = useBilingualText();

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">{tr('48시간 요약', '48-hour summary')}</h2>
      
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="glass p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-yellow-500/10">
              <i className={faIcon('fa-triangle-exclamation', 'h-5 w-5 text-yellow-500')} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">ALC EXIT</div>
              <div className="text-2xl font-bold">{summary.alc_exit}</div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tr('긴급 청산 알림', 'Emergency exit alerts')}
          </Badge>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-semantic-bull/10">
              <i className={faIcon('fa-arrow-trend-up', 'h-5 w-5 text-semantic-bull')} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">OPEN</div>
              <div className="text-2xl font-bold">{summary.open}</div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tr('신규 진입', 'New entries')}
          </Badge>
        </Card>

        <Card className="glass p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-full bg-semantic-bear/10">
              <i className={faIcon('fa-arrow-trend-down', 'h-5 w-5 text-semantic-bear')} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">CLOSE</div>
              <div className="text-2xl font-bold">{summary.close}</div>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {tr('포지션 청산', 'Position exits')}
          </Badge>
        </Card>
      </div>

      <Card className="glass p-6">
        <h3 className="text-lg font-semibold mb-4">{tr('즐겨찾기 추세', 'Favorite trends')}</h3>
        <div className="divide-y divide-border">
          {favorites.map(symbol => {
            const sparkData = (spark[symbol] || []).map((value, idx) => ({
              t: new Date(Date.now() - (4 - idx) * 3600000).toISOString(),
              v: value,
            }));

            return (
              <div key={symbol} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="font-mono font-semibold">{symbol}</span>
                <div className="w-32">
                  <Spark20 data={sparkData} color="#16A34A" />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        {tr('실데이터 미수신 시: 전체 종목 기준 · 종목별 진입/청산 20회 발생', 'When live data is unavailable: all symbols · 20 entry/exit events per symbol')}
      </p>
    </div>
  );
});
