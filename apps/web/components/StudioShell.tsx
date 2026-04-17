'use client';

/** Single client boundary for CRT overlay + app chrome. */
import { ArchiveFrame } from '@/components/archive/ArchiveFrame';
import { AppShell } from '@/components/layout/AppShell';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Iframe embebido: sin header/CRT para postMessage y menos superficie de error en dev. */
function isMangaEmbedPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === '/manga/embed' || pathname.startsWith('/manga/embed/');
}

export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isMangaEmbedPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <ArchiveFrame>
      <AppShell>{children}</AppShell>
    </ArchiveFrame>
  );
}
