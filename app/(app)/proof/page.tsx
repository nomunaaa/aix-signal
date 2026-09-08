import { Suspense } from 'react';
import type { Metadata } from 'next';
import { fetchProofPageData } from '@/lib/proof/fetch-proof';
import { ProofPageView } from '@/components/proof/ProofPageView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  title: '수익인증 · 시그널 성과',
  description:
    '플랫폼 시그널의 실제 청산 성과를 공개합니다. 손실 사이클을 포함한 기록 기반 통계입니다.',
  openGraph: {
    title: '수익인증 · 시그널 성과',
    description:
      '플랫폼 시그널의 실제 청산 성과를 공개합니다. 손실 사이클을 포함한 기록 기반 통계입니다.',
  },
};

export default async function ProofPage() {
  const data = await fetchProofPageData();
  return (
    <Suspense fallback={null}>
      <ProofPageView data={data} />
    </Suspense>
  );
}
