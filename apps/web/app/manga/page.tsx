'use client';

// Force dynamic rendering — this page uses headers() via next-intl
export const dynamic = 'force-dynamic';

import { MangaStudio } from '@/components/manga/MangaStudio';

/**
 * Dashboard de producción: inventario lore · editor [BORRADOR|NOVELA|GUION] · paneles/VFX · pie corrector ES/EN/FR.
 */
export default function MangaPage() {
  return (
    <div className="page-directors-cut page-production-dashboard">
      <MangaStudio />
    </div>
  );
}
