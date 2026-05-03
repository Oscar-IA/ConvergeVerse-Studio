'use client'

import { useState } from 'react'
import Link from 'next/link'

// ── Template Data (unchanged IDs, genres, structure, samplePrompt) ────────────

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
    description: 'El clásico viaje del héroe con poderes únicos, entrenamiento, amistades forjadas en batalla y un destino épico.',
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
  },
  {
    id: 'dark_fantasy_manhwa',
    name: 'Dark Fantasy — Manhwa Style',
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
  },
  {
    id: 'isekai_adventure',
    name: 'Isekai — Otro Mundo',
    genre: 'Isekai / Aventura',
    icon: '🌀',
    accentColor: '#8b5cf6',
    episodes: 26,
    arcs: ['Llegada al Nuevo Mundo', 'Forjando Alianzas', 'El Destino del Invocado', 'La Amenaza del Maou'],
    description: 'Protagonista transportado a un mundo de fantasía con conocimiento del mundo moderno como ventaja única.',
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
  },
  {
    id: 'psychological_thriller',
    name: 'Thriller Psicológico',
    genre: 'Psicológico / Suspense',
    icon: '🔪',
    accentColor: '#dc2626',
    episodes: 24,
    arcs: ['El Primer Movimiento', 'Cat and Mouse', 'El Sistema Se Quiebra', 'Jaque Mate'],
    description: 'Duelo intelectual entre dos genios con moralidades opuestas. Tensión psicológica y giros narrativos.',
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
    samplePrompt: 'Un estudiante brillante descubre que puede ver los crímenes futuros de cualquier persona con solo tocarla. Decide actuar antes de que ocurran. Un detective prodigio sin identidad conocida lo rastrea en 72 horas. Comienza el juego más peligroso.',
  },
  {
    id: 'mecha_scifi',
    name: 'Mecha Sci-Fi',
    genre: 'Mecha / Ciencia Ficción',
    icon: '🤖',
    accentColor: '#06b6d4',
    episodes: 26,
    arcs: ['Primer Contacto con el Mecha', 'La Facción Opuesta', 'El Secreto de la Guerra', 'La Batalla Final Orbital'],
    description: 'Pilotos jóvenes en mechas gigantes defienden la humanidad. Conspiración militar y el costo humano del conflicto.',
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
    samplePrompt: 'La humanidad perdió el 40% de la Tierra ante entidades llamadas "Sombras". Un adolescente con trastorno de estrés post-traumático descubre que puede pilotar el Colossus Omega — el único mecha capaz de combatir a la entidad de clase Extinción.',
  },
  {
    id: 'slice_romance',
    name: 'Slice of Life + Romance',
    genre: 'Slice of Life / Romance',
    icon: '🌸',
    accentColor: '#ec4899',
    episodes: 13,
    arcs: ['El Encuentro', 'Acercamiento', 'Confesión', 'Resolución'],
    description: 'Historia íntima de personajes complejos construyendo una conexión auténtica. Énfasis en el detalle cotidiano.',
    worldType: 'Japón contemporáneo — escuela, barrio, trabajo, o entorno especial',
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
  },
  {
    id: 'demon_hunter',
    name: 'Cazador de Demonios',
    genre: 'Dark Fantasy / Sobrenatural',
    icon: '🗡️',
    accentColor: '#f43f5e',
    episodes: 26,
    arcs: ['La Iniciación', 'El Primer Gran Demonio', 'La Orden y sus Secretos', 'La Guerra de los Rangos'],
    description: 'El mundo oculto de cazadores que combaten demonios. Técnicas de respiración y transformaciones demoníacas.',
    worldType: 'Japón de era Meiji / contemporáneo con demonios ocultos',
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
  },
  {
    id: 'fantasy_kingdom',
    name: 'Construcción de Reino',
    genre: 'Fantasy / Political',
    icon: '👑',
    accentColor: '#d97706',
    episodes: 39,
    arcs: ['El Exilado', 'La Alianza', 'La Primera Guerra', 'El Trono', 'La Era de Paz'],
    description: 'Política de fantasía medieval, construcción de ejércitos y civilizaciones, magia de alto nivel.',
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
  },
]

// ── ComicPreview SVG ──────────────────────────────────────────────────────────

function ComicPreview({
  accentColor,
  icon,
  genre,
}: {
  accentColor: string
  icon: string
  genre: string
}) {
  // Genre-appropriate action words
  const genreEffects: Record<string, string[]> = {
    'Shōnen': ['⚡', '💥', '🔥'],
    'Dark Fantasy': ['💀', '🌑', '⚫'],
    'Isekai': ['✨', '🌀', '💫'],
    'Psicológico': ['🔪', '🧠', '👁'],
    'Mecha': ['🤖', '💥', '⚙️'],
    'Slice of Life': ['🌸', '💕', '🍃'],
    'Fantasy': ['👑', '⚔️', '🏰'],
    default: ['✨', '💫', '⚡'],
  }
  const genreKey = Object.keys(genreEffects).find(k => genre.includes(k)) ?? 'default'
  const [fx1, fx2] = genreEffects[genreKey]

  return (
    <svg
      viewBox="0 0 320 240"
      style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 10 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width="320" height="240" fill="#0a0a14" rx="10" />

      {/* Panel borders */}
      {/* Panel 1 — tall left */}
      <rect x="6" y="6" width="120" height="228" fill={`${accentColor}15`} rx="4" stroke={accentColor} strokeWidth="2.5" />
      {/* Panel 2 — top right */}
      <rect x="134" y="6" width="180" height="110" fill={`${accentColor}0d`} rx="4" stroke={accentColor} strokeWidth="2" />
      {/* Panel 3 — wide middle */}
      <rect x="134" y="124" width="180" height="52" fill={`${accentColor}0a`} rx="4" stroke={accentColor} strokeWidth="2" />
      {/* Panel 4 — bottom left small */}
      <rect x="134" y="184" width="84" height="50" fill={`${accentColor}0d`} rx="4" stroke={accentColor} strokeWidth="2" />
      {/* Panel 5 — bottom right small */}
      <rect x="226" y="184" width="88" height="50" fill={`${accentColor}0d`} rx="4" stroke={accentColor} strokeWidth="2" />

      {/* Panel 1 — gradient fill + icon */}
      <defs>
        <radialGradient id={`pg1-${accentColor.replace('#','')}`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0.02" />
        </radialGradient>
        <radialGradient id={`pg2-${accentColor.replace('#','')}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0a0a14" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x="6" y="6" width="120" height="228" fill={`url(#pg1-${accentColor.replace('#','')})`} rx="4" />
      <rect x="134" y="6" width="180" height="110" fill={`url(#pg2-${accentColor.replace('#','')})`} rx="4" />

      {/* Halftone dots on panel 1 */}
      {Array.from({ length: 6 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <circle
            key={`dot-${row}-${col}`}
            cx={20 + col * 28}
            cy={20 + row * 38}
            r="2.5"
            fill={accentColor}
            opacity="0.15"
          />
        ))
      )}

      {/* Big icon on panel 1 */}
      <text x="66" y="130" textAnchor="middle" fontSize="52" fill="white" opacity="0.9">{icon}</text>

      {/* Action lines (speed effect) on panel 2 */}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`line-${i}`}
          x1={220 + i * 8}
          y1="10"
          x2={180 + i * 10}
          y2="112"
          stroke={accentColor}
          strokeWidth="1"
          opacity="0.2"
        />
      ))}

      {/* Effect text on panel 2 */}
      <text x="224" y="68" textAnchor="middle" fontSize="32" fill={accentColor} opacity="0.9"
        style={{ fontWeight: 900 }}>{fx1}</text>

      {/* Panel 3 — wide — dialog bubble */}
      <rect x="148" y="134" width="120" height="30" fill="white" rx="6" opacity="0.08" />
      <text x="208" y="148" textAnchor="middle" fontSize="10" fill={accentColor} opacity="0.9"
        fontFamily="sans-serif" fontWeight="700">¡EPISODIO 1!</text>
      <text x="208" y="162" textAnchor="middle" fontSize="10" fill="white" opacity="0.5"
        fontFamily="sans-serif">comienza aquí</text>

      {/* Panel 4 */}
      <text x="176" y="216" textAnchor="middle" fontSize="20" fill="white" opacity="0.7">{fx2}</text>

      {/* Panel 5 — ep count */}
      <rect x="230" y="190" width="78" height="38" fill={`${accentColor}20`} rx="4" />
      <text x="269" y="205" textAnchor="middle" fontSize="9" fill={accentColor} fontWeight="700"
        fontFamily="monospace">EPS</text>

      {/* Comic border shine */}
      <rect x="6" y="6" width="308" height="228" fill="none" rx="10"
        stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
    </svg>
  )
}

// ── TemplatePreviewCard ───────────────────────────────────────────────────────

function TemplatePreviewCard({
  template,
  onSelect,
  selected,
}: {
  template: AnimeTemplate
  onSelect: (t: AnimeTemplate) => void
  selected: boolean
}) {
  const [hov, setHov] = useState(false)

  return (
    <button
      onClick={() => onSelect(template)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: 0, outline: 'none',
        background: selected
          ? `${template.accentColor}14`
          : hov ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)',
        border: `2px solid ${selected ? template.accentColor + '60' : hov ? template.accentColor + '30' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: 16,
        boxShadow: selected ? `0 0 30px ${template.accentColor}20` : hov ? `0 4px 20px ${template.accentColor}10` : 'none',
        transition: 'all 0.2s',
        fontFamily: 'inherit',
        overflow: 'hidden',
      }}
    >
      {/* SVG comic preview */}
      <div style={{ borderRadius: '14px 14px 0 0', overflow: 'hidden' }}>
        <ComicPreview accentColor={template.accentColor} icon={template.icon} genre={template.genre} />
      </div>

      {/* Info row */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 24 }}>{template.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.2 }}>
            {template.name}
          </div>
          <div style={{ fontSize: 10, color: template.accentColor, fontWeight: 600, marginTop: 2 }}>
            {template.genre}
          </div>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
          padding: '2px 8px', borderRadius: 6,
          background: `${template.accentColor}20`, color: template.accentColor,
          border: `1px solid ${template.accentColor}30`,
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}>
          {template.episodes} eps
        </span>
      </div>
    </button>
  )
}

// ── TemplateDetail ────────────────────────────────────────────────────────────

function TemplateDetail({ template }: { template: AnimeTemplate }) {
  const [copied, setCopied] = useState(false)

  const copyPrompt = () => {
    navigator.clipboard.writeText(template.samplePrompt).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: 20,
      backdropFilter: 'blur(12px)',
      overflow: 'hidden',
      position: 'sticky',
      top: 80,
    }}>
      {/* Large comic preview at top */}
      <div style={{
        background: `linear-gradient(180deg, ${template.accentColor}18 0%, transparent 100%)`,
        padding: '20px 20px 0',
        borderBottom: `1px solid ${template.accentColor}20`,
      }}>
        <ComicPreview accentColor={template.accentColor} icon={template.icon} genre={template.genre} />
      </div>

      <div style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `${template.accentColor}18`,
            border: `2px solid ${template.accentColor}40`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>
            {template.icon}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>
              {template.name}
            </h2>
            <div style={{ fontSize: 11, color: template.accentColor, marginTop: 2, fontWeight: 600 }}>
              {template.genre}
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 18 }}>
          {template.description}
        </p>

        {/* Arcs — visual row */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase', marginBottom: 8 }}>
            Arcos de la Historia
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {template.arcs.map((arc, i) => (
              <span key={arc} style={{
                fontSize: 11, padding: '4px 10px', borderRadius: 8,
                background: `${template.accentColor}14`, color: template.accentColor,
                border: `1px solid ${template.accentColor}30`,
                fontWeight: 600,
              }}>
                {i + 1}. {arc}
              </span>
            ))}
          </div>
        </div>

        {/* Info grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {[
            ['🌍 Mundo', template.worldType],
            ['🎭 Protagonista', template.protagonist],
            ['😈 Antagonista', template.antagonist],
            ['📺 Episodios', `${template.episodes} eps · ${Math.ceil(template.episodes / 13)} cour`],
          ].map(([label, value]) => (
            <div key={label} style={{
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10,
            }}>
              <div style={{ fontSize: 10, color: '#475569', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>{value}</div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {template.structure.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                  background: `${template.accentColor}20`, color: template.accentColor,
                  fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sample prompt */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#475569', textTransform: 'uppercase' }}>
              Prompt de Inicio
            </div>
            <button
              onClick={copyPrompt}
              style={{
                fontSize: 10, padding: '4px 12px', borderRadius: 8, cursor: 'pointer',
                background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                color: copied ? '#4ade80' : '#64748b', fontFamily: 'inherit',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copiado!' : '📋 Copiar'}
            </button>
          </div>
          <div style={{
            padding: '14px 16px',
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${template.accentColor}20`,
            borderRadius: 12,
            fontSize: 12, color: '#94a3b8', lineHeight: 1.7,
            fontStyle: 'italic',
          }}>
            &ldquo;{template.samplePrompt}&rdquo;
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/story-engine?template=${template.id}&prompt=${encodeURIComponent(template.samplePrompt)}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '14px 0',
            background: `linear-gradient(135deg, ${template.accentColor} 0%, ${template.accentColor}cc 100%)`,
            borderRadius: 12,
            color: '#fff',
            fontSize: 14, fontWeight: 800,
            textDecoration: 'none',
            boxShadow: `0 4px 20px ${template.accentColor}30`,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 8px 30px ${template.accentColor}50`
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = `0 4px 20px ${template.accentColor}30`
          }}
        >
          <span style={{ fontSize: 20 }}>{template.icon}</span>
          ¡Usar este Template!
        </Link>
      </div>
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
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
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
          }}>
            🌸 Plantillas de Anime
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            Elige el estilo de tu historia — ¡haz clic en cualquier plantilla para verla en detalle!
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '9px 14px', color: '#e2e8f0', fontSize: 13,
              outline: 'none', fontFamily: 'inherit', width: 240,
            }}
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar plantilla…"
          />
          <select
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 10, padding: '9px 14px', color: '#e2e8f0', fontSize: 13,
              outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
            }}
            value={genreFilter} onChange={e => setGenreFilter(e.target.value)}
          >
            <option value="">Todos los géneros</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center' }}>
            {filtered.length} plantilla{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Two-column layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,380px) 1fr', gap: 24, alignItems: 'flex-start' }}>

          {/* Template grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            {filtered.map(t => (
              <TemplatePreviewCard
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
