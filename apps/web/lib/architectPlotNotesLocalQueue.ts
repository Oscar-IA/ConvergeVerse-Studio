/**
 * Cola de respaldo en localStorage cuando falla POST /architect-plot-notes (red / API).
 * Solo en el navegador; no sustituye a Supabase para el GENERADOR hasta sincronizar.
 */

export type LocalArchitectPlotNote = {
  localId: string;
  raw_plot_idea: string;
  title: string;
  savedAt: string;
};

const STORAGE_KEY = 'cv_architect_plot_notes_local_v1';

function isNote(x: unknown): x is LocalArchitectPlotNote {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.localId === 'string' &&
    typeof o.raw_plot_idea === 'string' &&
    typeof o.savedAt === 'string'
  );
}

export function readLocalArchitectPlotQueue(): LocalArchitectPlotNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isNote);
  } catch {
    return [];
  }
}

export function writeLocalArchitectPlotQueue(notes: LocalArchitectPlotNote[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    // quota exceeded, private mode, etc.
  }
}

export function appendLocalArchitectPlotNote(
  partial: Pick<LocalArchitectPlotNote, 'localId' | 'raw_plot_idea'> & { title?: string },
): LocalArchitectPlotNote[] {
  const prev = readLocalArchitectPlotQueue();
  const row: LocalArchitectPlotNote = {
    localId: partial.localId,
    raw_plot_idea: partial.raw_plot_idea.trim(),
    title: (partial.title ?? '').trim(),
    savedAt: new Date().toISOString(),
  };
  if (!row.raw_plot_idea) return prev;
  const next = [row, ...prev];
  writeLocalArchitectPlotQueue(next);
  return next;
}

export function replaceLocalArchitectPlotQueue(notes: LocalArchitectPlotNote[]): void {
  writeLocalArchitectPlotQueue(notes);
}
