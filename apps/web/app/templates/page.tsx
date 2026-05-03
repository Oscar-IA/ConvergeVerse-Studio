'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Template Data ─────────────────────────────────────────────────────────────

interface AnimeTemplate {
  id: string
  name: string
  genre: string
  icon: string
  accentColor: string
  episodes: number
  arcs: string[]
  description: string
  worldType: string
  protagonist: string
  antagonist: string
  themes: string[]
  structure: string[]
  samplePrompt: string
  inspirations: string[]
}

const TEMPLATES: AnimeTemplate[] = [
  {
    id: 'shonen_battle',
    name: 'Shōnen Battle Epic',
    genre: 'Shōnen / Acción',
    icon: '⚡',
    accentColor: '#f97316',
    episodes: 52,
    arcs: ['Despertar del Poder', 'Torneo del Destino', 'Arco del Antagonista', 'Guerra Final', 'Epílogo'],
    description: 'El clásico viaje del héroe con poderes únicos, entrenamiento, amistades forjadas en batalla y un destino épico. Inspirado en los grandes del género.',
    worldType: 'Mundo con sistema de poderes (aura, chakra, energía mística)',
    protagonist: 'Joven ordinario con poder oculto extraordinario. Determinación inquebrantable.',
    antagonist: 'Figura poderosa con filosofía opuesta. Pasado trágico que justifica sus acciones.',
    themes: ['Superación personal', 'Amistad y lealtad', 'Propósito vs. Poder', 'Sacrificio', 'El ciclo del odio'],
    structure: [
      'Eps 1–2: Mundo ordinario + incidente detonante',
      'Eps 3–6: Descubrimiento del poder, primer mentor',
      'Eps 7–13: Primer arco — prueba inicial, comrades',
      'Eps 14–26: Torneo / misión de escala media',
      'Eps 27–39: Revelación del antagonista principal',
      'Eps 40–50: Confrontación final épica',
      'Eps 51–52: Resolución + epílogo emocional',
    ],
    samplePrompt: 'Un adolescente sin poderes en un mundo donde todos los tienen descubre que su "vacío" es en realidad el poder más temido: absorber y neutralizar cualquier energía. El ejército del Imperio lo quiere muerto.',
    inspirations: ['Naruto', 'My Hero Academia', 'Bleach', 'Black Clover'],
  },
  {
    id: 'dark_fantasy_manhwa',
    name: 'Dark Fantasy — Solo Leveling Style',
    genre: 'Dark Fantasy / Manhwa',
    icon: '🌑',
    accentColor: '#6366f1',
    episodes: 26,
    arcs: ['El Despertar', 'La Ascensión', 'La Sombra del Monarca', 'La Guerra de los Reyes'],
    description: 'Protagonista inicialmente débil que asciende a un poder sin igual. Dungeons, Hunters, gates dimensionales y la amenaza del apocalipsis.',
    worldType: 'Tierra moderna con dungeons (puertas dimensionales) y hunters con poderes',
    protagonist: 'El más débil de todos — su poder único se revela gradualmente. Fría determinación.',
    antagonist: 'Entidades de otro mundo. Monarcas interdimensionales con poder inimaginable.',
    themes: ['Ascensión desde el fondo', 'Soledad del poder extremo', 'Proteger a los débiles', 'El precio de la fuerza'],
    structure: [
      'Eps 1–3: E-rank Hunter, el mundo de los gates',
      'Eps 4–6: Incidente en dungeon — near-death experience',
      'Eps 7–10: Sistema de misiones solo, poder creciente',
      'Eps 11–15: Reconocimiento del mundo, S-rank revelation',
      'Eps 16–21: Antagonista mayor aparece, stakes globales',
      'Eps 22–26: Confrontación con el Monarca — escala épica',
    ],
    samplePrompt: 'El "Hunter más débil del mundo" sobrevive imposiblemente a una mazmorra de clase S. Al despertar, un sistema de misiones invisible sólo visible para él le otorga poderes que escalan sin límite. Los Monarcas de las sombras lo notan.',
    inspirations: ['Solo Leveling', 'The Beginning After the End', 'Omniscient Reader'],
  },
  {
    id: 'isekai_adventure',
    name: 'Isekai — Otro Mundo',
    genre: 'Isekai / Aventura',
    icon: '🌀',
    accentColor: '#8b5cf6',
    episodes: 26,
    arcs: ['Llegada al Nuevo Mundo', 'Forjando Alianzas', 'El Destino del Invocado', 'La Amenaza del Maou'],
    description: 'Protagonista transportado a un mundo de fantasía con conocimiento del mundo moderno como ventaja única. Construcción de reino, magia y sistemas de niveles.',
    worldType: 'Reino de fantasía medieval con magia, clases y sistema de stats',
    protagonist: 'Joven con habilidades del mundo moderno (tecnología, conocimiento). Hábil estratega.',
    antagonist: 'Demon Lord / Calamidad antigua / Sistema corrompido del nuevo mundo.',
    themes: ['Adaptación e ingenio', 'Responsabilidad del poder', 'Pertenecer a dos mundos', 'Cambiar el destino'],
    structure: [
      'Eps 1–2: Invocación — choque cultural inicial',
      'Eps 3–5: Aprendizaje del mundo, primer compañero',
      'Eps 6–10: Misiones, construir reputación y party',
      'Eps 11–16: Descubrir el propósito de la invocación',
      'Eps 17–22: Conflicto con el sistema del mundo',
      'Eps 23–26: Enfrentar la amenaza mayor — decisión final',
    ],
    samplePrompt: 'Un desarrollador de videojuegos muere y renace como NPC de bajo nivel en el mundo de su propio juego — uno que diseñó pero nunca terminó. Conoce el código del mundo mejor que nadie, pero el juego tiene sus propias reglas que él rompió.',
    inspirations: ['Overlord', 'Re:Zero', 'Konosuba', 'Shield Hero'],
  },
  {
    id: 'psychological_thriller',
    name: 'Thriller Psicológico',
    genre: 'Psicológico / Suspense',
    icon: '🔪',
    accentColor: '#dc2626',
    episodes: 24,
    arcs: ['El Primer Movimiento', 'Cat and Mouse', 'El Sistema Se Quiebra', 'Jaque Mate'],
    description: 'Duelo intelectual entre dos genios con moralidades opuestas. Tensión psicológica, giros narrativos y cuestionamiento de la justicia.',
    worldType: 'Mundo contemporáneo con elementos de thriller criminal',
    protagonist: 'Genio con poder sobrenatural o intelectual extraordinario. Código moral propio.',
    antagonist: 'Investigador o figura de orden igual de brillante. El antagonista puede ser el "héroe".',
    themes: ['¿Qué es la justicia?', 'El fin justifica los medios', 'Hubris del genio', 'Sistemas corruptos'],
    structure: [
      'Eps 1–2: Establecer el poder del protagonista',
      'Eps 3–6: Los crímenes/actos comienzan — impacto social',
      'Eps 7–12: Aparece el nemesis — primer duelo intelectual',
      'Eps 13–17: Escalada — uno tiene ventaja, luego el otro',
      'Eps 18–22: Crisis — el sistema entra en juego',
      'Eps 23–24: Resolución — uno cae, el otro paga el precio',
    ],
    samplePrompt: 'Un estudiante brillante encuentra un cuaderno que mata a cualquier persona cuyo nombre escriba en él. Decide "limpiar" el mundo. Un detective prodigio anónimo lo identifica en 72 horas. Comienza el juego más peligroso.',
    inspirations: ['Death Note', 'Code Geass', 'Erased', 'Classroom of the Elite'],
  },
  {
    id: 'mecha_scifi',
    name: 'Mecha Sci-Fi',
    genre: 'Mecha / Ciencia Ficción',
    icon: '🤖',
    accentColor: '#06b6d4',
    episodes: 26,
    arcs: ['Primer Contacto con el Mecha', 'La Facción Opuesta', 'El Secreto de la Guerra', 'La Batalla Final Orbital'],
    description: 'Pilotos jóvenes en mechas gigantes defienden la humanidad. Conspiración militar, traumas de guerra y el costo humano del conflicto.',
    worldType: 'Futuro cercano — guerra entre facciones humanas o contra invasores extraterrestres',
    protagonist: 'Piloto con incompatibilidad perfecta con el mecha — conexión misteriosa. PTSD realista.',
    antagonist: 'El sistema militar mismo. + Antagonista personal con historia compartida.',
    themes: ['El costo de la guerra', 'Humanidad de los enemigos', 'Quién decide vivir o morir', 'Tecnología vs. Humanidad'],
    structure: [
      'Eps 1–3: La base, el mecha, la primera misión caótica',
      'Eps 4–8: Entrenamiento, camaradería de escuadrón',
      'Eps 9–13: Primera gran batalla — bajas reales',
      'Eps 14–19: Descubrir que el enemigo son humanos también',
      'Eps 20–23: Conspiración militar revelada',
      'Eps 24–26: Sacrificio y resolución — fin de la guerra',
    ],
    samplePrompt: 'La humanidad perdió el 40% de la Tierra ante entidades llamadas "Sombras". Un adolescente con síndrome de estrés post-traumático descubre que puede sintonizar el EVA de clase Ω — el único capaz de combatir al "Ángel Negro" que ningún pilot sobrevivió.',
    inspirations: ['Neon Genesis Evangelion', 'Gundam', 'Darling in the FranXX', 'Aldnoah.Zero'],
  },
  {
    id: 'slice_romance',
    name: 'Slice of Life + Romance',
    genre: 'Slice of Life / Romance',
    icon: '🌸',
    accentColor: '#ec4899',
    episodes: 13,
    arcs: ['El Encuentro', 'Acercamiento', 'Confesión', 'Resolución'],
    description: 'Historia íntima de personajes complejos construyendo una conexión auténtica. Énfasis en el detalle cotidiano, crecimiento personal y emociones genuinas.',
    worldType: 'Japón contemporáneo — escuela, barrio, trabajo, o entorno especial (pueblo costero, academia de arte)',
    protagonist: 'Personaje con herida emocional interna. Crece a través de la conexión con otros.',
    antagonist: 'Los miedos internos. Los malentendidos. El tiempo y la distancia.',
    themes: ['Sanar el pasado', 'Vulnerabilidad y fortaleza', 'El valor de los momentos pequeños', 'Crecer juntos'],
    structure: [
      'Eps 1–2: Mundo cotidiano — punto de encuentro casual',
      'Eps 3–4: Desarrollo de la amistad, personalidades',
      'Eps 5–7: Momento de conexión profunda — química clara',
      'Eps 8–9: Conflicto externo o malentendido emocional',
      'Eps 10–11: Distancia dolorosa — reflexión individual',
      'Eps 12–13: Resolución honesta — confesión o cierre',
    ],
    samplePrompt: 'Una pianista con parálisis escénica después de un accidente en su debut. Un fotógrafo que solo toma fotos de lugares vacíos, jamás de personas. Se cruzan en una residencia artística de verano donde todos están "reparándose".',
    inspirations: ['Your Lie in April', 'Toradora', 'Clannad', 'Fruits Basket'],
  },
  {
    id: 'demon_hunter',
    name: 'Cazador de Demonios',
    genre: 'Dark Fantasy / Sobrenatural',
    icon: '🗡️',
    accentColor: '#f43f5e',
    episodes: 26,
    arcs: ['La Iniciación', 'El Primer Gran Demonio', 'La Orden y sus Secretos', 'La Guerra de los Rangos'],
    description: 'El mundo oculto de cazadores que combaten demonios mientras mantienen la apariencia de normalidad. Técnicas de respiración, artes marciales y transformaciones demoníacas.',
    worldType: 'Japón de era Meiji / contemporáneo con demonios ocultos (o era victoriana)',
    protagonist: 'Joven con trauma personal que lo motiva. Determinación de acero. Habilidad innata + trabajo duro.',
    antagonist: 'El Demonio Supremo y sus Doce Lunas — cada uno con poderes únicos y personalidades complejas.',
    themes: ['Venganza vs. Paz', 'Humanidad en los monstruos', 'El sacrificio familiar', 'Límites del cuerpo humano'],
    structure: [
      'Eps 1–3: Tragedia personal, encuentro con el mentor',
      'Eps 4–7: Entrenamiento brutal, dominio de la técnica base',
      'Eps 8–12: Primera misión real — primer demonio de rango',
      'Eps 13–16: La Organización Cazadora — aliados y rivales',
      'Eps 17–22: Los demonio superiores — bajas emocionales',
      'Eps 23–26: Confrontación con el demonio que causó el trauma',
    ],
    samplePrompt: 'Una hermana mayor sobrevive a la masacre de su aldea por una entidad que convierte humanos en demonios. Con su hermano menor atrapado a medio camino entre humano y demonio, se convierte en Cazadora para encontrar la cura y la venganza.',
    inspirations: ['Demon Slayer', 'Jujutsu Kaisen', 'Dororo', 'Chainsaw Man'],
  },
  {
    id: 'fantasy_kingdom',
    name: 'Construcción de Reino',
    genre: 'Fantasy / Political',
    icon: '👑',
    accentColor: '#d97706',
    episodes: 39,
    arcs: ['El Exilado', 'La Alianza', 'La Primera Guerra', 'El Trono', 'La Era de Paz'],
    description: 'Política de fantasía medieval, construcción de ejércitos y civilizaciones, magia de alto nivel y el peso de gobernar. Múltiples facciones con motivaciones complejas.',
    worldType: 'Continente de fantasía con múltiples reinos, magia sistematizada y conflictos históricos',
    protagonist: 'Príncipe desterrado / noble caído / forastero con conocimiento moderno. Liderazgo emergente.',
    antagonist: 'Imperio expansionista. Nobleza corrupta. Amenaza supernatural que ningún reino puede enfrentar solo.',
    themes: ['El poder de las alianzas', 'Reforma vs. Tradición', 'El bien del pueblo sobre el del líder', 'Civilizaciones en conflicto'],
    structure: [
      'Eps 1–4: La caída del protagonista — exilio o punto cero',
      'Eps 5–10: Construir desde nada — primera alianza clave',
      'Eps 11–18: Primer conflicto territorial — táctica y magia',
      'Eps 19–26: El Imperio actúa — crisis existencial del proyecto',
      'Eps 27–34: La Gran Coalición — múltiples facciones unidas',
      'Eps 35–39: Batalla decisiva + establecer el nuevo orden',
    ],
    samplePrompt: 'El décimo príncipe, considerado inútil por no tener magia, es enviado a gobernar un territorio fronterizo devastado. Con conocimiento del mundo moderno y un grimorio de "ciencias olvidadas", construye el estado más avanzado del continente.',
    inspirations: ['Overlord', 'Re:Zero', 'The Rising of the Shield Hero', 'Maoyuu Maou Yuusha'],
  },
]

// ── Components ────────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: 16,
  backdropFilter: 'blur(12px)',
}

function TemplateCard({
  template,
  onSelect,
  selected,
}: {
  template: AnimeTemplate
  onSelect: (t: AnimeTemplate) => void
  selected: boolean
}) {
  return (
    <button
      onClick={() => onSelect(template)}
      style={{
        width: '100%', textAlign: 'left',
        padding: '18px 20px', cursor: 'pointer',
        ...glass,
        border: `1px solid ${selected ? template.accentColor + '50' : 'rgba(255,255,255,0.09)'}`,
        background: selected ? `${template.accentColor}0C` : 'rgba(255,255,255,0.04)',
        boxShadow: selected ? `0 0 24px ${template.accentColor}18` : 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 28, flexShrink: 0 }}>{template.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>{template.name}</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '2px 7px', borderRadius: 4,
              background: `${template.accentColor}18`, color: template.accentColor,
              border: `1px solid ${template.accentColor}30`,
            }}>
              {template.episodes} eps
            </span>
          </div>
          <div style={{ fontSize: 11, color: template.accentColor, marginBottom: 4, fontWeight: 600 }}>
            {template.genre}
          </div>
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            {template.description.slice(0, 100)}…
          </div>
        </div>
      </div>
    </button>
  )
}

function TemplateDetail({ template }: { template: AnimeTemplate }) {
  const [copied, setCopied] = useState(false)

  const copyPrompt = () => {
    navigator.clipboard.writeText(template.samplePrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ ...glass, padding: '24px 28px', position: 'sticky', top: 80 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 14, flexShrink: 0,
          background: `${template.accentColor}14`,
          border: `1px solid ${template.accentColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26,
        }}>
          {template.icon}
        </div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'inherit' }}>
            {template.name}
          </h2>
          <div style={{ fontSize: 11, color: template.accentColor, marginTop: 2 }}>{template.genre}</div>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 18 }}>
        {template.description}
      </p>

      {/* Info grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {[
          ['🌍 Mundo', template.worldType],
          ['🎭 Protagonista', template.protagonist],
          ['😈 Antagonista', template.antagonist],
          ['📺 Episodios', `${template.episodes} eps · ${Math.ceil(template.episodes / 13)} cour`],
        ].map(([label, value]) => (
          <div key={label as string} style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
          }}>
            <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>{label as string}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{value as string}</div>
          </div>
        ))}
      </div>

      {/* Themes */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
          Temas Centrales
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {template.themes.map(theme => (
            <span key={theme} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: `${template.accentColor}10`, color: template.accentColor,
              border: `1px solid ${template.accentColor}25`,
            }}>
              {theme}
            </span>
          ))}
        </div>
      </div>

      {/* Structure */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
          Estructura Narrativa
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {template.structure.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: `${template.accentColor}18`, color: template.accentColor,
                fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i + 1}
              </span>
              <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Arcs */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
          Arcos Narrativos
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {template.arcs.map((arc, i) => (
            <span key={arc} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', color: '#64748b',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {i + 1}. {arc}
            </span>
          ))}
        </div>
      </div>

      {/* Inspirations */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
          Inspiraciones
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {template.inspirations.map(insp => (
            <span key={insp} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(255,255,255,0.04)', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              {insp}
            </span>
          ))}
        </div>
      </div>

      {/* Sample prompt */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase' }}>
            Prompt de Inicio
          </div>
          <button
            onClick={copyPrompt}
            style={{
              fontSize: 10, padding: '3px 10px', borderRadius: 6, cursor: 'pointer',
              background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: copied ? '#4ade80' : '#64748b', fontFamily: 'inherit',
            }}
          >
            {copied ? '✓ Copiado' : 'Copiar'}
          </button>
        </div>
        <div style={{
          padding: '12px 14px',
          background: 'rgba(0,0,0,0.3)',
          border: `1px solid ${template.accentColor}20`,
          borderRadius: 8,
          fontSize: 12, color: '#94a3b8', lineHeight: 1.7,
          fontStyle: 'italic',
        }}>
          "{template.samplePrompt}"
        </div>
      </div>

      {/* CTA */}
      <Link
        href={`/story-engine?template=${template.id}&prompt=${encodeURIComponent(template.samplePrompt)}`}
        style={{
          display: 'block', textAlign: 'center',
          padding: '13px 0',
          background: `${template.accentColor}18`,
          border: `1px solid ${template.accentColor}40`,
          borderRadius: 10,
          color: template.accentColor,
          fontSize: 12, fontWeight: 700,
          letterSpacing: '0.1em', textTransform: 'uppercase',
          textDecoration: 'none',
          transition: 'all 0.2s',
        }}
      >
        ✨ Usar este Template en Story Engine
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TemplatesPage() {
  const [selected, setSelected] = useState<AnimeTemplate>(TEMPLATES[0])
  const [search, setSearch] = useState('')
  const [genreFilter, setGenreFilter] = useState('')

  const genres = Array.from(new Set(TEMPLATES.map(t => t.genre.split(' / ')[0])))

  const filtered = TEMPLATES.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      t.themes.some(th => th.toLowerCase().includes(search.toLowerCase()))
    const matchGenre = !genreFilter || t.genre.includes(genreFilter)
    return matchSearch && matchGenre
  })

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #070510 0%, #0f0820 40%, #070510 100%)',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '28px 20px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 9, letterSpacing: '0.4em', color: 'rgba(236,72,153,0.6)', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'ui-monospace,monospace' }}>
            BOND Studios · ConvergeVerse
          </div>
          <h1 style={{
            fontSize: 'clamp(1.5rem,4vw,2.5rem)', fontWeight: 900,
            color: '#fff', margin: 0, letterSpacing: '-0.01em',
            fontFamily: 'system-ui,sans-serif',
          }}>
            🌸 Anime Templates
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            Plantillas profesionales de estructuras narrativas para anime. Selecciona, personaliza y genera con el Story Engine.
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', fontSize: 13,
              outline: 'none', fontFamily: 'inherit', width: 240,
            }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar template…"
          />
          <select
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: '8px 14px', color: '#e2e8f0', fontSize: 13,
              outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
            }}
            value={genreFilter} onChange={e => setGenreFilter(e.target.value)}
          >
            <option value="">Todos los géneros</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center' }}>
            {filtered.length} template{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px,420px) 1fr', gap: 24, alignItems: 'flex-start' }}>

          {/* Template list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                onSelect={setSelected}
                selected={selected.id === t.id}
              />
            ))}
          </div>

          {/* Detail panel */}
          <TemplateDetail template={selected} />

        </div>
      </div>
    </main>
  )
}
