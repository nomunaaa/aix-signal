'use client';

import { usePulseStore } from '@/views/signals/pulse/stores/pulseStore';
import type { ProofCopy } from './proofCopy';

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
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-xs">
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
export function SymbolQualityFilter({ copy }: { copy: ProofCopy }) {
  const winRateThreshold = usePulseStore((state) => state.qualityWinRateThreshold);
  const riskRewardThreshold = usePulseStore((state) => state.qualityRiskRewardThreshold);
  const setWinRateThreshold = usePulseStore((state) => state.setQualityWinRateThreshold);
  const setRiskRewardThreshold = usePulseStore((state) => state.setQualityRiskRewardThreshold);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/50 p-2.5">
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
