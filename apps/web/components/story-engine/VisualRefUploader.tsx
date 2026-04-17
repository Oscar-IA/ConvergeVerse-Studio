'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { getApiBaseUrl } from '@/lib/config';

export type VisualReferenceRow = {
  id: string;
  label: string;
  visual_description: string;
  notes?: string | null;
  sort_order: number;
  active: boolean;
  image_url?: string | null;
  created_at?: string;
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

export function VisualRefUploader() {
  const api = `${getApiBaseUrl()}/api/story-engine`;

  const [refs, setRefs] = useState<VisualReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [visualDescription, setVisualDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [active, setActive] = useState(true);
  const [imageUrlManual, setImageUrlManual] = useState('');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const glassCard: CSSProperties = {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '1.75rem',
    padding: 'clamp(1rem, 3vw, 1.5rem)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
    marginBottom: '1.25rem',
  };

  const loadRefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${api}/visual-references?include_inactive=true&limit=120`);
      const data = (await res.json()) as { references?: VisualReferenceRow[] };
      if (!res.ok) throw new Error(parseApiDetail(data, res.status));
      setRefs(Array.isArray(data.references) ? data.references : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setRefs([]);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  useEffect(() => {
    if (!pendingFile) {
      setPreviewUrl(null);
      return;
    }
    const u = URL.createObjectURL(pendingFile);
    setPreviewUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [pendingFile]);

  const resetForm = () => {
    setEditingId(null);
    setLabel('');
    setVisualDescription('');
    setNotes('');
    setSortOrder(0);
    setActive(true);
    setImageUrlManual('');
    setPendingFile(null);
  };

  const pickFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen (JPEG, PNG, WebP, GIF).');
      return;
    }
    setError(null);
    setPendingFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    pickFile(f ?? null);
  };

  const saveReference = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      let imageUrl: string | null = imageUrlManual.trim() || null;
      if (pendingFile) {
        const fd = new FormData();
        fd.append('file', pendingFile);
        const up = await fetch(`${api}/visual-references/upload-image`, {
          method: 'POST',
          body: fd,
        });
        const upJson = (await up.json()) as { image_url?: string; detail?: unknown };
        if (!up.ok) throw new Error(parseApiDetail(upJson, up.status));
        imageUrl = upJson.image_url ?? null;
      }

      if (editingId) {
        const patch: Record<string, unknown> = {
          label: label.trim(),
          visual_description: visualDescription.trim(),
          notes: notes.trim() || null,
          sort_order: sortOrder,
          active,
          image_url: imageUrl,
        };
        const res = await fetch(`${api}/visual-references/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(parseApiDetail(data, res.status));
        setMessage('Referencia actualizada.');
      } else {
        const res = await fetch(`${api}/visual-references`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: label.trim(),
            visual_description: visualDescription.trim(),
            notes: notes.trim(),
            sort_order: sortOrder,
            active,
            image_url: imageUrl,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(parseApiDetail(data, res.status));
        setMessage('Referencia creada — el generador la usará en el próximo capítulo.');
      }
      resetForm();
      await loadRefs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: VisualReferenceRow) => {
    setEditingId(r.id);
    setLabel(r.label);
    setVisualDescription(r.visual_description);
    setNotes(r.notes ?? '');
    setSortOrder(Number(r.sort_order) || 0);
    setActive(r.active !== false);
    setImageUrlManual((r.image_url ?? '').trim());
    setPendingFile(null);
    setMessage(null);
    setError(null);
  };

  const removeRef = async (id: string) => {
    if (!globalThis.confirm('¿Eliminar esta referencia visual?')) return;
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`${api}/visual-references/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(parseApiDetail(data, res.status));
      if (editingId === id) resetForm();
      setMessage('Eliminada.');
      await loadRefs();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const dropZone: CSSProperties = {
    border: dragOver ? '2px dashed rgba(96, 165, 250, 0.85)' : '2px dashed rgba(96, 165, 250, 0.35)',
    borderRadius: '1.25rem',
    padding: '1.5rem',
    textAlign: 'center',
    background: dragOver ? 'rgba(59, 130, 246, 0.08)' : 'rgba(0, 0, 0, 0.2)',
    transition: 'border-color 0.15s, background 0.15s',
    cursor: 'pointer',
  };

  return (
    <section style={glassCard}>
      <header style={{ marginBottom: '1rem' }}>
        <h2
          style={{
            fontFamily: fontStack,
            fontSize: '0.72rem',
            letterSpacing: '0.22em',
            color: '#93c5fd',
            margin: 0,
            fontWeight: 700,
          }}
        >
          VISUAL UPLOADER · BIBLIA DE PRODUCCIÓN
        </h2>
        <p
          style={{
            fontFamily: fontStack,
            fontSize: '0.65rem',
            color: 'rgba(148, 163, 184, 0.95)',
            margin: '0.45rem 0 0',
            lineHeight: 1.55,
            maxWidth: '44rem',
          }}
        >
          Cada referencia alimenta la <strong style={{ color: '#cbd5e1' }}>Production Bible</strong>: en{' '}
          <strong style={{ color: '#cbd5e1' }}>novela</strong> el motor escribe paneles e{' '}
          <code style={{ fontSize: '0.6rem', color: '#94a3b8' }}>image_prompt</code> acordes a tu regla
          (p. ej. brazo con runas grabadas, no metal liso). Eso arrastra coherencia al{' '}
          <strong style={{ color: '#cbd5e1' }}>manga</strong> y deja una descripción canónica alineada con
          tu arte para <strong style={{ color: '#cbd5e1' }}>anime</strong> / animación. Opcional: imagen +
          URL en Storage.
        </p>
      </header>

      {error && (
        <div
          style={{
            fontFamily: fontStack,
            fontSize: '0.7rem',
            color: '#fca5a5',
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            background: 'rgba(127, 29, 29, 0.25)',
            borderRadius: '8px',
          }}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            fontFamily: fontStack,
            fontSize: '0.7rem',
            color: '#86efac',
            marginBottom: '0.75rem',
          }}
        >
          {message}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {loading ? (
          <span style={{ fontFamily: fontStack, fontSize: '0.65rem', color: '#64748b' }}>
            Cargando referencias…
          </span>
        ) : (
          refs.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => startEdit(r)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  startEdit(r);
                }
              }}
              style={{
                position: 'relative',
                border: editingId === r.id ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: '12px',
                overflow: 'hidden',
                padding: 0,
                background: '#0a0a0a',
                cursor: 'pointer',
                aspectRatio: '1',
              }}
            >
              {r.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: r.active ? 1 : 0.45 }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: fontStack,
                    fontSize: '0.55rem',
                    color: '#475569',
                    padding: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  {r.label}
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  padding: '0.35rem 0.4rem',
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                  fontFamily: fontStack,
                  fontSize: '0.55rem',
                  color: '#e2e8f0',
                  textAlign: 'left',
                  lineHeight: 1.2,
                }}
              >
                {r.label}
                {!r.active ? ' · off' : ''}
              </div>
              <button
                type="button"
                aria-label={`Eliminar ${r.label}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  void removeRef(r.id);
                }}
                style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  border: 'none',
                  background: 'rgba(0,0,0,0.65)',
                  color: '#fca5a5',
                  fontSize: '0.75rem',
                  lineHeight: '22px',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>

      <div
        style={dropZone}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('visual-ref-file')?.click()}
      >
        <input
          id="visual-ref-file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        <span style={{ fontFamily: fontStack, color: '#60a5fa', fontWeight: 700, fontSize: '0.78rem' }}>
          Inyectar referencia visual
        </span>
        <p style={{ fontFamily: fontStack, fontSize: '0.62rem', color: '#64748b', margin: '0.5rem 0 0' }}>
          Suelta el diseño aquí para que BOND OS lo aprenda (bucket Supabase: ver docs).
        </p>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Vista previa"
            style={{ maxHeight: 120, marginTop: '0.75rem', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
          />
        )}
      </div>

      <div style={{ display: 'grid', gap: '0.65rem', marginTop: '1rem' }}>
        <label style={{ fontFamily: fontStack, fontSize: '0.62rem', color: '#94a3b8' }}>
          Etiqueta (p. ej. Portal · True World)
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.35)',
              color: '#f1f5f9',
              fontFamily: fontStack,
              fontSize: '0.75rem',
            }}
          />
        </label>
        <label style={{ fontFamily: fontStack, fontSize: '0.62rem', color: '#94a3b8' }}>
          Descripción técnica (obligatoria para el generador)
          <textarea
            value={visualDescription}
            onChange={(e) => setVisualDescription(e.target.value)}
            rows={4}
            placeholder="Paleta, silueta, HUD, estilo Metahuman, lectura emocional…"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.35)',
              color: '#f1f5f9',
              fontFamily: fontStack,
              fontSize: '0.75rem',
              resize: 'vertical',
            }}
          />
        </label>
        <label style={{ fontFamily: fontStack, fontSize: '0.62rem', color: '#94a3b8' }}>
          Notas (opcional)
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.35)',
              color: '#f1f5f9',
              fontFamily: fontStack,
              fontSize: '0.75rem',
            }}
          />
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <label style={{ fontFamily: fontStack, fontSize: '0.62rem', color: '#94a3b8' }}>
            Orden
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              style={{
                display: 'block',
                width: 72,
                marginTop: 4,
                padding: '0.45rem',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.35)',
                color: '#f1f5f9',
                fontFamily: fontStack,
              }}
            />
          </label>
          <label
            style={{
              fontFamily: fontStack,
              fontSize: '0.62rem',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 18,
            }}
          >
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Activa en el generador
          </label>
        </div>
        <label style={{ fontFamily: fontStack, fontSize: '0.62rem', color: '#94a3b8' }}>
          URL imagen (opcional si ya subiste arriba, o pega un enlace externo)
          <input
            value={imageUrlManual}
            onChange={(e) => setImageUrlManual(e.target.value)}
            placeholder="https://…"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 4,
              padding: '0.5rem 0.65rem',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(0,0,0,0.35)',
              color: '#f1f5f9',
              fontFamily: fontStack,
              fontSize: '0.72rem',
            }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
        <button
          type="button"
          disabled={saving || !label.trim() || !visualDescription.trim()}
          onClick={() => void saveReference()}
          style={{
            fontFamily: fontStack,
            padding: '0.65rem 1.25rem',
            borderRadius: 9999,
            border: 'none',
            fontWeight: 700,
            fontSize: '0.72rem',
            cursor: saving || !label.trim() || !visualDescription.trim() ? 'not-allowed' : 'pointer',
            opacity: saving || !label.trim() || !visualDescription.trim() ? 0.45 : 1,
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff',
          }}
        >
          {saving ? 'Guardando…' : editingId ? 'Actualizar referencia' : 'Crear referencia'}
        </button>
        {(editingId || pendingFile || label) && (
          <button
            type="button"
            onClick={resetForm}
            style={{
              fontFamily: fontStack,
              padding: '0.65rem 1.1rem',
              borderRadius: 9999,
              border: '1px solid rgba(255,255,255,0.2)',
              fontWeight: 600,
              fontSize: '0.7rem',
              cursor: 'pointer',
              background: 'transparent',
              color: '#cbd5e1',
            }}
          >
            Nueva / limpiar
          </button>
        )}
      </div>
    </section>
  );
}
