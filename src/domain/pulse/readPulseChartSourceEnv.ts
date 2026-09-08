/**
 * Next.js 빌드 타임 `process.env.NEXT_PUBLIC_*`.
 * Jest는 `readPulseChartSourceEnv.jest.ts`로 매핑 (jest.config.js).
 */
export function readPulseChartSourceEnv(): string | undefined {
  const v = process.env?.NEXT_PUBLIC_PULSE_CHART_SOURCE;
  if (v != null && String(v).length > 0) return String(v);
  return undefined;
}
