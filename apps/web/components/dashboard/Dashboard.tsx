'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { loadBondStories, autoSaveBondStory, parseBondFile, seedDemoStory, hasDemoStory } from '@/lib/bondSave'
import type { BondStory } from '@/lib/bondSave'
import { useKidsMode } from '@/hooks/useKidsMode'

// ── Tips arrays (EN + ES) ────────────────────────────────────────────────────

const TIPS_EN = [
  '💡 Start with a hero who has a big dream',
  '🌟 The best villains also believe they are right',
  '🎭 Give your special move an awesome name',
  '📖 Every chapter should end with a surprise',
  '🤝 Your hero needs a loyal best friend',
  '⚡ The coolest powers always have a price',
  '🌈 Describe the colors of your world',
  '🗺️ Draw the map of your imaginary world',
  '🔥 A great villain makes the hero stronger',
  '🌙 Night scenes feel more mysterious and exciting',
]

const TIPS_ES = [
  '💡 Empieza con un héroe que tenga un gran sueño',
  '🌟 Los mejores villanos también creen que tienen razón',
  '🎭 Dale un nombre genial a tu técnica especial',
  '📖 Cada capítulo debe terminar con una sorpresa',
  '🤝 Tu protagonista necesita un mejor amigo fiel',
  '⚡ Los poderes más cool tienen un costo',
  '🌈 Describe los colores de tu mundo',
  '🗺️ Dibuja el mapa de tu mundo imaginario',
  '🔥 Un buen villano hace más fuerte al héroe',
  '🌙 Las escenas de noche son más misteriosas',
]

// ── HeroBanner ────────────────────────────────────────────────────────────────

function HeroBanner({ kidsMode }: { kidsMode: boolean }) {
  const t = useTranslations('dashboard')

  return (
    <div style={{
      position: 'relative',
      marginBottom: 32,
      padding: kidsMode ? '40px 24px' : '32px 24px',
      overflow: 'hidden',
      borderRadius: 24,
      background: 'linear-gradient(135deg, rgba(236,72,153,0.15) 0%, rgba(139,92,246,0.15) 50%, rgba(56,189,248,0.1) 100%)',
      border: `2px solid rgba(236,72,153,${kidsMode ? '0.4' : '0.25'})`,
      boxShadow: kidsMode
        ? '0 0 80px rgba(236,72,153,0.15), 0 0 0 2px rgba(236,72,153,0.08)'
        : '0 0 60px rgba(236,72,153,0.1)',
    }}>
      {/* Decorative burst SVG */}
      <svg aria-hidden style={{ position: 'absolute', right: -20, top: -20, opacity: 0.18, pointerEvents: 'none' }}
        width="260" height="260" viewBox="0 0 260 260">
        <polygon points="130,10 155,90 240,90 175,140 200,220 130,170 60,220 85,140 20,90 105,90"
          fill="none" stroke="#ec4899" strokeWidth="3" />
        <polygon points="130,30 150,95 225,95 165,135 188,210 130,168 72,210 95,135 35,95 110,95"
          fill="rgba(236,72,153,0.15)" />
        <circle cx="130" cy="130" r="40" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="6 4" />
      </svg>

      {/* Mascot — bigger in kids mode */}
      <div style={{
        fontSize: kidsMode ? 80 : 64,
        textAlign: 'center',
        marginBottom: 12,
        animation: 'bond-bounce 2s ease-in-out infinite',
        display: 'block',
      }}>
        {kidsMode ? '🦸' : '🦸'}
      </div>

      <h1 style={{
        textAlign: 'center',
        fontSize: kidsMode ? 'clamp(1.8rem, 5vw, 2.8rem)' : 'clamp(1.4rem, 5vw, 2.4rem)',
        fontWeight: 900,
        margin: '0 0 8px',
        background: 'linear-gradient(135deg, #fff 0%, #ec4899 60%, #a855f7 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
      }}>
        {t('heroTitle')}
      </h1>
      <p style={{ textAlign: 'center', fontSize: kidsMode ? 17 : 15, color: '#94a3b8', marginBottom: 28 }}>
        {t('heroSubtitle')}
      </p>

      {/* 3-step hero flow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {[
          { emoji: '💡', key: 'step1' as const },
          { emoji: '→', key: null },
          { emoji: '✍️', key: 'step2' as const },
          { emoji: '→', key: null },
          { emoji: '💾', key: 'step3' as const },
        ].map((step, i) =>
          step.key ? (
            <div key={i} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: kidsMode ? '14px 24px' : '12px 20px',
              background: 'rgba(255,255,255,0.07)',
              border: '2px solid rgba(255,255,255,0.15)',
              borderRadius: kidsMode ? 20 : 16,
              minWidth: kidsMode ? 100 : 90,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              animation: `bond-pop-in 0.4s ease ${i * 0.08}s both`,
            }}>
              <span style={{ fontSize: kidsMode ? 38 : 32 }}>{step.emoji}</span>
              <span style={{ fontSize: kidsMode ? 16 : 14, fontWeight: 700, color: '#e2e8f0' }}>{t(step.key)}</span>
            </div>
          ) : (
            <span key={i} style={{ fontSize: 22, color: 'rgba(255,255,255,0.3)', fontWeight: 300 }}>→</span>
          )
        )}
      </div>
    </div>
  )
}

// ── ActionGrid ────────────────────────────────────────────────────────────────

function ActionGrid({ kidsMode }: { kidsMode: boolean }) {
  const t = useTranslations('dashboard')

  const cards = [
    {
      href: '/story-engine',
      emoji: '✨',
      labelKey: 'actionCreate' as const,
      subKey: 'actionCreateSub' as const,
      gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      glow: 'rgba(236,72,153,0.5)',
      delay: '0s',
    },
    {
      href: '/manga',
      emoji: '🎨',
      labelKey: 'actionDraw' as const,
      subKey: 'actionDrawSub' as const,
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      glow: 'rgba(139,92,246,0.5)',
      delay: '0.05s',
    },
    {
      href: '/series',
      emoji: '📚',
      labelKey: 'actionSeries' as const,
      subKey: 'actionSeriesSub' as const,
      gradient: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
      glow: 'rgba(56,189,248,0.5)',
      delay: '0.1s',
    },
    {
      href: '/templates',
      emoji: '🌸',
      labelKey: 'actionTemplates' as const,
      subKey: 'actionTemplatesSub' as const,
      gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)',
      glow: 'rgba(251,146,60,0.5)',
      delay: '0.15s',
    },
  ]

  return (
    <div style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: kidsMode ? 20 : 18, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
        {t('whatToDo')}
      </h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: kidsMode ? 16 : 14,
      }}>
        {cards.map((card) => (
          <ActionCard key={card.href} card={card} label={t(card.labelKey)} sub={t(card.subKey)} kidsMode={kidsMode} />
        ))}
      </div>
    </div>
  )
}

function ActionCard({
  card, label, sub, kidsMode,
}: {
  card: { href: string; emoji: string; gradient: string; glow: string; delay: string };
  label: string; sub: string; kidsMode: boolean;
}) {
  const [hov, setHov] = useState(false)

  return (
    <Link
      href={card.href}
      className="btn-action"
      style={{
        background: hov ? card.gradient : 'rgba(255,255,255,0.06)',
        minHeight: kidsMode ? 150 : 130,
        position: 'relative',
        overflow: 'hidden',
        animationDelay: card.delay,
        boxShadow: hov
          ? `0 10px 0 rgba(0,0,0,0.4), 0 0 50px ${card.glow}`
          : `0 6px 0 rgba(0,0,0,0.5), 0 0 20px ${card.glow.replace('0.5)', '0.15)')}`,
        border: `3px solid ${hov ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)'}`,
        transform: hov ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        borderRadius: kidsMode ? 20 : undefined,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Halftone dots bg */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.08) 1.5px, transparent 1.5px)`,
        backgroundSize: '12px 12px',
        opacity: hov ? 1 : 0.5,
        transition: 'opacity 0.2s',
      }} />

      <span style={{ fontSize: kidsMode ? 56 : 48, position: 'relative', zIndex: 1, display: 'block',
        animation: kidsMode && hov ? 'bond-wiggle 0.4s ease' : undefined,
      }}>
        {card.emoji}
      </span>
      <span style={{
        fontSize: kidsMode ? 18 : 16, fontWeight: 800, color: '#fff',
        textShadow: '0 2px 8px rgba(0,0,0,0.5)',
        position: 'relative', zIndex: 1, textAlign: 'center',
      }}>
        {label}
      </span>
      <span style={{
        fontSize: kidsMode ? 13 : 11, color: 'rgba(255,255,255,0.75)',
        textAlign: 'center', lineHeight: 1.3,
        position: 'relative', zIndex: 1,
      }}>
        {sub}
      </span>
    </Link>
  )
}

// ── MyStoriesGallery ──────────────────────────────────────────────────────────

function MyStoriesGallery({ kidsMode }: { kidsMode: boolean }) {
  const t = useTranslations('dashboard')
  const [stories, setStories] = useState<BondStory[]>([])
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const reload = () => setStories(loadBondStories())
  useEffect(() => { reload() }, [])

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const story = parseBondFile(content)
      if (!story) {
        setImportMsg('❌ ' + (kidsMode
          ? 'That file didn\'t work. Make sure it\'s a .bond file! / ¡Ese archivo no funcionó. Asegúrate de que sea .bond!'
          : 'Archivo no válido. Asegúrate de que sea un archivo .bond de BOND Studios.'))
      } else {
        autoSaveBondStory(story)
        reload()
        setImportMsg(`✅ "${story.title}" loaded! / ¡cargada!`)
      }
      setTimeout(() => setImportMsg(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDemo = () => { seedDemoStory(); reload() }

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: kidsMode ? 20 : 18, fontWeight: 800, color: '#fff', margin: 0 }}>
          📖 {t('myStories')}
        </h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{
            fontSize: kidsMode ? 13 : 11, color: '#06b6d4', cursor: 'pointer',
            padding: kidsMode ? '8px 16px' : '5px 12px',
            border: '1px solid rgba(6,182,212,0.35)', borderRadius: 8, fontWeight: 600,
            background: 'rgba(6,182,212,0.06)',
            display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 0.15s',
          }}>
            {t('loadBond')}
            <input type="file" accept=".bond,.json" onChange={handleImportFile} style={{ display: 'none' }} />
          </label>
          {stories.length > 0 && (
            <Link href="/story-engine" style={{
              fontSize: kidsMode ? 13 : 11, color: '#ec4899', textDecoration: 'none',
              padding: kidsMode ? '8px 16px' : '5px 12px',
              border: '1px solid rgba(236,72,153,0.35)', borderRadius: 8, fontWeight: 600,
              background: 'rgba(236,72,153,0.06)',
            }}>
              {t('newStory')}
            </Link>
          )}
        </div>
      </div>

      {importMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 14,
          background: importMsg.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${importMsg.startsWith('✅') ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
          fontSize: kidsMode ? 14 : 13,
          color: importMsg.startsWith('✅') ? '#4ade80' : '#fca5a5',
        }}>
          {importMsg}
        </div>
      )}

      {stories.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: kidsMode ? '56px 24px' : '44px 24px',
          background: 'rgba(255,255,255,0.03)',
          border: '2px dashed rgba(255,255,255,0.12)',
          borderRadius: 20,
        }}>
          <div style={{ fontSize: kidsMode ? 64 : 52, marginBottom: 12 }}>🚀</div>
          <div style={{ fontSize: kidsMode ? 18 : 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
            {t('noStories')}
          </div>
          <div style={{ fontSize: kidsMode ? 15 : 13, color: '#64748b', marginBottom: 20 }}>
            {t('noStoriesHint')}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/story-engine" style={{
              display: 'inline-block', padding: kidsMode ? '14px 28px' : '12px 24px',
              background: 'linear-gradient(135deg, #ec4899, #a855f7)',
              borderRadius: kidsMode ? 16 : 12, color: '#fff', fontWeight: 700,
              fontSize: kidsMode ? 16 : 14, textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(236,72,153,0.3)',
            }}>
              {t('createFirst')}
            </Link>
            {!hasDemoStory() && (
              <button onClick={handleDemo} style={{
                padding: kidsMode ? '14px 28px' : '12px 24px',
                background: 'rgba(6,182,212,0.12)',
                border: '1px solid rgba(6,182,212,0.35)',
                borderRadius: kidsMode ? 16 : 12, color: '#06b6d4',
                fontWeight: 700, fontSize: kidsMode ? 16 : 14,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {t('viewExample')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: kidsMode ? 16 : 14,
        }}>
          {stories.map((story, i) => (
            <StoryCard key={story.id} story={story} delay={`${i * 0.05}s`} kidsMode={kidsMode} />
          ))}
        </div>
      )}
    </div>
  )
}

function StoryCard({ story, delay, kidsMode }: { story: BondStory; delay: string; kidsMode: boolean }) {
  const t = useTranslations('dashboard')
  const [hov, setHov] = useState(false)
  const date = new Date(story.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    import('@/lib/bondSave').then(({ saveBondFile }) => saveBondFile(story))
  }

  return (
    <div style={{ position: 'relative' }}>
      <Link
        href={`/my-stories?id=${story.id}`}
        className="story-card"
        style={{
          textDecoration: 'none', animationDelay: delay,
          transform: hov ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: hov ? '0 8px 24px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.2)',
          borderColor: hov ? 'rgba(236,72,153,0.4)' : 'rgba(255,255,255,0.1)',
          transition: 'all 0.2s', display: 'block',
          borderRadius: kidsMode ? '20px' : undefined,
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <div style={{
          fontSize: kidsMode ? 52 : 44, textAlign: 'center', marginBottom: 10,
          background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '12px 0',
        }}>
          {story.cover_emoji || '📖'}
        </div>
        <div style={{ fontSize: kidsMode ? 15 : 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, lineHeight: 1.3 }}>
          {story.title}
        </div>
        {story.genre && (
          <div style={{ fontSize: 10, color: '#ec4899', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {story.genre.replace(/_/g, ' ')}
          </div>
        )}
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 8 }}>
          📅 {date} · {story.chapters.length} ch.
        </div>
        <button onClick={handleSave} title="Save as .bond file"
          style={{
            width: '100%', padding: kidsMode ? '8px 0' : '6px 0',
            background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)',
            borderRadius: 8, color: '#06b6d4',
            fontSize: kidsMode ? 12 : 10, fontWeight: 700, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '0.05em',
          }}>
          {t('saveBond')}
        </button>
      </Link>
    </div>
  )
}

// ── QuickTip ──────────────────────────────────────────────────────────────────

function QuickTip({ kidsMode }: { kidsMode: boolean }) {
  const t = useTranslations('dashboard')
  const [tipIdx, setTipIdx] = useState(0)
  const [fading, setFading] = useState(false)

  // Use bilingual tips — show EN tip with ES tip below in kids mode
  const tipsEN = TIPS_EN
  const tipsES = TIPS_ES

  useEffect(() => { setTipIdx(Math.floor(Math.random() * tipsEN.length)) }, [])

  const nextTip = () => {
    setFading(true)
    setTimeout(() => { setTipIdx(i => (i + 1) % tipsEN.length); setFading(false) }, 200)
  }

  return (
    <div style={{
      padding: kidsMode ? '20px 24px' : '16px 20px',
      background: 'rgba(251,191,36,0.06)',
      border: `1px solid rgba(251,191,36,${kidsMode ? '0.35' : '0.2'})`,
      borderRadius: kidsMode ? 20 : 16,
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <span style={{ fontSize: kidsMode ? 36 : 28, flexShrink: 0 }}>🌟</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: kidsMode ? 12 : 10, color: '#fbbf24', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
          {t('tip')}
        </div>
        <div style={{
          fontSize: kidsMode ? 15 : 13, color: '#fde68a', lineHeight: 1.5,
          opacity: fading ? 0 : 1, transition: 'opacity 0.2s',
        }}>
          {tipsEN[tipIdx]}
          {kidsMode && (
            <div style={{ marginTop: 4, opacity: 0.6, fontSize: '0.9em' }}>
              {tipsES[tipIdx]}
            </div>
          )}
        </div>
      </div>
      <button onClick={nextTip} style={{
        background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.3)',
        borderRadius: 8, color: '#fbbf24',
        fontSize: kidsMode ? 13 : 11, fontWeight: 600,
        padding: kidsMode ? '8px 14px' : '6px 12px',
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        transition: 'all 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,191,36,0.25)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(251,191,36,0.15)')}
      >
        {t('tipNext')}
      </button>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export function Dashboard() {
  const { kidsMode } = useKidsMode()

  return (
    <main className={kidsMode ? 'kids-mode' : ''} style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #070510 0%, #0d0618 40%, #0a1020 100%)',
      color: '#e2e8f0',
      fontFamily: kidsMode
        ? "'Segoe UI', system-ui, -apple-system, sans-serif"
        : 'system-ui, -apple-system, sans-serif',
      overflowX: 'hidden',
    }}>
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute', width: 600, height: 600, top: '-10%', left: '10%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 65%)',
          filter: 'blur(100px)',
          animation: 'bond-float 9s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', width: 500, height: 500, bottom: '5%', right: '8%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 65%)',
          filter: 'blur(90px)',
          animation: 'bond-float 13s ease-in-out 3s infinite',
        }} />
      </div>

      <style>{`
        @keyframes bond-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
      `}</style>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '28px 20px' }}>
        <HeroBanner kidsMode={kidsMode} />
        <ActionGrid kidsMode={kidsMode} />
        <MyStoriesGallery kidsMode={kidsMode} />
        <QuickTip kidsMode={kidsMode} />

        {/* Footer */}
        <div style={{
          marginTop: 40, paddingTop: 16,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em', textTransform: 'uppercase', fontFamily: 'ui-monospace,monospace' }}>
            BOND Studios · ConvergeVerse Studio · v0.5.0
          </span>
        </div>
      </div>
    </main>
  )
}
