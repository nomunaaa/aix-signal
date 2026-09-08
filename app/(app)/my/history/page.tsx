import { redirect } from 'next/navigation';

export default function MyHistoryPage() {
  redirect('/my?tab=history');
}
