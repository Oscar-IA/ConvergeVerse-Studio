'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiStatus {
  story_engine: boolean
  replicate: boolean
  supabase: boolean
  openai: boolean
}

interface RecentChapter {
  id: string
  title: string
  day_number: number
  status: string
  production_phase?: string
  created_at: string
}

// ── Styles ────────────────────────────────────────────────────────────────────

const glass = (accent = 'rgba(255,255,255,'): React.CSSProperties => ({
  background: `${accent}0.04)`,
  border: `1px solid ${accent}0.10)`,
  borderRadius: 16,
  backdropFilter: 'blur(12px)',
})

const TOOLS: Array<{
  href: string
  icon: string
  title: string
  subtitle: string
  accent: string
  badge?: string
}> = [
  {
    href: '/story-engine',
    icon: '✍️',
    title: 'Story Engine',
    subtitle: 'Genera capítulos, gestiona arcos narrativos y ciclo Novela→Manga→Animación',
    accent: '#ec4899',
    badge: 'CORE',
  },
  {
    href: '/manga',
    icon: '🎨',
    title: 'Manga Studio',
    subtitle: 'Editor de paneles, guiones visuales, visor de páginas y exportación',
    accent: '#a78bfa',
  },
  {
    href: '/series',
    icon: '📚',
    title: 'Series Platform',
    subtitle: 'Organiza tus historias en series, gestiona volúmenes y estados de publicación',
    accent: '#38bdf8',
  },
  {
    href: '/templates',
    icon: '🌸',
    title: 'Anime Templates',
    subtitle: 'Plantillas de arcos, personajes, mundos y estructuras narrativas para anime',
    accent: '#fb923c',
    badge: 'NEW',
  },
  {
    href: '/creative-hub',
    icon: '🔮',
    title: 'Creative Hub',
    subtitle: 'Centro de referencias visuales, lore, personajes y biblia de producción',
    accent: '#4ade80',
  },
  {
    href: '/story-engine',
    icon: '🎬',
    title: 'Cour Structure',
    subtitle: 'Estructura por temporadas anime (13 eps), arcos y progresión de personajes',
    accent: '#fbbf24',
  },
]

const PHASES = [
  { key: 'novel', label: 'NOVELA', color: '#94a3b8', desc: 'Guion textual' },
  { key: 'manga', label: 'MANGA', color: '#ec4899', desc: 'Paneles ilustrados' },
  { key: 'animation', label: 'ANIMACIÓN', color: '#a78bfa', desc: 'Keyframes + video' },
  { key: 'complete', label: 'LEGADO', color: '#4ade80', desc: 'Publicado' },
]

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean | null }) {
  const color = ok === null ? '#fbbf24' : ok ? '#4ade80' : '#f87171'
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, boxShadow: `0 0 6px ${color}`,
      animation: ok === null ? 'bond-pulse 1.2s ease-in-out infinite' : undefined,
    }} />
  )
}

// ── Tool card ─────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: typeof TOOLS[0] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={tool.href}
      style={{
        display: 'block', textDecoration: 'none',
        ...glass(`${tool.accent.slice(0, 7)},`),
        border: `1px solid ${hovered ? tool.accent + '44' : 'rgba(255,255,255,0.08)'}`,
        padding: '20px 22px',
        transition: 'all 0.2s',
        boxShadow: hovered ? `0 0 30px ${tool.accent}18` : 'none',
        transform: hovered ? 'translateY(-2px)' : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {tool.badge && (
        <span style={{
          position: 'absolute', top: 12, right: 12,
          fontSize: 9, fontWeight: 800, letterSpacing: '0.12em',
          padding: '2px 7px', borderRadius: 4,
          background: `${tool.accent}22`, color: tool.accent,
          border: `1px solid ${tool.accent}44`,
        }}>
          {tool.badge}
        </span>
      )}
      <div style={{ fontSize: 28, marginBottom: 12 }}>{tool.icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', marginBottom: 6, fontFamily: 'inherit' }}>
        {tool.title}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
        {tool.subtitle}
      </div>
      {/* Accent line */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0,
        height: 2, width: hovered ? '100%' : '0%',
        background: `linear-gradient(90deg, ${tool.accent}, transparent)`,
        transition: 'width 0.3s ease',
      }} />
    </Link>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function Dashboard() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [recentChapters, setRecentChapters] = useState<RecentChapter[]>([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    // Update clock
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    // Check API status
    fetch(`${API_BASE}/api/story-engine/database-status`)
      .then(r => r.json())
      .then((d) => {
        setApiStatus({
          story_engine: true,
          replicate: !!(process.env.NEXT_PUBLIC_REPLICATE_STATUS !== 'off'),
          supabase: d.ok ?? d.database_ok ?? true,
          openai: true,
        })
      })
      .catch(() => setApiStatus({ story_engine: false, replicate: false, supabase: false, openai: false }))

    // Fetch recent chapters
    fetch(`${API_BASE}/api/story-engine/chapters/latest`)
      .then(r => r.json())
      .then((d) => setRecentChapters((d.chapters ?? d ?? []).slice(0, 5)))
      .catch(() => {})
  }, [])

  const phaseCount = recentChapters.reduce((acc, ch) => {
    const p = ch.production_phase ?? 'novel'
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #070510 0%, #0f0820 40%, #070510 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes bond-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes bond-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes bond-glow  { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes bond-scan  { from{top:-2px} to{top:102%} }
      `}</style>

      {/* Ambient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 600, height: 600,
          top: '-10%', left: '20%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 65%)',
          filter: 'blur(100px)',
          animation: 'bond-float 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 400, height: 400,
          bottom: '10%', right: '15%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.08) 0%, transparent 65%)',
          filter: 'blur(80px)',
          animation: 'bond-float 11s ease-in-out 2s infinite',
        }} />
        {/* Grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(236,72,153,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(236,72,153,0.02) 1px,transparent 1px)',
          backgroundSize: '52px 52px',
        }} />
        {/* Scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(236,72,153,0.2),transparent)',
          animation: 'bond-scan 6s linear infinite',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.5em',
              color: 'rgba(236,72,153,0.7)', textTransform: 'uppercase', marginBottom: 8,
              fontFamily: 'ui-monospace,monospace',
            }}>
              BOND Studios · Narrative Intelligence Platform
            </div>
            <h1 style={{
              fontSize: 'clamp(2rem,5vw,3rem)', fontWeight: 900,
              background: 'linear-gradient(135deg,#fff 0%,rgba(236,72,153,0.85) 60%,rgba(168,85,247,0.8) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0,
              fontFamily: 'system-ui,sans-serif',
            }}>
              ConvergeVerse Studio
            </h1>
            <p style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
              Sistema de creación anime autónomo — desde la historia hasta el manga publicado
            </p>
          </div>

          {/* Status panel */}
          <div style={{ ...glass(), padding: '14px 18px', minWidth: 220 }}>
            <div style={{ fontSize: 9, letterSpacing: '0.2em', color: '#475569', marginBottom: 10, textTransform: 'uppercase' }}>
              SYSTEM STATUS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                ['Story Engine', apiStatus?.story_engine ?? null],
                ['Supabase DB', apiStatus?.supabase ?? null],
                ['Replicate AI', apiStatus?.replicate ?? null],
                ['OpenAI', apiStatus?.openai ?? null],
              ].map(([label, ok]) => (
                <div key={label as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{label as string}</span>
                  <StatusDot ok={ok as boolean | null} />
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#334155', fontFamily: 'ui-monospace,monospace' }}>
              {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* ── Production pipeline ──────────────────────────────────────── */}
        <div style={{ ...glass(), padding: '18px 24px', marginBottom: 28 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.25em', color: '#475569', marginBottom: 14, textTransform: 'uppercase' }}>
            Pipeline de Producción · Capítulos activos
          </div>
          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch', flexWrap: 'wrap' }}>
            {PHASES.map((phase, i) => {
              const count = phaseCount[phase.key] ?? 0
              const isLast = i === PHASES.length - 1
              return (
                <div key={phase.key} style={{ display: 'flex', alignItems: 'center', flex: '1 1 120px' }}>
                  <div style={{
                    flex: 1, padding: '14px 16px',
                    background: count > 0 ? `${phase.color}10` : 'transparent',
                    border: `1px solid ${count > 0 ? phase.color + '30' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 10, textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: count > 0 ? phase.color : '#334155' }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 9, letterSpacing: '0.15em', color: count > 0 ? phase.color : '#334155', marginTop: 2, textTransform: 'uppercase' }}>
                      {phase.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{phase.desc}</div>
                  </div>
                  {!isLast && (
                    <div style={{ padding: '0 6px', color: '#1e293b', fontSize: 16 }}>→</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Tools grid ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{
            fontSize: 11, letterSpacing: '0.3em', color: '#475569',
            textTransform: 'uppercase', marginBottom: 16,
            fontFamily: 'ui-monospace,monospace', fontWeight: 600,
          }}>
            Herramientas de Creación
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 14,
          }}>
            {TOOLS.map((tool, i) => <ToolCard key={i} tool={tool} />)}
          </div>
        </div>

        {/* ── Recent chapters + Quick-start ────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flexWrap: 'wrap' as const }}>

          {/* Recent chapters */}
          <div style={{ ...glass(), padding: '18px 22px', minWidth: 260 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.25em', color: '#475569', marginBottom: 14, textTransform: 'uppercase' }}>
              Capítulos Recientes
            </div>
            {recentChapters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📖</div>
                <div style={{ fontSize: 12, color: '#475569' }}>No hay capítulos todavía</div>
                <Link href="/story-engine" style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: '#ec4899', textDecoration: 'none' }}>
                  Generar primer capítulo →
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentChapters.map(ch => (
                  <Link key={ch.id} href="/story-engine" style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8, textDecoration: 'none',
                    transition: 'all 0.15s',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>
                        {ch.title || `Capítulo ${ch.day_number}`}
                      </div>
                      <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                        Día {ch.day_number} · {new Date(ch.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: 4,
                      background: ch.status === 'published' ? 'rgba(74,222,128,0.12)' :
                                  ch.status === 'approved' ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.06)',
                      color: ch.status === 'published' ? '#4ade80' :
                             ch.status === 'approved' ? '#ec4899' : '#64748b',
                    }}>
                      {ch.status}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick-start guide */}
          <div style={{ ...glass('rgba(236,72,153,'), padding: '18px 22px', minWidth: 260 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.25em', color: 'rgba(236,72,153,0.6)', marginBottom: 16, textTransform: 'uppercase' }}>
              Flujo de Trabajo · Anime Creator
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['1', '#ec4899', 'Crea tu Serie', 'Define título, género y estilo visual en /series', '/series'],
                ['2', '#a78bfa', 'Elige un Template', 'Selecciona la estructura narrativa para tu anime', '/templates'],
                ['3', '#38bdf8', 'Genera Capítulos', 'El AI Story Engine escribe tu historia autónomamente', '/story-engine'],
                ['4', '#4ade80', 'Ilustra como Manga', 'Convierte capítulos aprobados a paneles con IA visual', '/story-engine'],
                ['5', '#fbbf24', 'Publica al Legado', 'Exporta tu obra al Libro de Crónicas permanente', '/manga'],
              ].map(([num, color, title, desc, href]) => (
                <Link key={num as string} href={href as string} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', textDecoration: 'none' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: `${color as string}18`, border: `1px solid ${color as string}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 800, color: color as string,
                  }}>
                    {num as string}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{title as string}</div>
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>{desc as string}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div style={{
          marginTop: 40, paddingTop: 20,
          borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 10, color: '#1e293b', letterSpacing: '0.25em', textTransform: 'uppercase' }}>
            BOND Studios · ConvergeVerse Studio · v0.3.0
          </span>
          <span style={{ fontSize: 10, color: '#1e293b' }}>
            Soberanía de Datos · Zero External Storage · Secure Environment
          </span>
        </div>

      </div>
    </main>
  )
}
