export interface MangaPanel {
  scene_index: number;
  description: string;
  dialogue?: string;
  /** Anime / video prep (ScriptAgent director layer) */
  camera_movement?: string;
  particle_effects?: string;
  sound_cues_sfx?: string;
  image_url?: string;
  prompt_used?: string;
  /** Set when Replicate fails or token missing */
  image_error?: string | null;
  /** replicate | pollinations | unsplash */
  image_provider?: string | null;
  /** Human-readable source / fallback reason */
  image_note?: string | null;
}

export interface PipelineTimingsMs {
  script?: number;
  images?: number;
  total?: number;
  /** World Engine: novel + manga storyboard + VFX LLM pass */
  narrative_three_step?: number;
  /** Pipeline maestro */
  novel_llm?: number;
  manga_moments_llm?: number;
  anime_motion_llm?: number;
  /** Modo Director: instrucciones de animación en lenguaje natural */
  animation_metadata_llm?: number;
}

export interface AnimeMotionShot {
  Camera_Movement: string;
  VFX_Blue_Sparks: string;
  SFX_Konosuba_Funny_Sound: string;
}

/** Fase Anime (director): escenas con instrucciones tipo storyboard animado */
export interface AnimationDirectorScene {
  panel_index: number;
  director_instruction: string;
  particles_blue_light: string;
  timing_beat?: string;
}

export interface AnimationMetadataPayload {
  format_version: number;
  director_mode: boolean;
  world: string;
  scenes: AnimationDirectorScene[];
  overall_notes?: string;
  anime_motion_technical: AnimeMotionShot[];
}

export interface ImageErrorItem {
  scene_index?: number;
  error: string;
}

export interface MangaPipelineResponse {
  script: string;
  panels: MangaPanel[];
  beats_processed: number;
  /** Integración reparto familiar + prompts Architect's Quill */
  architects_quill?: boolean;
  production_flow?: string;
  /** production_v2 = Modo Director (carpeta S#/E#_slug) */
  pipeline?: string;
  season_number?: number;
  episode_number?: number;
  chapter_title?: string | null;
  /** Idioma pedido al pipeline (es/en/fr) o inferido */
  narrative_language_requested?: string | null;
  /** Serie archivada en novel_page.html / chapter_info */
  tome_title?: string | null;
  world_lore_novel_lock_chars?: number;
  production_folder_slug?: string;
  beats_corrected?: string[];
  beat_spellcheck?: { per_beat: unknown[]; total_replacements: number };
  /** Pipeline maestro: prosa ~500 palabras + spellcheck */
  novel?: string;
  novel_word_count?: number;
  spellcheck?: { language: string; replacements: number };
  pipeline_stages?: string[];
  key_moments_planned?: number;
  anime_motion?: AnimeMotionShot[];
  animation_metadata?: AnimationMetadataPayload;
  /** Carpeta del episodio: storage/S#/E#_NombreCapitulo/ */
  production_dir?: string | null;
  /** Ruta absoluta de full_run.json dentro de production_dir */
  persisted_path?: string | null;
  animation_metadata_path?: string | null;
  /** storage/chronicles/season_n/chapter_XX_slug/ */
  chronicle_dir?: string | null;
  chronicle_info?: Record<string, unknown> | null;
  /** Flat list of panel image URLs (same as panels[].image_url where present) */
  image_urls?: string[];
  images_generated?: number;
  error?: string;
  timings_ms?: PipelineTimingsMs;
  image_errors?: ImageErrorItem[];
}

export interface HealthResponse {
  status: string;
  service?: string;
}

/** GET /api/lore/inventory */
export interface LoreInventoryCharacter {
  name: string;
  visual?: string | null;
  traits?: string | null;
  comedy_factor?: string | null;
  source: string;
}

export interface LoreInventoryLocation {
  name: string;
  style?: string | null;
  source: string;
}

/** Reparto The Architect's Quill (apps/api/data/characters.json → GET /api/lore/inventory) */
export interface StudioCastEntry {
  id?: string;
  name: string;
  ability?: string;
  role?: string;
  personality?: string;
  'class'?: string;
}

export interface LoreInventoryResponse {
  characters: LoreInventoryCharacter[];
  locations: LoreInventoryLocation[];
  studio_cast?: StudioCastEntry[];
}

/** GET /api/world-engine/library */
export interface WorldEngineLibraryChapter {
  id: number;
  season_id: number;
  chapter_number: number;
  slug: string;
  title: string | null;
  created_at: string;
  formats_saved: string[];
}

export interface WorldEngineLibrarySeason {
  id: number;
  slug: string;
  title: string;
  sort_order: number;
  created_at: string;
  chapters: WorldEngineLibraryChapter[];
}

export interface WorldEngineLibraryResponse {
  seasons: WorldEngineLibrarySeason[];
}

export interface AnimeVfxProposal {
  shot_index?: number;
  panel_ref?: number;
  title?: string;
  description?: string;
  vfx_type?: string;
  color_notes?: string;
  timing_notes?: string;
  reference_style?: string;
}

/** POST /api/world-engine/pipeline */
export interface WorldEnginePipelineResponse {
  workflow: string[];
  novel: string;
  script: string;
  panels: MangaPanel[];
  anime_vfx: AnimeVfxProposal[];
  beats_processed?: number;
  image_urls?: string[];
  images_generated?: number;
  error?: string;
  timings_ms?: PipelineTimingsMs;
  image_errors?: ImageErrorItem[];
  persisted?: Record<string, unknown> | null;
}
