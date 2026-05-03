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

// ── ComicPreview SVG — unique art style per template ─────────────────────────

function ComicPreview({ templateId }: { templateId: string }) {
  switch (templateId) {

    // ── SHŌNEN BATTLE — bold black ink, orange fire, speed lines ─────────────
    case 'shonen_battle':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#0d0800" />
          {/* Speed lines from center-right */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * Math.PI * 2
            return <line key={i} x1="240" y1="120" x2={240 + Math.cos(angle) * 160} y2={120 + Math.sin(angle) * 160} stroke="#f97316" strokeWidth={i % 3 === 0 ? 1.5 : 0.5} opacity={i % 3 === 0 ? 0.6 : 0.2} />
          })}
          {/* Panel 1 — tall left, black ink */}
          <rect x="4" y="4" width="130" height="232" fill="#080500" rx="2" stroke="#f97316" strokeWidth="3" />
          {/* Fighter silhouette */}
          <ellipse cx="69" cy="90" rx="22" ry="28" fill="#1a0800" stroke="#f97316" strokeWidth="2" />
          <rect x="57" y="115" width="24" height="60" fill="#1a0800" rx="4" stroke="#f97316" strokeWidth="2" />
          {/* Fist extended right */}
          <ellipse cx="115" cy="118" rx="18" ry="14" fill="#f97316" opacity="0.9" />
          <ellipse cx="115" cy="118" rx="10" ry="8" fill="#fff8" />
          {/* Impact burst */}
          {[0,45,90,135,180,225,270,315].map((a,i) => (
            <line key={i} x1="115" y1="118" x2={115+Math.cos(a*Math.PI/180)*28} y2={118+Math.sin(a*Math.PI/180)*28} stroke="#fff" strokeWidth="2" opacity="0.8" />
          ))}
          {/* Panel 2 — top right */}
          <rect x="142" y="4" width="174" height="112" fill="#0a0500" rx="2" stroke="#f97316" strokeWidth="2.5" />
          {/* Bold FIGHT text */}
          <text x="229" y="58" textAnchor="middle" fontSize="36" fill="#f97316" fontWeight="900" fontFamily="sans-serif" letterSpacing="-2">FIGHT!</text>
          <text x="229" y="58" textAnchor="middle" fontSize="36" fill="none" stroke="#fff" strokeWidth="1" fontWeight="900" fontFamily="sans-serif" letterSpacing="-2" opacity="0.3">FIGHT!</text>
          {/* Halftone dots bottom of panel 2 */}
          {Array.from({length:3}).map((_,r) => Array.from({length:8}).map((_,c) => (
            <circle key={`${r}-${c}`} cx={152+c*22} cy={90+r*10} r="2" fill="#f97316" opacity="0.25" />
          )))}
          {/* Panel 3 — wide middle */}
          <rect x="142" y="124" width="174" height="56" fill="#0a0500" rx="2" stroke="#f97316" strokeWidth="2" />
          <text x="229" y="147" textAnchor="middle" fontSize="10" fill="#fff" fontFamily="sans-serif" fontWeight="700">¡El poder oculto despierta!</text>
          <text x="229" y="163" textAnchor="middle" fontSize="9" fill="#f97316" fontFamily="sans-serif">52 episodios · Shōnen</text>
          {/* Panel 4 — bottom left */}
          <rect x="142" y="188" width="80" height="48" fill="#0a0500" rx="2" stroke="#f97316" strokeWidth="2" />
          <text x="182" y="218" textAnchor="middle" fontSize="28" fill="#f97316">⚡</text>
          {/* Panel 5 — bottom right */}
          <rect x="230" y="188" width="86" height="48" fill="#1a0800" rx="2" stroke="#f97316" strokeWidth="2" />
          <text x="273" y="210" textAnchor="middle" fontSize="9" fill="#f97316" fontWeight="700" fontFamily="monospace">POW!</text>
          <text x="273" y="228" textAnchor="middle" fontSize="9" fill="#fff6" fontFamily="monospace">¡Combate!</text>
          <rect width="320" height="240" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        </svg>
      )

    // ── DARK FANTASY MANHWA — cold noir, shadows, minimal color ──────────────
    case 'dark_fantasy_manhwa':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="mw-glow" cx="50%" cy="40%" r="50%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="mw-shadow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#050510" />
              <stop offset="100%" stopColor="#0d0d20" />
            </linearGradient>
          </defs>
          <rect width="320" height="240" fill="url(#mw-shadow)" />
          {/* Tall single panel — manhwa vertical style */}
          <rect x="4" y="4" width="312" height="232" fill="#06060f" rx="3" stroke="#6366f1" strokeWidth="2" />
          {/* Sky with cold gradient */}
          <rect x="4" y="4" width="312" height="130" fill="url(#mw-glow)" />
          {/* Shadow figure — solo hunter */}
          <ellipse cx="160" cy="148" rx="16" ry="20" fill="#000" stroke="#6366f1" strokeWidth="1.5" opacity="0.9" />
          <rect x="150" y="165" width="20" height="50" fill="#000" rx="3" stroke="#6366f1" strokeWidth="1.5" />
          {/* Aura rings */}
          {[30, 50, 72].map((r, i) => (
            <ellipse key={i} cx="160" cy="175" rx={r} ry={r * 0.35} fill="none" stroke="#6366f1" strokeWidth={1.5 - i * 0.4} opacity={0.6 - i * 0.15} strokeDasharray="4 3" />
          ))}
          {/* Shadow army below */}
          {Array.from({length:9}).map((_,i) => (
            <g key={i}>
              <ellipse cx={60+i*23} cy={210} rx={6} ry={8} fill="#6366f1" opacity={0.12+i*0.03} />
              <rect x={57+i*23} y={217} width={6} height={12} fill="#6366f1" opacity={0.1+i*0.02} rx={1} />
            </g>
          ))}
          {/* Particle dust */}
          {Array.from({length:30}).map((_,i) => (
            <circle key={i} cx={20+i*10+(i%3)*5} cy={30+i*6} r={1} fill="#818cf8" opacity={0.08+Math.random()*0.2} />
          ))}
          {/* Title panel — horizontal stripe at top */}
          <rect x="4" y="4" width="312" height="36" fill="rgba(0,0,0,0.7)" />
          <text x="160" y="24" textAnchor="middle" fontSize="13" fill="#818cf8" fontWeight="900" fontFamily="sans-serif" letterSpacing="3">DARK FANTASY</text>
          <text x="160" y="36" textAnchor="middle" fontSize="8" fill="#6366f155" fontFamily="monospace" letterSpacing="6">MANHWA STYLE</text>
          {/* Bottom text */}
          <rect x="4" y="208" width="312" height="28" fill="rgba(0,0,0,0.75)" />
          <text x="160" y="222" textAnchor="middle" fontSize="9" fill="#6366f1" fontFamily="sans-serif">El más débil asciende al poder absoluto</text>
          <text x="160" y="234" textAnchor="middle" fontSize="8" fill="#ffffff44" fontFamily="monospace">26 episodios · 4 arcos</text>
          <rect width="320" height="240" fill="none" stroke="#6366f130" strokeWidth="2" />
        </svg>
      )

    // ── ISEKAI ADVENTURE — purple portal, magical sparkles, vivid contrast ────
    case 'isekai_adventure':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="isk-portal" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#7c3aed" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#1e0a3c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="isk-world" cx="50%" cy="60%" r="60%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0a0a1a" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="240" fill="#0a0616" />
          {/* World below — green hills */}
          <ellipse cx="160" cy="260" rx="200" ry="80" fill="#10b981" opacity="0.15" />
          <ellipse cx="80" cy="240" rx="120" ry="50" fill="#22d3ee" opacity="0.08" />
          {/* Portal swirl rings */}
          {[70, 56, 42, 28, 14].map((r, i) => (
            <ellipse key={i} cx="160" cy="110" rx={r} ry={r * 0.55}
              fill={i === 0 ? 'none' : 'none'}
              stroke={i % 2 === 0 ? '#a855f7' : '#7c3aed'}
              strokeWidth={2 - i * 0.3}
              opacity={0.8 - i * 0.1}
              strokeDasharray={i > 0 ? `${i * 4} ${i * 2}` : undefined}
            />
          ))}
          <ellipse cx="160" cy="110" rx="70" ry="38" fill="url(#isk-portal)" />
          {/* Sparkles */}
          {[[40,50],[280,70],[60,180],[290,160],[150,30],[200,200],[100,130],[250,130]].map(([x,y],i) => (
            <g key={i}>
              <line x1={x} y1={y-8} x2={x} y2={y+8} stroke="#f0abfc" strokeWidth="1.5" opacity="0.7" />
              <line x1={x-8} y1={y} x2={x+8} y2={y} stroke="#f0abfc" strokeWidth="1.5" opacity="0.7" />
              <circle cx={x} cy={y} r="2" fill="#fff" opacity="0.9" />
            </g>
          ))}
          {/* Falling figure into portal */}
          <ellipse cx="160" cy="95" rx="8" ry="10" fill="#c4b5fd" opacity="0.9" />
          <rect x="155" y="104" width="10" height="18" fill="#c4b5fd" opacity="0.7" rx="3" />
          {/* Panel grid — 3 small panels bottom */}
          <rect x="4" y="175" width="96" height="61" fill="#0e0820" rx="3" stroke="#8b5cf6" strokeWidth="2" />
          <rect x="108" y="175" width="96" height="61" fill="#0e0820" rx="3" stroke="#8b5cf6" strokeWidth="2" />
          <rect x="212" y="175" width="104" height="61" fill="#0e0820" rx="3" stroke="#8b5cf6" strokeWidth="2" />
          <text x="52" y="210" textAnchor="middle" fontSize="18" fill="#a855f7">🌀</text>
          <text x="156" y="207" textAnchor="middle" fontSize="8" fill="#c4b5fd" fontFamily="sans-serif">Otro mundo</text>
          <text x="156" y="220" textAnchor="middle" fontSize="7" fill="#8b5cf677" fontFamily="sans-serif">espera…</text>
          <text x="264" y="207" textAnchor="middle" fontSize="8" fill="#c4b5fd" fontFamily="monospace">26 eps</text>
          <text x="264" y="220" textAnchor="middle" fontSize="7" fill="#a855f7" fontFamily="monospace">Isekai</text>
          {/* Title overlay */}
          <rect x="4" y="4" width="312" height="30" fill="rgba(10,6,22,0.8)" />
          <text x="160" y="22" textAnchor="middle" fontSize="12" fill="#c4b5fd" fontWeight="800" fontFamily="sans-serif" letterSpacing="2">✨ ISEKAI — OTRO MUNDO ✨</text>
        </svg>
      )

    // ── PSYCHOLOGICAL THRILLER — pure B&W + single red accent, high contrast ──
    case 'psychological_thriller':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#030303" />
          {/* Cross-hatch texture fill */}
          {Array.from({length:14}).map((_,i) => (
            <line key={`h${i}`} x1="0" y1={i*17} x2="320" y2={i*17} stroke="#1a1a1a" strokeWidth="0.5" />
          ))}
          {Array.from({length:22}).map((_,i) => (
            <line key={`v${i}`} x1={i*15} y1="0" x2={i*15} y2="240" stroke="#111" strokeWidth="0.5" />
          ))}
          {/* LARGE eye panel — center top */}
          <rect x="4" y="4" width="312" height="120" fill="#050505" rx="2" stroke="#fff" strokeWidth="3" />
          {/* Eye whites */}
          <ellipse cx="160" cy="64" rx="90" ry="40" fill="#0a0a0a" stroke="#fff" strokeWidth="2.5" />
          <ellipse cx="160" cy="64" rx="70" ry="30" fill="#101010" />
          {/* Iris */}
          <circle cx="160" cy="64" r="22" fill="#1a1a1a" stroke="#fff" strokeWidth="1.5" />
          <circle cx="160" cy="64" r="14" fill="#0d0d0d" />
          {/* Pupil — RED */}
          <circle cx="160" cy="64" r="8" fill="#dc2626" />
          <circle cx="163" cy="61" r="3" fill="#fff" opacity="0.8" />
          {/* Reflection lines in eye */}
          {Array.from({length:8}).map((_,i) => (
            <line key={i} x1={135+i*7} y1="44" x2={133+i*7} y2="84" stroke="#fff" strokeWidth="0.4" opacity="0.15" />
          ))}
          {/* 3 bottom panels */}
          <rect x="4" y="132" width="100" height="104" fill="#060606" rx="2" stroke="#fff" strokeWidth="2.5" />
          <rect x="112" y="132" width="96" height="104" fill="#060606" rx="2" stroke="#fff" strokeWidth="2.5" />
          <rect x="216" y="132" width="100" height="104" fill="#060606" rx="2" stroke="#fff" strokeWidth="2.5" />
          {/* Panel 4 — notebook + RED pen */}
          <rect x="20" y="148" width="68" height="70" fill="#0c0c0c" stroke="#333" strokeWidth="1" />
          {Array.from({length:6}).map((_,i) => (
            <line key={i} x1="24" y1={158+i*10} x2="84" y2={158+i*10} stroke="#333" strokeWidth="0.7" />
          ))}
          <line x1="32" y1="148" x2="32" y2="218" stroke="#dc262640" strokeWidth="1.5" />
          {/* Red writing on notebook */}
          <text x="40" y="165" fontSize="7" fill="#dc2626" fontFamily="monospace">DAY 1...</text>
          <text x="40" y="177" fontSize="7" fill="#dc2626" fontFamily="monospace">TARGET</text>
          <text x="40" y="189" fontSize="7" fill="#dc2626" fontFamily="monospace">FOUND</text>
          {/* Panel 5 — chess piece */}
          <rect x="134" y="170" width="52" height="50" fill="#0d0d0d" stroke="#2a2a2a" strokeWidth="0.5" />
          <ellipse cx="160" cy="190" rx="14" ry="6" fill="#222" stroke="#fff" strokeWidth="1" />
          <rect x="155" y="170" width="10" height="20" fill="#1a1a1a" stroke="#fff" strokeWidth="1" />
          <circle cx="160" cy="166" r="7" fill="#1a1a1a" stroke="#fff" strokeWidth="1.5" />
          {/* Panel 6 — quote */}
          <text x="266" y="185" textAnchor="middle" fontSize="9" fill="#fff" fontFamily="sans-serif" fontStyle="italic">&ldquo;72 horas.</text>
          <text x="266" y="198" textAnchor="middle" fontSize="9" fill="#fff" fontFamily="sans-serif" fontStyle="italic">El juego</text>
          <text x="266" y="211" textAnchor="middle" fontSize="9" fill="#fff" fontFamily="sans-serif" fontStyle="italic">comienza.&rdquo;</text>
          <text x="266" y="228" textAnchor="middle" fontSize="8" fill="#dc2626" fontFamily="monospace">24 eps</text>
          <rect width="320" height="240" fill="none" stroke="#ffffff15" strokeWidth="1" />
        </svg>
      )

    // ── MECHA SCI-FI — cold cyan blueprint, circuit patterns, hard geometry ───
    case 'mecha_scifi':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mch-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#030d14" />
              <stop offset="100%" stopColor="#05131f" />
            </linearGradient>
          </defs>
          <rect width="320" height="240" fill="url(#mch-bg)" />
          {/* Blueprint grid */}
          {Array.from({length:16}).map((_,i) => (
            <line key={`h${i}`} x1="0" y1={i*15} x2="320" y2={i*15} stroke="#06b6d4" strokeWidth="0.3" opacity="0.2" />
          ))}
          {Array.from({length:22}).map((_,i) => (
            <line key={`v${i}`} x1={i*15} y1="0" x2={i*15} y2="240" stroke="#06b6d4" strokeWidth="0.3" opacity="0.2" />
          ))}
          {/* Mecha frame — angular geometric */}
          {/* Body */}
          <polygon points="130,80 190,80 210,110 200,170 120,170 110,110" fill="#051520" stroke="#06b6d4" strokeWidth="2" />
          {/* Head */}
          <rect x="145" y="48" width="30" height="34" fill="#051520" rx="2" stroke="#06b6d4" strokeWidth="2" />
          {/* Visor — glowing */}
          <rect x="150" y="56" width="20" height="8" fill="#06b6d4" rx="1" opacity="0.9" />
          <rect x="150" y="56" width="20" height="8" fill="#22d3ee" rx="1" opacity="0.3" />
          {/* Shoulder armor */}
          <polygon points="108,90 130,85 130,115 105,115" fill="#051520" stroke="#06b6d4" strokeWidth="1.5" />
          <polygon points="190,85 212,90 215,115 190,115" fill="#051520" stroke="#06b6d4" strokeWidth="1.5" />
          {/* Legs */}
          <rect x="125" y="168" width="22" height="44" fill="#051520" stroke="#06b6d4" strokeWidth="1.5" rx="1" />
          <rect x="173" y="168" width="22" height="44" fill="#051520" stroke="#06b6d4" strokeWidth="1.5" rx="1" />
          {/* Feet */}
          <rect x="115" y="210" width="38" height="12" fill="#051520" stroke="#06b6d4" strokeWidth="1.5" rx="2" />
          <rect x="167" y="210" width="38" height="12" fill="#051520" stroke="#06b6d4" strokeWidth="1.5" rx="2" />
          {/* Circuit lines on body */}
          <path d="M145 100 L140 108 L150 108" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
          <path d="M175 100 L180 108 L170 108" fill="none" stroke="#06b6d4" strokeWidth="1" opacity="0.6" />
          <circle cx="160" cy="125" r="8" fill="none" stroke="#06b6d4" strokeWidth="1.5" />
          <circle cx="160" cy="125" r="3" fill="#06b6d4" opacity="0.8" />
          {/* Energy blast from arm */}
          {[0,15,-15,25,-25].map((a,i) => (
            <line key={i} x1="215" y1="110" x2={215+60+i*5} y2={110+Math.tan(a*Math.PI/180)*60} stroke="#06b6d4" strokeWidth={2-i*0.3} opacity={0.9-i*0.15} />
          ))}
          <circle cx="280" cy="110" r="12" fill="#06b6d4" opacity="0.3" />
          <circle cx="280" cy="110" r="6" fill="#22d3ee" opacity="0.7" />
          {/* HUD panel — top right */}
          <rect x="230" y="8" width="86" height="52" fill="#030d14" rx="2" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="273" y="24" textAnchor="middle" fontSize="8" fill="#06b6d4" fontFamily="monospace" letterSpacing="1">BOND-Ω-001</text>
          <text x="273" y="36" textAnchor="middle" fontSize="7" fill="#22d3ee88" fontFamily="monospace">UNIT: ACTIVE</text>
          <text x="273" y="48" textAnchor="middle" fontSize="7" fill="#06b6d4" fontFamily="monospace">PWR: ████░</text>
          {/* HUD panel — bottom left */}
          <rect x="4" y="8" width="86" height="52" fill="#030d14" rx="2" stroke="#06b6d4" strokeWidth="1.5" />
          <text x="47" y="28" textAnchor="middle" fontSize="10" fill="#06b6d4" fontFamily="monospace">MECHA</text>
          <text x="47" y="42" textAnchor="middle" fontSize="8" fill="#06b6d422" fontFamily="monospace">SCI-FI</text>
          <text x="47" y="54" textAnchor="middle" fontSize="7" fill="#06b6d4" fontFamily="monospace">26 EPS</text>
          <rect width="320" height="240" fill="none" stroke="#06b6d420" strokeWidth="2" />
        </svg>
      )

    // ── SLICE OF LIFE + ROMANCE — soft watercolor, petals, warm pastel ────────
    case 'slice_romance':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="sl-sky" cx="50%" cy="0%" r="80%">
              <stop offset="0%" stopColor="#fdf4f9" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0f0818" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="sl-sun" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0f0818" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="240" fill="#0f0818" />
          <rect width="320" height="240" fill="url(#sl-sky)" />
          {/* Soft bokeh circles */}
          {[[40,60,30],[280,40,22],[60,180,18],[300,200,26],[160,30,35],[200,170,20],[100,100,15]].map(([x,y,r],i) => (
            <circle key={i} cx={x} cy={y} r={r} fill="#ec4899" opacity={0.04+i*0.01} />
          ))}
          {/* Main panel — soft border */}
          <rect x="4" y="4" width="312" height="232" fill="rgba(255,245,250,0.02)" rx="12" stroke="#ec4899" strokeWidth="1.5" strokeDasharray="8 3" />
          {/* Two figures side by side — silhouettes */}
          <ellipse cx="138" cy="148" rx="14" ry="18" fill="#1a0d18" stroke="#ec4899" strokeWidth="1.5" opacity="0.9" />
          <rect x="127" y="163" width="22" height="48" fill="#1a0d18" rx="4" stroke="#ec4899" strokeWidth="1.5" />
          <ellipse cx="182" cy="148" rx="14" ry="18" fill="#1a0d18" stroke="#ec4899" strokeWidth="1.5" opacity="0.9" />
          <rect x="171" y="163" width="22" height="48" fill="#1a0d18" rx="4" stroke="#ec4899" strokeWidth="1.5" />
          {/* Holding hands */}
          <line x1="149" y1="188" x2="171" y2="188" stroke="#ec4899" strokeWidth="2" />
          <circle cx="152" cy="188" r="4" fill="#ec4899" opacity="0.7" />
          <circle cx="168" cy="188" r="4" fill="#ec4899" opacity="0.7" />
          {/* Cherry blossoms */}
          {[[55,55],[85,35],[250,45],[290,75],[30,150],[305,150],[160,20],[220,25],[45,210],[275,220]].map(([x,y],i) => (
            <g key={i} transform={`translate(${x},${y}) rotate(${i*37})`}>
              <circle cx="0" cy="-5" r="4" fill="#f9a8d4" opacity="0.55" />
              <circle cx="5" cy="0" r="4" fill="#f9a8d4" opacity="0.55" />
              <circle cx="0" cy="5" r="4" fill="#fbcfe8" opacity="0.55" />
              <circle cx="-5" cy="0" r="4" fill="#f9a8d4" opacity="0.55" />
              <circle cx="0" cy="0" r="2" fill="#fce7f3" opacity="0.8" />
            </g>
          ))}
          {/* Sun/warm light behind */}
          <circle cx="160" cy="100" r="50" fill="url(#sl-sun)" />
          {/* Piano keys at bottom — Slice of Life touch */}
          <rect x="60" y="210" width="200" height="25" fill="#0d0815" rx="4" stroke="#ec489944" strokeWidth="1" />
          {Array.from({length:12}).map((_,i) => (
            <rect key={i} x={65+i*16} y="212" width="13" height="20" fill={i%2===0?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.6)'} rx="1" stroke="#ec489930" strokeWidth="0.5" />
          ))}
          {/* Title */}
          <rect x="4" y="4" width="312" height="28" fill="rgba(15,8,24,0.85)" rx="12" />
          <text x="160" y="21" textAnchor="middle" fontSize="11" fill="#f9a8d4" fontWeight="700" fontFamily="sans-serif">🌸 SLICE OF LIFE + ROMANCE 🌸</text>
        </svg>
      )

    // ── DEMON HUNTER — deep crimson, fire, Japanese patterns, dark drama ───────
    case 'demon_hunter':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="dh-fire" cx="50%" cy="100%" r="60%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#f97316" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="dh-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0000" />
              <stop offset="100%" stopColor="#1a0505" />
            </linearGradient>
          </defs>
          <rect width="320" height="240" fill="url(#dh-bg)" />
          <rect width="320" height="240" fill="url(#dh-fire)" />
          {/* Japanese cloud pattern — top */}
          {[40,100,170,230,280].map((x,i) => (
            <g key={i}>
              <circle cx={x} cy={20+i*3} r={12+i} fill="none" stroke="#f4433615" strokeWidth="1" />
              <circle cx={x+10} cy={14+i*3} r={9+i} fill="none" stroke="#f4433610" strokeWidth="1" />
            </g>
          ))}
          {/* Main panel — vertical */}
          <rect x="4" y="4" width="312" height="180" fill="#050000" rx="2" stroke="#ef4444" strokeWidth="2.5" />
          {/* Moon */}
          <circle cx="260" cy="50" r="28" fill="#1a0505" stroke="#ef4444" strokeWidth="1.5" />
          <circle cx="252" cy="44" r="22" fill="#0a0000" />
          {/* Hunter figure — dramatic pose */}
          <ellipse cx="130" cy="100" rx="15" ry="19" fill="#100000" stroke="#ef4444" strokeWidth="2" />
          <rect x="119" y="116" width="22" height="52" fill="#100000" rx="3" stroke="#ef4444" strokeWidth="1.5" />
          {/* Cape flowing */}
          <path d="M119 120 Q80 150 75 175 L119 175" fill="#1a0505" stroke="#ef4444" strokeWidth="1.5" opacity="0.8" />
          {/* Sword extended */}
          <line x1="141" y1="108" x2="230" y2="85" stroke="#f8fafc" strokeWidth="2.5" />
          <line x1="141" y1="108" x2="230" y2="85" stroke="#ef444460" strokeWidth="4" />
          {/* Sword glow at tip */}
          <circle cx="230" cy="85" r="6" fill="#ef4444" opacity="0.7" />
          {/* Demon shadow opposite */}
          <ellipse cx="240" cy="100" rx="20" ry="25" fill="#200000" stroke="#ef444460" strokeWidth="1.5" />
          <rect x="228" y="122" width="24" height="50" fill="#200000" rx="3" stroke="#ef444460" strokeWidth="1" />
          {/* Demon horns */}
          <path d="M230 102 Q224 80 228 72" fill="none" stroke="#ef4444" strokeWidth="2" />
          <path d="M250 102 Q256 80 252 72" fill="none" stroke="#ef4444" strokeWidth="2" />
          {/* Fire particles at bottom */}
          {Array.from({length:16}).map((_,i) => {
            const x = 20+i*18; const h = 20+Math.sin(i)*15
            return (
              <g key={i}>
                <ellipse cx={x} cy={180} rx={5} ry={h/2} fill="#ef4444" opacity={0.25+Math.sin(i)*0.15} />
                <ellipse cx={x} cy={180} rx={3} ry={h/3} fill="#f97316" opacity={0.3} />
              </g>
            )
          })}
          {/* 2 bottom panels */}
          <rect x="4" y="192" width="150" height="44" fill="#080000" rx="2" stroke="#ef4444" strokeWidth="2" />
          <rect x="162" y="192" width="154" height="44" fill="#080000" rx="2" stroke="#ef4444" strokeWidth="2" />
          <text x="79" y="215" textAnchor="middle" fontSize="9" fill="#ef4444" fontFamily="sans-serif">¡Venganza y sacrificio!</text>
          <text x="79" y="228" textAnchor="middle" fontSize="8" fill="#ef444466" fontFamily="monospace">26 eps · Dark Fantasy</text>
          <text x="239" y="215" textAnchor="middle" fontSize="9" fill="#fff8" fontFamily="sans-serif" fontStyle="italic">&ldquo;Ni uno más.&rdquo;</text>
          <text x="239" y="228" textAnchor="middle" fontSize="8" fill="#ef4444" fontFamily="monospace">Cazador Lv.MAX</text>
        </svg>
      )

    // ── FANTASY KINGDOM — gold/amber, castle, royal heraldry ─────────────────
    case 'fantasy_kingdom':
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="fk-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a0600" />
              <stop offset="60%" stopColor="#1a0e00" />
              <stop offset="100%" stopColor="#0d0900" />
            </linearGradient>
            <radialGradient id="fk-moon" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#0a0600" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="240" fill="url(#fk-sky)" />
          {/* Stars */}
          {[[30,30],[80,15],[150,25],[220,18],[270,35],[50,60],[300,50],[180,45],[120,55],[250,60]].map(([x,y],i) => (
            <circle key={i} cx={x} cy={y} r={1+i%2} fill="#fbbf24" opacity={0.4+i*0.05} />
          ))}
          {/* Moon glow */}
          <circle cx="260" cy="55" r="40" fill="url(#fk-moon)" />
          <circle cx="260" cy="55" r="20" fill="#120c00" stroke="#fbbf24" strokeWidth="1.5" />
          {/* Castle silhouette */}
          {/* Main tower */}
          <rect x="135" y="90" width="50" height="120" fill="#0a0700" stroke="#d97706" strokeWidth="1.5" />
          {/* Battlements */}
          {[135,145,155,165,175].map((x,i) => (
            <rect key={i} x={x} y="82" width="8" height="12" fill="#0a0700" stroke="#d97706" strokeWidth="1" />
          ))}
          {/* Gate */}
          <path d="M152 210 L152 168 Q160 155 168 168 L168 210" fill="#050300" stroke="#fbbf24" strokeWidth="1.5" />
          {/* Left tower */}
          <rect x="88" y="120" width="34" height="90" fill="#080600" stroke="#d97706" strokeWidth="1.5" />
          {[88,96,104,114].map((x,i) => (
            <rect key={i} x={x} y="112" width="8" height="12" fill="#080600" stroke="#d97706" strokeWidth="1" />
          ))}
          {/* Right tower */}
          <rect x="198" y="120" width="34" height="90" fill="#080600" stroke="#d97706" strokeWidth="1.5" />
          {[198,206,214,224].map((x,i) => (
            <rect key={i} x={x} y="112" width="8" height="12" fill="#080600" stroke="#d97706" strokeWidth="1" />
          ))}
          {/* Windows with light */}
          {[[105,145],[210,145],[148,130],[172,130]].map(([x,y],i) => (
            <rect key={i} x={x} y={y} width="10" height="14" fill="#fbbf24" opacity="0.4" rx="5" />
          ))}
          {/* Crown above towers */}
          <text x="160" y="82" textAnchor="middle" fontSize="22" fill="#fbbf24" opacity="0.9">👑</text>
          {/* Diamond heraldry pattern left */}
          {[[40,80],[20,100],[60,100],[40,120]].map(([x,y],i) => (
            <rect key={i} x={x-8} y={y-8} width="16" height="16" fill="#d97706" opacity={0.15+i*0.05} transform={`rotate(45,${x},${y})`} />
          ))}
          {/* Diamond heraldry pattern right */}
          {[[280,80],[260,100],[300,100],[280,120]].map(([x,y],i) => (
            <rect key={i} x={x-8} y={y-8} width="16" height="16" fill="#d97706" opacity={0.15+i*0.05} transform={`rotate(45,${x},${y})`} />
          ))}
          {/* Ground */}
          <rect x="0" y="208" width="320" height="32" fill="#0a0700" />
          {/* Banner */}
          <rect x="4" y="4" width="312" height="28" fill="rgba(10,7,0,0.9)" />
          <text x="160" y="22" textAnchor="middle" fontSize="12" fill="#fbbf24" fontWeight="800" fontFamily="sans-serif" letterSpacing="2">⚔️ CONSTRUCCIÓN DE REINO ⚔️</text>
        </svg>
      )

    // ── FALLBACK — generic colored gradient ───────────────────────────────────
    default: {
      const t = TEMPLATES.find(x => x.id === templateId)
      const ac = t?.accentColor ?? '#ec4899'
      return (
        <svg viewBox="0 0 320 240" style={{ width: '100%', height: 'auto', display: 'block' }} xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="240" fill="#0a0a14" rx="8" />
          <rect x="6" y="6" width="120" height="228" fill={`${ac}18`} rx="4" stroke={ac} strokeWidth="2.5" />
          <rect x="134" y="6" width="180" height="110" fill={`${ac}10`} rx="4" stroke={ac} strokeWidth="2" />
          <rect x="134" y="124" width="180" height="110" fill={`${ac}10`} rx="4" stroke={ac} strokeWidth="2" />
          <text x="66" y="130" textAnchor="middle" fontSize="52" fill="white" opacity="0.9">{t?.icon ?? '✨'}</text>
          <text x="224" y="75" textAnchor="middle" fontSize="32" fill={ac} opacity="0.85">{t?.icon ?? '✨'}</text>
          <text x="224" y="185" textAnchor="middle" fontSize="11" fill={ac} fontFamily="sans-serif" fontWeight="700">{t?.episodes ?? 0} eps</text>
        </svg>
      )
    }
  }
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
        <ComicPreview templateId={template.id} />
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
        <ComicPreview templateId={template.id} />
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
