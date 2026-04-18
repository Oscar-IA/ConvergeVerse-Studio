export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';

/** La raíz envía al dashboard en `/story-engine` (Next exige un `app/page.tsx`). */
export default function RootPage() {
  redirect('/story-engine');
}
