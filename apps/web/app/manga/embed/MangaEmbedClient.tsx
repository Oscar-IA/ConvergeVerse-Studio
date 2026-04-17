'use client';

/**
 * Vista embebida en iframe: recibe postMessage desde MangaStudio tras el pipeline.
 * Origen: parent debe ser mismo sitio (validamos origin al recibir).
 */
import { MangaFlipViewer, type FlipPanel } from '@/components/archive/MangaFlipViewer';
import { useEffect, useState } from 'react';

const MANGA_PANELS_MESSAGE_TYPE = 'MANGA_PANELS' as const;

type MangaPanelsMessage = {
  type: typeof MANGA_PANELS_MESSAGE_TYPE;
  panels?: unknown;
  script?: string;
  chapterLabel?: string;
};

function normalizePanels(raw: unknown): FlipPanel[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p, i) => {
    const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
    const si = o.scene_index;
    return {
      scene_index: typeof si === 'number' ? si : i,
      description: String(o.description ?? ''),
      dialogue: o.dialogue != null && o.dialogue !== '' ? String(o.dialogue) : undefined,
      image_url: o.image_url != null ? String(o.image_url) : undefined,
      prompt_used: o.prompt_used != null ? String(o.prompt_used) : undefined,
      image_error: o.image_error != null ? String(o.image_error) : undefined,
      image_provider: o.image_provider != null ? String(o.image_provider) : undefined,
      image_note: o.image_note != null ? String(o.image_note) : undefined,
    };
  });
}

export default function MangaEmbedClient() {
  const [panels, setPanels] = useState<FlipPanel[]>([]);
  const [script, setScript] = useState('');
  const [chapterLabel, setChapterLabel] = useState('Bond Converge');

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as MangaPanelsMessage;
      if (!d || d.type !== MANGA_PANELS_MESSAGE_TYPE) return;
      setPanels(normalizePanels(d.panels));
      setScript(typeof d.script === 'string' ? d.script : '');
      setChapterLabel(typeof d.chapterLabel === 'string' && d.chapterLabel.trim() ? d.chapterLabel.trim() : 'Bond Converge');
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  return (
    <div
      className="manga-embed-root"
      style={{
        minHeight: '100vh',
        background: 'var(--bg, #0c0c12)',
        color: 'var(--text, #e8e4f0)',
        padding: '0.75rem',
        boxSizing: 'border-box',
      }}
    >
      <p
        className="font-datum"
        style={{
          fontSize: '0.62rem',
          letterSpacing: '0.14em',
          color: 'var(--text-muted, #888)',
          marginBottom: '0.5rem',
        }}
      >
        LIBRO · IFRAME · postMessage(MANGA_PANELS)
      </p>
      {script ? (
        <details className="manga-embed-script font-inter" style={{ marginBottom: '1rem', fontSize: '0.75rem' }}>
          <summary style={{ cursor: 'pointer', marginBottom: '0.35rem' }}>Guion ({script.length} caracteres)</summary>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '12rem',
              overflow: 'auto',
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid var(--border, #333)',
              borderRadius: 4,
            }}
          >
            {script}
          </pre>
        </details>
      ) : null}
      {panels.length === 0 ? (
        <p className="font-datum" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
          Esperando datos del pipeline… (Generar manga desde el dashboard)
        </p>
      ) : (
        <MangaFlipViewer panels={panels} chapterLabel={chapterLabel} />
      )}
    </div>
  );
}
