'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDollarAmount } from '@/lib/format-price';
import { formatPrice } from '../utils/formatters';

const CanvasRevealEffect = dynamic(
  () =>
    import('@/components/aceternity/canvas-reveal-effect').then((m) => ({
      default: m.CanvasRevealEffect,
    })),
  { ssr: false }
);
import type { OpenSignal } from '../utils/section';

type DetailCardMode = 'discount' | 'profit';
type DetailCardSignal = OpenSignal & {
  pnlAmount?: number;
  profitLossAmount?: number | null;
};

interface SignalDetailCardProps {
  className?: string;
}

interface DetailCardState {
  signal: DetailCardSignal | null;
  mode: DetailCardMode;
}

export function SignalDetailCard({ className }: SignalDetailCardProps) {
  const [state, setState] = useState<DetailCardState>({ signal: null, mode: 'discount' });

  // Listen for custom event from DetailButtonRenderer
  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      const { signal, tableType } = custom.detail;
      const mode: DetailCardMode = tableType === 'profit' ? 'profit' : 'discount';
      setState({ signal, mode });
    };
    window.addEventListener('pulse:detail-card', handler);
    return () => window.removeEventListener('pulse:detail-card', handler);
  }, []);

  const close = useCallback(() => setState({ signal: null, mode: 'discount' }), []);

  const signal = state.signal;
  if (!signal) return null;

  const isLong = signal.direction === 'long';

  // Cast for extended fields
  const s = signal as DetailCardSignal & {
    currentPrice?: number;
    discountGain?: number;
    discountRate?: number;
    averageEntryPrice?: number;
    additionalBuyCount?: number;
    lockedAmount?: number;
    lockedPercent?: number;
    lockedExitPrice?: number;
  };

  const currentPrice = s.currentPrice ?? s.entryPrice;
  const pnlPercent = s.pnlPercent ?? 0;
  const pnlAmount =
    typeof s.pnlAmount === 'number'
      ? s.pnlAmount
      : typeof s.profitLossAmount === 'number'
        ? s.profitLossAmount
        : Math.round(((pnlPercent * s.entryPrice) / 100) * 100) / 100;

  return (
    <AnimatePresence>
      {signal && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-black/60"
          />

          {/* Card */}
          <motion.div
            key="detail-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
              'w-[380px] max-w-[calc(100vw-32px)] overflow-hidden rounded-xl border shadow-2xl',
              isLong ? 'border-emerald-500/30' : 'border-red-500/30',
              className
            )}
          >
            {/* CanvasRevealEffect Background */}
            <div className="absolute inset-0 overflow-hidden">
              <CanvasRevealEffect
                animationSpeed={3}
                containerClassName={isLong ? 'bg-emerald-950' : 'bg-red-950'}
                colors={isLong ? [[34, 197, 94]] : [[239, 68, 68]]}
                dotSize={2}
                showGradient={true}
              />
            </div>

            {/* Content overlay */}
            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white">
                    {signal.symbol.replace('USDT', '/USDT')}
                  </span>
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase',
                      isLong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    )}
                  >
                    {isLong ? 'LONG' : 'SHORT'}
                  </span>
                </div>
                <button
                  onClick={close}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="닫기"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body - different based on mode */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4">
                {state.mode === 'discount' ? (
                  <>
                    {/* 할인진입 detail fields */}
                    <DetailField
                      label="추가진입 신호"
                      value={(s.additionalBuyCount ?? 0) > 0 ? '추가매수' : '없음'}
                      highlight={(s.additionalBuyCount ?? 0) > 0}
                    />
                    <DetailField
                      label="추가진입 시간"
                      value={s.enteredAt ? formatRelativeTime(s.enteredAt) : '\u2014'}
                    />
                    <DetailField label="현재가" value={`$${formatPrice(currentPrice)}`} mono />
                    <DetailField
                      label="할인진입($)"
                      value={formatDollarAmount(pnlAmount)}
                      color={pnlAmount >= 0 ? 'hsl(var(--pnl-up))' : 'hsl(var(--pnl-down))'}
                      mono
                    />
                    <DetailField
                      label="확정할인(%)"
                      value={`${(s.discountRate ?? Math.abs(pnlPercent)) < 0 ? '-' : ''}${Math.abs(s.discountRate ?? pnlPercent).toFixed(2)}%`}
                      color={
                        (s.discountRate ?? pnlPercent) >= 0
                          ? 'hsl(var(--pnl-up))'
                          : 'hsl(var(--pnl-down))'
                      }
                      mono
                    />
                    <DetailField
                      label="평단가"
                      value={
                        s.averageEntryPrice ? `$${formatPrice(s.averageEntryPrice)}` : '\u2014'
                      }
                      mono
                    />
                    <DetailField
                      label="진입비율(%)"
                      value={`${(s.additionalBuyCount ?? 0) > 0 ? 200 : 100}%`}
                      mono
                    />
                  </>
                ) : (
                  <>
                    {/* 수익실현 detail fields */}
                    <DetailField
                      label="분할청산 신호"
                      value={(s.lockedAmount ?? 0) > 0 ? '중간청산' : '없음'}
                      highlight={(s.lockedAmount ?? 0) > 0}
                    />
                    <DetailField
                      label="분할청산 시간"
                      value={s.enteredAt ? formatRelativeTime(s.enteredAt) : '\u2014'}
                    />
                    <DetailField label="현재가" value={`$${formatPrice(currentPrice)}`} mono />
                    <DetailField
                      label="분할청산($)"
                      value={formatDollarAmount(s.lockedAmount ?? pnlAmount)}
                      color={
                        (s.lockedAmount ?? pnlAmount) >= 0
                          ? 'hsl(var(--pnl-up))'
                          : 'hsl(var(--pnl-down))'
                      }
                      mono
                    />
                    <DetailField
                      label="확정수익(%)"
                      value={`${(s.lockedPercent ?? pnlPercent) < 0 ? '-' : ''}${Math.abs(s.lockedPercent ?? pnlPercent).toFixed(2)}%`}
                      color={
                        (s.lockedPercent ?? pnlPercent) >= 0
                          ? 'hsl(var(--pnl-up))'
                          : 'hsl(var(--pnl-down))'
                      }
                      mono
                    />
                    <DetailField
                      label="수익 합계"
                      value={calculateTotalProfit(s, pnlAmount)}
                      color="hsl(var(--pnl-up))"
                      mono
                    />
                    <DetailField
                      label="청산비율(%)"
                      value={`${(s.lockedAmount ?? 0) > 0 ? '50' : '0'}%`}
                      mono
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Helper components ────────────────────────────

function DetailField({
  label,
  value,
  color,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  color?: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <span
        className={cn(
          'text-sm font-semibold text-white',
          mono && 'font-mono tabular-nums',
          highlight && 'text-yellow-300'
        )}
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}

function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '방금 전';
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  if (hours > 0) return `${hours}시간 ${remainMin}분전`;
  return `${minutes}분전`;
}

function calculateTotalProfit(
  signal: { lockedAmount?: number; entryPrice: number; pnlPercent?: number },
  currentPnlAmount: number
): string {
  // 50% already realized + current unrealized portion
  const realized = signal.lockedAmount ?? 0;
  const unrealized = currentPnlAmount * 0.5; // remaining 50% at current PnL
  const total = realized + unrealized;
  return formatDollarAmount(total);
}
