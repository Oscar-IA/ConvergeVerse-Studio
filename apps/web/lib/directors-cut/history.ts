/**
 * Historial local del Director's Cut (por capítulo) — localStorage.
 * No sustituye la persistencia del API (storage/season_1/*.json).
 */

import type {
  AnimationMetadataPayload,
  AnimeMotionShot,
  AnimeVfxProposal,
  MangaPanel,
} from '@/lib/api/types';

export type DirectorCutSource = 'manga' | 'world';

/** @deprecated Tabs viven ahora en el editor central del dashboard */
export type DirectorTab = 'novel' | 'manga' | 'anime';

export interface DirectorBundle {
  workspaceSnapshot: string;
  novel: string;
  script: string;
  panels: MangaPanel[];
  animeMotion?: AnimeMotionShot[];
  /** Modo Director / production_pipeline */
  animationMetadata?: AnimationMetadataPayload | null;
  worldVfx?: AnimeVfxProposal[];
  source: DirectorCutSource;
  spellcheck?: { language: string; replacements: number };
  persistedPath?: string | null;
  productionDir?: string | null;
  savedAt: string;
  seasonSlug?: string;
  chapterNumber?: number;
}

const INDEX_KEY = 'cv_directors_cut_index';

export function storageKeyForChapter(seasonSlug: string, chapterNumber: number): string {
  return `cv_dc_${encodeURIComponent(seasonSlug)}_ch${chapterNumber}`;
}

export const LOCAL_DRAFT_KEY = 'cv_dc_local_draft';

export function currentStorageKey(
  meta: { seasonSlug: string; chapterNumber: number } | null,
): string {
  if (meta?.seasonSlug != null && meta.chapterNumber != null) {
    return storageKeyForChapter(meta.seasonSlug, meta.chapterNumber);
  }
  return LOCAL_DRAFT_KEY;
}

export function loadDirectorBundle(key: string): DirectorBundle | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as DirectorBundle;
    if (!data || typeof data.novel !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveDirectorBundle(key: string, bundle: DirectorBundle): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = { ...bundle, savedAt: new Date().toISOString() };
    localStorage.setItem(key, JSON.stringify(payload));
    const idx = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]') as string[];
    const next = [key, ...idx.filter((k) => k !== key)].slice(0, 80);
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch (e) {
    console.warn('[DirectorCut] save failed', e);
  }
}

export function touchHistoryIndex(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const idx = JSON.parse(localStorage.getItem(INDEX_KEY) || '[]') as string[];
    const next = [key, ...idx.filter((k) => k !== key)].slice(0, 80);
    localStorage.setItem(INDEX_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
