'use client'

import { useState, useEffect, useCallback } from 'react'
import { StyleSelector } from '@/components/manga/StyleSelector'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ────────────────────────────────────────────────────────────────────

interface Series {
  id: string
  title: string
  description: string
  genre: string
  style_id: string
  cover_url: string | null
  tags: string[]
  status: 'active' | 'hiatus' | 'completed'
  chapter_count: number
  created_at: string
  updated_at: string
}

// ── Styles ────────────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 14,
  backdropFilter: 'blur(12px)',
  padding: '20px 24px',
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#e2e8f0',
  fontSize: 14,
  width: '100%',
  outline: 'none',
  fontFamily: 'inherit',
}

const btn = (accent: string, filled = false): React.CSSProperties => ({
  background: filled ? accent : `${accent}18`,
  border: `1px solid ${accent}55`,
  borderRadius: 8,
  color: filled ? '#fff' : accent,
  fontSize: 13,
  fontWeight: 600,
  padding: '8px 18px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.2s',
})

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  active:    { bg: 'rgba(16,185,129,0.14)', color: '#6ee7b7', label: 'ACTIVA' },
  hiatus:    { bg: 'rgba(245,158,11,0.14)', color: '#fcd34d', label: 'HIATUS' },
  completed: { bg: 'rgba(99,102,241,0.14)', color: '#a5b4fc', label: 'COMPLETA' },
}

const GENRE_OPTIONS = [
  'action', 'adventure', 'fantasy', 'dark_fantasy', 'horror', 'romance',
  'sci_fi', 'mecha', 'shonen', 'slice_of_life', 'comedy', 'drama',
  'psychological', 'thriller', 'supernatural', 'isekai',
]

// ── Create / Edit Form ────────────────────────────────────────────────────────

function SeriesForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Series>
  onSave: (data: Partial<Series>) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [genre, setGenre] = useState(initial?.genre ?? '')
  const [styleId, setStyleId] = useState(initial?.style_id ?? 'solo_leveling')
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!title.trim()) { setError('El título es obligatorio.'); return }
    setSaving(true); setError('')
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        genre,
        style_id: styleId,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar.')
    } finally { setSaving(false) }
  }

  return (
    <div style={{ ...glass, marginBottom: 24 }}>
      <h2 style={{ color: '#ec4899', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>
        {initial?.id ? '✏️ Editar Serie' : '✨ Nueva Serie'}
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Título *
          </label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Mi Manga Épico" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
            Género
          </label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Sin especificar</option>
            {GENRE_OPTIONS.map(g => (
              <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
          Descripción
        </label>
        <textarea
          style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="La historia de un joven que..."
        />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
          Tags (separados por coma)
        </label>
        <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder="magia, escuela, isekai" />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
          Estilo Visual
        </label>
        <StyleSelector value={styleId} onChange={setStyleId} compact />
      </div>

      {error && <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button style={btn('#ec4899', true)} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Guardando…' : '💾 Guardar Serie'}
        </button>
        <button style={btn('#64748b')} onClick={onCancel}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Series Card ───────────────────────────────────────────────────────────────

function SeriesCard({
  series,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  series: Series
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
}) {
  const badge = STATUS_BADGE[series.status] ?? STATUS_BADGE.active
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div style={{ ...glass, position: 'relative' }}>
      {/* Status badge */}
      <span style={{
        position: 'absolute', top: 14, right: 14,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
        padding: '2px 8px', borderRadius: 20,
        background: badge.bg, color: badge.color,
        border: `1px solid ${badge.color}44`,
      }}>
        {badge.label}
      </span>

      <h3 style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, marginBottom: 4, paddingRight: 80 }}>
        {series.title}
      </h3>

      {series.genre && (
        <div style={{ fontSize: 11, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
          {series.genre.replace(/_/g, ' ')}
        </div>
      )}

      {series.description && (
        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, marginBottom: 10 }}>
          {series.description}
        </p>
      )}

      {series.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
          {series.tags.map(tag => (
            <span key={tag} style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 4,
              background: 'rgba(255,255,255,0.06)', color: '#64748b',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: '#64748b' }}>
        <span>🎨 {series.style_id.replace(/_/g, ' ')}</span>
        <span>·</span>
        <span>📖 {series.chapter_count} capítulos</span>
        <span>·</span>
        <span>{new Date(series.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>

      {/* Status quick-change */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {(['active', 'hiatus', 'completed'] as const).map(s => (
          <button
            key={s}
            style={{
              ...btn(STATUS_BADGE[s].color),
              fontSize: 10,
              padding: '3px 10px',
              opacity: series.status === s ? 1 : 0.5,
              border: series.status === s ? `1px solid ${STATUS_BADGE[s].color}` : '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={() => onStatusChange(s)}
          >
            {STATUS_BADGE[s].label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={btn('#60a5fa')} onClick={onEdit}>✏️ Editar</button>
        {confirmDelete ? (
          <>
            <button style={btn('#ef4444', true)} onClick={onDelete}>Confirmar borrar</button>
            <button style={btn('#64748b')} onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </>
        ) : (
          <button style={btn('#ef4444')} onClick={() => setConfirmDelete(true)}>🗑 Borrar</button>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SeriesPage() {
  const [series, setSeries] = useState<Series[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editingSeries, setEditingSeries] = useState<Series | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterGenre, setFilterGenre] = useState<string>('')
  const [search, setSearch] = useState('')

  const fetchSeries = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterGenre) params.set('genre', filterGenre)
      const res = await fetch(`${API_BASE}/api/story-engine/series?${params}`)
      const data = await res.json()
      setSeries(data.series ?? [])
    } catch {
      // Keep previous state
    } finally { setLoading(false) }
  }, [filterStatus, filterGenre])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  const handleCreate = async (data: Partial<Series>) => {
    const res = await fetch(`${API_BASE}/api/story-engine/series`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).detail || 'Error al crear serie.')
    setShowCreate(false)
    fetchSeries()
  }

  const handleUpdate = async (data: Partial<Series>) => {
    if (!editingSeries) return
    const res = await fetch(`${API_BASE}/api/story-engine/series/${editingSeries.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).detail || 'Error al actualizar.')
    setEditingSeries(null)
    fetchSeries()
  }

  const handleDelete = async (id: string) => {
    await fetch(`${API_BASE}/api/story-engine/series/${id}`, { method: 'DELETE' })
    fetchSeries()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`${API_BASE}/api/story-engine/series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchSeries()
  }

  const filtered = series.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)',
      padding: '32px 24px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0 }}>
              📚 Series Platform
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>
              Organiza tus historias en series profesionales
            </p>
          </div>
          <button
            style={btn('#ec4899', true)}
            onClick={() => { setShowCreate(true); setEditingSeries(null) }}
          >
            + Nueva Serie
          </button>
        </div>

        {/* Create / Edit form */}
        {(showCreate && !editingSeries) && (
          <SeriesForm
            onSave={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        )}
        {editingSeries && (
          <SeriesForm
            initial={editingSeries}
            onSave={handleUpdate}
            onCancel={() => setEditingSeries(null)}
          />
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, width: 220 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar serie…"
          />
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); }}
            style={{ ...inputStyle, width: 140, cursor: 'pointer' }}
          >
            <option value="">Todos los estados</option>
            <option value="active">Activa</option>
            <option value="hiatus">Hiatus</option>
            <option value="completed">Completa</option>
          </select>
          <select
            value={filterGenre}
            onChange={e => { setFilterGenre(e.target.value); }}
            style={{ ...inputStyle, width: 160, cursor: 'pointer' }}
          >
            <option value="">Todos los géneros</option>
            {GENRE_OPTIONS.map(g => (
              <option key={g} value={g}>{g.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <span style={{ fontSize: 13, color: '#64748b', marginLeft: 4 }}>
            {filtered.length} serie{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Series grid */}
        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>Cargando series…</div>
        ) : filtered.length === 0 ? (
          <div style={{ ...glass, textAlign: 'center', padding: 48, color: '#64748b' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📖</div>
            <div style={{ fontSize: 16, color: '#94a3b8', marginBottom: 6 }}>No hay series todavía</div>
            <div style={{ fontSize: 13 }}>Crea tu primera serie con el botón de arriba</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}>
            {filtered.map(s => (
              <SeriesCard
                key={s.id}
                series={s}
                onEdit={() => { setEditingSeries(s); setShowCreate(false) }}
                onDelete={() => handleDelete(s.id)}
                onStatusChange={status => handleStatusChange(s.id, status)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
