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
