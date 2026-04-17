'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export type ProactiveChapterOption = {
  id: string;
  title: string;
  day_number: number;
  slot: number;
  script: string;
};

type Props = {
  chapters: ProactiveChapterOption[];
  disabled?: boolean;
};

const fontStack =
  'system-ui, -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif';

function parseApiDetail(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  }
  return `HTTP ${status}`;
}

export function ProactiveFeedbackPanel({ chapters, disabled = false }: Props) {
  const api = `${getApiBaseUrl()}/api/story-engine`;

  const sorted = useMemo(() => {
    return [...chapters].sort((a, b) => {
      if (b.day_number !== a.day_number) return b.day_number - a.day_number;
      return a.slot - b.slot;
    });
  }, [chapters]);

  const [chapterId, setChapterId] = useState(() => sorted[0]?.id ?? '');
  const [scientificLore, setScientificLore] = useState('');

  useEffect(() => {
    if (!sorted.length) return;
    if (!chapterId || !sorted.some((c) => c.id === chapterId)) {
      setChapterId(sorted[0].id);
    }
  }, [sorted, chapterId]);
  const [includeVisualRefs, setIncludeVisualRefs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ refs: number; title: string | null } | null>(null);

  const runFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setMeta(null);
    try {
      if (!chapterId) {
        throw new Error('Selecciona un capítulo con guion.');
      }
      const res = await fetch(`${api}/proactive-feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapter_id: chapterId,
          scientific_lore: scientificLore.trim(),
          include_visual_refs: includeVisualRefs,
        }),
      });
      const data = (await res.json()) as {
        suggestions_markdown?: string;
        visual_references_used?: number;
        chapter_title?: string | null;
        detail?: unknown;
      };
      if (!res.ok) throw new Error(parseApiDetail(data, res.status));
      setResult(data.suggestions_markdown ?? '');
      setMeta({
        refs: Number(data.visual_references_used) || 0,
        title: data.chapter_title ?? null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [api, chapterId, scientificLore, includeVisualRefs, sorted]);

  const card: CSSProperties = {
    background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.08) 0%, rgba(30, 27, 75, 0.35) 100%)',
    border: '1px solid rgba(96, 165, 250, 0.35)',
    borderRadius: '1.5rem',
    padding: 'clamp(1rem, 3vw, 1.35rem)',
    marginBottom: '1.25rem',
    boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
  };

  if (sorted.length === 0) {
    return (
      <section style={card}>
        <p style={{ fontFamily: fontStack, fontSize: '0.65rem', color: '#64748b', margin: 0 }}>
          Motor de reacción proactiva: genera al menos un capítulo para elegir guion.
        </p>
      </section>
    );
  }

  return (
    <section style={card}>
      <h2
        style={{
          fontFamily: fontStack,
          fontSize: '0.72rem',
          letterSpacing: '0.2em',
          color: '#93c5fd',
          margin: '0 0 0.35rem',
          fontWeight: 800,
        }}
      >
        MOTOR DE REACCIÓN PROACTIVA
      </h2>
      <p
        style={{
          fontFamily: fontStack,
          fontSize: '0.62rem',
          color: 'rgba(148, 163, 184, 0.95)',
          margin: '0 0 1rem',
          lineHeight: 1.55,
          maxWidth: '46rem',
        }}
      >
        El asistente <strong style={{ color: '#e2e8f0' }}>no solo obedece</strong>: lee tu guion, la
        biblia visual y (opcional) tus notas de ciencia — y <strong style={{ color: '#e2e8f0' }}>propone</strong>{' '}
        mejoras (física creíble, combate visceral, hooks de lore). No modifica Supabase.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <label style={{ fontFamily: fontStack, fontSize: '0.6rem', color: '#94a3b8', flex: '1 1 200px' }}>
          Capítulo
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            disabled={disabled || loading}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '0.45rem 0.5rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(0,0,0,0.45)',
              color: '#e2e8f0',
              fontFamily: fontStack,
              fontSize: '0.7rem',
            }}
          >
            {sorted.map((c) => (
              <option key={c.id} value={c.id}>
                D{c.day_number} · S{c.slot} — {c.title || '(sin título)'}
              </option>
            ))}
          </select>
        </label>
        <label
          style={{
            fontFamily: fontStack,
            fontSize: '0.6rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 18,
          }}
        >
          <input
            type="checkbox"
            checked={includeVisualRefs}
            onChange={(e) => setIncludeVisualRefs(e.target.checked)}
            disabled={disabled || loading}
          />
          Incluir referencias visuales (Supabase)
        </label>
      </div>

      <label style={{ fontFamily: fontStack, fontSize: '0.6rem', color: '#94a3b8', display: 'block', marginBottom: '0.65rem' }}>
        Ciencia / lore aplicado (opcional). Vacío = la API inyecta la Ancla de Realismo (ER + energía oscura,
        dilatación temporal, BOND como código de honor digital).
        <textarea
          value={scientificLore}
          onChange={(e) => setScientificLore(e.target.value)}
          rows={3}
          placeholder="Ej. Refuerza el coste temporal del sacrificio de Aren en el Ep 4 con dilatación cerca del umbral…"
          disabled={disabled || loading}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 6,
            padding: '0.5rem 0.65rem',
            borderRadius: 8,
            border: '1px solid rgba(96, 165, 250, 0.35)',
            background: 'rgba(0,0,0,0.4)',
            color: '#f1f5f9',
            fontFamily: fontStack,
            fontSize: '0.68rem',
            lineHeight: 1.45,
            resize: 'vertical',
          }}
        />
      </label>

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => void runFeedback()}
        style={{
          fontFamily: fontStack,
          padding: '0.65rem 1.35rem',
          borderRadius: 9999,
          border: 'none',
          fontWeight: 800,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          opacity: disabled || loading ? 0.5 : 1,
          background: 'linear-gradient(135deg, #38bdf8, #2563eb)',
          color: '#0f172a',
          marginBottom: '0.75rem',
        }}
      >
        {loading ? 'Consultando al Arquitecto…' : 'Pedir propuestas al Arquitecto'}
      </button>

      {error && (
        <div
          style={{
            fontFamily: fontStack,
            fontSize: '0.68rem',
            color: '#fca5a5',
            marginBottom: '0.65rem',
            padding: '0.5rem 0.65rem',
            background: 'rgba(127, 29, 29, 0.25)',
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {meta && (
        <p style={{ fontFamily: fontStack, fontSize: '0.55rem', color: '#64748b', margin: '0 0 0.5rem' }}>
          Referencias visuales usadas: {meta.refs}
          {meta.title ? ` · ${meta.title}` : ''}
        </p>
      )}

      {result && (
        <div
          style={{
            maxHeight: 'min(70vh, 520px)',
            overflow: 'auto',
            padding: '0.85rem 1rem',
            borderRadius: 12,
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(148, 163, 184, 0.2)',
            fontFamily: fontStack,
            fontSize: '0.72rem',
            lineHeight: 1.55,
            color: '#e2e8f0',
            whiteSpace: 'pre-wrap',
          }}
        >
          {result}
        </div>
      )}
    </section>
  );
}
