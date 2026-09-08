import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildSymbolHubMetadata } from '@/lib/seo/symbol-route-meta';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.aixsignal.com';
/** export 금지 — Next 라우트 타입이 layout에서 허용 export만 인정함 */
const metadataBase = new URL(siteUrl);

export async function generateMetadata({
  params,
}: {
  params: { symbol: string };
}): Promise<Metadata> {
  const { normalized, title, description } = buildSymbolHubMetadata(params.symbol);
  const path = `/signals/${encodeURIComponent(normalized)}`;
  const canonicalUrl = new URL(path, metadataBase).toString();

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: 'AiXSignal',
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function SignalsSymbolLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
