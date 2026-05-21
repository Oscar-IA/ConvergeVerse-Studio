'use client'

/**
 * MangaSfx — Onomatopoeia SVG library for ConvergeVerse manga panels.
 *
 * Deterministic, on-brand sound-effect typography. Each preset returns an
 * SVG element that can be dropped into a panel. No external font files
 * (uses system display fonts with text-stroke as a Photoshop-style outline).
 *
 * Accepts intensity 0–1 which scales the burst-rays and stroke width so the
 * same SFX can be used softly for ambient sound or loud for action peaks.
 *
 * Twelve presets cover the common shōnen / shōjo / seinen vocabulary:
 *
 *   BOOM   POW    BAM    CRASH    ZOOM    WHOOSH
 *   THUD   CLINK  SLASH  ZAP      SNAP    DOKI
 *
 * Each is purely SVG — animatable via SMIL or framer-motion at the
 * caller's discretion.
 */

import type { CSSProperties } from 'react'

export type SfxPreset =
  | 'BOOM' | 'POW' | 'BAM' | 'CRASH' | 'ZOOM' | 'WHOOSH'
  | 'THUD' | 'CLINK' | 'SLASH' | 'ZAP' | 'SNAP' | 'DOKI'

interface Props {
  preset: SfxPreset
  /** 0.5 → soft; 1.0 → standard; 1.5 → action peak. Default 1.0. */
  intensity?: number
  /** Override the displayed word. Defaults to the preset name. */
  text?: string
  /** Accent colour. Defaults are preset-specific. */
  color?: string
  /** Tilt angle in degrees. Default ±8° (preset-specific). */
  tilt?: number
  className?: string
  style?: CSSProperties
  /** Width of the SVG in CSS pixels (height auto). Default 220. */
  width?: number
}

interface Style {
  color: string
  outline: string
  tilt: number
  rays: number
  burst: 'star' | 'cloud' | 'jagged' | 'lightning' | 'flash' | 'none'
  font: string
}

const STYLES: Record<SfxPreset, Style> = {
  BOOM:   { color: '#ff5722', outline: '#fff7e0', tilt:  -6, rays: 18, burst: 'flash',    font: 'Impact, "Anton", sans-serif' },
  POW:    { color: '#ffd194', outline: '#0a0a0a', tilt:   8, rays: 14, burst: 'star',     font: 'Impact, sans-serif' },
  BAM:    { color: '#f59e0b', outline: '#0a0a0a', tilt:  -8, rays: 12, burst: 'star',     font: 'Impact, sans-serif' },
  CRASH:  { color: '#ec4899', outline: '#fffaf2', tilt:  -4, rays: 20, burst: 'jagged',   font: 'Impact, sans-serif' },
  ZOOM:   { color: '#22d3ee', outline: '#04080f', tilt: -12, rays: 10, burst: 'cloud',    font: 'Impact, sans-serif' },
  WHOOSH: { color: '#a855f7', outline: '#fff',    tilt: -14, rays:  8, burst: 'cloud',    font: 'Impact, sans-serif' },
  THUD:   { color: '#6b7280', outline: '#0a0a0a', tilt:   4, rays:  6, burst: 'cloud',    font: 'Impact, sans-serif' },
  CLINK:  { color: '#7fe9f5', outline: '#0a0a0a', tilt:  10, rays:  8, burst: 'flash',    font: 'Impact, sans-serif' },
  SLASH:  { color: '#fafafa', outline: '#0a0a0a', tilt: -18, rays:  4, burst: 'jagged',   font: 'Impact, sans-serif' },
  ZAP:    { color: '#facc15', outline: '#0a0a0a', tilt:   6, rays: 12, burst: 'lightning', font: 'Impact, sans-serif' },
  SNAP:   { color: '#fb7185', outline: '#0a0a0a', tilt:  10, rays:  6, burst: 'star',     font: 'Impact, sans-serif' },
  DOKI:   { color: '#f43f5e', outline: '#fff',    tilt:  -4, rays:  0, burst: 'none',     font: 'Impact, sans-serif' },
}

function burstShape(burst: Style['burst'], r: number, accent: string, intensity: number): string {
  if (burst === 'none' || r === 0) return ''
  let path = ''
  if (burst === 'star' || burst === 'flash') {
    const pts: string[] = []
    const arms = burst === 'flash' ? 16 : 10
    const outer = 130 * intensity
    const inner = burst === 'flash' ? outer * 0.7 : outer * 0.4
    for (let i = 0; i < arms * 2; i++) {
      const a = (i / (arms * 2)) * Math.PI * 2 - Math.PI / 2
      const rad = i % 2 === 0 ? outer : inner
      pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`)
    }
    path = `<polygon points="${pts.join(' ')}" fill="${accent}" fill-opacity="0.28" stroke="${accent}" stroke-width="${3 * intensity}" stroke-linejoin="miter"/>`
  } else if (burst === 'jagged') {
    const arms = 14
    const pts: string[] = []
    for (let i = 0; i < arms * 2; i++) {
      const a = (i / (arms * 2)) * Math.PI * 2 - Math.PI / 2
      const rad = i % 2 === 0 ? 130 * intensity : 50 * intensity
      pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`)
    }
    path = `<polygon points="${pts.join(' ')}" fill="${accent}" fill-opacity="0.22" stroke="${accent}" stroke-width="${2.5 * intensity}"/>`
  } else if (burst === 'cloud') {
    path = `<ellipse cx="0" cy="0" rx="${(120 * intensity).toFixed(1)}" ry="${(70 * intensity).toFixed(1)}" fill="${accent}" fill-opacity="0.18" stroke="${accent}" stroke-width="${2 * intensity}"/>`
  } else if (burst === 'lightning') {
    path = `<path d="M -60 -50 L -10 -10 L -30 0 L 40 60 L 0 10 L 20 0 L -20 -50 Z" fill="${accent}" fill-opacity="0.45" stroke="${accent}" stroke-width="${3 * intensity}" stroke-linejoin="miter"/>`
  }
  return path
}

export function MangaSfx({
  preset,
  intensity = 1,
  text,
  color,
  tilt,
  className,
  style,
  width = 220,
}: Props) {
  const s = STYLES[preset]
  const label = (text ?? preset).toUpperCase()
  const angle = tilt ?? s.tilt
  const accent = color ?? s.color
  const outline = s.outline
  const fontSize = 84 - Math.max(0, (label.length - 4) * 6)

  // Photoshop-style 4-layer outline: stroke offsets behind text
  const offsets = [
    [-3, -3], [3, -3], [-3, 3], [3, 3], [-4, 0], [4, 0], [0, -4], [0, 4],
  ]

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-160 -110 320 220"
      width={width}
      role="img"
      aria-label={`SFX ${label}`}
      className={className}
      style={style}
    >
      <g transform={`rotate(${angle})`}>
        {/* Burst behind the text */}
        <g dangerouslySetInnerHTML={{ __html: burstShape(s.burst, s.rays, accent, intensity) }} />
        {/* Outline halo via stroke-width on a duplicated text node */}
        <text
          x="0" y="0" textAnchor="middle" dominantBaseline="central"
          fontFamily={s.font}
          fontWeight="900"
          fontSize={fontSize}
          fill={outline}
          stroke={outline}
          strokeWidth={14 * intensity}
          paintOrder="stroke fill"
          letterSpacing="-0.04em"
        >{label}</text>
        {/* Offset shadow copies for depth */}
        {offsets.map(([dx, dy], i) => (
          <text
            key={i}
            x={dx} y={dy} textAnchor="middle" dominantBaseline="central"
            fontFamily={s.font} fontWeight="900" fontSize={fontSize}
            fill={outline} letterSpacing="-0.04em"
          >{label}</text>
        ))}
        {/* Fill text on top */}
        <text
          x="0" y="0" textAnchor="middle" dominantBaseline="central"
          fontFamily={s.font} fontWeight="900" fontSize={fontSize}
          fill={accent} letterSpacing="-0.04em"
        >{label}</text>
      </g>
    </svg>
  )
}

export const ALL_SFX_PRESETS: SfxPreset[] = [
  'BOOM', 'POW', 'BAM', 'CRASH', 'ZOOM', 'WHOOSH',
  'THUD', 'CLINK', 'SLASH', 'ZAP', 'SNAP', 'DOKI',
]
