'use client'
import { useState, useEffect } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type AnimeStyleInfo = {
  id: string
  name: string
  description: string
  genre_tags: string[]
  sample_keywords: string[]
  aspect_ratio: string
}

const GENRE_COLORS: Record<string, string> = {
  action: '#ef4444',
  adventure: '#f97316',
  fantasy: '#8b5cf6',
  dark_fantasy: '#6d28d9',
  horror: '#dc2626',
  children: '#22c55e',
  sci_fi: '#3b82f6',
  mecha: '#06b6d4',
  romance: '#ec4899',
  shonen: '#f59e0b',
  manhwa: '#a78bfa',
  supernatural: '#c084fc',
  comedy: '#84cc16',
  military: '#64748b',
  psychological: '#7c3aed',
  slice_of_life: '#34d399',
  drama: '#fb7185',
  pirate: '#fbbf24',
  isekai: '#818cf8',
  ninja: '#6b7280',
  historical: '#92400e',
  steampunk: '#a16207',
  dystopia: '#374151',
  thriller: '#7f1d1d',
  magical: '#f0abfc',
  dark: '#4b5563',
}

// Fallback styles if API is not available
const FALLBACK_STYLES: AnimeStyleInfo[] = [
  { id: 'solo_leveling', name: 'Solo Leveling', description: 'Korean dark fantasy manhwa with dramatic energy auras', genre_tags: ['dark_fantasy', 'action', 'manhwa'], sample_keywords: ['shadow monarch'], aspect_ratio: '2:3' },
  { id: 'jujutsu_kaisen', name: 'Jujutsu Kaisen', description: 'Cursed energy horror action manga', genre_tags: ['horror', 'action', 'supernatural'], sample_keywords: ['cursed energy'], aspect_ratio: '2:3' },
  { id: 'sword_art_online', name: 'Sword Art Online', description: 'Luminous VR isekai fantasy', genre_tags: ['isekai', 'fantasy', 'romance'], sample_keywords: ['virtual world'], aspect_ratio: '2:3' },
  { id: 'demon_slayer', name: 'Demon Slayer', description: 'Breathtaking watercolor breathing arts', genre_tags: ['dark_fantasy', 'action', 'historical'], sample_keywords: ['breathing technique'], aspect_ratio: '2:3' },
  { id: 'attack_on_titan', name: 'Attack on Titan', description: 'Gritty military dystopia manga', genre_tags: ['dark', 'military', 'horror'], sample_keywords: ['Titan'], aspect_ratio: '2:3' },
  { id: 'naruto', name: 'Naruto', description: 'Classic ninja chakra shonen', genre_tags: ['action', 'adventure', 'ninja'], sample_keywords: ['chakra jutsu'], aspect_ratio: '2:3' },
  { id: 'one_piece', name: 'One Piece', description: 'Bold pirate adventure comedy', genre_tags: ['adventure', 'comedy', 'pirate'], sample_keywords: ['Devil Fruit'], aspect_ratio: '2:3' },
  { id: 'fairy_tail', name: 'Fairy Tail', description: 'Colorful guild magic fantasy', genre_tags: ['fantasy', 'adventure', 'romance'], sample_keywords: ['guild magic'], aspect_ratio: '2:3' },
  { id: 'hunter_x_hunter', name: 'Hunter x Hunter', description: 'Strategic Nen ability battles', genre_tags: ['action', 'adventure', 'psychological'], sample_keywords: ['Nen ability'], aspect_ratio: '2:3' },
  { id: 'fullmetal_alchemist', name: 'Fullmetal Alchemist', description: 'Steampunk alchemy equivalent exchange', genre_tags: ['steampunk', 'dark_fantasy', 'drama'], sample_keywords: ['transmutation circle'], aspect_ratio: '2:3' },
  { id: 'bleach', name: 'BLEACH', description: 'Stylish Soul Reaper Zanpakuto battles', genre_tags: ['action', 'supernatural', 'shonen'], sample_keywords: ['Bankai'], aspect_ratio: '2:3' },
  { id: 'children_kawaii', name: 'Kawaii Kids Comics', description: 'Bright cheerful chibi style for children', genre_tags: ['children', 'comedy', 'magical'], sample_keywords: ['kawaii adventure'], aspect_ratio: '2:3' },
  { id: 'sci_fi_mecha', name: 'Mecha Sci-Fi', description: 'Epic mecha battles Gundam/EVA style', genre_tags: ['mecha', 'sci_fi', 'military'], sample_keywords: ['Mobile Suit'], aspect_ratio: '2:3' },
]

interface Props {
  value: string
  onChange: (styleId: string) => void
  compact?: boolean // Small inline version vs full grid
}

export function StyleSelector({ value, onChange, compact = false }: Props) {
  const [styles, setStyles] = useState<AnimeStyleInfo[]>(FALLBACK_STYLES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/api/story-engine/styles`)
      .then(r => r.json())
      .then(d => { if (d.styles?.length) setStyles(d.styles) })
      .catch(() => {}) // Use fallback on error
      .finally(() => setLoading(false))
  }, [])

  const ACCENT = '#ec4899'

  if (compact) {
    // Dropdown-style compact selector
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Estilo de Arte
        </label>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8, padding: '8px 12px', color: '#e2e8f0', fontSize: 14,
            cursor: 'pointer', outline: 'none',
          }}>
          {styles.map(s => (
            <option key={s.id} value={s.id} style={{ background: '#1a1a2e' }}>
              {s.name}
            </option>
          ))}
        </select>
        {value && styles.find(s => s.id === value) && (
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {styles.find(s => s.id === value)?.description}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 12 }}>
        Selecciona el estilo de arte para tus paneles
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: 10,
      }}>
        {styles.map(style => {
          const isSelected = value === style.id
          return (
            <button
              key={style.id}
              onClick={() => onChange(style.id)}
              style={{
                textAlign: 'left', padding: '12px 14px',
                background: isSelected ? 'rgba(236,72,153,0.12)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isSelected ? ACCENT : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12, cursor: 'pointer',
                boxShadow: isSelected ? `0 0 20px rgba(236,72,153,0.25)` : 'none',
                transition: 'all 0.2s',
                fontFamily: 'inherit',
              }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 13, marginBottom: 4 }}>
                {style.name}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8, lineHeight: 1.4 }}>
                {style.description}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {style.genre_tags.slice(0, 3).map(tag => (
                  <span key={tag} style={{
                    fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    background: `${GENRE_COLORS[tag] || '#64748b'}22`,
                    color: GENRE_COLORS[tag] || '#94a3b8',
                    border: `1px solid ${GENRE_COLORS[tag] || '#64748b'}44`,
                  }}>
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
