import { getApiBaseUrl } from '@/lib/config';
import type {
  LoreInventoryResponse,
  MangaPipelineResponse,
  WorldEngineLibraryResponse,
  WorldEnginePipelineResponse,
} from '@/lib/api/types';

export { getApiHealth } from '@/lib/api/health';

/** Full pipeline: Claude + 2× Replicate can exceed 60s; browsers default can feel “stuck”. */
const MANGA_PIPELINE_TIMEOUT_MS = 360_000; // 6 min

const MANGA_PIPELINE_PATH = '/api/pipeline/manga';
const WORLD_ENGINE_PIPELINE_PATH = '/api/world-engine/pipeline';
const WORLD_ENGINE_LIBRARY_PATH = '/api/world-engine/library';
const LORE_INVENTORY_PATH = '/api/lore/inventory';
const CHAPTER_NOVEL_PROGRESS_PATH = '/api/chapters/novel-progress';

export interface WorldEngineChapterBundle {
  chapter: Record<string, unknown>;
  novel: { prose?: string } | null;
  manga: { script?: string; panels_rendered?: unknown[] } | null;
  anime: { vfx_proposals?: unknown[] } | null;
}

export async function postMangaPipeline(
  beats: string[],
  options?: {
    chapter_number?: number;
    season_number?: number;
    chapter_title?: string | null;
    /** Fuerza novela + corrector en es | en | fr (omitir = auto desde el beat). */
    narrative_language?: 'es' | 'en' | 'fr' | null;
    /** Línea de tomo en crónica HTML (ej. Tomo 1 — Crónicas de Aethel-Arévalo). */
    tome_title?: string | null;
  },
): Promise<MangaPipelineResponse> {
  const base = getApiBaseUrl();
  const url = `${base}${MANGA_PIPELINE_PATH}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), MANGA_PIPELINE_TIMEOUT_MS);

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[ConvergeVerse] POST', url, 'beats:', beats.length);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        beats,
        ...(options?.chapter_number != null ? { chapter_number: options.chapter_number } : {}),
        ...(options?.season_number != null ? { season_number: options.season_number } : {}),
        ...(options?.chapter_title != null && options.chapter_title !== ''
          ? { chapter_title: options.chapter_title }
          : {}),
        ...(options?.narrative_language ? { narrative_language: options.narrative_language } : {}),
        ...(options?.tome_title != null && options.tome_title !== ''
          ? { tome_title: options.tome_title }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => {
      throw new Error('Respuesta del servidor no es JSON válido');
    });
    return data as MangaPipelineResponse;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Tiempo agotado (${MANGA_PIPELINE_TIMEOUT_MS / 60000} min). El pipeline (guion + imágenes Replicate) sigue en marcha en el servidor; revisa la terminal de uvicorn o sube el timeout en lib/api/client.ts.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}

export interface ChapterNovelProgressResponse {
  ok: boolean;
  path?: string;
  relative?: string;
  chapter_number?: number;
}

export interface ChapterNovelProgressGetResponse {
  ok: boolean;
  /** false si aún no existe cap_X_novela.json (respuesta 200, sin error en red) */
  found?: boolean;
  chapter_number?: number;
  season_folder?: string;
  chapter_title?: string | null;
  saved_at?: string | null;
  novel_text?: string;
  relative?: string;
}

/** Lee novela guardada (cap_X_novela.json) si existe. */
export async function getChapterNovelProgress(params: {
  chapter_number: number;
  season_folder?: string;
}): Promise<ChapterNovelProgressGetResponse> {
  const base = getApiBaseUrl();
  const q = new URLSearchParams({
    chapter_number: String(params.chapter_number),
    season_folder: params.season_folder ?? 'season_1',
  });
  const res = await fetch(`${base}${CHAPTER_NOVEL_PROGRESS_PATH}?${q.toString()}`);
  const data = (await res.json().catch(() => ({}))) as ChapterNovelProgressGetResponse & { detail?: string };
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  if (data.found === false) {
    return {
      ...data,
      ok: true,
      found: false,
      novel_text: data.novel_text ?? '',
    };
  }
  return { ...data, found: data.found ?? true };
}

/** Guarda novela corregida en API → storage/season_1/cap_X_novela.json */
export async function postChapterNovelProgress(body: {
  chapter_number: number;
  novel_text: string;
  season_folder?: string;
  chapter_title?: string | null;
}): Promise<ChapterNovelProgressResponse> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${CHAPTER_NOVEL_PROGRESS_PATH}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chapter_number: body.chapter_number,
      novel_text: body.novel_text,
      season_folder: body.season_folder ?? 'season_1',
      chapter_title: body.chapter_title ?? null,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as ChapterNovelProgressResponse & { detail?: string };
  if (!res.ok) {
    throw new Error(data.detail || `HTTP ${res.status}`);
  }
  return data;
}

export async function getLoreInventory(): Promise<LoreInventoryResponse> {
  const base = getApiBaseUrl();
  const url = `${base}${LORE_INVENTORY_PATH}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  return res.json().catch(() => { throw new Error('Respuesta del inventario no es JSON válido'); });
}

export async function getWorldEngineLibrary(): Promise<WorldEngineLibraryResponse> {
  const base = getApiBaseUrl();
  const url = `${base}${WORLD_ENGINE_LIBRARY_PATH}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  return res.json().catch(() => { throw new Error('Respuesta de la librería no es JSON válido'); });
}

export async function getWorldEngineChapter(chapterId: number): Promise<WorldEngineChapterBundle> {
  const base = getApiBaseUrl();
  const url = `${base}/api/world-engine/chapters/${chapterId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
  }
  return res.json().catch(() => { throw new Error('Respuesta del capítulo no es JSON válido'); });
}

export interface WorldEnginePipelineRequestBody {
  beats: string[];
  persist?: boolean;
  season_slug?: string | null;
  season_title?: string | null;
  chapter_number?: number | null;
  chapter_title?: string | null;
  chapter_slug?: string | null;
}

export async function postWorldEnginePipeline(
  body: WorldEnginePipelineRequestBody,
): Promise<WorldEnginePipelineResponse> {
  const base = getApiBaseUrl();
  const url = `${base}${WORLD_ENGINE_PIPELINE_PATH}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), MANGA_PIPELINE_TIMEOUT_MS);

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[ConvergeVerse] POST', url, 'world-engine');
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { detail?: string }).detail || `HTTP ${res.status}`);
    }

    const data = await res.json().catch(() => {
      throw new Error('Respuesta del world-engine no es JSON válido');
    });
    return data as WorldEnginePipelineResponse;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error(
        `Tiempo agotado (${MANGA_PIPELINE_TIMEOUT_MS / 60000} min). Prueba de nuevo o revisa el servidor API.`,
      );
    }
    throw e;
  } finally {
    clearTimeout(id);
  }
}
