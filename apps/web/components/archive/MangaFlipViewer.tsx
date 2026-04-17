'use client';

import { useCallback, useEffect, useState } from 'react';

function PanelImage({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  if (broken) {
    return (
      <div
        className="font-datum"
        style={{
          aspectRatio: '3/4',
          maxHeight: 'min(70vh, 640px)',
          margin: '0 auto',
          background: '#1a0a0a',
          border: '2px solid var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent)',
          fontSize: '0.75rem',
          padding: '1rem',
          textAlign: 'center',
        }}
      >
        IMAGE_LOAD_FAILED // URL no cargó (CORS, expiró o URL inválida)
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setBroken(true)}
      style={{
        width: '100%',
        maxHeight: 'min(70vh, 640px)',
        objectFit: 'contain',
        display: 'block',
        border: '1px solid var(--border)',
        background: '#000',
      }}
    />
  );
}

export interface FlipPanel {
  scene_index: number;
  description: string;
  dialogue?: string;
  image_url?: string;
  prompt_used?: string;
  image_error?: string | null;
  image_provider?: string | null;
  image_note?: string | null;
}

interface MangaFlipViewerProps {
  panels: FlipPanel[];
  chapterLabel?: string;
}

export function MangaFlipViewer({ panels, chapterLabel = 'ARCHIVE VIEW' }: MangaFlipViewerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [panels]);

  const total = panels.length;
  const current = panels[index];
  const goPrev = useCallback(() => {
    setIndex((i) => (i > 0 ? i - 1 : total - 1));
  }, [total]);
  const goNext = useCallback(() => {
    setIndex((i) => (i < total - 1 ? i + 1 : 0));
  }, [total]);

  if (!current || total === 0) return null;

  return (
    <div className="surface" style={{ overflow: 'hidden' }}>
      <div
        className="font-datum"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.65rem 1rem',
          borderBottom: '2px solid var(--border)',
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        <span>
          <strong style={{ color: 'var(--accent)' }}>{chapterLabel}</strong> — PANEL {index + 1}/{total}
        </span>
        <span>FLIP VIEW // ORBET.VISUAL</span>
      </div>

      <div className="manga-flip-stage" style={{ padding: '1.25rem' }}>
        <div
          key={`${current.scene_index}-${index}`}
          className="manga-flip-inner manga-flip-animate"
          style={{ transformOrigin: 'center center' }}
        >
          {current.image_url ? (
            <PanelImage src={current.image_url} alt={`Panel ${index + 1}`} />
          ) : (
            <div
              style={{
                aspectRatio: '3/4',
                maxHeight: 'min(70vh, 640px)',
                margin: '0 auto',
                background: '#0a0a0a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                color: 'var(--text-muted)',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-jetbrains), monospace',
                border: '2px solid var(--border)',
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <span style={{ color: 'var(--accent)' }}>NO_IMAGE_URL</span>
              {current.image_error && (
                <span style={{ color: 'var(--accent)', maxWidth: '100%' }}>{current.image_error}</span>
              )}
              {!current.image_error && (
                <span>Replicate no devolvió URL — revisa token y logs del API</span>
              )}
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            {(current.image_note || current.image_provider) && (
              <p
                className="font-datum"
                style={{
                  fontSize: '0.62rem',
                  letterSpacing: '0.08em',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                }}
              >
                {current.image_provider && `[${current.image_provider}] `}
                {current.image_note}
              </p>
            )}
            <p
              className="font-inter"
              style={{ fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text)', lineHeight: 1.55 }}
            >
              {current.description}
            </p>
            {current.dialogue && (
              <p
                className="font-manga-dialogue"
                style={{
                  fontSize: 'clamp(1rem, 2.5vw, 1.2rem)',
                  color: 'var(--accent)',
                  letterSpacing: '0.04em',
                  borderLeft: '3px solid var(--accent)',
                  paddingLeft: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                &ldquo;{current.dialogue}&rdquo;
              </p>
            )}
          </div>
        </div>
      </div>

      <div
        className="font-datum"
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderTop: '2px solid var(--border)',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={goPrev}
          className="surface"
          style={{
            flex: 1,
            padding: '0.6rem',
            background: 'var(--bg)',
            color: 'var(--text)',
            border: '2px solid var(--border)',
          }}
        >
          ◀ PREV
        </button>
        <button
          type="button"
          onClick={goNext}
          className="surface"
          style={{
            flex: 1,
            padding: '0.6rem',
            background: 'var(--accent)',
            color: '#fff',
            border: '2px solid var(--accent)',
          }}
        >
          NEXT ▶
        </button>
      </div>
    </div>
  );
}
