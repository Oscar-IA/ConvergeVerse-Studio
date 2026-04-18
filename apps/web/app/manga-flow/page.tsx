export const dynamic = 'force-dynamic';
import { redirect } from 'next/navigation';

/** Legacy route → modern manga reader */
export default function MangaFlowRedirect() {
  redirect('/manga');
}
