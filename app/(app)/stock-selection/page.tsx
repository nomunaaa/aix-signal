import type { Metadata } from 'next';
import { StockSelectionPageView } from '@/components/stock-selection/StockSelectionPageView';

export const metadata: Metadata = { title: 'Stock Selection · Signal symbols' };

export default function StockSelectionPage() {
  return <StockSelectionPageView />;
}

