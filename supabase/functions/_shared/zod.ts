/**
 * Zod 스키마 정의
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const LtTrendDirectionSchema = z.union([z.literal(-100), z.literal(100), z.literal(-999)]);
const StTrendDirectionSchema = z.union([
  z.literal(-100),
  z.literal(0),
  z.literal(100),
  z.literal(-999),
]);

// 장기추세 웹훅 페이로드
export const TrendLongSchema = z.object({
  symbol: z.string().min(1),
  barinterval: z.enum(['1m', '10m']),
  type: z.string(),
  direction: z.number().int().min(-100).max(100),
  timestamp: z.number().int().positive(),
  source: z.string(),
  indicator_name: z.string(),
});

// 단기추세 웹훅 페이로드
export const TrendShortSchema = z.object({
  symbol: z.string().min(1),
  barinterval: z.enum(['1m', '10m']),
  type: z.string(),
  direction: z.number().int().min(-100).max(100),
  timestamp: z.number().int().positive(),
  source: z.string(),
  indicator_name: z.string(),
});

// 변동성 웹훅 페이로드
export const VolatilitySchema = z.object({
  symbol: z.string().min(1),
  barinterval: z.enum(['1m', '10m']),
  strength: z.number().int().min(-200).max(200),
  timestamp: z.number().int().positive(),
  source: z.string(),
  indicator_name: z.string(),
});

// 시그널 웹훅 페이로드
export const SignalSchema = z
  .object({
    signal_type: z.enum(['entry', 'exit', 'added_entry', 'partial_exit']),
    trading_category: z.string().min(1),
    cycle_id: z.string().min(1),
    direction: z.string(),
    symbol: z.string().min(1),
    barinterval: z.enum(['1m', '10m']),
    price: z.number().positive(),
    timestamp: z.number().int().positive(),
    source: z.string(),
    signal_name: z.string(),
    percentage: z.number().int().min(0).max(100).optional(),
    level: z.number().int().min(1).max(2).optional(),
    lt_trend_direction: LtTrendDirectionSchema.optional(),
    st_trend_direction: StTrendDirectionSchema.optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.signal_type !== 'entry') return;

    if (payload.lt_trend_direction === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lt_trend_direction'],
        message: 'lt_trend_direction is required for entry signals',
      });
    }

    if (payload.st_trend_direction === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['st_trend_direction'],
        message: 'st_trend_direction is required for entry signals',
      });
    }
  });

export type TrendLongPayload = z.infer<typeof TrendLongSchema>;
export type TrendShortPayload = z.infer<typeof TrendShortSchema>;
export type VolatilityPayload = z.infer<typeof VolatilitySchema>;
export type SignalPayload = z.infer<typeof SignalSchema>;
