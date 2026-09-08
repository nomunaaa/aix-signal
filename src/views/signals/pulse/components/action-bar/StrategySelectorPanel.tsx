/**
 * Pulse 액션바 — 전략 Collapsible 본문 (전략 칩 + 설명·KPI·리스크 + 신뢰도 카드).
 */

import { AlertTriangle, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { STRATEGY_CONFIGS, type StrategyId } from '../../types/pulse.types';
import { usePulseStore } from '../../stores/pulseStore';
import { StrategyConfidenceCard } from '@/components/signals/strategy-confidence-card';
import { pulseStrategyIdToConfidenceType } from '@/lib/mock/confidence-mock';
import {
  getStrategyToolbarMock,
  STRATEGY_ONE_LINE,
  STRATEGY_RISK_COPY,
} from '@/lib/mock/pulse-strategy-toolbar-mock';
import {
  localizeStrategyToolbarLabel,
  localizeStrategyToolbarValue,
  localizeStrategyExtraText,
  pulseStrategyName,
  pulseStrategyOneLine,
  pulseStrategyRisk,
  usePulseCopy,
} from '../../utils/pulseTranslations';
import {
  TRADING_CATEGORY_ORDER,
  TRADING_CATEGORY_TO_STRATEGY,
} from '@/lib/trading-category';

export interface StrategySelectorPanelProps {
  className?: string;
}

export function StrategySelectorPanel({ className }: StrategySelectorPanelProps) {
  const { language, copy } = usePulseCopy();
  const selectedStrategy = usePulseStore((s) => s.selectedStrategy);
  const tradingCategoryFilters = usePulseStore((s) => s.tradingCategoryFilters);
  const toggleTradingCategoryFilter = usePulseStore((s) => s.toggleTradingCategoryFilter);
  const setStrategyDrawerOpen = usePulseStore((s) => s.setStrategyDrawerOpen);
  const simulationInput = usePulseStore((s) => s.simulationInput);

  const cfg = STRATEGY_CONFIGS.find((c) => c.id === selectedStrategy);
  const mock = getStrategyToolbarMock(selectedStrategy);
  const ct = pulseStrategyIdToConfidenceType(selectedStrategy);
  const panelTitle = language === 'ko' ? '신호 필터' : 'Signal filter';
  const panelAria = language === 'ko' ? '신호 필터' : 'Signal filter';
  const activeCategoryCount = tradingCategoryFilters.length;

  return (
    <div className={cn('rounded-lg border border-border bg-card/80 p-4', className)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{panelTitle}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setStrategyDrawerOpen(true)}
        >
          <Pencil className="h-3 w-3" />
          {copy.strategyPanel.edit}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label={panelAria}>
        {TRADING_CATEGORY_ORDER.map((category) => {
          const on = tradingCategoryFilters.includes(category);
          const strategy = STRATEGY_CONFIGS.find(
            (item) => item.id === TRADING_CATEGORY_TO_STRATEGY[category]
          );
          return (
            <button
              key={category}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggleTradingCategoryFilter(category)}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
                on
                  ? 'border-primary/50 bg-primary/10 text-foreground'
                  : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
                  on
                    ? 'border-foreground bg-foreground text-background shadow-sm'
                    : 'border-muted-foreground/55 bg-background text-transparent'
                )}
                aria-hidden
              >
                <Check className="h-3 w-3 stroke-[3]" />
              </span>
              <span className="font-mono">{category}</span>
              {strategy ? (
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: strategy.color }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {cfg ? (
        <div className="space-y-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            {language === 'ko'
              ? `선택된 신호 ${activeCategoryCount}개`
              : `${activeCategoryCount} selected signals`}
          </p>
          <div>
            <h3 className="text-base font-bold text-foreground">{pulseStrategyName(cfg, language)}</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {pulseStrategyOneLine(cfg.id, STRATEGY_ONE_LINE[cfg.id as StrategyId], language)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <StrategyKpi label={copy.strategyPanel.winRate} value={`${mock.winRate}%`} />
            <StrategyKpi
              label={localizeStrategyToolbarLabel(mock.kpi2Label, language)}
              value={localizeStrategyToolbarValue(mock.kpi2Value, language)}
            />
            <StrategyKpi
              label={localizeStrategyToolbarLabel(mock.kpi3Label, language)}
              value={localizeStrategyToolbarValue(mock.kpi3Value, language)}
            />
          </div>

          <p className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>
              <span className="font-medium">{copy.strategyPanel.risk}: </span>
              {pulseStrategyRisk(cfg.id, STRATEGY_RISK_COPY[cfg.id as StrategyId], language)}
            </span>
          </p>

          {mock.extraSignalsBlock ? (
            <div className="rounded-md border border-border/80 bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                {localizeStrategyExtraText(mock.extraSignalsBlock.title, language)}
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {mock.extraSignalsBlock.lines.map((line) => (
                  <li key={line} className="font-mono text-xs">
                    {localizeStrategyExtraText(line, language)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">{copy.strategyPanel.extraSignalsNone}</p>
          )}

          {mock.vsOneshotLine ? (
            <p className="rounded-md border border-dashed border-border/80 bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{copy.strategyPanel.vsOneShot}: </span>
              {localizeStrategyExtraText(mock.vsOneshotLine, language)}
            </p>
          ) : null}

          <StrategyConfidenceCard
            strategy={ct}
            simulationAmount={simulationInput.capital}
            hideTitle
            hideRisk
            hideComparison={!!mock.vsOneshotLine}
            className="border-0 bg-muted/15 p-0 pt-2 shadow-none"
          />
        </div>
      ) : null}
    </div>
  );
}

function StrategyKpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background/50 p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
