import { redirect } from 'next/navigation';

/** 인사이트 허브 — KAIROS 인사이트 `/insights`로 통합 */
export default function InsightIndexPage() {
  redirect('/insights');
}
