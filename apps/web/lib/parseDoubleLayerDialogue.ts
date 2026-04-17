/**
 * Diálogo de doble capa — Libro Digital (ConvergeVerse).
 *
 * En el guion, usa líneas de sección solas en una línea:
 *   :::bond_os
 *   texto técnico del narrador / BOND OS (multilínea permitido)
 *   :::aren
 *   interrupción coloquial de Aren (multilínea)
 *
 * Alias aceptados: :::bond → bond_os. :::narrator o sin marcadores = narración plana.
 */

export type DoubleLayerSegmentType = 'plain' | 'bond_os' | 'aren';

export type DoubleLayerSegment = {
  type: DoubleLayerSegmentType;
  text: string;
};

const SECTION_LINE = /^:::([a-zA-Z0-9_]+)\s*$/;

function normalizeTag(tag: string): DoubleLayerSegmentType {
  const t = tag.trim().toLowerCase();
  if (t === 'bond_os' || t === 'bond' || t === 'narrador_bond') return 'bond_os';
  if (t === 'aren' || t === 'aren_interrupt' || t === 'interrupcion') return 'aren';
  if (t === 'narrator' || t === 'narrador' || t === 'plain') return 'plain';
  return 'plain';
}

/**
 * Parte el guion en segmentos para render con estilos distintos.
 * Si no hay ningún `:::tag`, devuelve un solo segmento `plain`.
 */
export function parseDoubleLayerScript(raw: string): DoubleLayerSegment[] {
  const text = raw ?? '';
  if (!text.includes(':::')) {
    return [{ type: 'plain', text }];
  }

  const lines = text.split(/\r?\n/);
  const segments: DoubleLayerSegment[] = [];
  let mode: DoubleLayerSegmentType = 'plain';
  const buffer: string[] = [];

  const flush = () => {
    const joined = buffer.join('\n');
    buffer.length = 0;
    const trimmed = joined.replace(/^\n+/, '').replace(/\n+$/, '');
    if (trimmed.length > 0) {
      segments.push({ type: mode, text: trimmed });
    }
  };

  for (const line of lines) {
    const m = line.match(SECTION_LINE);
    if (m) {
      flush();
      mode = normalizeTag(m[1]);
      continue;
    }
    buffer.push(line);
  }
  flush();

  return segments.length > 0 ? segments : [{ type: 'plain', text }];
}

/** Texto plano (p. ej. para TTS) sin marcadores de sección. */
export function stripDoubleLayerMarkers(raw: string): string {
  const segs = parseDoubleLayerScript(raw);
  return segs.map((s) => s.text).join('\n\n').trim() || raw.trim();
}

/** Segmentos `:::bond_os` para el glosario lateral «Nerd». */
export function extractBondGlossarySegments(segments: DoubleLayerSegment[]): DoubleLayerSegment[] {
  return segments.filter((s) => s.type === 'bond_os' && (s.text || '').trim().length > 0);
}
