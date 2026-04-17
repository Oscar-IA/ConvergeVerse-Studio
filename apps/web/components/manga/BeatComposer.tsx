'use client';

import { SpellcheckHints } from '@/components/manga/SpellcheckHints';
import { useMultilingualSpellcheck } from '@/lib/spellcheck/useMultilingualSpellcheck';

interface BeatComposerProps {
  value: string;
  onChange: (v: string) => void;
  /** Receives trimmed beat text at submit time (same as textarea value). */
  onSubmit: (beatText: string) => void | Promise<void>;
  loading: boolean;
  /** Seconds since request started (guion + N× Replicate). */
  loadingElapsedSec?: number;
}

export function BeatComposer({
  value,
  onChange,
  onSubmit,
  loading,
  loadingElapsedSec = 0,
}: BeatComposerProps) {
  const { runSpellcheckOnBlur, spellStatus, clearSpellStatus } = useMultilingualSpellcheck();

  return (
    <section className="bvl-panel">
      <div className="bvl-panel__head font-datum">
        <span className="bvl-panel__label">INPUT</span>
        <span className="bvl-panel__meta">STORY_BEAT → POST /api/pipeline/manga</span>
      </div>
      <form
        className="bvl-panel__body"
        onSubmit={(e) => {
          e.preventDefault();
          const text = value.trim();
          if (!text) return;
          void onSubmit(text);
        }}
      >
        <label htmlFor="beat" className="sr-only">
          Story beat
        </label>
        <textarea
          id="beat"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (spellStatus.state !== 'idle') clearSpellStatus();
          }}
          onBlur={() => {
            if (loading) return;
            void runSpellcheckOnBlur(value, onChange);
          }}
          placeholder="NPC POV: Aren Valis watches a Wanderer fall in battle — then stand again. The gate guards whisper of the Orbets…"
          rows={5}
          disabled={loading}
          spellCheck={false}
          className="bvl-textarea font-datum"
        />
        <SpellcheckHints status={spellStatus} />
        {loading && (
          <p className="font-datum bvl-loading-hint">
            Guion (Claude) ~10–40s · cada imagen (Flux) ~5–25s · 2 paneles ≈ 1–3 min. No cierres esta pestaña.
            {loadingElapsedSec > 0 && (
              <span className="bvl-loading-hint__time"> · {loadingElapsedSec}s</span>
            )}
          </p>
        )}
        <div className="bvl-actions">
          <button type="submit" disabled={loading || !value.trim()} className="bvl-btn bvl-btn--primary">
            {loading ? 'SYNTHESIZING…' : 'GENERATE MANGA'}
          </button>
        </div>
      </form>
    </section>
  );
}
