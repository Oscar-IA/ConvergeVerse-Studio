// ── BOND Save System ──────────────────────────────────────────────────────────
// All data stays local (localStorage + .bond file download). No external storage.

export interface BondChapter {
  number: number
  title: string
  script: string
  panels: { description: string; image_url?: string }[]
  status: 'draft' | 'complete'
}

export interface BondStory {
  id: string
  title: string
  genre: string
  cover_emoji: string
  template_id?: string
  prompt: string
  chapters: BondChapter[]
  createdAt: string
  updatedAt: string
  version: '1.0'
}

const STORAGE_KEY = 'bond_stories'

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function now(): string {
  return new Date().toISOString()
}

// ── Read / Write localStorage ─────────────────────────────────────────────────

export function loadBondStories(): BondStory[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getBondStory(id: string): BondStory | null {
  return loadBondStories().find(s => s.id === id) ?? null
}

export function autoSaveBondStory(story: BondStory): void {
  if (typeof window === 'undefined') return
  try {
    const stories = loadBondStories()
    const idx = stories.findIndex(s => s.id === story.id)
    const updated: BondStory = { ...story, updatedAt: now() }
    if (idx >= 0) {
      stories[idx] = updated
    } else {
      stories.unshift(updated)
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories))
  } catch {
    // Storage quota exceeded — silently skip
  }
}

export function deleteBondStory(id: string): void {
  if (typeof window === 'undefined') return
  const stories = loadBondStories().filter(s => s.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stories))
}

// ── Save with .bond file download ─────────────────────────────────────────────

export function saveBondFile(story: BondStory): void {
  // 1. Auto-save to localStorage
  autoSaveBondStory(story)

  // 2. Trigger browser download of the .bond file
  if (typeof window === 'undefined') return
  const json = JSON.stringify(story, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${story.title.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'mi-historia'}.bond`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Parse a .bond file ────────────────────────────────────────────────────────

export function parseBondFile(fileContent: string): BondStory | null {
  try {
    const parsed = JSON.parse(fileContent) as Partial<BondStory>
    // Basic validation
    if (
      typeof parsed.title !== 'string' ||
      typeof parsed.genre !== 'string' ||
      parsed.version !== '1.0'
    ) {
      return null
    }
    return {
      id: parsed.id ?? generateId(),
      title: parsed.title,
      genre: parsed.genre,
      cover_emoji: parsed.cover_emoji ?? '📖',
      template_id: parsed.template_id,
      prompt: parsed.prompt ?? '',
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
      createdAt: parsed.createdAt ?? now(),
      updatedAt: now(),
      version: '1.0',
    }
  } catch {
    return null
  }
}

// ── Create a blank story ──────────────────────────────────────────────────────

export function createBondStory(partial: Partial<BondStory>): BondStory {
  return {
    id: generateId(),
    title: partial.title ?? 'Mi Historia',
    genre: partial.genre ?? '',
    cover_emoji: partial.cover_emoji ?? '✨',
    template_id: partial.template_id,
    prompt: partial.prompt ?? '',
    chapters: partial.chapters ?? [],
    createdAt: now(),
    updatedAt: now(),
    version: '1.0',
  }
}

// ── Demo story — pre-loaded example for kids to explore ──────────────────────

export function seedDemoStory(): BondStory {
  const demo: BondStory = {
    id: 'demo-bond-001',
    title: '⚡ El Chico del Viento',
    genre: 'shonen',
    cover_emoji: '⚡',
    template_id: 'shonen_battle',
    prompt: 'Kai tiene 14 años y nunca pudo controlar su poder — el viento lo obedece, pero de forma caótica. El día de su examen final, un demonio ataca la escuela. Es ahora o nunca.',
    chapters: [
      {
        number: 1,
        title: 'El Examen del Destino',
        script: `El pasillo de la Academia Viento Libre olía a tiza y nervios.

KAI (14 años, cabello alborotado por el viento constante) sostenía su número de examen: el 13. Mal augurio.

— Vamos, Kai. Esta vez sí lo controlas — se dijo, apretando los puños.

En la sala de pruebas, el MAESTRO ISHIRO observaba con expresión neutral.

— Prueba de control elemental. Tienes tres intentos.

Kai cerró los ojos. Respiró. El viento respondió — y arrasó con todos los papeles del salón.

Entre las risas de sus compañeros, nadie notó que las ventanas se habían abierto solas. Nadie excepto una figura oscura en el tejado.

FIN DEL CAPÍTULO 1.`,
        panels: [
          { description: 'Panel 1: Vista del pasillo de la academia, estudiantes nerviosos en fila' },
          { description: 'Panel 2: Primer plano de Kai con cabello moviéndose por el viento, número 13 en mano' },
          { description: 'Panel 3: El viento explota en el salón, papeles volando por todas partes' },
          { description: 'Panel 4: Silueta misteriosa en el tejado, observando' },
        ],
        status: 'complete',
      },
      {
        number: 2,
        title: 'La Sombra en el Tejado',
        script: `La academia se sacudió. No era un terremoto.

Una criatura de sombras y viento oscuro descendió del tejado. Los estudiantes gritaron y corrieron.

KAI no se movió. Algo dentro de él reconoció esa energía — era como la suya, pero corrompida.

— ¿Eres... como yo? — preguntó.

La criatura rio, un sonido como el viento a través de huesos.

— Soy lo que SERÁS si no aprendes a controlarlo.

El viento de Kai rugió — esta vez con intención.

FIN DEL CAPÍTULO 2.`,
        panels: [
          { description: 'Panel 1: Criatura de sombras descendiendo del tejado, estudiantes huyendo' },
          { description: 'Panel 2: Kai de pie frente a la criatura, sin huir — contrapicado dramático' },
          { description: 'Panel 3: El viento de Kai brillando en azul claro vs el viento oscuro de la criatura' },
          { description: 'Panel 4: Close-up del ojo de Kai determinado, con reflejo de la criatura' },
        ],
        status: 'complete',
      },
    ],
    createdAt: new Date('2026-05-01T10:00:00Z').toISOString(),
    updatedAt: now(),
    version: '1.0',
  }

  // Save to localStorage
  autoSaveBondStory(demo)
  return demo
}

// ── Check if demo story already exists ───────────────────────────────────────

export function hasDemoStory(): boolean {
  return loadBondStories().some(s => s.id === 'demo-bond-001')
}
