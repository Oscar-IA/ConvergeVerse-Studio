'use client';

import { MangaFlipViewer } from '@/components/archive/MangaFlipViewer';
import type { MangaPanel } from '@/lib/api/types';
import { useState } from 'react';
import { MangaStripViewer } from './MangaStripViewer';

type ViewMode = 'flip' | 'strip';

interface MangaReaderProps {
  panels: MangaPanel[];
  chapterLabel?: string;
}

export function MangaReader({ panels, chapterLabel }: MangaReaderProps) {
  const [mode, setMode] = useState<ViewMode>('flip');

  if (!panels.length) return null;

  return (
    <section className="manga-reader">
      <div className="manga-reader__toolbar font-datum">
        <span className="manga-reader__toolbar-label">VIEW</span>
        <div className="manga-reader__toggle" role="group" aria-label="Manga view mode">
          <button
            type="button"
            className={`bvl-toggle ${mode === 'flip' ? 'bvl-toggle--on' : ''}`}
            onClick={() => setMode('flip')}
          >
            FLIP
          </button>
          <button
            type="button"
            className={`bvl-toggle ${mode === 'strip' ? 'bvl-toggle--on' : ''}`}
            onClick={() => setMode('strip')}
          >
            STRIP
          </button>
        </div>
      </div>

      {mode === 'flip' ? (
        <MangaFlipViewer panels={panels} chapterLabel={chapterLabel} />
      ) : (
        <MangaStripViewer panels={panels} chapterLabel={chapterLabel} />
      )}
    </section>
  );
}
