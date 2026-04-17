'use client';

import type { SpellStatus } from '@/lib/spellcheck/useMultilingualSpellcheck';

export function SpellcheckHints({ status }: { status: SpellStatus }) {
  if (status.state === 'idle') return null;

  if (status.state === 'checking') {
    return (
      <p className="spellcheck-hints font-datum" role="status">
        <span className="spellcheck-hints__tag">ORTOGRAFÍA</span> Analizando idioma (es / en / fr)…
      </p>
    );
  }

  if (status.state === 'error') {
    return (
      <p className="spellcheck-hints spellcheck-hints--error font-datum" role="alert">
        <span className="spellcheck-hints__tag">ORTOGRAFÍA</span> {status.message}
      </p>
    );
  }

  const { lang, replacementCount, mistakes } = status;
  const unresolved = mistakes.filter((m) => m.suggestions.length > 0);

  return (
    <div className="spellcheck-hints font-datum" role="status">
      <p className="spellcheck-hints__summary">
        <span className="spellcheck-hints__tag">ORTOGRAFÍA</span>
        <span className="spellcheck-hints__lang">[{lang}]</span>
        {replacementCount > 0 ? (
          <span> · Autocorregido: {replacementCount} palabra(s)</span>
        ) : (
          <span> · Sin cambios automáticos</span>
        )}
      </p>
      {unresolved.length > 0 && (
        <ul className="spellcheck-hints__list">
          {unresolved.slice(0, 12).map((m, i) => (
            <li key={`${m.word}-${i}`}>
              <mark className="spellcheck-hints__word">{m.word}</mark>
              {m.suggestions[0] ? (
                <span className="spellcheck-hints__sug"> → {m.suggestions.slice(0, 3).join(', ')}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
