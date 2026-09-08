import { redirect } from 'next/navigation';

export default function MyPositionsPage() {
  redirect('/my?tab=positions');
}
