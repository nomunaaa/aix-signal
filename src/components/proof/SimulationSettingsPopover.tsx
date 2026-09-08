import { useEffect, useState } from 'react';
import { ChevronDown, Landmark, Percent, Zap } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { formatSeed } from './proofFormat';
import type { ProofCopy } from './proofCopy';

function NumberField({
  icon,
  label,
  value,
  suffix,
  onCommit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix: string;
  onCommit: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  return (
    <div className="flex items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {icon}
        </span>
        {label}
      </label>
      <span className="flex w-[132px] items-center gap-1 rounded-md border border-border bg-muted px-2.5 py-1.5">
        <input
          inputMode="numeric"
          value={text}
          onChange={(event) => setText(event.target.value.replace(/[^0-9]/g, ''))}
          onBlur={() => {
            const numeric = Number(text);
            onCommit(Number.isFinite(numeric) ? numeric : value);
          }}
          className="w-full min-w-0 bg-transparent text-right font-mono text-sm font-semibold tabular-nums text-foreground outline-none"
        />
        <span className="font-mono text-xs font-semibold text-muted-foreground">{suffix}</span>
      </span>
    </div>
  );
}

export function SimulationSettingsPopover({
  seed,
  entryRatio,
  leverage,
  onSeedChange,
  onEntryRatioChange,
  onLeverageChange,
  copy,
  className,
}: {
  seed: number;
  entryRatio: number;
  leverage: number;
  onSeedChange: (value: number) => void;
  onEntryRatioChange: (value: number) => void;
  onLeverageChange: (value: number) => void;
  copy: ProofCopy;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50',
            className
          )}
        >
          {copy.simulator.settingsButton}
          <span className="font-mono font-semibold text-foreground">${formatSeed(seed)}</span>
          <span className="text-border">·</span>
          <span className="font-mono font-semibold text-primary">{entryRatio}%</span>
          <span className="text-border">·</span>
          <span className="font-mono font-semibold text-foreground">{leverage}x</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[300px] space-y-3 p-4">
        <h4 className="text-xs font-semibold text-muted-foreground">{copy.simulator.settingsTitle}</h4>
        <NumberField
          icon={<Landmark className="h-3.5 w-3.5" />}
          label={copy.simulator.seed}
          value={seed}
          suffix="USD"
          onCommit={onSeedChange}
        />
        <NumberField
          icon={<Percent className="h-3.5 w-3.5" />}
          label={copy.simulator.entryRatio}
          value={entryRatio}
          suffix="%"
          onCommit={onEntryRatioChange}
        />
        <NumberField
          icon={<Zap className="h-3.5 w-3.5" />}
          label={copy.simulator.leverage}
          value={leverage}
          suffix="x"
          onCommit={onLeverageChange}
        />
      </PopoverContent>
    </Popover>
  );
}
