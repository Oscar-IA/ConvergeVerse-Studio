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

// ── Genre config ─────────────────────────────────────────────────────────────

const GENRE_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  action:        { color: '#f97316', bg: '#1a0800', icon: '⚡' },
  adventure:     { color: '#fb923c', bg: '#1a0c00', icon: '🗺️' },
  fantasy:       { color: '#a78bfa', bg: '#0e0820', icon: '🔮' },
  dark_fantasy:  { color: '#6366f1', bg: '#06060f', icon: '🌑' },
  horror:        { color: '#ef4444', bg: '#0a0000', icon: '💀' },
  romance:       { color: '#ec4899', bg: '#120018', icon: '🌸' },
  sci_fi:        { color: '#06b6d4', bg: '#03090f', icon: '🚀' },
  mecha:         { color: '#22d3ee', bg: '#030d14', icon: '🤖' },
  shonen:        { color: '#fbbf24', bg: '#0a0700', icon: '⚔️' },
  slice_of_life: { color: '#34d399', bg: '#03120a', icon: '🍃' },
  comedy:        { color: '#84cc16', bg: '#060a00', icon: '😄' },
  drama:         { color: '#fb7185', bg: '#120009', icon: '🎭' },
  psychological: { color: '#c084fc', bg: '#0a0010', icon: '🧠' },
  thriller:      { color: '#f43f5e', bg: '#0a0003', icon: '🔪' },
  supernatural:  { color: '#e879f9', bg: '#0f0014', icon: '👁' },
  isekai:        { color: '#818cf8', bg: '#080a1a', icon: '🌀' },
}

const getGenreCfg = (genre: string) =>
  GENRE_CONFIG[genre] ?? { color: '#ec4899', bg: '#120018', icon: '✨' }

const GENRE_OPTIONS = Object.keys(GENRE_CONFIG)

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; emoji: string }> = {
  active:    { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', label: 'ACTIVA',   emoji: '🟢' },
  hiatus:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  label: 'HIATUS',  emoji: '🟡' },
  completed: { color: '#a5b4fc', bg: 'rgba(165,180,252,0.12)', label: 'COMPLETA', emoji: '🔵' },
}

// ── Animated genre cover SVG ─────────────────────────────────────────────────

function GenreCover({ genre, title }: { genre: string; title: string }) {
  const cfg = getGenreCfg(genre)
  const initial = (title || '?').charAt(0).toUpperCase()

  return (
    <svg viewBox="0 0 160 200" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
      <rect width="160" height="200" fill={cfg.bg} rx="6" />
      {/* Gradient wash */}
      <defs>
        <radialGradient id={`cg-${genre}`} cx="50%" cy="35%" r="60%">
          <stop offset="0%" stopColor={cfg.color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={cfg.color} stopOpacity="0.02" />
        </radialGradient>
      </defs>
      <rect width="160" height="200" fill={`url(#cg-${genre})`} rx="6" />
      {/* Speed lines for action genres */}
      {['action','shonen','mecha','thriller'].includes(genre) && (
        <>
          {Array.from({length:12}).map((_,i) => (
            <line key={i} x1="80" y1="100" x2={80+Math.cos(i/12*Math.PI*2)*140} y2={100+Math.sin(i/12*Math.PI*2)*140}
              stroke={cfg.color} strokeWidth={i%3===0?1:0.4} opacity={i%3===0?0.35:0.12} />
          ))}
        </>
      )}
      {/* Sparkles for fantasy/isekai/magical */}
      {['fantasy','dark_fantasy','isekai','supernatural','romance'].includes(genre) && (
        <>
          {[[20,30],[140,25],[15,160],[145,155],[80,15],[10,90],[150,100]].map(([x,y],i) => (
            <g key={i}>
              <line x1={x} y1={y-5} x2={x} y2={y+5} stroke={cfg.color} strokeWidth="1" opacity="0.6" />
              <line x1={x-5} y1={y} x2={x+5} y2={y} stroke={cfg.color} strokeWidth="1" opacity="0.6" />
              <circle cx={x} cy={y} r="1.5" fill="#fff" opacity="0.8" />
            </g>
          ))}
        </>
      )}
      {/* Circuit for sci-fi */}
      {['sci_fi','mecha'].includes(genre) && (
        <>
          {Array.from({length:8}).map((_,i) => (
            <line key={i} x1={i*20} y1="0" x2={i*20} y2="200" stroke={cfg.color} strokeWidth="0.3" opacity="0.15" />
          ))}
          {Array.from({length:10}).map((_,i) => (
            <line key={i} x1="0" y1={i*20} x2="160" y2={i*20} stroke={cfg.color} strokeWidth="0.3" opacity="0.15" />
          ))}
        </>
      )}
      {/* Big genre icon */}
      <text x="80" y="95" textAnchor="middle" fontSize="44" fill={cfg.color} opacity="0.7">{cfg.icon}</text>
      {/* Decorative ring */}
      <circle cx="80" cy="80" r="42" fill="none" stroke={cfg.color} strokeWidth="1" opacity="0.2" strokeDasharray="6 3" />
      <circle cx="80" cy="80" r="52" fill="none" stroke={cfg.color} strokeWidth="0.5" opacity="0.1" />
      {/* Title initial */}
      <circle cx="80" cy="80" r="28" fill={`${cfg.color}18`} stroke={cfg.color} strokeWidth="1.5" opacity="0.8" />
      <text x="80" y="88" textAnchor="middle" fontSize="28" fill={cfg.color} fontWeight="900" fontFamily="sans-serif" opacity="0.9">{initial}</text>
      {/* Bottom strip */}
      <rect x="0" y="162" width="160" height="38" fill="rgba(0,0,0,0.7)" rx="0" />
      <rect x="0" y="162" width="160" height="38" fill={`${cfg.color}10`} />
      <text x="80" y="177" textAnchor="middle" fontSize="7" fill={cfg.color} fontFamily="monospace" letterSpacing="2" fontWeight="700" opacity="0.9">
        {genre.replace(/_/g,' ').toUpperCase()}
      </text>
      {/* Border */}
      <rect width="160" height="200" fill="none" rx="6" stroke={cfg.color} strokeWidth="2" opacity="0.4" />
    </svg>
  )
}

// ── Floating particles background ────────────────────────────────────────────

function AnimeBg() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      <style>{`
        @keyframes float-up { 0%{transform:translateY(0) scale(1);opacity:0} 10%{opacity:0.6} 90%{opacity:0.2} 100%{transform:translateY(-100vh) scale(0.5);opacity:0} }
        @keyframes twinkle { 0%,100%{opacity:0.15} 50%{opacity:0.5} }
        @keyframes slide-right { 0%{transform:translateX(-20px);opacity:0} 100%{transform:translateX(120vw);opacity:0.4} }
        .anime-particle { position:absolute; border-radius:50%; animation: float-up linear infinite; }
        .anime-star { position:absolute; animation: twinkle ease-in-out infinite; }
        .anime-streak { position:absolute; height:1px; animation: slide-right linear infinite; }
      `}</style>
      {/* Floating particles */}
      {[
        {l:'5%',t:'80%',s:4,d:8,c:'#ec4899',op:0.3},
        {l:'20%',t:'60%',s:3,d:12,c:'#a855f7',op:0.25},
        {l:'40%',t:'90%',s:5,d:10,c:'#06b6d4',op:0.2},
        {l:'60%',t:'70%',s:4,d:14,c:'#ec4899',op:0.3},
        {l:'80%',t:'85%',s:3,d:9,c:'#f97316',op:0.25},
        {l:'90%',t:'75%',s:6,d:16,c:'#a855f7',op:0.2},
        {l:'15%',t:'95%',s:3,d:11,c:'#fbbf24',op:0.2},
        {l:'55%',t:'88%',s:4,d:13,c:'#ec4899',op:0.15},
      ].map((p,i) => (
        <div key={i} className="anime-particle" style={{
          left:p.l, top:p.t, width:p.s, height:p.s,
          background:p.c, opacity:p.op,
          animationDuration:`${p.d}s`, animationDelay:`${i*1.5}s`,
        }} />
      ))}
      {/* Stars */}
      {Array.from({length:20}).map((_,i) => (
        <div key={i} className="anime-star" style={{
          left:`${(i*7+13)%100}%`, top:`${(i*11+5)%60}%`,
          width:2, height:2, borderRadius:'50%',
          background: i%3===0 ? '#ec4899' : i%3===1 ? '#a855f7' : '#06b6d4',
          animationDuration:`${2+i%3}s`, animationDelay:`${i*0.4}s`,
        }} />
      ))}
      {/* Speed streaks */}
      {Array.from({length:5}).map((_,i) => (
        <div key={i} className="anime-streak" style={{
          top:`${20+i*15}%`, left:'-120px', width:`${60+i*20}px`,
          background:`linear-gradient(90deg,transparent,${i%2===0?'#ec4899':'#a855f7'},transparent)`,
          animationDuration:`${4+i*2}s`, animationDelay:`${i*3}s`, opacity: 0.15,
        }} />
      ))}
    </div>
  )
}

// ── Series Form ───────────────────────────────────────────────────────────────

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
  const cfg = genre ? getGenreCfg(genre) : { color: '#ec4899', bg: '#120018', icon: '✨' }

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

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid ${cfg.color}30`,
    borderRadius: 10,
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s',
  }

  return (
    <div style={{
      background: `linear-gradient(135deg, ${cfg.bg} 0%, rgba(5,2,12,0.98) 100%)`,
      border: `2px solid ${cfg.color}30`,
      borderRadius: 20,
      padding: '28px 32px',
      marginBottom: 28,
      backdropFilter: 'blur(20px)',
      boxShadow: `0 0 40px ${cfg.color}12, 0 20px 60px rgba(0,0,0,0.5)`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative corner accent */}
      <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '0 20px 0 0',
        background: `linear-gradient(225deg, ${cfg.color}15, transparent)`, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${cfg.color}18`, border: `2px solid ${cfg.color}40`, fontSize: 20,
        }}>
          {initial?.id ? '✏️' : '✨'}
        </div>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: 0 }}>
          {initial?.id ? 'Editar Serie' : 'Nueva Serie'}
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={{ fontSize: 10, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 7, fontWeight: 700 }}>
            Título *
          </label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Mi Manga Épico" />
        </div>
        <div>
          <label style={{ fontSize: 10, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 7, fontWeight: 700 }}>
            Género
          </label>
          <select value={genre} onChange={e => setGenre(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}>
            <option value="" style={{ background: '#1a1a2e' }}>Sin especificar</option>
            {GENRE_OPTIONS.map(g => (
              <option key={g} value={g} style={{ background: '#1a1a2e' }}>
                {getGenreCfg(g).icon} {g.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 7, fontWeight: 700 }}>
          Descripción
        </label>
        <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="La historia de un joven que descubre un poder oculto…" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 10, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 7, fontWeight: 700 }}>
          Tags (separados por coma)
        </label>
        <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} placeholder="magia, escuela, aventura" />
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 10, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.12em', display: 'block', marginBottom: 10, fontWeight: 700 }}>
          Estilo Visual
        </label>
        <StyleSelector value={styleId} onChange={setStyleId} compact />
      </div>

      {error && (
        <div style={{ color: '#fca5a5', fontSize: 13, marginBottom: 14, padding: '10px 14px',
          background: 'rgba(239,68,68,0.08)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={handleSubmit} disabled={saving}
          style={{
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`,
            border: 'none', borderRadius: 12, color: '#fff',
            fontSize: 14, fontWeight: 700, padding: '12px 24px',
            cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit',
            opacity: saving ? 0.7 : 1,
            boxShadow: `0 4px 20px ${cfg.color}30`,
            transition: 'all 0.2s',
          }}>
          {saving ? '⏳ Guardando…' : '💾 Guardar Serie'}
        </button>
        <button onClick={onCancel}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, color: '#94a3b8', fontSize: 14, fontWeight: 600,
            padding: '12px 24px', cursor: 'pointer', fontFamily: 'inherit',
          }}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Series Card ───────────────────────────────────────────────────────────────

function SeriesCard({
  series, onEdit, onDelete, onStatusChange,
}: {
  series: Series
  onEdit: () => void
  onDelete: () => void
  onStatusChange: (status: string) => void
}) {
  const cfg = getGenreCfg(series.genre)
  const statusCfg = STATUS_CONFIG[series.status] ?? STATUS_CONFIG.active
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [hov, setHov] = useState(false)

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: `linear-gradient(135deg, ${cfg.bg} 0%, rgba(5,2,12,0.95) 100%)`,
        border: `2px solid ${hov ? cfg.color + '50' : cfg.color + '20'}`,
        borderRadius: 20,
        overflow: 'hidden',
        transition: 'all 0.3s',
        transform: hov ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hov
          ? `0 12px 40px ${cfg.color}20, 0 0 0 1px ${cfg.color}15`
          : `0 4px 16px rgba(0,0,0,0.4)`,
        position: 'relative',
      }}
    >
      {/* Shimmer line at top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
        opacity: hov ? 0.8 : 0.3,
        transition: 'opacity 0.3s',
      }} />

      {/* Card layout — cover + info */}
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Cover — left column */}
        <div style={{ width: 110, flexShrink: 0 }}>
          <GenreCover genre={series.genre} title={series.title} />
        </div>

        {/* Info — right column */}
        <div style={{ flex: 1, padding: '16px 18px 14px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Status badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
              padding: '3px 9px', borderRadius: 20,
              background: statusCfg.bg, color: statusCfg.color,
              border: `1px solid ${statusCfg.color}40`,
            }}>
              {statusCfg.emoji} {statusCfg.label}
            </span>
            <span style={{ fontSize: 10, color: cfg.color, fontWeight: 700, fontFamily: 'monospace' }}>
              {series.chapter_count} caps
            </span>
          </div>

          {/* Title */}
          <h3 style={{
            color: '#f1f5f9', fontSize: 15, fontWeight: 800, margin: '0 0 4px',
            lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {series.title}
          </h3>

          {/* Genre */}
          <div style={{ fontSize: 10, color: cfg.color, fontWeight: 700, marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {cfg.icon} {series.genre.replace(/_/g, ' ')}
          </div>

          {/* Description */}
          {series.description && (
            <p style={{
              fontSize: 11, color: '#94a3b8', lineHeight: 1.55, margin: '0 0 8px',
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
            }}>
              {series.description}
            </p>
          )}

          {/* Tags */}
          {series.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginBottom: 8 }}>
              {series.tags.slice(0, 4).map(tag => (
                <span key={tag} style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 4,
                  background: `${cfg.color}12`, color: cfg.color,
                  border: `1px solid ${cfg.color}25`,
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Date */}
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 10 }}>
            {new Date(series.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div style={{
        borderTop: `1px solid ${cfg.color}15`,
        padding: '10px 14px',
        display: 'flex', gap: 6, alignItems: 'center',
        background: `rgba(0,0,0,0.3)`,
        flexWrap: 'wrap',
      }}>
        {/* Status quick-switch */}
        {(['active', 'hiatus', 'completed'] as const).map(s => {
          const sc = STATUS_CONFIG[s]
          return (
            <button key={s} onClick={() => onStatusChange(s)}
              style={{
                fontSize: 9, padding: '3px 8px', borderRadius: 8, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 700, letterSpacing: '0.08em',
                background: series.status === s ? sc.bg : 'rgba(255,255,255,0.04)',
                color: series.status === s ? sc.color : '#475569',
                border: `1px solid ${series.status === s ? sc.color + '50' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.15s',
              }}>
              {sc.emoji} {sc.label}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* Edit */}
        <button onClick={onEdit}
          style={{
            fontSize: 11, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
            background: `${cfg.color}15`, border: `1px solid ${cfg.color}30`,
            color: cfg.color, fontFamily: 'inherit', fontWeight: 600,
            transition: 'all 0.15s',
          }}>
          ✏️ Editar
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <>
            <button onClick={onDelete}
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                color: '#fca5a5', fontFamily: 'inherit', fontWeight: 600,
              }}>
              Confirmar
            </button>
            <button onClick={() => setConfirmDelete(false)}
              style={{
                fontSize: 11, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#64748b', fontFamily: 'inherit',
              }}>
              No
            </button>
          </>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            style={{
              fontSize: 11, padding: '5px 12px', borderRadius: 8, cursor: 'pointer',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}>
            🗑
          </button>
        )}
      </div>
    </div>
  )
}

// ── Empty State SVG ───────────────────────────────────────────────────────────

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <svg viewBox="0 0 200 160" style={{ width: 200, height: 160, margin: '0 auto 24px', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="es-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="80" r="60" fill="url(#es-glow)" />
        {/* Open book */}
        <path d="M40 55 L100 70 L100 130 Q70 120 40 125 Z" fill="#1a0818" stroke="#ec4899" strokeWidth="2" />
        <path d="M160 55 L100 70 L100 130 Q130 120 160 125 Z" fill="#1a0818" stroke="#ec4899" strokeWidth="2" />
        <line x1="100" y1="70" x2="100" y2="130" stroke="#ec4899" strokeWidth="1.5" />
        {/* Lines on pages */}
        {[0,1,2,3].map(i => <line key={i} x1={50+i*2} y1={85+i*10} x2={90} y2={80+i*9} stroke="#ec499960" strokeWidth="1" />)}
        {[0,1,2,3].map(i => <line key={i} x1={150-i*2} y1={85+i*10} x2={110} y2={80+i*9} stroke="#ec499960" strokeWidth="1" />)}
        {/* Plus sign */}
        <circle cx="100" cy="40" r="14" fill="#ec489918" stroke="#ec4899" strokeWidth="1.5" />
        <line x1="100" y1="32" x2="100" y2="48" stroke="#ec4899" strokeWidth="2.5" />
        <line x1="92" y1="40" x2="108" y2="40" stroke="#ec4899" strokeWidth="2.5" />
        {/* Sparkles */}
        {[[30,30],[170,30],[20,110],[180,110]].map(([x,y],i) => (
          <g key={i}>
            <line x1={x} y1={y-6} x2={x} y2={y+6} stroke="#a855f7" strokeWidth="1" opacity="0.5" />
            <line x1={x-6} y1={y} x2={x+6} y2={y} stroke="#a855f7" strokeWidth="1" opacity="0.5" />
          </g>
        ))}
      </svg>
      <h3 style={{ color: '#f1f5f9', fontSize: 20, fontWeight: 800, margin: '0 0 8px' }}>
        ¡Tu biblioteca está vacía!
      </h3>
      <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
        Crea tu primera serie y empieza a construir<br />tu universo de anime
      </p>
      <button onClick={onNew}
        style={{
          background: 'linear-gradient(135deg, #ec4899, #a855f7)',
          border: 'none', borderRadius: 14, color: '#fff',
          fontSize: 15, fontWeight: 800, padding: '14px 32px',
          cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: '0 4px 20px rgba(236,72,153,0.3)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
      >
        ✨ Crear mi primera serie
      </button>
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
      const res = await fetch(`${API_BASE}/api/story-engine/series?${params}`,
        { signal: AbortSignal.timeout(10000) })
      const data = await res.json()
      setSeries(data.series ?? [])
    } catch {
      // Keep previous state — API might be offline
    } finally { setLoading(false) }
  }, [filterStatus, filterGenre])

  useEffect(() => { fetchSeries() }, [fetchSeries])

  const handleCreate = async (data: Partial<Series>) => {
    const res = await fetch(`${API_BASE}/api/story-engine/series`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error((await res.json()).detail || 'Error al crear serie.')
    setShowCreate(false); fetchSeries()
  }

  const handleUpdate = async (data: Partial<Series>) => {
    if (!editingSeries) return
    const res = await fetch(`${API_BASE}/api/story-engine/series/${editingSeries.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error((await res.json()).detail || 'Error al actualizar.')
    setEditingSeries(null); fetchSeries()
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_BASE}/api/story-engine/series/${id}`, {
        method: 'DELETE', signal: AbortSignal.timeout(10000),
      })
    } catch { /* Continue */ }
    fetchSeries()
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/api/story-engine/series/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }), signal: AbortSignal.timeout(10000),
      })
    } catch { /* Continue */ }
    fetchSeries()
  }

  const filtered = series.filter(s =>
    !search || s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  )

  const totalCaps = series.reduce((sum, s) => sum + s.chapter_count, 0)
  const activeCount = series.filter(s => s.status === 'active').length

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #060310 0%, #0f0820 45%, #060310 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
    }}>
      <AnimeBg />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '32px 20px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          {/* Label */}
          <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(236,72,153,0.6)',
            textTransform: 'uppercase', marginBottom: 8, fontFamily: 'ui-monospace,monospace' }}>
            BOND Studios · ConvergeVerse
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{
                fontSize: 'clamp(1.6rem,4vw,2.8rem)', fontWeight: 900,
                margin: 0, letterSpacing: '-0.02em', lineHeight: 1,
                background: 'linear-gradient(135deg,#fff 30%,#ec4899 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                📚 Series Platform
              </h1>
              <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0' }}>
                Tu biblioteca de historias · anime · manga · novelas
              </p>
            </div>

            <button
              onClick={() => { setShowCreate(true); setEditingSeries(null) }}
              style={{
                background: 'linear-gradient(135deg, #ec4899, #a855f7)',
                border: 'none', borderRadius: 14, color: '#fff',
                fontSize: 14, fontWeight: 800, padding: '14px 28px',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 24px rgba(236,72,153,0.3)',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 30px rgba(236,72,153,0.45)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(236,72,153,0.3)' }}
            >
              <span style={{ fontSize: 18 }}>✨</span>
              Nueva Serie
            </button>
          </div>

          {/* Stats bar */}
          {series.length > 0 && (
            <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
              {[
                { label: 'Total Series', value: series.length, color: '#ec4899', icon: '📚' },
                { label: 'Activas', value: activeCount, color: '#4ade80', icon: '🟢' },
                { label: 'Capítulos', value: totalCaps, color: '#06b6d4', icon: '📖' },
                { label: 'Géneros', value: new Set(series.map(s=>s.genre)).size, color: '#a855f7', icon: '🎨' },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: '8px 16px', borderRadius: 12,
                  background: `${stat.color}10`,
                  border: `1px solid ${stat.color}25`,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 9, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── CREATE / EDIT FORM ───────────────────────────────────────────── */}
        {(showCreate && !editingSeries) && (
          <SeriesForm onSave={handleCreate} onCancel={() => setShowCreate(false)} />
        )}
        {editingSeries && (
          <SeriesForm initial={editingSeries} onSave={handleUpdate} onCancel={() => setEditingSeries(null)} />
        )}

        {/* ── FILTERS ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '10px 14px', color: '#e2e8f0', fontSize: 13,
              outline: 'none', fontFamily: 'inherit', width: 240,
            }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar serie…"
          />
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '10px 14px', color: '#e2e8f0', fontSize: 13,
              cursor: 'pointer', outline: 'none', fontFamily: 'inherit', width: 150,
            }}>
            <option value="" style={{ background: '#1a1a2e' }}>Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#1a1a2e' }}>{v.emoji} {v.label}</option>
            ))}
          </select>
          <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12, padding: '10px 14px', color: '#e2e8f0', fontSize: 13,
              cursor: 'pointer', outline: 'none', fontFamily: 'inherit', width: 170,
            }}>
            <option value="" style={{ background: '#1a1a2e' }}>Todos los géneros</option>
            {GENRE_OPTIONS.map(g => (
              <option key={g} value={g} style={{ background: '#1a1a2e' }}>{getGenreCfg(g).icon} {g.replace(/_/g,' ')}</option>
            ))}
          </select>
          <span style={{ fontSize: 12, color: '#475569' }}>
            {filtered.length} serie{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── SERIES GRID ──────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: 'bond-bounce 1.2s ease-in-out infinite' }}>📚</div>
            <div style={{ color: '#64748b', fontSize: 14 }}>Cargando tu biblioteca…</div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState onNew={() => { setShowCreate(true); setEditingSeries(null) }} />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: 20,
          }}>
            {filtered.map(s => (
              <SeriesCard
                key={s.id} series={s}
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
