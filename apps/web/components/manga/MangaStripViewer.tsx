'use client';

import type { MangaPanel } from '@/lib/api/types';

interface MangaStripViewerProps {
  panels: MangaPanel[];
  chapterLabel?: string;
}

export function MangaStripViewer({ panels, chapterLabel = 'BOND_CONVERGE' }: MangaStripViewerProps) {
  if (!panels.length) return null;

  return (
    <div className="manga-strip surface">
      <div className="manga-strip__head font-datum">
        <strong className="manga-strip__title">{chapterLabel}</strong>
        <span>STRIP // {panels.length} PANELS</span>
      </div>
      <div className="manga-strip__scroll">
        {panels.map((panel, i) => (
          <article key={`${panel.scene_index}-${i}`} className="manga-strip__page">
            <div className="manga-strip__frame">
              {panel.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={panel.image_url} alt={`Panel ${i + 1}`} className="manga-strip__img" />
              ) : (
                <div className="manga-strip__placeholder font-datum manga-strip__placeholder--err">
                  <span>NO IMAGE // PANEL {i + 1}</span>
                  {panel.image_error && <span className="manga-strip__err">{panel.image_error}</span>}
                </div>
              )}
            </div>
            <div className="manga-strip__caption">
              {(panel.image_note || panel.image_provider) && (
                <p className="font-datum manga-strip__meta">
                  {panel.image_provider && `[${panel.image_provider}] `}
                  {panel.image_note}
                </p>
              )}
              <p className="font-inter manga-strip__desc">{panel.description}</p>
              {panel.dialogue && (
                <p className="font-manga-dialogue manga-strip__dialogue">&ldquo;{panel.dialogue}&rdquo;</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
