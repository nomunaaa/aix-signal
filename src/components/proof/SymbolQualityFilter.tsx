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
      <select
        value={period}
        onChange={(event) => onPeriodChange(event.target.value as ProofQualityPeriod)}
        className="h-9 w-36 shrink-0 rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary"
        aria-label="Date"
      >
        <option value="last30d">{copy.quality.last30d}</option>
        <option value="last3mo">{copy.quality.last3mo}</option>
      </select>

      <span className="hidden h-6 w-px shrink-0 bg-border sm:block" aria-hidden />

      <QualitySlider
        label={copy.quality.winRate}
        value={winRateThreshold}
        min={35}
        max={100}
        step={1}
        valueLabel={`${winRateThreshold}%`}
        onChange={setWinRateThreshold}
      />
      <QualitySlider
        label={copy.quality.riskReward}
        value={riskRewardThreshold}
        min={0.6}
        max={5}
        step={0.1}
        valueLabel={riskRewardThreshold.toFixed(1)}
        onChange={setRiskRewardThreshold}
      />
    </div>
  );
}
