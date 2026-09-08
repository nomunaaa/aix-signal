import { redirect } from 'next/navigation';

export default function MyProfitsPage() {
  redirect('/my?tab=profits');
}
