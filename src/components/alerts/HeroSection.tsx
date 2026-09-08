import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FAIcon } from '@/components/icons/FAIcon';
import { useBilingualText } from '@/hooks/useBilingualText';
import { cn } from '@/lib/utils';
import { HeroSectionProps } from '@/types/alerts';

export const HeroSection = memo(function HeroSection({ 
  statusChips,
  className 
}: HeroSectionProps) {
  const { tr } = useBilingualText();

  return (
    <Card className={cn('glass card-hover p-8 lg:p-12 relative overflow-hidden', className)}>
      {/* Aurora background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
      
      <div className="relative z-10 max-w-4xl">
        <div className="flex items-center gap-2 mb-4">
          <FAIcon icon="bell" className="h-6 w-6 text-primary animate-pulse" />
          <h1 className="text-3xl lg:text-4xl font-bold">
            {tr('알람과 기록, 한 곳에서 5초 결정', 'Alerts and history for 5-second decisions')}
          </h1>
        </div>
        
        <p className="text-lg text-muted-foreground mb-6">
          {tr('앱 내 알림 · 즐겨찾기 · DND · 자동 PnL(수수료 제외)', 'In-app alerts · Favorites · DND · Auto PnL (fees excluded)')}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-8">
          {statusChips.map((chip, idx) => (
            <Badge key={idx} variant="secondary" className="px-3 py-1">
              {chip}
            </Badge>
          ))}
        </div>
        
      </div>
    </Card>
  );
});
