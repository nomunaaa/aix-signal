import { memo, useMemo, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBilingualText } from '@/hooks/useBilingualText';
import { SORTED_SYMBOLS } from '@/config/symbols';
import { QuickStartWizardProps, NotifyPreset, NotifyChannel } from '@/types/alerts';

const PRESETS: NotifyPreset[] = ['Conservative', 'Balanced', 'Aggressive'];
const CHANNELS: NotifyChannel[] = ['앱 내 알림(기본)'];
const DEFAULT_FAVORITES = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

const getMaxFavorites = (preset: NotifyPreset): number => {
  switch (preset) {
    case 'Conservative':
      return 10;
    case 'Balanced':
      return 18;
    case 'Aggressive':
      return 30;
    default:
      return 18;
  }
};

function getInitialFavorites(initialFavorites: string[] | undefined, availableSymbols: string[]) {
  const source = initialFavorites?.length ? initialFavorites : DEFAULT_FAVORITES;
  const allowed = new Set(availableSymbols);
  const filtered = source.filter((symbol) => allowed.has(symbol));

  if (filtered.length > 0 || availableSymbols.length === 0) return filtered;
  return availableSymbols.slice(0, Math.min(3, availableSymbols.length));
}

export const QuickStartWizard = memo(function QuickStartWizard({
  onComplete,
  allowedSymbols,
  initialSettings,
}: QuickStartWizardProps) {
  const { tr } = useBilingualText();
  const availableSymbols = useMemo(() => {
    return allowedSymbols ?? SORTED_SYMBOLS;
  }, [allowedSymbols]);
  const [step, setStep] = useState(1);
  const [preset, setPreset] = useState<NotifyPreset>(initialSettings?.preset || 'Balanced');
  const [channels, setChannels] = useState<NotifyChannel[]>(initialSettings?.channels || ['앱 내 알림(기본)']);
  const [favorites, setFavorites] = useState<string[]>(() =>
    getInitialFavorites(initialSettings?.favorites, availableSymbols)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      if (initialSettings.preset) {
        setPreset(initialSettings.preset);
      }
      if (initialSettings.channels) {
        setChannels(initialSettings.channels);
      }
      if (initialSettings.favorites) {
        setFavorites(getInitialFavorites(initialSettings.favorites, availableSymbols));
      }
    }
  }, [availableSymbols, initialSettings]);

  useEffect(() => {
    const available = new Set(availableSymbols);
    const maxFavorites = Math.min(getMaxFavorites(preset), availableSymbols.length);

    setFavorites((prev) =>
      prev.filter((symbol) => available.has(symbol)).slice(0, maxFavorites)
    );
  }, [availableSymbols, preset]);

  const handleChannelToggle = (channel: NotifyChannel) => {
    setChannels(prev =>
      prev.includes(channel)
        ? prev.filter(c => c !== channel)
        : [...prev, channel]
    );
  };

  const handleFavoriteToggle = (symbol: string) => {
    const maxFavorites = Math.min(getMaxFavorites(preset), availableSymbols.length);
    setFavorites(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : prev.length < maxFavorites
        ? [...prev, symbol]
        : prev
    );
  };

  const handleSelectAllFavorites = () => {
    const maxFavorites = Math.min(getMaxFavorites(preset), availableSymbols.length);
    setFavorites(availableSymbols.slice(0, maxFavorites));
  };

  const handleDeselectAllFavorites = () => {
    setFavorites([]);
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      if (isSubmitting) return;
      
      setIsSubmitting(true);
      try {
        const available = new Set(availableSymbols);
        await onComplete({
          preset,
          channels,
          favorites: favorites.filter((symbol) => available.has(symbol)),
        });
      } catch (error) {
        console.error('Error completing wizard:', error);
        setIsSubmitting(false);
      }
    }
  };

  const presetKicker = (value: NotifyPreset) => {
    switch (value) {
      case 'Conservative':
        return tr('(신중)', '(Conservative)');
      case 'Balanced':
        return tr('(균형)', '(Balanced)');
      case 'Aggressive':
        return tr('(적극)', '(Aggressive)');
      default:
        return '';
    }
  };

  const presetDescription = (value: NotifyPreset) => {
    switch (value) {
      case 'Conservative':
        return tr(
          '30개 중 약 10개 알림 · 고신뢰도 시그널만 전송 · 하루 평균 3-5건',
          'About 10 of 30 symbols · high-confidence signals only · 3-5 alerts/day'
        );
      case 'Balanced':
        return tr(
          '30개 중 약 18개 알림 · 기본 설정 권장 · 하루 평균 10-12건',
          'About 18 of 30 symbols · recommended default · 10-12 alerts/day'
        );
      case 'Aggressive':
        return tr(
          '30개 전체 알림 · 모든 시그널 수신 · 하루 평균 20-25건',
          'All 30 symbols · receive every signal · 20-25 alerts/day'
        );
      default:
        return '';
    }
  };

  const favoriteLimitText = (value: NotifyPreset) => {
    switch (value) {
      case 'Conservative':
        return tr('최소 3개, 최대 10개까지 선택 가능', 'Select 3 to 10 symbols');
      case 'Balanced':
        return tr('최소 3개, 최대 18개까지 선택 가능', 'Select 3 to 18 symbols');
      case 'Aggressive':
        return tr('최소 3개, 최대 30개까지 선택 가능', 'Select 3 to 30 symbols');
      default:
        return '';
    }
  };

  const channelLabel = (channel: NotifyChannel) =>
    channel === '앱 내 알림(기본)' ? tr('앱 내 알림(기본)', 'In-app alerts (default)') : channel;

  return (
    <Card className="glass p-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map(num => (
            <div
              key={num}
              className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors',
                step >= num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}
            >
              {step > num ? <Check className="h-4 w-4" /> : num}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {tr('빠른 시작 (90초 내 완료)', 'Quick start (under 90 seconds)')}
        </span>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{tr('프리셋 선택', 'Choose a preset')}</h3>
          <p className="text-sm text-muted-foreground">
            {tr('30개 종목 기준으로 하루 알림 횟수를 설정합니다', 'Set daily alert volume based on 30 symbols')}
          </p>
          <div className="grid grid-cols-1 gap-3">
            {PRESETS.map(p => (
              <Button
                key={p}
                variant={preset === p ? 'default' : 'outline'}
                onClick={() => setPreset(p)}
                className="h-auto py-4 flex-col gap-2 items-start text-left"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-semibold">{p}</span>
                  <span className="text-xs opacity-70">
                    {presetKicker(p)}
                  </span>
                </div>
                <span className="text-xs opacity-80">
                  {presetDescription(p)}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{tr('채널 선택', 'Choose channels')}</h3>
          <div className="space-y-3">
            {CHANNELS.map(channel => (
              <div key={channel} className="flex items-center gap-3">
                <Checkbox
                  id={channel}
                  checked={channels.includes(channel)}
                  onCheckedChange={() => handleChannelToggle(channel)}
                />
                <Label htmlFor={channel} className="cursor-pointer">
                  {channelLabel(channel)}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{tr('즐겨찾기 선택', 'Choose favorites')}</h3>
            <Badge variant="secondary">
              {favorites.length}/{Math.min(getMaxFavorites(preset), availableSymbols.length)}
            </Badge>
          </div>
          {availableSymbols.length > 0 && (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleSelectAllFavorites}
                className="text-xs text-primary hover:underline"
              >
                {tr('전체 선택', 'Select all')}
              </button>
              <span className="text-xs text-muted-foreground">|</span>
              <button
                type="button"
                onClick={handleDeselectAllFavorites}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                {tr('전체 해제', 'Clear all')}
              </button>
            </div>
          )}
          {availableSymbols.length === 0 ? (
            <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
              {tr('Free 플랜에는 종목 알림이 포함되지 않습니다. Pro를 선택하면 알림 종목을 고를 수 있습니다.', 'Symbol alerts are not included in the Free plan. Choose Pro to select alert symbols.')}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
              {availableSymbols.map(symbol => {
                const maxFavorites = Math.min(getMaxFavorites(preset), availableSymbols.length);
                const isSelected = favorites.includes(symbol);
                const isDisabled = !isSelected && favorites.length >= maxFavorites;
                return (
                  <Button
                    key={symbol}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleFavoriteToggle(symbol)}
                    disabled={isDisabled}
                    className="justify-start"
                  >
                    {symbol}
                  </Button>
                );
              })}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {favoriteLimitText(preset)}
          </p>
        </div>
      )}

      <div className="flex justify-between mt-6 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
        >
          {tr('이전', 'Previous')}
        </Button>
        <Button 
          onClick={handleNext} 
          className="gap-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr('저장 중...', 'Saving...')}
            </>
          ) : (
            <>
              {step === 3 ? tr('완료', 'Done') : tr('다음', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
});
