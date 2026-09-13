import { fetchProofPageData } from '@/lib/proof/fetch-proof';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  return Response.json(await fetchProofPageData());
}
