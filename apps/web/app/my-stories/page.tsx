'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  loadBondStories,
  getBondStory,
  saveBondFile,
  autoSaveBondStory,
  deleteBondStory,
  parseBondFile,
  seedDemoStory,
  hasDemoStory,
} from '@/lib/bondSave'
import type { BondStory, BondChapter } from '@/lib/bondSave'

// ── Genre colors ──────────��────────────────────────────────���─────────────────
const GENRE_COLOR: Record<string, string> = {
  action: '#f97316', adventure: '#fb923c', fantasy: '#a78bfa',
  dark_fantasy: '#6366f1', horror: '#ef4444', romance: '#ec4899',
  sci_fi: '#06b6d4', mecha: '#22d3ee', shonen: '#fbbf24',
  slice_of_life: '#34d399', comedy: '#84cc16', drama: '#fb7185',
  psychological: '#c084fc', thriller: '#f43f5e', supernatural: '#e879f9',
  isekai: '#818cf8',
}
const genreColor = (g: string) => GENRE_COLOR[g] ?? '#ec4899'

// ── Chapter Reader ────────────────────────────────────────────────────────────

function ChapterReader({
  chapter,
  color,
  onClose,
}: {
  chapter: BondChapter
  color: string
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.92)',
      overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '40px 20px',
    }}>
      {/* Close */}
      <button onClick={onClose}
        style={{
          position: 'fixed', top: 20, right: 24,
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%', width: 40, height: 40,
          color: '#fff', fontSize: 20, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 101,
        }}>
        ✕
      </button>

      <div style={{ maxWidth: 680, width: '100%' }}>
        {/* Chapter header */}
        <div style={{
          textAlign: 'center', marginBottom: 32,
          padding: '24px',
          background: `${color}10`,
          borderRadius: 16,
          border: `1px solid ${color}25`,
        }}>
          <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.2em',
            textTransform: 'uppercase', fontFamily: 'ui-monospace,monospace', marginBottom: 8 }}>
            Capítulo {chapter.number}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0 }}>
            {chapter.title}
          </h2>
        </div>

        {/* Script */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          padding: '32px 36px',
          marginBottom: 24,
        }}>
          {chapter.script.split('\n\n').map((para, i) => (
            <p key={i} style={{
              color: '#e2e8f0', fontSize: 15, lineHeight: 1.8,
              margin: '0 0 20px',
              whiteSpace: 'pre-wrap',
            }}>
              {para}
            </p>
          ))}
        </div>

        {/* Panels preview */}
        {chapter.panels.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', marginBottom: 12 }}>
              🎨 Panels ({chapter.panels.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 12 }}>
              {chapter.panels.map((panel, i) => (
                <div key={i} style={{
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${color}20`,
                  borderRadius: 12,
                }}>
                  <div style={{ fontSize: 10, color, marginBottom: 6, fontWeight: 700 }}>
                    Panel {i + 1}
                  </div>
                  {panel.image_url ? (
                    <img src={panel.image_url} alt={`Panel ${i + 1}`}
                      style={{ width: '100%', borderRadius: 8, marginBottom: 8 }} />
                  ) : (
                    <div style={{
                      height: 80, borderRadius: 8, marginBottom: 8,
                      background: `${color}10`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: `${color}60`, fontStyle: 'italic',
                    }}>
                      No image generated
                    </div>
                  )}
                  <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                    {panel.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose}
          style={{
            width: '100%', padding: '14px 0',
            background: `${color}18`, border: `1px solid ${color}35`,
            borderRadius: 12, color, fontSize: 14, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          ← Back to Story
        </button>
      </div>
    </div>
  )
}

// ── Story Detail View ─────────────────────────────��───────────────────────────

function StoryDetail({ story, onBack }: { story: BondStory; onBack: () => void }) {
  const color = genreColor(story.genre)
  const [readingChapter, setReadingChapter] = useState<BondChapter | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const handleDelete = () => {
    deleteBondStory(story.id)
    setDeleted(true)
    setTimeout(() => onBack(), 500)
  }

  if (deleted) return (
    <div style={{ textAlign: 'center', padding: 60, color: '#64748b', fontSize: 16 }}>
      Story deleted.
    </div>
  )

  return (
    <>
      {readingChapter && (
        <ChapterReader
          chapter={readingChapter}
          color={color}
          onClose={() => setReadingChapter(null)}
        />
      )}

      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {/* Back */}
        <button onClick={onBack}
          style={{
            background: 'transparent', border: 'none',
            color: '#64748b', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6,
            padding: 0,
          }}>
          ← My Stories
        </button>

        {/* Story header */}
        <div style={{
          background: `linear-gradient(135deg, ${color}14 0%, rgba(5,2,12,0.95) 100%)`,
          border: `2px solid ${color}30`,
          borderRadius: 20,
          padding: '28px 32px',
          marginBottom: 24,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          }} />

          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Cover emoji */}
            <div style={{
              width: 80, height: 80, flexShrink: 0, borderRadius: 16,
              background: `${color}15`, border: `2px solid ${color}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40,
            }}>
              {story.cover_emoji || '📖'}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>
                {story.title}
              </h1>
              <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.12em', marginBottom: 10 }}>
                {story.genre.replace(/_/g, ' ')} · {story.chapters.length} chapter{story.chapters.length !== 1 ? 's' : ''}
              </div>
              {story.prompt && (
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6, margin: 0,
                  fontStyle: 'italic', maxWidth: 500 }}>
                  &ldquo;{story.prompt}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Action bar */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
            <button
              onClick={() => saveBondFile(story)}
              style={{
                padding: '10px 20px', borderRadius: 10,
                background: `${color}15`, border: `1px solid ${color}35`,
                color, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}>
              💾 Save .bond
            </button>
            <Link href={`/story-engine`}
              style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'linear-gradient(135deg,#ec4899,#a855f7)',
                color: '#fff', fontSize: 13, fontWeight: 700,
                textDecoration: 'none', display: 'inline-block',
              }}>
              ✨ Continue in Studio
            </Link>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)}
                style={{
                  padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                🗑 Delete
              </button>
            ) : (
              <>
                <button onClick={handleDelete}
                  style={{
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)',
                    color: '#fca5a5', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700,
                  }}>
                  Confirm Delete
                </button>
                <button onClick={() => setConfirmDel(false)}
                  style={{
                    padding: '10px 16px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        {/* Chapters */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 14 }}>
            📖 Chapters
          </h2>
          {story.chapters.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '2px dashed rgba(255,255,255,0.10)',
              borderRadius: 16, color: '#475569', fontSize: 14,
            }}>
              No chapters yet. Go to the Studio to generate your first chapter!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {story.chapters.map((ch) => (
                <div key={ch.number}
                  onClick={() => setReadingChapter(ch)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${color}20`,
                    borderRadius: 14,
                    padding: '16px 20px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 16,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${color}45`
                    ;(e.currentTarget as HTMLDivElement).style.background = `${color}08`
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${color}20`
                    ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'
                  }}
                >
                  {/* Chapter number */}
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: `${color}15`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color,
                  }}>
                    {ch.number}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                      {ch.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#475569' }}>
                      {ch.panels.length} panels ·{' '}
                      <span style={{
                        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                        background: ch.status === 'complete' ? 'rgba(74,222,128,0.12)' : 'rgba(251,191,36,0.12)',
                        color: ch.status === 'complete' ? '#4ade80' : '#fbbf24',
                        border: `1px solid ${ch.status === 'complete' ? 'rgba(74,222,128,0.3)' : 'rgba(251,191,36,0.3)'}`,
                        textTransform: 'uppercase' as const,
                      }}>
                        {ch.status}
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: `${color}60` }}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Stories Grid ─────────────────────────────────────────────────────────���────

function StoriesGrid({
  stories,
  onSelect,
  onRefresh,
}: {
  stories: BondStory[]
  onSelect: (id: string) => void
  onRefresh: () => void
}) {
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const story = parseBondFile(ev.target?.result as string)
      if (!story) {
        setImportMsg('❌ Invalid file. Make sure it is a .bond file.')
      } else {
        autoSaveBondStory(story)
        onRefresh()
        setImportMsg(`✅ "${story.title}" loaded successfully!`)
        setTimeout(() => onSelect(story.id), 300)
      }
      setTimeout(() => setImportMsg(null), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, margin: 0,
            background: 'linear-gradient(135deg,#fff 30%,#ec4899 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            📖 My Stories
          </h1>
          <p style={{ color: '#475569', fontSize: 13, margin: '4px 0 0' }}>
            {stories.length} {stories.length === 1 ? 'story' : 'stories'} saved on this device
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <label style={{
            padding: '10px 18px', borderRadius: 12, cursor: 'pointer',
            background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
            color: '#06b6d4', fontSize: 13, fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            📂 Load .bond
            <input type="file" accept=".bond,.json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <Link href="/story-engine"
            style={{
              padding: '10px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg,#ec4899,#a855f7)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              textDecoration: 'none', display: 'inline-block',
            }}>
            ✨ New Story
          </Link>
        </div>
      </div>

      {/* Import message */}
      {importMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: importMsg.startsWith('✅') ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${importMsg.startsWith('✅') ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
          fontSize: 13, color: importMsg.startsWith('✅') ? '#4ade80' : '#fca5a5',
        }}>
          {importMsg}
        </div>
      )}

      {stories.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 24px',
          background: 'rgba(255,255,255,0.03)',
          border: '2px dashed rgba(255,255,255,0.10)',
          borderRadius: 20,
        }}>
          <div style={{ fontSize: 60, marginBottom: 16 }}>📖</div>
          <h3 style={{ color: '#f1f5f9', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
            No stories saved yet
          </h3>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
            Create your first story or load a .bond file from your computer
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/story-engine"
              style={{
                padding: '12px 24px', borderRadius: 12,
                background: 'linear-gradient(135deg,#ec4899,#a855f7)',
                color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}>
              ✨ Create Story
            </Link>
            {!hasDemoStory() && (
              <button
                onClick={() => { seedDemoStory(); onRefresh() }}
                style={{
                  padding: '12px 24px', borderRadius: 12,
                  background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                  color: '#06b6d4', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                ⚡ Load Demo Story
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))',
          gap: 16,
        }}>
          {stories.map(story => {
            const color = genreColor(story.genre)
            const date = new Date(story.updatedAt).toLocaleDateString('en-CA', {
              day: '2-digit', month: 'short', year: 'numeric',
            })
            return (
              <div
                key={story.id}
                onClick={() => onSelect(story.id)}
                style={{
                  background: `linear-gradient(135deg, ${color}10 0%, rgba(5,2,12,0.95) 100%)`,
                  border: `2px solid ${color}20`,
                  borderRadius: 18, overflow: 'hidden', cursor: 'pointer',
                  transition: 'all 0.25s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(-4px)'
                  el.style.borderColor = `${color}45`
                  el.style.boxShadow = `0 10px 30px ${color}18`
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(0)'
                  el.style.borderColor = `${color}20`
                  el.style.boxShadow = 'none'
                }}
              >
                {/* Cover */}
                <div style={{
                  height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${color}10`, fontSize: 52, position: 'relative',
                  borderBottom: `1px solid ${color}15`,
                }}>
                  {story.cover_emoji || '📖'}
                  {/* chapter count badge */}
                  <div style={{
                    position: 'absolute', top: 10, right: 12,
                    background: `${color}20`, border: `1px solid ${color}35`,
                    borderRadius: 20, padding: '2px 8px',
                    fontSize: 9, fontWeight: 700, color,
                    fontFamily: 'ui-monospace,monospace',
                  }}>
                    {story.chapters.length} ch.
                  </div>
                </div>
                {/* Info */}
                <div style={{ padding: '14px 16px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 800, color: '#f1f5f9', margin: '0 0 4px', lineHeight: 1.3 }}>
                    {story.title}
                  </h3>
                  <div style={{ fontSize: 10, color, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.1em', marginBottom: 8 }}>
                    {story.genre.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569' }}>
                    Updated {date}
                  </div>
                </div>
                {/* Save button */}
                <div style={{ padding: '0 12px 12px' }}>
                  <button
                    onClick={e => { e.stopPropagation(); saveBondFile(story) }}
                    style={{
                      width: '100%', padding: '7px 0',
                      background: `${color}0a`, border: `1px solid ${color}20`,
                      borderRadius: 8, color: `${color}cc`,
                      fontSize: 10, fontWeight: 700, cursor: 'pointer',
                      fontFamily: 'inherit', letterSpacing: '0.05em',
                    }}>
                    💾 Save .bond file
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page Content ──────────────────────────────────────────────────────────────

function MyStoriesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const storyIdParam = searchParams.get('id') ?? searchParams.get('story')

  const [stories, setStories] = useState<BondStory[]>([])
  const [selected, setSelected] = useState<BondStory | null>(null)

  const refresh = useCallback(() => {
    setStories(loadBondStories())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-open story from URL param
  useEffect(() => {
    if (storyIdParam) {
      const s = getBondStory(storyIdParam)
      if (s) setSelected(s)
    }
  }, [storyIdParam])

  const handleSelect = (id: string) => {
    const s = getBondStory(id)
    if (s) {
      setSelected(s)
      router.replace(`/my-stories?id=${id}`, { scroll: false })
    }
  }

  const handleBack = () => {
    setSelected(null)
    router.replace('/my-stories', { scroll: false })
    refresh()
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg,#060310 0%,#0f0820 45%,#060310 100%)',
      padding: '32px 20px',
      fontFamily: 'system-ui,-apple-system,sans-serif',
      color: '#e2e8f0',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: 20, fontSize: 11, color: '#475569', fontFamily: 'ui-monospace,monospace',
          letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          <Link href="/" style={{ color: '#475569', textDecoration: 'none' }}>Home</Link>
          {' → '}
          <span style={{ color: '#ec4899' }}>My Stories</span>
          {selected && <> → <span style={{ color: '#f1f5f9' }}>{selected.title}</span></>}
        </div>

        {selected ? (
          <StoryDetail story={selected} onBack={handleBack} />
        ) : (
          <StoriesGrid stories={stories} onSelect={handleSelect} onRefresh={refresh} />
        )}
      </div>
    </main>
  )
}

export default function MyStoriesPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#060310', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading stories…</div>
      </div>
    }>
      <MyStoriesContent />
    </Suspense>
  )
}
