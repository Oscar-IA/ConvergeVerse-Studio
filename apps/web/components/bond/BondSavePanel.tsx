'use client'

import { useState, useRef } from 'react'
import { saveBondFile, parseBondFile, autoSaveBondStory } from '@/lib/bondSave'
import type { BondStory } from '@/lib/bondSave'

interface BondSavePanelProps {
  story: Partial<BondStory>
  onLoad?: (story: BondStory) => void
}

export function BondSavePanel({ story, onLoad }: BondSavePanelProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [loadError, setLoadError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = () => {
    try {
      const full: BondStory = {
        id: story.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: story.title ?? 'Mi Historia',
        genre: story.genre ?? '',
        cover_emoji: story.cover_emoji ?? '✨',
        template_id: story.template_id,
        prompt: story.prompt ?? '',
        chapters: story.chapters ?? [],
        createdAt: story.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
      }
      saveBondFile(full)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 4000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // ── Auto-save (no download) ─────────────────────────────────────────────────

  const handleAutoSave = () => {
    try {
      const full: BondStory = {
        id: story.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: story.title ?? 'Mi Historia',
        genre: story.genre ?? '',
        cover_emoji: story.cover_emoji ?? '✨',
        template_id: story.template_id,
        prompt: story.prompt ?? '',
        chapters: story.chapters ?? [],
        createdAt: story.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1.0',
      }
      autoSaveBondStory(full)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // ── Load .bond file ────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadError('')

    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const parsed = parseBondFile(content)
      if (!parsed) {
        setLoadError('Archivo inválido — asegúrate de cargar un archivo .bond')
        return
      }
      onLoad?.(parsed)
    }
    reader.onerror = () => setLoadError('No se pudo leer el archivo.')
    reader.readAsText(file)

    // Reset file input so the same file can be loaded again
    e.target.value = ''
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 16,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Save buttons row */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {/* Download .bond */}
        <button
          onClick={handleSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            borderRadius: 12, cursor: 'pointer',
            background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
            border: 'none', color: '#fff',
            fontSize: 14, fontWeight: 700,
            fontFamily: 'inherit',
            boxShadow: '0 4px 15px rgba(236,72,153,0.3)',
            transition: 'transform 0.15s, box-shadow 0.15s',
            minHeight: 48,
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(236,72,153,0.4)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(236,72,153,0.3)'
          }}
        >
          <span style={{ fontSize: 20 }}>💾</span>
          Guardar mi Historia
        </button>

        {/* Auto-save only (no download) */}
        <button
          onClick={handleAutoSave}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            borderRadius: 12, cursor: 'pointer',
            background: 'rgba(99,102,241,0.15)',
            border: '1px solid rgba(99,102,241,0.35)',
            color: '#a5b4fc',
            fontSize: 14, fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            minHeight: 48,
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.25)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)'
          }}
        >
          <span style={{ fontSize: 18 }}>☁️</span>
          Guardar borrador
        </button>

        {/* Load .bond file */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 20px',
            borderRadius: 12, cursor: 'pointer',
            background: 'rgba(56,189,248,0.1)',
            border: '1px solid rgba(56,189,248,0.3)',
            color: '#7dd3fc',
            fontSize: 14, fontWeight: 600,
            fontFamily: 'inherit',
            transition: 'all 0.15s',
            minHeight: 48,
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.2)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(56,189,248,0.1)'
          }}
        >
          <span style={{ fontSize: 18 }}>📂</span>
          Cargar Historia .bond
        </button>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".bond,.json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Status messages */}
      {saveStatus === 'saved' && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(74,222,128,0.1)',
          border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: 10,
          color: '#86efac',
          fontSize: 13, fontWeight: 500,
          animation: 'bond-pop-in 0.3s ease',
        }}>
          ✅ ¡Historia guardada! Puedes encontrarla en &apos;Mis Historias&apos;
        </div>
      )}

      {saveStatus === 'error' && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: 10,
          color: '#fca5a5',
          fontSize: 13,
        }}>
          ❌ No se pudo guardar. Intenta de nuevo.
        </div>
      )}

      {loadError && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 10,
          color: '#fde68a',
          fontSize: 13,
        }}>
          ⚠️ {loadError}
        </div>
      )}
    </div>
  )
}
