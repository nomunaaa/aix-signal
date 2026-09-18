import type { Metadata } from 'next';
import { SelectionPageView } from '@/components/selection/SelectionPageView';

export const metadata: Metadata = { title: 'Selection · Signal choice' };

export default function SelectionPage() {
  return <SelectionPageView />;
}
