'use client';

import { cn } from '@/lib/utils';
import type { ProofPeriod } from '@/lib/mock/my-mock';

const PERIODS: { value: ProofPeriod; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
  { value: 'all', label: '전체' },
];

interface MyPeriodFilterProps {
  value: ProofPeriod;
  onChange: (period: ProofPeriod) => void;
  className?: string;
}

export function MyPeriodFilter({ value, onChange, className }: MyPeriodFilterProps) {
  return (
    <div className={cn('flex gap-1', className)}>
      {PERIODS.map(({ value: p, label }) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === p
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
