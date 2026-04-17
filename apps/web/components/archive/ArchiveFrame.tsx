'use client';

import type { ReactNode } from 'react';

/**
 * Wraps the app with a fixed CRT scanline overlay (archive / high-tech terminal).
 */
export function ArchiveFrame({ children }: { children: ReactNode }) {
  return (
    <div className="crt-root">
      {children}
      <div className="crt-overlay" aria-hidden />
    </div>
  );
}
