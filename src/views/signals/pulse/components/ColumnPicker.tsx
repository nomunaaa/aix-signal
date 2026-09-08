/**
 * ColumnPicker — column visibility toggle (real data).
 * Base columns are locked; optional columns toggle.
 * isEmpty columns are hidden by default.
 */

import { SlidersHorizontal, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { usePulseCopy } from '../utils/pulseTranslations';

export interface ColumnConfig {
  id: string;
  label: string;
  isOptional: boolean;
  isEmpty?: boolean;
  visible: boolean;
}

interface ColumnPickerProps {
  columns: ColumnConfig[];
  onToggle: (columnId: string) => void;
  className?: string;
}

export function ColumnPicker({ columns, onToggle, className }: ColumnPickerProps) {
  const { copy } = usePulseCopy();
  const baseColumns = columns.filter((c) => !c.isOptional);
  const optionalColumns = columns.filter((c) => c.isOptional);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={copy.columnPicker.aria}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-md',
            'text-xs text-muted-foreground',
            'hover:bg-muted/50 transition-colors',
            'border border-border',
            className,
          )}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{copy.columnPicker.trigger}</span>
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-56 max-h-80 overflow-y-auto p-3">
        {/* Base columns (locked) */}
        <div className="mb-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{copy.columnPicker.base}</p>
          {baseColumns.map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-2 py-1 px-2 rounded opacity-60 cursor-not-allowed"
            >
              <Checkbox checked disabled />
              <span className="text-xs text-foreground">{col.label}</span>
              <Lock className="w-3 h-3 text-muted-foreground ml-auto" />
            </label>
          ))}
        </div>

        <div className="border-t border-border my-2" />

        {/* Optional columns */}
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{copy.columnPicker.optional}</p>
          {optionalColumns.map((col) => (
            <label
              key={col.id}
              className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer"
            >
              <Checkbox
                checked={col.visible}
                onCheckedChange={() => onToggle(col.id)}
              />
              <span className="text-xs text-foreground">{col.label}</span>
              {col.isEmpty && (
                <span className="text-[10px] text-muted-foreground bg-muted px-1 rounded ml-auto">{copy.columnPicker.empty}</span>
              )}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
