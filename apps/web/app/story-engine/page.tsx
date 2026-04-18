'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getApiBaseUrl } from '@/lib/config';
import {
  appendLocalArchitectPlotNote,
  readLocalArchitectPlotQueue,
  type LocalArchitectPlotNote,
  writeLocalArchitectPlotQueue,
} from '@/lib/architectPlotNotesLocalQueue';
import { ReadingExperience } from '@/components/story-engine/ReadingExperience';
import { SeasonProgress } from '@/components/story-engine/SeasonProgress';
import { LoreAnnexSection, type LoreAnnex } from '@/components/story-engine/LoreAnnexSection';
import { ArchitectWorkspace } from '@/components/story-engine/ArchitectWorkspace';
import { DecisionTimeline, type TimelineEventRow } from '@/components/story-engine/DecisionTimeline';
import { VisualRefUploader } from '@/components/story-engine/VisualRefUploader';
import { ProactiveFeedbackPanel } from '@/components/story-engine/ProactiveFeedbackPanel';

function formatApiError(body: unknown, status: number): string {
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === 'string') return d;
    if (Array.isArray(d)) return JSON.stringify(d);
  }
  return `HTTP ${status}`;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type ProductionPhase = 'novel' | 'manga' | 'animation' | 'complete';

function productionPhaseLabel(phase: string | undefined): string {
  switch ((phase || 'novel').toLowerCase()) {
    case 'manga':
      return 'MANGA';
    case 'animation':
      return 'ANIM · REF';
    case 'complete':
      return 'COMPLETO';
    default:
      return 'NOVELA';
  }
}

function productionPhaseColor(phase: string | undefined): string {
  switch ((phase || 'novel').toLowerCase()) {
    case 'manga':
      return '#f472b6';
    case 'animation':
      return '#a78bfa';
    case 'complete':
      return '#4adfff';
    default:
      return '#94a3b8';
  }
}

interface Chapter {
  id: string;
  day_number: number;
  slot: number;
  title: string;
  script: string;
  panels: Panel[];
  status: 'draft' | 'approved' | 'rejected' | 'published' | 'obsolete';
  /** Ciclo Novela→Manga→Animación — columna production_phase (SQL migration) */
  production_phase?: ProductionPhase | string;
  arc_position: string;
  symbols_planted: StorySymbol[];
  bond_os_signals: BondSignal[];
  author_notes: string;
  created_at: string;
  /** Canon: orden global en el Libro de Crónicas (tras aprobar) */
  canon_chapter_number?: number | null;
  slug?: string | null;
  canon_registered_at?: string | null;
  book_payload?: {
    novela?: { text?: string; char_count?: number };
    manga?: { panels?: Panel[]; panel_count?: number };
    /** Incluye timeline_branch_event_id tras regeneración en cascada */
    meta?: Record<string, unknown> & {
      timeline_branch_event_id?: string;
      timeline_branch_at?: string;
    };
    /** Anexo de Lore (bestiario, ficha Aren, runas) — snapshot al aprobar */
    lore_annex?: LoreAnnex;
    hero_image?: { url?: string; scene_prompt_en?: string; source?: string };
    narration?: {
      urls?: string[];
      voice?: string;
      model?: string;
      segments?: number;
      text_source?: string;
      provider?: string;
    };
  };
  /** Generado al «Publicar al Legado» (finalize) */
  meta_summary?: string | null;
  /** Motor visual BOND OS (Replicate al publicar) */
  hero_image_url?: string | null;
  /** Primer MP3 narración (OpenAI TTS → Storage) */
  narration_audio_url?: string | null;
}

interface Panel {
  scene_index: number;
  description: string;
  dialogue?: string;
  image_url?: string;
  image_provider?: string;
}

/** No usar el nombre `Symbol` — choca con el tipo global ES6 y puede tumbar el compilador. */
interface StorySymbol {
  name: string;
  description: string;
  category: string;
  game_reveal: string;
}

interface BondSignal {
  feature: string;
  narrative_element: string;
}

/** Cour / Libro Digital — alineado con GET /chapters/latest y POST /generate */
interface CourContext {
  cour_enabled?: boolean;
  cour_length?: number;
  season_index?: number;
  episode_in_cour?: number;
  phase_key?: string;
  phase_instruction?: string;
  day_number?: number;
  is_cour_finale?: boolean;
  prequel_seeding_active?: boolean;
}

// ── API helpers ──────────────────────────────────────────────────────────────

const api = async (path: string, method = 'GET', body?: object) => {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/story-engine${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(formatApiError(err, res.status));
  }
  return res.json();
};

// ── Diff component ───────────────────────────────────────────────────────────

function ScriptDiff({ original, current }: { original: string; current: string }) {
  if (original === current) return null;
  return (
    <div style={{
      background: '#0f1a0f',
      border: '1px solid #2a4a2a',
      borderRadius: '4px',
      padding: '0.75rem',
      marginTop: '0.5rem',
      fontSize: '0.7rem',
      fontFamily: 'monospace',
    }}>
      <div style={{ color: '#ff6b6b', marginBottom: '0.25rem' }}>− Original</div>
      <div style={{ color: '#888', marginBottom: '0.5rem', lineHeight: 1.5 }}>{original}</div>
      <div style={{ color: '#6bff6b', marginBottom: '0.25rem' }}>+ Editado</div>
      <div style={{ color: '#ccc', lineHeight: 1.5 }}>{current}</div>
    </div>
  );
}

// ── Chapter card ─────────────────────────────────────────────────────────────

function ChapterCard({
  chapter,
  onApprove,
  onReject,
  onEdit,
  onFinalize,
  onChapterPatch,
  postNarrate,
  onMangaIllustrate,
  mangaIllustrateBusy,
  onRegenerateCascade,
  cascadeBusy = false,
  onSyncLoreForward,
  loreSyncBusy = false,
}: {
  chapter: Chapter;
  onApprove: (id: string, notes: string) => void;
  onReject: (id: string, notes: string) => void;
  onEdit: (id: string, field: string, original: string, edited: string, reason: string) => void;
  onFinalize: (
    id: string,
    opts: { generateHeroIllustration: boolean; generateNarrationAudio: boolean },
  ) => void;
  onChapterPatch?: (id: string, partial: Partial<Chapter>) => void;
  postNarrate?: (chapterId: string) => Promise<Record<string, unknown>>;
  onMangaIllustrate?: (id: string) => void;
  mangaIllustrateBusy?: boolean;
  onRegenerateCascade?: (
    id: string,
    plotPivotNote: string,
    opts: { cascadeMode: 'hard_reset' | 'soft_enrich'; maxFutureChapters: number },
  ) => void | Promise<void>;
  cascadeBusy?: boolean;
  onSyncLoreForward?: (id: string, newDetail: string) => void | Promise<void>;
  loreSyncBusy?: boolean;
}) {
  const tSE = useTranslations('storyEngine');
  const [expanded, setExpanded] = useState(chapter.slot === 1);
  const [generateHeroIllustration, setGenerateHeroIllustration] = useState(true);
  const [generateNarrationAudio, setGenerateNarrationAudio] = useState(false);
  const [editingScript, setEditingScript] = useState(false);
  const [scriptDraft, setScriptDraft] = useState(chapter.script);
  const [editReason, setEditReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showSymbols, setShowSymbols] = useState(false);

  const slotLabels = ['', 'SETUP', 'CONFLICTO', 'MISTERIO'];
  const slotColors = ['', '#4a9eff', '#ff6b4a', '#b44aff'];
  const [cascadePlotNote, setCascadePlotNote] = useState('');
  const [cascadeMode, setCascadeMode] = useState<'hard_reset' | 'soft_enrich'>('hard_reset');
  const [softMaxFuture, setSoftMaxFuture] = useState(12);
  const [loreSyncDetail, setLoreSyncDetail] = useState('');

  const statusColors = {
    draft: '#888',
    approved: '#4aff6b',
    rejected: '#ff4a4a',
    published: '#4adfff',
    obsolete: '#555',
  };

  return (
    <div style={{
      background: '#0d0d0d',
      border: `1px solid ${
        chapter.status === 'published'
          ? '#1a3a4a'
          : chapter.status === 'approved'
            ? '#2a4a2a'
            : chapter.status === 'rejected'
              ? '#4a2a2a'
              : '#1a1a1a'
      }`,
      borderLeft: `3px solid ${slotColors[chapter.slot]}`,
      borderRadius: '4px',
      overflow: 'hidden',
      marginBottom: '1rem',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem 1rem',
          cursor: 'pointer',
          background: '#111',
          borderBottom: expanded ? '1px solid #1a1a1a' : 'none',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.55rem',
          letterSpacing: '0.12em',
          color: productionPhaseColor(chapter.production_phase),
          background: `${productionPhaseColor(chapter.production_phase)}22`,
          padding: '2px 8px',
          borderRadius: '2px',
          border: `1px solid ${productionPhaseColor(chapter.production_phase)}44`,
        }}>
          {productionPhaseLabel(chapter.production_phase)}
        </span>
        <span style={{
          fontFamily: 'monospace',
          fontSize: '0.6rem',
          letterSpacing: '0.15em',
          color: slotColors[chapter.slot],
          background: `${slotColors[chapter.slot]}22`,
          padding: '2px 8px',
          borderRadius: '2px',
        }}>
          SLOT {chapter.slot} · {slotLabels[chapter.slot]}
        </span>
        <span style={{ flex: 1, fontFamily: 'serif', fontSize: '0.9rem', color: '#e8d5a0' }}>
          {chapter.title}
        </span>
        {(chapter.status === 'approved' || chapter.status === 'published') && chapter.canon_chapter_number != null && (
          <span style={{
            fontSize: '0.5rem',
            fontFamily: 'monospace',
            letterSpacing: '0.12em',
            color: chapter.status === 'published' ? '#4adfff' : '#C9A84C',
            border: `1px solid ${chapter.status === 'published' ? '#2a4a5a' : '#3a3020'}`,
            padding: '2px 6px',
            borderRadius: '2px',
          }} title={chapter.slug || ''}>
            {chapter.status === 'published' ? 'LEGADO #' : 'CANON #'}{chapter.canon_chapter_number}
          </span>
        )}
        <span style={{
          fontSize: '0.55rem',
          fontFamily: 'monospace',
          letterSpacing: '0.1em',
          color: statusColors[chapter.status],
          textTransform: 'uppercase',
        }}>
          {chapter.status}
        </span>
        <span style={{ color: '#444', fontSize: '0.8rem' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding: '1rem' }}>

          {/* Script section */}
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
            }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: '#666' }}>
                GUION
              </span>
              {chapter.status === 'draft' && (
                <button
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.55rem',
                    letterSpacing: '0.1em',
                    color: '#4a9eff',
                    background: 'transparent',
                    border: '1px solid #4a9eff44',
                    padding: '2px 8px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setEditingScript(!editingScript)}
                >
                  {editingScript ? 'CANCELAR' : 'EDITAR'}
                </button>
              )}
            </div>

            {editingScript ? (
              <div>
                <textarea
                  value={scriptDraft}
                  onChange={(e) => setScriptDraft(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '200px',
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    color: '#ddd',
                    fontFamily: 'serif',
                    fontSize: '0.8rem',
                    lineHeight: 1.6,
                    padding: '0.75rem',
                    resize: 'vertical',
                    borderRadius: '2px',
                  }}
                />
                <ScriptDiff original={chapter.script} current={scriptDraft} />
                <input
                  type="text"
                  placeholder="¿Por qué hiciste este cambio? (ayuda a la IA a aprender)"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: '0.5rem',
                    background: '#0a0a0a',
                    border: '1px solid #333',
                    color: '#ddd',
                    fontFamily: 'monospace',
                    fontSize: '0.7rem',
                    padding: '0.5rem',
                    borderRadius: '2px',
                  }}
                />
                <button
                  onClick={() => {
                    if (scriptDraft !== chapter.script) {
                      onEdit(chapter.id, 'script', chapter.script, scriptDraft, editReason);
                    }
                    setEditingScript(false);
                  }}
                  style={{
                    marginTop: '0.5rem',
                    fontFamily: 'monospace',
                    fontSize: '0.65rem',
                    letterSpacing: '0.15em',
                    color: '#111',
                    background: '#4aff6b',
                    border: 'none',
                    padding: '0.4rem 1rem',
                    cursor: 'pointer',
                  }}
                >
                  GUARDAR EDICIÓN
                </button>

                {onSyncLoreForward && (
                  <div
                    style={{
                      marginTop: '1rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '14px',
                      background: 'linear-gradient(145deg, rgba(251, 191, 36, 0.12) 0%, rgba(234, 179, 8, 0.08) 50%, rgba(30, 58, 138, 0.2) 100%)',
                      border: '1px solid rgba(251, 191, 36, 0.45)',
                      boxShadow: '0 0 28px rgba(251, 191, 36, 0.12)',
                    }}
                  >
                    <div style={{
                      fontSize: '0.58rem',
                      letterSpacing: '0.2em',
                      color: '#fcd34d',
                      marginBottom: '0.45rem',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                    >
                      LIBRO DIGITAL · SINCRONIZAR LORE
                    </div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.58rem', lineHeight: 1.5, color: 'rgba(226, 232, 240, 0.85)' }}>
                      Tras pulir un párrafo (runa, objeto, gesto), describe el <strong style={{ color: '#fde68a' }}>detalle nuevo</strong> aquí.
                      Los capítulos <strong>aprobados/publicados posteriores</strong> se refinan con IA sin borrarlos.
                    </p>
                    <textarea
                      value={loreSyncDetail}
                      onChange={(e) => setLoreSyncDetail(e.target.value)}
                      placeholder="Ej. La runa del umbral tiene tres anillos entrelazados y vibra en azul cobalto cuando Aren miente."
                      rows={2}
                      style={{
                        width: '100%',
                        resize: 'vertical',
                        padding: '0.5rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid rgba(251, 191, 36, 0.4)',
                        background: 'rgba(0,0,0,0.5)',
                        color: '#fffbeb',
                        fontSize: '0.68rem',
                        lineHeight: 1.45,
                        fontFamily: 'system-ui, sans-serif',
                      }}
                    />
                    <button
                      type="button"
                      disabled={loreSyncBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        const d = loreSyncDetail.trim();
                        if (!d) {
                          window.alert('Describe el detalle de lore a propagar hacia el futuro.');
                          return;
                        }
                        void onSyncLoreForward(chapter.id, d);
                      }}
                      style={{
                        marginTop: '0.55rem',
                        width: '100%',
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: '0.58rem',
                        letterSpacing: '0.18em',
                        fontWeight: 800,
                        color: '#1c1917',
                        background: loreSyncBusy
                          ? '#57534e'
                          : 'linear-gradient(180deg, #fde047 0%, #eab308 55%, #ca8a04 100%)',
                        border: '1px solid rgba(253, 224, 71, 0.6)',
                        padding: '0.55rem 1rem',
                        borderRadius: '9999px',
                        cursor: loreSyncBusy ? 'default' : 'pointer',
                        boxShadow: loreSyncBusy ? 'none' : '0 0 24px rgba(250, 204, 21, 0.35)',
                      }}
                    >
                      {loreSyncBusy ? 'SINCRONIZANDO…' : '✦ SINCRONIZAR LORE EN EL FUTURO'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <ReadingExperience
                  title={chapter.title}
                  content={scriptDraft}
                  chapterId={chapter.id}
                  narrationUrls={chapter.book_payload?.narration?.urls ?? null}
                  narrationAudioUrl={chapter.narration_audio_url ?? null}
                  postNarrate={postNarrate}
                  onChapterUpdated={(row) => {
                    if (onChapterPatch && row && typeof row === 'object') {
                      onChapterPatch(chapter.id, row as Partial<Chapter>);
                    }
                  }}
                  timelineGlitch={Boolean(
                    chapter.book_payload?.meta
                    && typeof chapter.book_payload.meta === 'object'
                    && chapter.book_payload.meta.timeline_branch_event_id,
                  )}
                />
              </div>
            )}
          </div>

          {chapter.status !== 'obsolete' && onRegenerateCascade && ['draft', 'approved', 'published', 'rejected'].includes(chapter.status) && (
            <div
              style={{
                marginTop: '1rem',
                marginBottom: '1rem',
                padding: '1rem 1.15rem',
                borderRadius: '1.25rem',
                background: cascadeMode === 'soft_enrich'
                  ? 'linear-gradient(135deg, rgba(6, 78, 59, 0.25) 0%, rgba(30, 27, 75, 0.35) 100%)'
                  : 'linear-gradient(135deg, rgba(127, 29, 29, 0.22) 0%, rgba(30, 27, 75, 0.35) 100%)',
                border: cascadeMode === 'soft_enrich'
                  ? '1px solid rgba(52, 211, 153, 0.35)'
                  : '1px solid rgba(248, 113, 113, 0.28)',
                boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '0.65rem' }}>
                <span style={{ fontSize: '0.55rem', letterSpacing: '0.12em', color: '#94a3b8' }}>PRESERVAR EL FUTURO</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.58rem', color: '#fca5a5', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`cascade-${chapter.id}`}
                    checked={cascadeMode === 'hard_reset'}
                    onChange={() => setCascadeMode('hard_reset')}
                  />
                  Hard reset (cambio de trama)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.58rem', color: '#6ee7b7', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`cascade-${chapter.id}`}
                    checked={cascadeMode === 'soft_enrich'}
                    onChange={() => setCascadeMode('soft_enrich')}
                  />
                  Enriquecer (conservar capítulos)
                </label>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <h3 style={{
                    margin: '0 0 0.4rem',
                    fontSize: '0.72rem',
                    letterSpacing: '0.14em',
                    color: cascadeMode === 'soft_enrich' ? '#6ee7b7' : '#fca5a5',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                  >
                    ZONA DE PARADOJA
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.62rem', lineHeight: 1.55, color: 'rgba(200, 200, 220, 0.82)' }}>
                    {cascadeMode === 'hard_reset' ? (
                      <>
                        <strong style={{ color: '#e2e8f0' }}>Hard reset</strong> borra y regenera desde este punto: pivote, mismo día desde este slot y días posteriores.
                        La continuidad usa el <strong style={{ color: '#93c5fd' }}>último canon previo</strong> (~25 min/slot con generador maestro).
                      </>
                    ) : (
                      <>
                        <strong style={{ color: '#a7f3d0' }}>Enriquecer</strong> mantiene los capítulos <strong>aprobados / publicados</strong> posteriores al pivote;
                        la IA integra tu nota en cada guion sin reescribir los eventos principales. Consume una llamada por capítulo futuro.
                      </>
                    )}
                  </p>
                </div>
                <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {cascadeMode === 'soft_enrich' && (
                    <label style={{ fontSize: '0.55rem', color: '#94a3b8' }}>
                      Máx. capítulos a refinar (1–24)
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={softMaxFuture}
                        onChange={(e) => setSoftMaxFuture(Math.min(24, Math.max(1, Number(e.target.value) || 12)))}
                        style={{
                          marginLeft: '0.5rem',
                          width: '3.5rem',
                          padding: '0.25rem',
                          background: '#111',
                          border: '1px solid #333',
                          color: '#e2e8f0',
                          borderRadius: '4px',
                        }}
                      />
                    </label>
                  )}
                  <textarea
                    value={cascadePlotNote}
                    onChange={(e) => setCascadePlotNote(e.target.value)}
                    placeholder={
                      cascadeMode === 'hard_reset'
                        ? 'Ej. "No quiero que Aren escape; que lo capturen en el callejón."'
                        : 'Ej. "La runa que vio Aren deja un zumbido metálico; debe mencionarse en capítulos siguientes."'
                    }
                    rows={3}
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '10px',
                      border: `1px solid ${cascadeMode === 'soft_enrich' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(248, 113, 113, 0.35)'}`,
                      background: 'rgba(0,0,0,0.45)',
                      color: '#f1f5f9',
                      fontSize: '0.68rem',
                      lineHeight: 1.45,
                      fontFamily: 'system-ui, sans-serif',
                    }}
                  />
                  <button
                    type="button"
                    disabled={cascadeBusy}
                    onClick={(e) => {
                      e.stopPropagation();
                      const t = cascadePlotNote.trim();
                      if (!t) {
                        window.alert(
                          cascadeMode === 'hard_reset'
                            ? 'Escribe una instrucción de trama para la nueva línea temporal.'
                            : 'Describe el detalle de lore o continuidad a inyectar.',
                        );
                        return;
                      }
                      void onRegenerateCascade(chapter.id, t, {
                        cascadeMode,
                        maxFutureChapters: softMaxFuture,
                      });
                    }}
                    style={{
                      alignSelf: 'flex-end',
                      fontFamily: 'ui-monospace, monospace',
                      fontSize: '0.58rem',
                      letterSpacing: '0.12em',
                      fontWeight: 700,
                      color: '#0c0a0a',
                      background: cascadeBusy
                        ? '#555'
                        : cascadeMode === 'soft_enrich'
                          ? 'linear-gradient(180deg, #6ee7b7 0%, #059669 100%)'
                          : 'linear-gradient(180deg, #f87171 0%, #dc2626 100%)',
                      border: 'none',
                      padding: '0.55rem 1.1rem',
                      borderRadius: '9999px',
                      cursor: cascadeBusy ? 'default' : 'pointer',
                      boxShadow: cascadeBusy ? 'none' : '0 8px 24px rgba(220, 38, 38, 0.25)',
                    }}
                  >
                    {cascadeBusy
                      ? cascadeMode === 'soft_enrich' ? tSE('learning') : tSE('generating')
                      : cascadeMode === 'soft_enrich' ? tSE('enrichFuture') : tSE('regenerateHardReset')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Panels preview */}
          {chapter.panels?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.15em', color: '#666', marginBottom: '0.5rem' }}>
                {tSE('panels', { count: chapter.panels.length })}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.5rem' }}>
                {chapter.panels.map((panel, i) => (
                  <div key={i} style={{
                    background: '#111',
                    border: '1px solid #222',
                    borderRadius: '2px',
                    padding: '0.5rem',
                  }}>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: '#555', marginBottom: '0.25rem' }}>
                      PANEL {i + 1}
                    </div>
                    {panel.image_url ? (
                      <img src={panel.image_url} alt={`Panel ${i+1}`} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block', marginBottom: '0.4rem' }} />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '3/4', background: '#0a0a0a', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.5rem', color: '#333' }}>{tSE('noImage')}</span>
                      </div>
                    )}
                    <p style={{ fontFamily: 'serif', fontSize: '0.65rem', color: '#888', lineHeight: 1.4 }}>
                      {panel.description?.substring(0, 80)}…
                    </p>
                    {panel.dialogue && (
                      <p style={{ fontFamily: 'monospace', fontSize: '0.6rem', color: '#e8d5a0', fontStyle: 'italic', marginTop: '0.25rem' }}>
                        "{panel.dialogue}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Symbols */}
          {chapter.symbols_planted?.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <button
                onClick={() => setShowSymbols(!showSymbols)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.15em',
                  color: '#b44aff',
                  background: 'transparent',
                  border: '1px solid #b44aff44',
                  padding: '3px 10px',
                  cursor: 'pointer',
                }}
              >
                {showSymbols ? '▲' : '▼'} SÍMBOLOS PLANTADOS ({chapter.symbols_planted.length})
              </button>
              {showSymbols && chapter.symbols_planted.map((sym, i) => (
                <div key={i} style={{
                  background: '#0a0a14',
                  border: '1px solid #b44aff33',
                  borderRadius: '2px',
                  padding: '0.6rem',
                  marginTop: '0.4rem',
                  fontSize: '0.7rem',
                }}>
                  <div style={{ color: '#b44aff', fontFamily: 'monospace', fontSize: '0.6rem', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>
                    {sym.category.toUpperCase()} · {sym.name}
                  </div>
                  <div style={{ color: '#999', marginBottom: '0.25rem' }}>{sym.description}</div>
                  <div style={{ color: '#666', fontStyle: 'italic', borderTop: '1px solid #1a1a2a', paddingTop: '0.25rem', marginTop: '0.25rem' }}>
                    🎮 Revelación en el juego: {sym.game_reveal}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Author notes */}
          {(chapter.status === 'approved' || chapter.status === 'published') && chapter.slug && (
            <div style={{
              marginBottom: '0.75rem',
              fontFamily: 'monospace',
              fontSize: '0.58rem',
              color: '#6a8a6a',
              letterSpacing: '0.06em',
            }}>
              LIBRO DIGITAL · <code style={{ color: '#9abf9a' }}>{chapter.slug}</code>
              {chapter.book_payload?.manga?.panel_count != null && (
                <span style={{ marginLeft: '0.75rem', color: '#666' }}>
                  novela + {chapter.book_payload.manga.panel_count} paneles (snapshot al aprobar)
                </span>
              )}
            </div>
          )}

          {(chapter.status === 'approved' || chapter.status === 'published') && chapter.book_payload?.lore_annex && (
            <LoreAnnexSection annex={chapter.book_payload.lore_annex} />
          )}

          {chapter.status === 'published' && chapter.meta_summary && (
            <div style={{
              background: '#0a1214',
              border: '1px solid #1a3a4a',
              borderRadius: '4px',
              padding: '0.65rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#4adfff', marginBottom: '0.35rem' }}>
                META-RESUMEN (continuidad canónica)
              </div>
              <p style={{
                fontFamily: 'serif',
                fontSize: '0.72rem',
                lineHeight: 1.65,
                color: '#b0c4c8',
                whiteSpace: 'pre-wrap',
                margin: 0,
              }}>
                {chapter.meta_summary}
              </p>
            </div>
          )}

          {chapter.status === 'published' && (chapter.hero_image_url || chapter.book_payload?.hero_image?.url) && (
            <div style={{
              marginBottom: '1rem',
              border: '1px solid #2a4a5a',
              borderRadius: '6px',
              overflow: 'hidden',
              background: '#070a0c',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.12em', color: '#6ad', padding: '0.45rem 0.65rem', borderBottom: '1px solid #1a2a38' }}>
                MOTOR VISUAL BOND OS · Replicate (Legado)
              </div>
              <img
                src={chapter.hero_image_url || chapter.book_payload?.hero_image?.url || ''}
                alt="Ilustración hero capítulo"
                style={{ width: '100%', maxHeight: '420px', objectFit: 'cover', display: 'block' }}
              />
              {chapter.book_payload?.hero_image?.scene_prompt_en && (
                <p style={{ fontSize: '0.58rem', color: '#678', padding: '0.5rem 0.65rem', margin: 0, lineHeight: 1.5 }}>
                  Escena clave (EN): {chapter.book_payload.hero_image.scene_prompt_en.slice(0, 400)}
                  {(chapter.book_payload.hero_image.scene_prompt_en.length > 400) ? '…' : ''}
                </p>
              )}
            </div>
          )}

          {chapter.status === 'approved' && ['manga', 'animation'].includes(String(chapter.production_phase || 'novel').toLowerCase()) && onMangaIllustrate && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.65rem',
              background: '#140f18',
              border: '1px solid #3a2a4a',
              borderRadius: '4px',
            }}>
              <div style={{ fontSize: '0.58rem', color: '#c4b5fd', marginBottom: '0.45rem', letterSpacing: '0.08em' }}>
                {tSE('mangaPhase')}
              </div>
              <p style={{ fontSize: '0.55rem', color: '#7a6a8a', lineHeight: 1.5, margin: '0 0 0.55rem' }}>
                Tras aprobar la novela, genera hasta 6 paneles con Flux. Luego la fase pasa a <strong style={{ color: '#a78bfa' }}>ANIM · REF</strong> (referencia para animación futura).
                Requiere <code style={{ color: '#9ab' }}>REPLICATE_API_TOKEN</code> y filas con <code style={{ color: '#9ab' }}>description</code> en cada panel.
              </p>
              <button
                type="button"
                disabled={mangaIllustrateBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  onMangaIllustrate(chapter.id);
                }}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.14em',
                  color: '#0c0614',
                  background: mangaIllustrateBusy ? '#444' : 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)',
                  border: 'none',
                  padding: '0.45rem 1rem',
                  cursor: mangaIllustrateBusy ? 'default' : 'pointer',
                  borderRadius: '9999px',
                  boxShadow: mangaIllustrateBusy ? 'none' : '0 8px 24px rgba(124, 58, 237, 0.25)',
                }}
              >
                {mangaIllustrateBusy ? tSE('generatingPanels') : tSE('generateMangaPanels')}
              </button>
            </div>
          )}

          {chapter.status === 'approved' && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.65rem',
              background: '#0f140f',
              border: '1px solid #2a3a2a',
              borderRadius: '4px',
            }}>
              <div style={{ fontSize: '0.58rem', color: '#7a9a7a', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                Paso 3 — <strong style={{ color: '#C9A84C' }}>Publicar al Legado</strong> (tras novela ± manga): meta-resumen,
                registra símbolos/Bond OS en memoria y actualiza el índice del día para que la siguiente generación no contradiga el canon.
                Si <code style={{ color: '#9ab' }}>REPLICATE_API_TOKEN</code> está en la API, también se genera la ilustración Flux 16:9 (crédito Replicate).
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.55rem', color: '#8ab', marginBottom: '0.55rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={generateHeroIllustration}
                  onChange={(e) => setGenerateHeroIllustration(e.target.checked)}
                />
                Generar ilustración Replicate (Prompt Maestro Laguna Legacy)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.55rem', color: '#9cf', marginBottom: '0.55rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={generateNarrationAudio}
                  onChange={(e) => setGenerateNarrationAudio(e.target.checked)}
                />
                Generar narración OpenAI TTS (Storage) — «La Voz del Multiverso»
              </label>
              <button
                type="button"
                onClick={() =>
                  onFinalize(chapter.id, {
                    generateHeroIllustration,
                    generateNarrationAudio,
                  })}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.15em',
                  color: '#061018',
                  background: '#4adfff',
                  border: 'none',
                  padding: '0.5rem 1.2rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ◆ PUBLICAR AL LEGADO
              </button>
            </div>
          )}

          {chapter.author_notes && (
            <div style={{
              background: '#0a0a0a',
              border: '1px solid #222',
              borderRadius: '2px',
              padding: '0.6rem',
              marginBottom: '1rem',
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.55rem', letterSpacing: '0.15em', color: '#555', marginBottom: '0.25rem' }}>
                NOTAS DEL MOTOR NARRATIVO
              </div>
              <p style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#666', lineHeight: 1.5, fontStyle: 'italic' }}>
                {chapter.author_notes}
              </p>
            </div>
          )}

          {chapter.status === 'draft' && (
            <p style={{
              fontSize: '0.55rem',
              color: '#64748b',
              marginBottom: '0.65rem',
              lineHeight: 1.5,
              letterSpacing: '0.04em',
            }}
            >
              <strong style={{ color: '#94a3b8' }}>Fase novela:</strong> guion denso (~25 min con generador maestro). Al aprobar, el sistema pasa a fase <strong style={{ color: '#f472b6' }}>MANGA</strong> para ilustrar paneles antes del Legado.
            </p>
          )}

          {/* Approval actions */}
          {chapter.status === 'draft' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <input
                type="text"
                placeholder="Notas opcionales (se guardarán con el capítulo)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  flex: 1,
                  background: '#0a0a0a',
                  border: '1px solid #333',
                  color: '#ddd',
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  padding: '0.5rem',
                  borderRadius: '2px',
                }}
              />
              <button
                onClick={() => onApprove(chapter.id, notes)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.15em',
                  color: '#111',
                  background: '#4aff6b',
                  border: 'none',
                  padding: '0.5rem 1.2rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ✓ APROBAR
              </button>
              <button
                onClick={() => onReject(chapter.id, notes)}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.65rem',
                  letterSpacing: '0.15em',
                  color: '#ff4a4a',
                  background: 'transparent',
                  border: '1px solid #ff4a4a',
                  padding: '0.5rem 1.2rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ✗ RECHAZAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function StoryEnginePage() {
  const tSE = useTranslations('storyEngine');
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [learning, setLearning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [worldState, setWorldState] = useState<object | null>(null);

  /** Slider 0–100; se normaliza a proporción antes de enviar */
  const [toneHumor, setToneHumor] = useState(40);
  const [toneEpic, setToneEpic] = useState(40);
  const [toneStrategy, setToneStrategy] = useState(20);
  const [injectMarketing, setInjectMarketing] = useState('');
  const [forceSecret, setForceSecret] = useState(false);
  const [backgroundLore, setBackgroundLore] = useState('');
  /** Generador maestro: 3 actos (~25 min anime), guion denso por slot */
  const [useMasterGenerator, setUseMasterGenerator] = useState(true);
  /** Progreso de temporada (cour) — Libro Digital */
  const [courContext, setCourContext] = useState<CourContext | null>(null);

  /** Cola architect_plot_notes + idea inline para triangulación del GENERADOR */
  const [architectPlotDraft, setArchitectPlotDraft] = useState('');
  const [architectQueue, setArchitectQueue] = useState<{ id: string; raw_plot_idea: string; title?: string }[]>([]);
  const [architectQueueLoading, setArchitectQueueLoading] = useState(false);
  const [architectInjecting, setArchitectInjecting] = useState(false);
  /** Ideas guardadas en localStorage cuando falla la API (reintento manual o al recargar) */
  const [localArchitectQueue, setLocalArchitectQueue] = useState<LocalArchitectPlotNote[]>([]);
  const [architectLocalSyncing, setArchitectLocalSyncing] = useState(false);
  const [skipArchitectTriangulation, setSkipArchitectTriangulation] = useState(false);
  const [consumeArchitectNotes, setConsumeArchitectNotes] = useState(true);
  const [mangaBusyChapterId, setMangaBusyChapterId] = useState<string | null>(null);
  const [cascadeBusyChapterId, setCascadeBusyChapterId] = useState<string | null>(null);
  const [loreSyncBusyChapterId, setLoreSyncBusyChapterId] = useState<string | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventRow[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [visualMaster, setVisualMaster] = useState<{
    project_title: string;
    full_prompt_en: string;
    compact_prompt_en: string;
    doc_path: string;
    notes: string;
  } | null>(null);
  const [visualMasterLoading, setVisualMasterLoading] = useState(false);

  const loadVisualMaster = useCallback(async () => {
    if (visualMaster) return;
    setVisualMasterLoading(true);
    try {
      const d = await api('/visual-master-prompt');
      setVisualMaster({
        project_title: String(d.project_title ?? ''),
        full_prompt_en: String(d.full_prompt_en ?? ''),
        compact_prompt_en: String(d.compact_prompt_en ?? ''),
        doc_path: String(d.doc_path ?? ''),
        notes: String(d.notes ?? ''),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error cargando visual-master-prompt');
    } finally {
      setVisualMasterLoading(false);
    }
  }, [visualMaster]);

  const buildGenerationBody = () => {
    const h = toneHumor / 100;
    const e = toneEpic / 100;
    const s = toneStrategy / 100;
    const sum = h + e + s;
    const th = sum > 0 ? h / sum : 0.33;
    const te = sum > 0 ? e / sum : 0.33;
    const ts = sum > 0 ? s / sum : 0.34;
    const gc: Record<string, unknown> = {
      tone_mix: { humor: th, epic: te, strategy: ts },
      inject_marketing: injectMarketing.trim(),
      force_secret: forceSecret,
      background_lore: backgroundLore.trim(),
      use_master_generator: useMasterGenerator,
      consume_architect_notes: consumeArchitectNotes,
    };
    if (skipArchitectTriangulation) {
      gc.skip_architect_triangulation = true;
    }
    const inlineIdea = architectPlotDraft.trim();
    if (inlineIdea) {
      gc.architect_plot_idea = inlineIdea;
    }
    return { generation_config: gc };
  };

  const toneSumPct = toneHumor + toneEpic + toneStrategy;

  const showMsg = (msg: string, ms = 3000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), ms);
  };

  const loadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const d = await api('/timeline-events?limit=40');
      setTimelineEvents((d.events as TimelineEventRow[]) || []);
    } catch {
      setTimelineEvents([]);
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  const loadArchitectQueue = useCallback(async () => {
    setArchitectQueueLoading(true);
    try {
      const q = await api('/architect-plot-notes?pending_only=true');
      const notes = (q.notes as { id: string; raw_plot_idea: string; title?: string }[]) || [];
      setArchitectQueue(notes);
    } catch {
      setArchitectQueue([]);
    } finally {
      setArchitectQueueLoading(false);
    }
  }, []);

  /** Envía la cola local a Supabase en orden; en el primer fallo conserva el resto en localStorage */
  const handleSyncLocalArchitectQueue = useCallback(async () => {
    const local = readLocalArchitectPlotQueue();
    if (local.length === 0) return;
    setArchitectLocalSyncing(true);
    setError(null);
    let syncedCount = 0;
    try {
      for (const item of local) {
        await api('/architect-plot-notes', 'POST', {
          raw_plot_idea: item.raw_plot_idea,
          title: item.title || '',
        });
        syncedCount += 1;
      }
      writeLocalArchitectPlotQueue([]);
      setLocalArchitectQueue([]);
      showMsg('Cola local sincronizada con Supabase. Ya entra en la triangulación del GENERADOR.', 4500);
      void loadArchitectQueue();
    } catch (e) {
      const remaining = local.slice(syncedCount);
      writeLocalArchitectPlotQueue(remaining);
      setLocalArchitectQueue(remaining);
      setError(
        e instanceof Error ? e.message : 'No se pudo sincronizar toda la cola local (revisa API / Supabase)',
      );
      if (syncedCount > 0) {
        showMsg(`Se sincronizaron ${syncedCount} idea(s); el resto sigue en este dispositivo.`, 5000);
        void loadArchitectQueue();
      }
    } finally {
      setArchitectLocalSyncing(false);
    }
  }, [loadArchitectQueue]);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api('/chapters/latest');
      setDayNumber(data.day_number);
      setChapters(data.chapters || []);
      setCourContext((data.cour_context as CourContext | undefined) ?? null);
      try {
        const state = await api('/world-state');
        setWorldState(state.world_state);
      } catch {
        setWorldState(null);
      }
      void loadArchitectQueue();
      void loadTimeline();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error loading chapters');
    } finally {
      setLoading(false);
    }
  }, [loadArchitectQueue, loadTimeline]);

  useEffect(() => { loadLatest(); }, [loadLatest]);

  useEffect(() => {
    setLocalArchitectQueue(readLocalArchitectPlotQueue());
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await api('/generate', 'POST', buildGenerationBody());
      setDayNumber(data.day_number);
      setChapters(data.chapters || []);
      const cc = data.cour_context as CourContext | undefined;
      setCourContext(cc ?? null);
      const courHint =
        cc?.cour_enabled && cc.season_index != null && cc.episode_in_cour != null && cc.cour_length != null
          ? ` · Cour T${cc.season_index} ep.${cc.episode_in_cour}/${cc.cour_length} (${String(cc.phase_key || '').toUpperCase()})`
          : '';
      const mg = data.master_generator as { enabled?: boolean } | undefined;
      const mgHint = mg?.enabled === false ? ' · modo compacto' : mg?.enabled ? ' · generador maestro (~25 min)' : '';
      const prequelHint = cc?.prequel_seeding_active ? ' · precuela (fin de cour)' : '';
      const tri = data.architect_triangulation as {
        active?: boolean;
        skipped?: boolean;
        plot_ideas_in_prompt?: number;
        notes_marked_processed?: number;
      } | undefined;
      const triHint =
        tri?.skipped ? ' · sin triangulación' : tri?.active
          ? ` · triangulación (${tri.plot_ideas_in_prompt ?? 0} ideas, ${tri.notes_marked_processed ?? 0} notas consumidas)`
          : '';
      const vc = data.visual_context as { references_loaded?: number; block_chars?: number } | undefined;
      const visualHint =
        vc && (vc.references_loaded ?? 0) > 0
          ? ` · contexto visual (${vc.references_loaded} ref.)`
          : '';
      showMsg(`✓ Día ${data.day_number}: ${data.count} capítulos generados${courHint}${mgHint}${prequelHint}${triHint}${visualHint}`, 4200);
      void loadArchitectQueue();
      void loadTimeline();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generating chapters');
    } finally {
      setGenerating(false);
    }
  };

  const handleEnqueueArchitect = async () => {
    const t = architectPlotDraft.trim();
    if (!t) {
      showMsg('Escribe una idea antes de encolar', 2500);
      return;
    }
    setArchitectInjecting(true);
    setError(null);
    try {
      const data = (await api('/architect-plot-notes', 'POST', {
        raw_plot_idea: t,
        title: '',
      })) as {
        ok?: boolean;
        note?: { id?: string; raw_plot_idea?: string; title?: string };
        ideas_document_sync?: { ok?: boolean };
      };
      if (data && data.ok === false) {
        throw new Error('El servidor no confirmó el guardado de la idea');
      }
      const note = data?.note;
      // Campo libre para la siguiente idea solo tras confirmación HTTP + ok
      setArchitectPlotDraft('');
      if (note && typeof note.id === 'string') {
        const noteId = note.id;
        setArchitectQueue((prev) => {
          if (prev.some((p) => p.id === noteId)) return prev;
          return [
            {
              id: noteId,
              raw_plot_idea: String(note.raw_plot_idea ?? t),
              title: typeof note.title === 'string' ? note.title : undefined,
            },
            ...prev,
          ];
        });
      }
      const docOk = data.ideas_document_sync?.ok === true;
      showMsg(
        docOk
          ? 'Idea guardada en Supabase y reflejada en `IDEAS.pages/IDEAS.md` (sección app). Cola lista para el GENERADOR.'
          : 'Idea guardada en Supabase · queda en cola para el GENERADOR (triangulación al crear capítulos).',
        5000,
      );
      void loadArchitectQueue();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNetworkFailure =
        e instanceof TypeError ||
        /failed to fetch|networkerror|load failed|network request failed/i.test(msg);
      if (isNetworkFailure) {
        const localId =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const nextLocal = appendLocalArchitectPlotNote({ localId, raw_plot_idea: t, title: '' });
        setLocalArchitectQueue(nextLocal);
        setArchitectPlotDraft('');
        setError(null);
        showMsg(
          'Sin conexión con la API: idea guardada solo en este navegador. Pulsa «Sincronizar cola local» cuando el servidor vuelva.',
          6500,
        );
      } else {
        setError(msg || 'Error encolando nota (¿SQL architect_plot_notes?)');
      }
    } finally {
      setArchitectInjecting(false);
    }
  };

  const postNarrateChapter = useCallback(async (chapterId: string) => {
    return api('/chapters/narrate', 'POST', {
      chapter_id: chapterId,
      text_source: 'script',
    });
  }, []);

  const handleChapterPatch = useCallback((id: string, partial: Partial<Chapter>) => {
    setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  }, []);

  const handleFinalize = async (
    id: string,
    opts: { generateHeroIllustration: boolean; generateNarrationAudio: boolean },
  ) => {
    try {
      const data = await api('/finalize', 'POST', {
        chapter_id: id,
        generate_hero_illustration: opts.generateHeroIllustration,
        generate_narration_audio: opts.generateNarrationAudio,
      });
      const row = data.chapter as Chapter | undefined;
      if (row) {
        setChapters(prev => prev.map(c => (c.id === id ? { ...c, ...row } : c)));
      }
      showMsg(typeof data.message === 'string' ? data.message : 'Legado actualizado', 4500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al publicar al Legado');
    }
  };

  const handleApprove = async (id: string, notes: string) => {
    try {
      const data = await api('/approve', 'POST', { chapter_id: id, status: 'approved', notes });
      const promoted = data.chapter as Chapter | undefined;
      if (promoted) {
        setChapters(prev => prev.map(c => (c.id === id ? { ...c, ...promoted } : c)));
      } else {
        setChapters(prev => prev.map(c => (c.id === id ? { ...c, status: 'approved' } : c)));
      }
      if (data.world_state && typeof data.world_state === 'object') {
        setWorldState(data.world_state);
      }
      const n = promoted?.canon_chapter_number;
      const slug = promoted?.slug;
      const sync = data.ideas_document_sync as { ok?: boolean } | undefined;
      const docHint = sync?.ok ? ' · `IDEAS.pages/IDEAS.md` (registro canon)' : '';
      showMsg(
        n != null && slug
          ? `✓ Canon #${n} registrado · ${slug} · world state actualizado${docHint}`
          : `✓ Capítulo aprobado${docHint}`,
        5000,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error approving');
    }
  };

  const handleReject = async (id: string, notes: string) => {
    try {
      await api('/approve', 'POST', { chapter_id: id, status: 'rejected', notes });
      setChapters(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
      showMsg('✗ Capítulo rechazado — la IA aprenderá por qué');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error rejecting');
    }
  };

  const handleRegenerateCascade = async (
    chapterId: string,
    plotPivotNote: string,
    opts: { cascadeMode: 'hard_reset' | 'soft_enrich'; maxFutureChapters: number },
  ) => {
    const soft = opts.cascadeMode === 'soft_enrich';
    if (typeof window !== 'undefined') {
      const ok = soft
        ? window.confirm(
            '¿Enriquecer con IA los capítulos futuros (aprobados/publicados) sin borrarlos? '
            + 'Se hará una llamada a Claude por capítulo (coste acumulado).',
          )
        : window.confirm(
            '¿Hard reset? Se borrarán capítulos posteriores en la DB y se regenerará desde aquí (~25 min/slot).',
          );
      if (!ok) return;
    }
    setCascadeBusyChapterId(chapterId);
    setError(null);
    try {
      const data = await api('/chapters/regenerate-cascade', 'POST', {
        chapter_id: chapterId,
        plot_pivot_note: plotPivotNote,
        cascade_mode: opts.cascadeMode,
        max_future_chapters: opts.maxFutureChapters,
        ...buildGenerationBody(),
      });
      await loadLatest();
      void loadTimeline();
      const errs = Array.isArray(data.sync_errors) ? (data.sync_errors as string[]).filter(Boolean) : [];
      const baseMsg = typeof data.message === 'string' ? data.message : 'Operación completada.';
      showMsg(
        errs.length ? `${baseMsg} · Avisos: ${errs.slice(0, 2).join(' · ')}` : baseMsg,
        soft ? 8000 : 7000,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error en regeneración / enriquecimiento');
    } finally {
      setCascadeBusyChapterId(null);
    }
  };

  const handleSyncLoreForward = async (chapterId: string, newDetail: string) => {
    if (
      typeof window !== 'undefined'
      && !window.confirm(
        '¿Sincronizar este detalle de lore en los capítulos futuros (aprobados/publicados)? Una llamada Claude por capítulo.',
      )
    ) {
      return;
    }
    setLoreSyncBusyChapterId(chapterId);
    setError(null);
    try {
      const data = await api('/chapters/sync-lore-forward', 'POST', {
        chapter_id: chapterId,
        new_detail: newDetail,
        max_future_chapters: 12,
      });
      await loadLatest();
      void loadTimeline();
      const errs = Array.isArray(data.sync_errors) ? (data.sync_errors as string[]).filter(Boolean) : [];
      const baseMsg = typeof data.message === 'string' ? data.message : 'Lore sincronizado.';
      showMsg(errs.length ? `${baseMsg} · ${errs.slice(0, 2).join(' · ')}` : baseMsg, 8000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error sincronizando lore');
    } finally {
      setLoreSyncBusyChapterId(null);
    }
  };

  const handleMangaIllustrate = async (chapterId: string) => {
    setMangaBusyChapterId(chapterId);
    setError(null);
    try {
      const data = await api('/chapters/manga-illustrate', 'POST', {
        chapter_id: chapterId,
        max_panels: 6,
        overwrite: false,
      });
      const row = data.chapter as Chapter | undefined;
      if (row) {
        setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, ...row } : c)));
      }
      const n = typeof data.panels_illustrated === 'number' ? data.panels_illustrated : 0;
      showMsg(
        typeof data.message === 'string' ? data.message : `Paneles manga: ${n} imagen(es). Fase → ANIM · REF`,
        5000,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando paneles manga');
    } finally {
      setMangaBusyChapterId(null);
    }
  };

  const handleEdit = async (
    id: string, field: string, original: string, edited: string, reason: string
  ) => {
    try {
      await api('/edit', 'POST', { chapter_id: id, field, original, edited, reason });
      if (field === 'script') {
        setChapters((prev) => prev.map((c) => (c.id === id ? { ...c, script: edited } : c)));
      }
      showMsg('✓ Edición guardada — la IA aprenderá de este cambio');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error saving edit');
    }
  };

  const handleLearn = async () => {
    setLearning(true);
    try {
      const data = await api('/learn', 'POST');
      showMsg(`✓ Aprendizaje completado: ${data.edits_processed} edits, ${data.new_rules?.length} nuevas reglas`, 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error during learning');
    } finally {
      setLearning(false);
    }
  };

  const approvedCount = chapters.filter(c => c.status === 'approved').length;
  const publishedCount = chapters.filter(c => c.status === 'published').length;
  const draftCount = chapters.filter(c => c.status === 'draft').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080808',
      color: '#e0e0e0',
      fontFamily: 'monospace',
    }}>
      {/* Top bar */}
      <div style={{
        background: '#0d0d0d',
        borderBottom: '1px solid #1a1a1a',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <span style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#C9A84C' }}>
          {tSE('title')}
        </span>
        <Link
          href="/manga"
          style={{
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            color: '#6bff6b',
            textDecoration: 'none',
            border: '1px solid #2a4a2a',
            padding: '0.25rem 0.6rem',
          }}
        >
          {tSE('mangaArchive')}
        </Link>
        <a
          href={`${getApiBaseUrl()}/api/story-engine/chronicle-book?legado=published`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: '0.55rem',
            letterSpacing: '0.12em',
            color: '#4adfff',
            textDecoration: 'none',
            border: '1px solid #2a4a5a',
            padding: '0.25rem 0.6rem',
          }}
          title="Solo capítulos publicados al Legado (meta-resumen)"
        >
          {tSE('legacyBook')}
        </a>
        {dayNumber !== null && dayNumber > 0 && (
          <span style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.1em' }}>
            {tSE('day', { day: dayNumber })} · {publishedCount} {tSE('legacy')} · {approvedCount} {tSE('canon')} · {draftCount} {tSE('drafts')}
          </span>
        )}
        <div style={{ flex: 1 }} />

        <button
          onClick={handleLearn}
          disabled={learning}
          style={{
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            color: '#b44aff',
            background: 'transparent',
            border: '1px solid #b44aff44',
            padding: '0.4rem 0.9rem',
            cursor: learning ? 'default' : 'pointer',
            opacity: learning ? 0.5 : 1,
          }}
        >
          {learning ? tSE('learning') : tSE('learnFromEdits')}
        </button>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || draftCount > 0}
          title="3 bloques (actos) por episodio · ~25 min anime si el generador maestro está activo"
          style={{
            fontFamily: 'monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.15em',
            color: '#111',
            background: draftCount > 0 ? '#333' : '#C9A84C',
            border: 'none',
            padding: '0.4rem 1.2rem',
            cursor: (generating || draftCount > 0) ? 'default' : 'pointer',
          }}
        >
          {generating ? tSE('generating') : draftCount > 0 ? tSE('pending', { count: draftCount }) : tSE('generator')}
        </button>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem' }}>

        {/* Message / Error */}
        {message && (
          <div style={{
            background: '#0f1a0f',
            border: '1px solid #2a4a2a',
            borderRadius: '4px',
            padding: '0.6rem 1rem',
            marginBottom: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            color: '#4aff6b',
          }}>
            {message}
          </div>
        )}
        {error && (
          <div style={{
            background: '#1a0f0f',
            border: '1px solid #4a2a2a',
            borderRadius: '4px',
            padding: '0.6rem 1rem',
            marginBottom: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.7rem',
            color: '#ff6b6b',
          }}>
            ERROR: {error}
          </div>
        )}

        {!loading && courContext != null && (
          <SeasonProgress
            courEnabled={courContext.cour_enabled === true}
            currentEpisode={Number(courContext.episode_in_cour ?? 0)}
            totalEpisodes={Math.max(1, Number(courContext.cour_length ?? 12))}
            seasonIndex={Math.max(1, Number(courContext.season_index ?? 1))}
            phaseKey={courContext.phase_key}
            prequelSeeding={courContext.prequel_seeding_active === true}
          />
        )}

        {!loading && (
          <ArchitectWorkspace
            plotIdea={architectPlotDraft}
            onPlotIdeaChange={setArchitectPlotDraft}
            onInjectPlot={handleEnqueueArchitect}
            onGenerateEpisode={handleGenerate}
            injectDisabled={!architectPlotDraft.trim()}
            generateDisabled={generating || draftCount > 0}
            injectLoading={architectInjecting}
            generateLoading={generating}
            pendingQueueCount={architectQueue.length}
            queueLoading={architectQueueLoading}
            queuedNotes={architectQueue}
            localQueuedNotes={localArchitectQueue}
            onSyncLocalQueue={() => void handleSyncLocalArchitectQueue()}
            localSyncLoading={architectLocalSyncing}
            skipTriangulation={skipArchitectTriangulation}
            onSkipTriangulationChange={setSkipArchitectTriangulation}
            consumeArchitectNotes={consumeArchitectNotes}
            onConsumeArchitectNotesChange={setConsumeArchitectNotes}
          />
        )}

        {!loading && (
          <div style={{ marginBottom: '1.25rem' }}>
            <DecisionTimeline events={timelineEvents} loading={timelineLoading} />
          </div>
        )}

        {!loading && <VisualRefUploader />}

        {!loading && (
          <ProactiveFeedbackPanel
            disabled={loading}
            chapters={chapters
              .filter((c) => (c.script || '').trim().length > 0)
              .map((c) => ({
                id: c.id,
                title: c.title,
                day_number: c.day_number,
                slot: c.slot,
                script: c.script || '',
              }))}
          />
        )}

        {/* Calibración antes del GENERADOR */}
        {!loading && (
          <details
            open
            style={{
              marginBottom: '1.25rem',
              border: '1px solid #2a2a1a',
              borderRadius: '6px',
              background: '#0c0c0c',
              padding: '0.75rem 1rem',
            }}
          >
            <summary style={{
              cursor: 'pointer',
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              color: '#C9A84C',
              listStyle: 'none',
            }}
            >
              INTENSIDAD CREATIVA · mezcla → POST /generate
            </summary>
            <p style={{ fontSize: '0.6rem', color: '#555', margin: '0.6rem 0 0.75rem', lineHeight: 1.5 }}>
              Konosuba/Deadpool (humor) · Solo Leveling/JJK (épica) · Log Horizon/SAO (estrategia).
              Suma sliders: {toneSumPct}% (al generar se normaliza a 100%).
            </p>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.58rem',
              color: '#c9a84c',
              marginBottom: '0.65rem',
            }}
            >
              <input
                type="checkbox"
                checked={useMasterGenerator}
                onChange={(e) => setUseMasterGenerator(e.target.checked)}
              />
              Generador maestro (~25 min · 3 actos: humor 8m → conflicto rúnico 10m → clímax 7m)
            </label>
            <p style={{ fontSize: '0.55rem', color: '#555', margin: '0 0 0.65rem', lineHeight: 1.45 }}>
              El <strong style={{ color: '#888' }}>Workspace · Plot Architect</strong> arriba encola en Supabase o envía la idea en esta misma generación. Usa también el botón <strong style={{ color: '#888' }}>GENERADOR</strong> en la barra superior.
            </p>

            <div style={{ display: 'grid', gap: '0.65rem' }}>
              {[
                { label: 'Humor / ingenio', v: toneHumor, set: setToneHumor, color: '#6bff6b' },
                { label: 'Épica visual', v: toneEpic, set: setToneEpic, color: '#4a9eff' },
                { label: 'Estrategia / mundo', v: toneStrategy, set: setToneStrategy, color: '#b44aff' },
              ].map((row) => (
                <label key={row.label} style={{ display: 'block', fontSize: '0.58rem', color: '#888' }}>
                  <span style={{ color: row.color }}>{row.label}</span> — {row.v}%
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={row.v}
                    onChange={(e) => row.set(Number(e.target.value))}
                    style={{ width: '100%', marginTop: '0.25rem', accentColor: row.color }}
                  />
                </label>
              ))}
              <label style={{ display: 'block', fontSize: '0.58rem', color: '#888' }}>
                Inyectar marketing (Bond OS / lore)
                <input
                  type="text"
                  value={injectMarketing}
                  onChange={(e) => setInjectMarketing(e.target.value)}
                  placeholder="ej. WealthPilot"
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.45rem',
                    background: '#111',
                    border: '1px solid #333',
                    color: '#ddd',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                  }}
                />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.58rem', color: '#c9a84c' }}>
                <input
                  type="checkbox"
                  checked={forceSecret}
                  onChange={(e) => setForceSecret(e.target.checked)}
                />
                Forzar pista tipo «libro es la llave» (story_secrets)
              </label>
              <label style={{ display: 'block', fontSize: '0.58rem', color: '#888' }}>
                Lore de fondo (precuela / familia / canon extra)
                <textarea
                  value={backgroundLore}
                  onChange={(e) => setBackgroundLore(e.target.value)}
                  placeholder="ej. Orígenes de la familia Laguna"
                  rows={3}
                  style={{
                    width: '100%',
                    marginTop: '0.25rem',
                    padding: '0.45rem',
                    background: '#111',
                    border: '1px solid #333',
                    color: '#ddd',
                    fontSize: '0.68rem',
                    borderRadius: '4px',
                    resize: 'vertical',
                  }}
                />
              </label>
            </div>
          </details>
        )}

        {/* Prompt maestro Replicate — CONVERGEVERSE: THE LAGUNA LEGACY */}
        {!loading && (
          <details
            style={{
              marginBottom: '1.25rem',
              border: '1px solid #1a2a3a',
              borderRadius: '6px',
              background: '#0a0c10',
              padding: '0.75rem 1rem',
            }}
            onToggle={(e) => {
              if (e.currentTarget.open) void loadVisualMaster();
            }}
          >
            <summary style={{
              cursor: 'pointer',
              fontSize: '0.65rem',
              letterSpacing: '0.18em',
              color: '#4adfff',
              listStyle: 'none',
            }}
            >
              PROMPT MAESTRO · CONVERGEVERSE: THE LAGUNA LEGACY (Replicate / portada libro)
            </summary>
            <p style={{ fontSize: '0.6rem', color: '#556', margin: '0.6rem 0 0.5rem', lineHeight: 1.55 }}>
              Herencia noble Laguna Arévalo (cuero, escudo, árbol de la vida, oro Cinzel) + BOND OS
              (marco neón cian Orbet, pergamino crema{' '}
              <code style={{ color: '#7a9aaa' }}>#f4ecd8</code>, manga SL + reacciones Konosuba).
              Las crónicas en disco usan este prompt al generar <code style={{ color: '#7a9aaa' }}>cover.jpg</code> si hay token Replicate.
            </p>
            {visualMasterLoading && (
              <p style={{ fontSize: '0.6rem', color: '#456' }}>Cargando desde GET /visual-master-prompt…</p>
            )}
            {visualMaster && (
              <>
                <p style={{ fontSize: '0.55rem', color: '#567', marginBottom: '0.35rem' }}>{visualMaster.notes}</p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(visualMaster.full_prompt_en);
                      showMsg('✓ Prompt completo copiado (EN)', 2500);
                    }}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.58rem',
                      letterSpacing: '0.1em',
                      background: '#1a3040',
                      border: '1px solid #2a5068',
                      color: '#9cf',
                      padding: '0.35rem 0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    COPIAR PROMPT COMPLETO (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(visualMaster.compact_prompt_en);
                      showMsg('✓ Prompt compacto copiado', 2500);
                    }}
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '0.58rem',
                      letterSpacing: '0.1em',
                      background: 'transparent',
                      border: '1px solid #3a5060',
                      color: '#7ab',
                      padding: '0.35rem 0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    COPIAR COMPACTO (Flux / límites bajos)
                  </button>
                </div>
                <label style={{ fontSize: '0.55rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                  Completo (inglés)
                </label>
                <textarea
                  readOnly
                  value={visualMaster.full_prompt_en}
                  rows={8}
                  style={{
                    width: '100%',
                    fontSize: '0.62rem',
                    fontFamily: 'monospace',
                    background: '#06080c',
                    border: '1px solid #1a2a38',
                    color: '#9ab',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    marginBottom: '0.65rem',
                    resize: 'vertical',
                  }}
                />
                <label style={{ fontSize: '0.55rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>
                  Compacto
                </label>
                <textarea
                  readOnly
                  value={visualMaster.compact_prompt_en}
                  rows={4}
                  style={{
                    width: '100%',
                    fontSize: '0.62rem',
                    fontFamily: 'monospace',
                    background: '#06080c',
                    border: '1px solid #1a2a38',
                    color: '#9ab',
                    borderRadius: '4px',
                    padding: '0.5rem',
                    resize: 'vertical',
                  }}
                />
              </>
            )}
          </details>
        )}

        {/* Empty state */}
        {!loading && chapters.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#333',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>◎</div>
            <div style={{ fontSize: '0.8rem', letterSpacing: '0.2em', marginBottom: '0.5rem' }}>
              ARCHIVO VACÍO
            </div>
            <div style={{ fontSize: '0.65rem', color: '#222', marginBottom: '2rem' }}>
              Genera los primeros 3 capítulos del universo ConvergeVerse
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.2em',
                color: '#111',
                background: '#C9A84C',
                border: 'none',
                padding: '0.75rem 2rem',
                cursor: generating ? 'default' : 'pointer',
              }}
            >
              {generating ? 'GENERANDO DÍA 1…' : 'INICIAR HISTORIA — DÍA 1'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#333', fontSize: '0.7rem', letterSpacing: '0.2em' }}>
            CARGANDO ARCHIVO…
          </div>
        )}

        {/* Chapters */}
        {!loading && chapters.length > 0 && (
          <>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
              paddingBottom: '0.75rem',
              borderBottom: '1px solid #1a1a1a',
            }}>
              <div>
                <div style={{ fontSize: '0.6rem', letterSpacing: '0.2em', color: '#666', marginBottom: '0.2rem' }}>
                  DÍA {dayNumber} · {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                </div>
                <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#C9A84C' }}>
                  CAPÍTULOS PARA REVISIÓN
                </div>
              </div>
              <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.1em', textAlign: 'right' }}>
                <div>◆ {publishedCount} en Legado (publicados)</div>
                <div>✓ {approvedCount} solo aprobados / canon</div>
                <div>◎ {draftCount} borradores</div>
              </div>
            </div>

            {chapters.map(chapter => (
              <ChapterCard
                key={chapter.id}
                chapter={chapter}
                onApprove={handleApprove}
                onReject={handleReject}
                onEdit={handleEdit}
                onFinalize={handleFinalize}
                onChapterPatch={handleChapterPatch}
                postNarrate={postNarrateChapter}
                onMangaIllustrate={handleMangaIllustrate}
                mangaIllustrateBusy={mangaBusyChapterId === chapter.id}
                onRegenerateCascade={handleRegenerateCascade}
                cascadeBusy={cascadeBusyChapterId === chapter.id}
                onSyncLoreForward={handleSyncLoreForward}
                loreSyncBusy={loreSyncBusyChapterId === chapter.id}
              />
            ))}

            {/* Day navigation */}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center' }}>
              {dayNumber && dayNumber > 1 && (
                <button
                  onClick={async () => {
                    const prevDay = dayNumber - 1;
                    const data = await api(`/chapters/${prevDay}`);
                    setDayNumber(prevDay);
                    setChapters(data.chapters || []);
                  }}
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.6rem',
                    letterSpacing: '0.1em',
                    color: '#666',
                    background: 'transparent',
                    border: '1px solid #222',
                    padding: '0.4rem 1rem',
                    cursor: 'pointer',
                  }}
                >
                  ◂ DÍA {dayNumber - 1}
                </button>
              )}
              <button
                onClick={loadLatest}
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.6rem',
                  letterSpacing: '0.1em',
                  color: '#444',
                  background: 'transparent',
                  border: '1px solid #1a1a1a',
                  padding: '0.4rem 1rem',
                  cursor: 'pointer',
                }}
              >
                ↺ ACTUALIZAR
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
