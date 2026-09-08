import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProofFilterChip({
  checked,
  label,
  dotColor,
  onChange,
}: {
  checked: boolean;
  label: string;
  dotColor?: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={cn(
        'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
        checked
          ? 'border-primary/50 bg-primary/10 text-foreground'
          : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          checked
            ? 'border-foreground bg-foreground text-background shadow-sm'
            : 'border-muted-foreground/55 bg-background text-transparent'
        )}
        aria-hidden
      >
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
      <span className={cn(dotColor && 'font-mono')}>{label}</span>
      {dotColor ? (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      ) : null}
    </button>
  );
}

export function ProofStreamToggle({
  checked,
  label,
  winRate,
  dotColor,
  onChange,
}: {
  checked: boolean;
  label: string;
  winRate?: number;
  dotColor?: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="flex min-w-0 flex-1 items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold leading-none tracking-wide transition-colors hover:bg-muted/35 active:bg-muted/50"
    >
      <span
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors',
          checked
            ? 'border-foreground bg-foreground text-background shadow-sm'
            : 'border-muted-foreground/55 bg-background text-transparent'
        )}
        aria-hidden
      >
        <Check className="h-3 w-3 stroke-[3]" />
      </span>
      <span className={cn('whitespace-nowrap', checked ? 'text-foreground' : 'text-muted-foreground')}>
        {label}
      </span>
      {typeof winRate === 'number' ? (
        <span className="ml-1 inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px] font-semibold text-muted-foreground">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotColor ?? 'currentColor' }}
            aria-hidden
          />
          {winRate.toFixed(0)}%
        </span>
      ) : null}
    </button>
  );
}
