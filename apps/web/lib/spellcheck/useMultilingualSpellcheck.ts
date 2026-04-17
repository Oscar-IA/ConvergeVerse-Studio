'use client';

import { useCallback, useState } from 'react';

export type SpellMistakeClient = {
  word: string;
  suggestions: string[];
};

export type SpellStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | {
      state: 'ok';
      lang: string;
      replacementCount: number;
      mistakes: SpellMistakeClient[];
    }
  | { state: 'error'; message: string };

export type SpellcheckUiLang = 'es' | 'en' | 'fr' | 'auto';

type ApiSpellResponse = {
  detectedLang?: string;
  mistakes?: { word: string; suggestions: string[] }[];
  correctedText?: string;
  replacementCount?: number;
  error?: string;
};

/**
 * Corrector multilingüe (es / en / fr): servidor nspell + franc-min.
 * `spellLang`: auto = detección; es/en/fr fuerza diccionario (pie del dashboard).
 */
export function useMultilingualSpellcheck(spellLang: SpellcheckUiLang = 'auto') {
  const [status, setStatus] = useState<SpellStatus>({ state: 'idle' });

  const runSpellcheckOnBlur = useCallback(
    async (text: string, onApplyCorrection: (next: string) => void) => {
      if (!text.trim()) {
        setStatus({ state: 'idle' });
        return;
      }
      setStatus({ state: 'checking' });
      try {
        const body: Record<string, unknown> = { text, autocorrect: true };
        if (spellLang !== 'auto') {
          body.lang = spellLang;
        }
        const res = await fetch('/api/spellcheck', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as ApiSpellResponse;
        if (!res.ok) {
          throw new Error(data.error || `HTTP ${res.status}`);
        }

        const corrected = data.correctedText ?? text;
        if (corrected !== text) {
          onApplyCorrection(corrected);
        }

        const mistakes = (data.mistakes ?? []).map((m) => ({
          word: m.word,
          suggestions: m.suggestions ?? [],
        }));

        setStatus({
          state: 'ok',
          lang: data.detectedLang ?? '?',
          replacementCount: data.replacementCount ?? 0,
          mistakes,
        });
      } catch (e) {
        setStatus({
          state: 'error',
          message: e instanceof Error ? e.message : 'Spellcheck error',
        });
      }
    },
    [spellLang],
  );

  const clearSpellStatus = useCallback(() => setStatus({ state: 'idle' }), []);

  return { runSpellcheckOnBlur, spellStatus: status, clearSpellStatus };
}
