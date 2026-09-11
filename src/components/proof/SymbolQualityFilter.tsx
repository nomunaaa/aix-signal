'use client';

import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import type { ProofCopy } from './proofCopy';
import type { ProofQualityPeriod } from './symbolQuality';

function QualitySlider({
  label,
  value,
  min,
  max,
  step,
  valueLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  valueLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex w-[7.5rem] min-w-[7.5rem] flex-col gap-1 text-xs">
      <span className="flex items-center justify-between text-muted-foreground">
        <span>{label}</span>
        <b className="font-mono text-foreground">{valueLabel}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer accent-primary"
      />
    </label>
  );
}

/** Trend Board와 usePulseStore를 공유하는 승률/손익비 threshold 필터 — 종목별 통계 행을 걸러낸다. */
export function SymbolQualityFilter({
  copy,
  period,
  onPeriodChange,
}: {
  copy: ProofCopy;
  period: ProofQualityPeriod;
  onPeriodChange: (period: ProofQualityPeriod) => void;
}) {
  const winRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const riskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const setWinRateThreshold = usePulseStore((state) => state.setQualityWinRateThreshold);
  const setRiskRewardThreshold = usePulseStore((state) => state.setQualityRiskRewardThreshold);

  return (
    <div className="flex flex-nowrap items-center gap-2 rounded-lg border border-border bg-card/50 p-2.5">
      <div
        className="flex shrink-0 items-center gap-1.5"
        role="radiogroup"
        aria-label="Quality period"
      >
        {(['last30d', 'last3mo', 'all'] as const).map((value) => (
          <label
            key={value}
            className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"
          >
            <input
              type="radio"
              name="proof-quality-period"
              value={value}
              checked={period === value}
              onChange={() => onPeriodChange(value)}
              className="h-3.5 w-3.5 accent-primary"
            />
            <span>{copy.quality[value]}</span>
          </label>
        ))}
      </div>

      <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />

      <QualitySlider
        label={copy.quality.winRate}
        value={winRateThreshold}
        min={0}
        max={100}
        step={1}
        valueLabel={`${winRateThreshold}%`}
        onChange={setWinRateThreshold}
      />
      <QualitySlider
        label={copy.quality.riskReward}
        value={riskRewardThreshold}
        min={0}
        max={5}
        step={0.1}
        valueLabel={riskRewardThreshold.toFixed(1)}
        onChange={setRiskRewardThreshold}
      />
    </div>
  );
}
