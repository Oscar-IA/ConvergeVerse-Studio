'use client'
import { useState, useRef, useCallback } from 'react'
import { DrawingCanvas } from './DrawingCanvas'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const ACCENT = '#ec4899'
const ACCENT2 = '#8b5cf6'

type Panel = {
  panel_number: number
  description: string
  dialogue?: string
  image_prompt: string
  image_url?: string | null
  composition?: string
  emotion?: string
}

type Character = {
  id: string
  name: string
  original_description: string
  manga_description: string
  role: string
}

type Story = {
  story_title: string
  genre: string
  characters: Character[]
  scene_description: string
  mood: string
  panels: Panel[]
  style_notes: string
  original_story_summary: string
}

type Phase = 'create' | 'analyzing' | 'result'

const ANALYSIS_STEPS = [
  'Detectando personajes…',
  'Entendiendo la escena…',
  'Creando la historia…',
  'Generando paneles manga…',
]

const glass = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(236,72,153,0.15)',
  borderRadius: 16,
  backdropFilter: 'blur(12px)',
} as React.CSSProperties

export function DrawingStudio({ locale = 'es' }: { locale?: string }) {
  const [phase, setPhase] = useState<Phase>('create')
  const [inputTab, setInputTab] = useState<'upload' | 'draw'>('upload')
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [story, setStory] = useState<Story | null>(null)
  const [panels, setPanels] = useState<Panel[]>([])
  const [analysisStep, setAnalysisStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [editingPanel, setEditingPanel] = useState<number | null>(null)
  const [generatingPanels, setGeneratingPanels] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingFile = useRef<File | Blob | null>(null)

  const triggerPanelImages = useCallback(async (panelList: Panel[], styleNotes: string) => {
    if (!panelList.length) return
    setGeneratingPanels(true)
    try {
      const res = await fetch(`${API_BASE}/api/story-engine/drawing/generate-panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panels: panelList, style_notes: styleNotes }),
      })
      if (res.ok) {
        const data = await res.json()
        setPanels(data.panels || [])
      }
    } catch {
      // Images are optional — panel text is still shown
    }
    setGeneratingPanels(false)
  }, [])

  const startAnalysis = useCallback(async (file: File | Blob) => {
    setPhase('analyzing')
    setAnalysisStep(0)
    setError(null)

    const stepInterval = setInterval(() => {
      setAnalysisStep(prev => {
        if (prev >= ANALYSIS_STEPS.length - 1) { clearInterval(stepInterval); return prev }
        return prev + 1
      })
    }, 1200)

    try {
      const form = new FormData()
      form.append('file', file, 'drawing.png')
      form.append('generate_images', 'false')
      form.append('language', locale)

      const res = await fetch(`${API_BASE}/api/story-engine/drawing/analyze`, {
        method: 'POST',
        body: form,
      })

      clearInterval(stepInterval)
      setAnalysisStep(ANALYSIS_STEPS.length - 1)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error((err as { detail?: string }).detail || 'Analysis failed')
      }

      const data = await res.json()
      setStory(data.story)
      const panelList: Panel[] = data.panels || data.story?.panels || []
      setPanels(panelList)
      setPhase('result')

      // Trigger panel image generation asynchronously
      void triggerPanelImages(panelList, data.story?.style_notes || 'professional manga style')
    } catch (err) {
      clearInterval(stepInterval)
      setError(String(err))
      setPhase('create')
    }
  }, [locale, triggerPanelImages])

  const handleFileSelected = (file: File) => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    pendingFile.current = file
  }

  const handleCanvasExport = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setPreview(url)
    pendingFile.current = blob
    setInputTab('upload')
  }

  const handleAnalyze = () => {
    if (pendingFile.current) void startAnalysis(pendingFile.current)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) handleFileSelected(file)
  }

  const resetAll = () => {
    setPhase('create')
    setPreview(null)
    setStory(null)
    setPanels([])
    pendingFile.current = null
    setInputTab('upload')
    setError(null)
  }

  // ── Phase: analyzing ────────────────────────────────────────────────────────
  if (phase === 'analyzing') return (
    <div style={{ ...glass, padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎨</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
        BOND Vision está analizando tu dibujo
      </div>
      <div style={{ color: '#94a3b8', marginBottom: 32, fontSize: 14 }}>
        Transformando tu creatividad en una historieta profesional…
      </div>
      {preview && (
        <img
          src={preview}
          alt="Tu dibujo"
          style={{ maxHeight: 200, borderRadius: 12, marginBottom: 24, objectFit: 'contain', maxWidth: '100%' }}
        />
      )}
      <div style={{ maxWidth: 320, margin: '0 auto' }}>
        {ANALYSIS_STEPS.map((step, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
            color: i <= analysisStep ? '#fff' : '#475569',
            transition: 'color 0.4s',
          }}>
            <span style={{ fontSize: 18, minWidth: 24 }}>
              {i < analysisStep ? '✅' : i === analysisStep ? '⏳' : '○'}
            </span>
            <span style={{ fontSize: 14 }}>{step}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 24, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, maxWidth: 320, margin: '24px auto 0' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT2})`,
          width: `${((analysisStep + 1) / ANALYSIS_STEPS.length) * 100}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )

  // ── Phase: result ───────────────────────────────────────────────────────────
  if (phase === 'result' && story) return (
    <div style={{ ...glass, padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', color: ACCENT, textTransform: 'uppercase', marginBottom: 4 }}>
            {story.genre} · {story.mood}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: 0, textTransform: 'none', letterSpacing: 'normal' }}>
            {story.story_title}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {generatingPanels && (
            <span style={{ fontSize: 12, color: ACCENT, padding: '6px 12px', background: `${ACCENT}11`, borderRadius: 8 }}>
              ⏳ Generando imágenes…
            </span>
          )}
          <button onClick={resetAll}
            style={{
              padding: '8px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: '#94a3b8', cursor: 'pointer', fontSize: 13,
              fontFamily: 'inherit', textTransform: 'none',
            }}>
            🔙 Crear Otra
          </button>
        </div>
      </div>

      {/* Original story summary */}
      <div style={{
        background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.2)',
        borderRadius: 10, padding: '12px 16px', marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, color: ACCENT, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
          Lo que tu dibujo nos contó
        </div>
        <div style={{ fontSize: 14, color: '#e2e8f0' }}>{story.original_story_summary}</div>
      </div>

      {/* Characters */}
      {story.characters.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
            Personajes
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {story.characters.map(c => (
              <div key={c.id} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10, padding: '12px 14px',
              }}>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', marginBottom: 2 }}>Tu dibujo</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{c.original_description}</div>
                <div style={{ fontSize: 11, color: ACCENT, textTransform: 'uppercase', marginBottom: 2 }}>Versión manga</div>
                <div style={{ fontSize: 12, color: '#e2e8f0' }}>{c.manga_description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panels grid */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Paneles
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {panels.map((panel, idx) => (
            <div key={idx} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12, overflow: 'hidden',
            }}>
              {/* Panel image */}
              <div style={{ aspectRatio: '2/3', background: 'rgba(0,0,0,0.3)', position: 'relative', overflow: 'hidden' }}>
                {panel.image_url ? (
                  <img
                    src={panel.image_url}
                    alt={`Panel ${panel.panel_number}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    height: '100%', color: '#475569', flexDirection: 'column', gap: 8,
                  }}>
                    {generatingPanels
                      ? <><div style={{ fontSize: 24 }}>🎨</div><div style={{ fontSize: 12 }}>Generando…</div></>
                      : <><div style={{ fontSize: 24 }}>🖼️</div><div style={{ fontSize: 12 }}>Panel {panel.panel_number}</div></>
                    }
                  </div>
                )}
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(0,0,0,0.7)', borderRadius: 6,
                  padding: '2px 8px', fontSize: 11, color: '#e2e8f0',
                }}>
                  {panel.panel_number}
                </div>
              </div>

              {/* Panel info */}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6 }}>{panel.description}</div>
                {editingPanel === idx ? (
                  <textarea
                    autoFocus
                    defaultValue={panel.dialogue || ''}
                    onBlur={e => {
                      setPanels(prev => prev.map((p, i) => i === idx ? { ...p, dialogue: e.target.value } : p))
                      setEditingPanel(null)
                    }}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.08)',
                      border: `1px solid rgba(236,72,153,0.3)`, borderRadius: 6,
                      padding: '6px 8px', color: '#fff', fontSize: 13,
                      resize: 'none', minHeight: 60, fontFamily: 'inherit',
                    }}
                  />
                ) : (
                  <div
                    style={{ fontSize: 13, color: '#e2e8f0', cursor: 'pointer', minHeight: 24 }}
                    onClick={() => setEditingPanel(idx)}
                    title="Clic para editar diálogo"
                  >
                    {panel.dialogue
                      ? panel.dialogue
                      : <span style={{ color: '#475569', fontStyle: 'italic' }}>Clic para añadir diálogo…</span>
                    }
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          onClick={() => story && void triggerPanelImages(panels, story.style_notes)}
          disabled={generatingPanels}
          style={{
            padding: '10px 20px', borderRadius: 10,
            background: generatingPanels ? 'rgba(255,255,255,0.1)' : `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`,
            border: 'none', color: '#fff', cursor: generatingPanels ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: 14, fontFamily: 'inherit', textTransform: 'none',
          }}>
          🔄 Regenerar Imágenes
        </button>
      </div>
    </div>
  )

  // ── Phase: create ───────────────────────────────────────────────────────────
  return (
    <div style={{ ...glass, padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{
          fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 4px',
          textTransform: 'none', letterSpacing: 'normal',
        }}>
          🎨 Drawing Studio
        </h3>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>
          Sube una foto de tu dibujo o dibuja aquí — BOND Vision lo convierte en una historieta profesional
        </p>
      </div>

      {error && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16,
        }}>
          ❌ {error}
        </div>
      )}

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 4,
        width: 'fit-content',
      }}>
        {(['upload', 'draw'] as const).map(tab => (
          <button key={tab} onClick={() => setInputTab(tab)}
            style={{
              padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit', textTransform: 'none',
              background: inputTab === tab ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})` : 'transparent',
              color: inputTab === tab ? '#fff' : '#94a3b8',
            }}>
            {tab === 'upload' ? '📷 Subir Foto' : '🎨 Dibujar Aquí'}
          </button>
        ))}
      </div>

      {/* Upload tab */}
      {inputTab === 'upload' && (
        <div>
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? ACCENT : 'rgba(236,72,153,0.3)'}`,
              borderRadius: 16, padding: '32px 24px', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s',
              background: dragOver ? `${ACCENT}08` : 'rgba(255,255,255,0.02)',
              marginBottom: 16,
            }}>
            {preview ? (
              <img
                src={preview}
                alt="Vista previa"
                style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 8, objectFit: 'contain' }}
              />
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🖼️</div>
                <div style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>
                  Arrastra tu dibujo aquí
                </div>
                <div style={{ color: '#64748b', fontSize: 13 }}>
                  o haz clic para seleccionar · JPG, PNG, WebP
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelected(f) }}
          />
        </div>
      )}

      {/* Draw tab */}
      {inputTab === 'draw' && (
        <DrawingCanvas onExport={handleCanvasExport} />
      )}

      {/* Analyze button — shown when file is ready */}
      {(preview || (inputTab === 'draw' && pendingFile.current)) && (
        <button
          onClick={handleAnalyze}
          disabled={!pendingFile.current}
          style={{
            marginTop: 16, padding: '14px 28px', borderRadius: 12, width: '100%',
            background: pendingFile.current
              ? `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`
              : 'rgba(255,255,255,0.1)',
            border: 'none', color: '#fff',
            cursor: pendingFile.current ? 'pointer' : 'not-allowed',
            fontWeight: 700, fontSize: 16, letterSpacing: '0.02em',
            boxShadow: pendingFile.current ? `0 4px 24px ${ACCENT}44` : 'none',
            fontFamily: 'inherit', textTransform: 'none',
          }}>
          🪄 Convertir en Historieta Profesional
        </button>
      )}
    </div>
  )
}
