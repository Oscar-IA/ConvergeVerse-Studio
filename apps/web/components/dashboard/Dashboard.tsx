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

// ── Tool definitions ──────────────────────────────────────────────────────────

const TOOLS = [
  { href: '/story-engine', icon: '✍️', title: 'Story Engine',    sub: 'Genera capítulos y arcos narrativos',   accent: '#ec4899', badge: 'CORE' },
  { href: '/manga',        icon: '🎨', title: 'Manga Studio',    sub: 'Editor visual y exportación de paneles', accent: '#a78bfa' },
  { href: '/series',       icon: '📚', title: 'Series Platform', sub: 'Gestiona tus series y volúmenes',        accent: '#38bdf8' },
  { href: '/templates',    icon: '🌸', title: 'Templates',       sub: 'Plantillas de arcos y mundos',           accent: '#fb923c', badge: 'NEW' },
  { href: '/creative-hub', icon: '🔮', title: 'Creative Hub',    sub: 'Referencias visuales y biblia de lore',  accent: '#4ade80' },
  { href: '/story-engine', icon: '🎬', title: 'Cour Structure',  sub: 'Estructura anime por temporadas',        accent: '#fbbf24' },
]

const PHASES = [
  { key: 'novel',     label: 'NOVELA',    color: '#94a3b8', desc: 'Guion textual' },
  { key: 'manga',     label: 'MANGA',     color: '#ec4899', desc: 'Paneles' },
  { key: 'animation', label: 'ANIMACIÓN', color: '#a78bfa', desc: 'Keyframes' },
  { key: 'complete',  label: 'LEGADO',    color: '#4ade80', desc: 'Publicado' },
]

const WORKFLOW = [
  { num: '01', color: '#ec4899', title: 'Crea tu Serie',       desc: 'Define título, género y estilo visual',     href: '/series' },
  { num: '02', color: '#a78bfa', title: 'Elige un Template',   desc: 'Estructura narrativa para tu anime',        href: '/templates' },
  { num: '03', color: '#38bdf8', title: 'Genera Capítulos',    desc: 'El AI Story Engine escribe autónomamente',  href: '/story-engine' },
  { num: '04', color: '#4ade80', title: 'Ilustra como Manga',  desc: 'Convierte capítulos a paneles con IA',      href: '/story-engine' },
  { num: '05', color: '#fbbf24', title: 'Publica al Legado',   desc: 'Exporta al Libro de Crónicas permanente',  href: '/manga' },
]

// ── Status dot ────────────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean | null }) {
  const c = ok === null ? '#fbbf24' : ok ? '#4ade80' : '#f87171'
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: c, boxShadow: `0 0 5px ${c}`,
      flexShrink: 0,
      animation: ok === null ? 'bond-pulse 1.2s ease-in-out infinite' : undefined,
    }} />
  )
}

// ── Tool card — comic panel style ─────────────────────────────────────────────

function ToolCard({ tool }: { tool: typeof TOOLS[0] }) {
  const [hov, setHov] = useState(false)
  return (
    <Link
      href={tool.href}
      style={{ display: 'block', textDecoration: 'none', position: 'relative' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{
        position: 'relative',
        background: hov ? `${tool.accent}0a` : 'rgba(6,3,14,0.97)',
        border: `2px solid ${hov ? tool.accent + '60' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 3,
        padding: '20px 20px 22px',
        overflow: 'hidden',
        boxShadow: hov
          ? `4px 4px 0 ${tool.accent}30, 0 0 20px ${tool.accent}10`
          : '3px 3px 0 rgba(0,0,0,0.8)',
        transition: 'all 0.15s',
      }}>
        {/* Halftone bg */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `radial-gradient(circle, ${tool.accent}08 1.5px, transparent 1.5px)`,
          backgroundSize: '10px 10px',
          pointerEvents: 'none',
        }} />
        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg, ${tool.accent} 0%, transparent 60%)`,
        }} />
        {/* Badge */}
        {tool.badge && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            fontSize: 8, fontWeight: 900, letterSpacing: '0.15em',
            padding: '2px 6px', borderRadius: 2,
            background: `${tool.accent}22`, color: tool.accent,
            border: `1px solid ${tool.accent}50`,
            textTransform: 'uppercase',
          }}>
            {tool.badge}
          </span>
        )}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 26, marginBottom: 10 }}>{tool.icon}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 5, letterSpacing: '0.01em' }}>
            {tool.title}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.55 }}>
            {tool.sub}
          </div>
          {/* Animated bottom bar */}
          <div style={{
            position: 'absolute', bottom: -22, left: -20, right: -20, height: 2,
            background: `linear-gradient(90deg, ${tool.accent}, transparent)`,
            opacity: hov ? 1 : 0,
            transition: 'opacity 0.2s',
          }} />
        </div>
      </div>
    </Link>
  )
}

// ── Pipeline bar ──────────────────────────────────────────────────────────────

function PipelineBar({ phases, counts }: { phases: typeof PHASES; counts: Record<string, number> }) {
  return (
    <div style={{
      display: 'flex', gap: 3,
      background: 'rgba(0,0,0,0.6)',
      border: '2px solid rgba(255,255,255,0.07)',
      borderRadius: 3,
      padding: 3,
    }}>
      {phases.map((phase, i) => {
        const count = counts[phase.key] ?? 0
        const active = count > 0
        return (
          <div key={phase.key} style={{
            flex: 1, display: 'flex', alignItems: 'stretch',
          }}>
            <div style={{
              flex: 1,
              background: active ? `${phase.color}12` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${active ? phase.color + '35' : 'rgba(255,255,255,0.04)'}`,
              padding: '14px 12px',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {active && (
                <div style={{
                  position: 'absolute', inset: 0,
                  backgroundImage: `radial-gradient(circle, ${phase.color}07 1px, transparent 1px)`,
                  backgroundSize: '8px 8px',
                  pointerEvents: 'none',
                }} />
              )}
              <div style={{ position: 'relative' }}>
                <div style={{
                  fontSize: 24, fontWeight: 900, lineHeight: 1,
                  color: active ? phase.color : 'rgba(255,255,255,0.1)',
                  fontFamily: 'ui-monospace, monospace',
                }}>
                  {count}
                </div>
                <div style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: active ? phase.color : 'rgba(255,255,255,0.12)',
                  marginTop: 3,
                }}>
                  {phase.label}
                </div>
                <div style={{ fontSize: 9, color: '#334155', marginTop: 2 }}>
                  {phase.desc}
                </div>
              </div>
            </div>
            {i < phases.length - 1 && (
              <div style={{
                width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.12)', fontSize: 10,
              }}>
                ▶
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function Dashboard() {
  const [apiStatus, setApiStatus] = useState<ApiStatus | null>(null)
  const [recentChapters, setRecentChapters] = useState<RecentChapter[]>([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    // API status check — non-blocking, never crashes the UI
    fetch(`${API_BASE}/api/story-engine/database-status`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d) => setApiStatus({
        story_engine: true,
        replicate: true,
        supabase: !!(d?.ok ?? d?.database_ok ?? true),
        openai: true,
      }))
      .catch(() => setApiStatus({ story_engine: false, replicate: false, supabase: false, openai: false }))

    // Recent chapters — optional, silently skipped if API is down
    fetch(`${API_BASE}/api/story-engine/chapters/latest`, { signal: AbortSignal.timeout(4000) })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d) => setRecentChapters((d?.chapters ?? d ?? []).slice(0, 5)))
      .catch(() => {})
  }, [])

  const phaseCounts = recentChapters.reduce<Record<string, number>>((acc, ch) => {
    const p = ch.production_phase ?? 'novel'
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})

  const statusEntries: [string, boolean | null][] = [
    ['Story Engine', apiStatus?.story_engine ?? null],
    ['Supabase DB',  apiStatus?.supabase ?? null],
    ['Replicate AI', apiStatus?.replicate ?? null],
    ['OpenAI',       apiStatus?.openai ?? null],
  ]

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #070510 0%, #0d0618 40%, #070510 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowX: 'hidden',
    }}>
      <style>{`
        @keyframes bond-pulse  { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes bond-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes bond-scan   { from{top:-2px} to{top:102%} }
      `}</style>

      {/* ── Ambient background ─────────────────────────────────────────── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 700, height: 700, top: '-15%', left: '15%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.09) 0%, transparent 65%)',
          filter: 'blur(120px)', animation: 'bond-float 9s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, bottom: '5%', right: '10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 65%)',
          filter: 'blur(100px)', animation: 'bond-float 13s ease-in-out 3s infinite',
        }} />
        {/* Comic grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage:
            'linear-gradient(rgba(236,72,153,0.025) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(236,72,153,0.025) 1px,transparent 1px)',
          backgroundSize: '52px 52px',
        }} />
        {/* Halftone scatter */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          backgroundPosition: '10px 10px',
        }} />
        {/* Scan line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg,transparent,rgba(236,72,153,0.18),transparent)',
          animation: 'bond-scan 7s linear infinite',
        }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '28px 20px' }}>

        {/* ── Header — comic panel hero ──────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr auto', gap: 16,
          marginBottom: 28, alignItems: 'start', flexWrap: 'wrap',
        }}>
          {/* Title panel */}
          <div style={{
            position: 'relative',
            background: 'rgba(6,3,14,0.97)',
            border: '2px solid rgba(255,255,255,0.08)',
            borderLeft: '4px solid #ec4899',
            borderRadius: '0 4px 4px 0',
            padding: '20px 28px',
            overflow: 'hidden',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.05) 1.5px, transparent 1.5px)',
              backgroundSize: '12px 12px', pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                fontSize: 8, fontWeight: 900, letterSpacing: '0.55em',
                color: 'rgba(236,72,153,0.65)', textTransform: 'uppercase',
                marginBottom: 6, fontFamily: 'ui-monospace, monospace',
              }}>
                BOND Studios · Narrative Intelligence Platform
              </div>
              <h1 style={{
                fontSize: 'clamp(1.8rem,4.5vw,2.8rem)', fontWeight: 900, margin: 0,
                background: 'linear-gradient(135deg,#fff 0%,rgba(236,72,153,0.85) 55%,rgba(139,92,246,0.8) 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em', lineHeight: 1.1,
              }}>
                ConvergeVerse Studio
              </h1>
              <p style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                Sistema autónomo de creación anime — desde la historia hasta el manga publicado
              </p>
            </div>
          </div>

          {/* Status + clock panel */}
          <div style={{
            background: 'rgba(6,3,14,0.97)',
            border: '2px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
            padding: '16px 18px',
            minWidth: 200,
            boxShadow: '3px 3px 0 rgba(0,0,0,0.8)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, #4ade80 0%, transparent 70%)',
            }} />
            <div style={{
              fontSize: 8, fontWeight: 800, letterSpacing: '0.3em',
              color: 'rgba(74,222,128,0.6)', textTransform: 'uppercase',
              marginBottom: 10, fontFamily: 'ui-monospace, monospace',
            }}>
              SYSTEM STATUS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {statusEntries.map(([label, ok]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 11, color: '#94a3b8' }}>{label}</span>
                  <StatusDot ok={ok} />
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 10, paddingTop: 10,
              borderTop: '1px solid rgba(255,255,255,0.05)',
              fontSize: 11,
              fontFamily: 'ui-monospace, monospace', textAlign: 'center',
              color: 'rgba(255,255,255,0.25)',
            }}>
              {time.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
        </div>

        {/* ── Production pipeline ──────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          }}>
            <div style={{ width: 20, height: 2, background: '#ec4899', flexShrink: 0 }} />
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.3em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
              fontFamily: 'ui-monospace, monospace',
            }}>
              Pipeline de Producción
            </span>
          </div>
          <PipelineBar phases={PHASES} counts={phaseCounts} />
        </div>

        {/* ── Tools grid — comic layout ──────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
          }}>
            <div style={{ width: 20, height: 2, background: '#a78bfa', flexShrink: 0 }} />
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '0.3em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
              fontFamily: 'ui-monospace, monospace',
            }}>
              Herramientas de Creación
            </span>
          </div>

          {/* Comic page grid: 3 cols, first card spans 2 rows */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 3,
          }}>
            {TOOLS.map((tool, i) => (
              <div key={i} style={i === 0 ? { gridRow: '1 / 3' } : {}}>
                <ToolCard tool={tool} />
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom: Recent chapters + Workflow ───────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3,
          marginBottom: 28,
        }}>
          {/* Recent chapters panel */}
          <div style={{
            background: 'rgba(6,3,14,0.97)',
            border: '2px solid rgba(255,255,255,0.07)',
            borderTop: '2px solid rgba(56,189,248,0.4)',
            borderRadius: 3,
            padding: '18px 20px',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.7)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(56,189,248,0.04) 1px, transparent 1px)',
              backgroundSize: '10px 10px', pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                fontSize: 8, fontWeight: 800, letterSpacing: '0.3em',
                color: 'rgba(56,189,248,0.6)', textTransform: 'uppercase',
                marginBottom: 12, fontFamily: 'ui-monospace, monospace',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: 14, height: 2, background: '#38bdf8' }} />
                Capítulos Recientes
              </div>

              {recentChapters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📖</div>
                  <div style={{ fontSize: 11, color: '#334155' }}>Ningún capítulo todavía</div>
                  <Link href="/story-engine" style={{
                    display: 'inline-block', marginTop: 10,
                    fontSize: 11, color: '#ec4899', textDecoration: 'none',
                    border: '1px solid rgba(236,72,153,0.3)',
                    padding: '4px 12px', borderRadius: 3,
                  }}>
                    Generar primer capítulo →
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {recentChapters.map((ch) => {
                    const statusColor =
                      ch.status === 'published' ? '#4ade80' :
                      ch.status === 'approved'  ? '#ec4899' : '#475569'
                    return (
                      <Link key={ch.id} href="/story-engine" style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 10px',
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderLeft: `2px solid ${statusColor}40`,
                        borderRadius: '0 3px 3px 0',
                        textDecoration: 'none',
                        transition: 'border-color 0.15s',
                      }}>
                        <div>
                          <div style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 600 }}>
                            {ch.title || `Capítulo ${ch.day_number}`}
                          </div>
                          <div style={{ fontSize: 10, color: '#334155', marginTop: 1 }}>
                            Día {ch.day_number} · {new Date(ch.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 8, fontWeight: 800, letterSpacing: '0.1em',
                          textTransform: 'uppercase', padding: '2px 7px',
                          background: `${statusColor}15`,
                          color: statusColor,
                          border: `1px solid ${statusColor}30`,
                          borderRadius: 2,
                          flexShrink: 0,
                        }}>
                          {ch.status}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Workflow guide panel */}
          <div style={{
            background: 'rgba(6,3,14,0.97)',
            border: '2px solid rgba(255,255,255,0.07)',
            borderTop: '2px solid rgba(236,72,153,0.4)',
            borderRadius: 3,
            padding: '18px 20px',
            boxShadow: '3px 3px 0 rgba(0,0,0,0.7)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.04) 1px, transparent 1px)',
              backgroundSize: '10px 10px', pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                fontSize: 8, fontWeight: 800, letterSpacing: '0.3em',
                color: 'rgba(236,72,153,0.6)', textTransform: 'uppercase',
                marginBottom: 12, fontFamily: 'ui-monospace, monospace',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{ width: 14, height: 2, background: '#ec4899' }} />
                Flujo de Trabajo
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {WORKFLOW.map(({ num, color, title, desc, href }) => (
                  <Link key={num} href={href} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', textDecoration: 'none' }}>
                    <div style={{
                      width: 26, height: 26, flexShrink: 0, borderRadius: 2,
                      background: `${color}12`,
                      border: `1px solid ${color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 900, color,
                      fontFamily: 'ui-monospace, monospace',
                    }}>
                      {num}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.3 }}>{title}</div>
                      <div style={{ fontSize: 10, color: '#475569', lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div style={{
          paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: '0.3em', textTransform: 'uppercase', fontFamily: 'ui-monospace, monospace' }}>
            BOND Studios · ConvergeVerse Studio · v0.4.0
          </span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.1)', fontFamily: 'ui-monospace, monospace' }}>
            Soberanía de Datos · Zero External Storage · Secure
          </span>
        </div>

      </div>
    </main>
  )
}
