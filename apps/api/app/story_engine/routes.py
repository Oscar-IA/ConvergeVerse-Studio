"""
Story Engine API routes.
Montado en main.py como: prefix="/api/story-engine"
"""

from __future__ import annotations

import asyncio
import logging
import os
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, Request, UploadFile
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from app.utils.bond_bus import emit_event, BondBusEvents

from app.story_engine.errors import StoryEngineError
from app.utils.rate_limit import is_rate_limited
from app.story_engine.memory_agent import MemoryAgent
from app.story_engine.narrative_db import NarrativeDB, verify_story_engine_supabase
from app.story_engine.cour_structure import cour_context_for_dashboard, resolve_cour_context
from app.story_engine.master_generator import master_generator_enabled
from app.story_engine.story_engine import StoryEngine

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_db() -> NarrativeDB:
    return NarrativeDB()


def _resolve_narration_text(chapter: dict, text_source: str, custom_text: str) -> tuple[str, str]:
    """Devuelve (texto, fuente normalizada) para TTS."""
    src = (text_source or "script").strip().lower()
    if src == "custom":
        t = (custom_text or "").strip()
        return t, "custom"
    if src == "meta_summary":
        t = (chapter.get("meta_summary") or "").strip()
        return t, "meta_summary"
    t = (chapter.get("script") or "").strip()
    return t, "script"


async def _run_narration_for_chapter(
    db: NarrativeDB,
    chapter_id: str,
    *,
    voice: str | None,
    model: str | None,
    text_source: str = "script",
    custom_text: str = "",
) -> tuple[dict, dict]:
    """
    Genera audio OpenAI TTS, sube a Storage y actualiza capítulo.
    Returns: (chapter_row_updated, narration_meta)
    """
    from app.story_engine.narration_tts import generate_and_upload_chapter_narration

    ch = await db.get_chapter(chapter_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")
    text, src_norm = _resolve_narration_text(ch, text_source, custom_text)
    if not text:
        raise HTTPException(
            status_code=400,
            detail=(
                "No hay texto para narrar para esta fuente. "
                "Prueba text_source=script o rellena meta_summary / custom_text."
            ),
        )
    client = db._get_client()
    meta = await generate_and_upload_chapter_narration(
        supabase_client=client,
        chapter_id=chapter_id,
        text=text,
        voice=voice,
        model=model,
        title_hint=str(ch.get("title") or ""),
    )
    updated = await db.attach_narration_audio(
        chapter_id,
        urls=meta["urls"],
        voice=meta["voice"],
        model=meta["model"],
        text_source=src_norm,
    )
    return updated, meta


# ── Models ───────────────────────────────────────────────────────────────────


class ToneMixPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    humor: float = Field(default=0.33, ge=0, le=1)
    epic: float = Field(default=0.33, ge=0, le=1)
    strategy: float = Field(default=0.34, ge=0, le=1)


class GenerationConfigPayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    tone_mix: ToneMixPayload | None = Field(
        default=None,
        validation_alias=AliasChoices("tone_mix", "toneMix"),
    )
    inject_marketing: str = Field(
        default="",
        validation_alias=AliasChoices("inject_marketing", "injectMarketing"),
    )
    force_secret: bool = Field(
        default=False,
        validation_alias=AliasChoices("force_secret", "forceSecret"),
    )
    background_lore: str = Field(
        default="",
        validation_alias=AliasChoices("background_lore", "backgroundLore"),
    )
    disable_cour_structure: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "disable_cour_structure",
            "disableCourStructure",
            "cour_disabled",
            "courDisabled",
        ),
        description="Si true, no inyecta el bloque de cour (12 episodios) en el prompt.",
    )
    season_number: int | None = Field(
        default=None,
        ge=1,
        validation_alias=AliasChoices("season_number", "seasonNumber"),
        description="Sobrescribe el índice de temporada mostrado en el prompt.",
    )
    cour_length: int | None = Field(
        default=None,
        ge=4,
        le=24,
        validation_alias=AliasChoices("cour_length", "courLength"),
        description="Longitud del cour (default 12). Env: CONVERGE_COUR_LENGTH.",
    )
    cour_episode: int | None = Field(
        default=None,
        ge=1,
        le=24,
        validation_alias=AliasChoices(
            "cour_episode",
            "courEpisode",
            "episode_in_cour",
            "episodeInCour",
        ),
        description="Forzar episodio dentro del cour (1..cour_length).",
    )
    use_master_generator: bool = Field(
        True,
        validation_alias=AliasChoices(
            "use_master_generator",
            "useMasterGenerator",
            "master_generator",
            "masterGenerator",
        ),
        description="Generador maestro: 3 actos (~25 min anime), guion denso por slot. False = modo compacto.",
    )
    disable_master_generator: bool = Field(
        False,
        validation_alias=AliasChoices(
            "disable_master_generator",
            "disableMasterGenerator",
        ),
        description="Si true, desactiva el generador maestro (prioridad sobre use_master_generator).",
    )
    architect_plot_idea: str = Field(
        default="",
        max_length=5_000_000,
        validation_alias=AliasChoices("architect_plot_idea", "architectPlotIdea"),
        description="Idea de trama solo para esta generación (sin guardar en cola).",
    )
    skip_architect_triangulation: bool = Field(
        False,
        validation_alias=AliasChoices(
            "skip_architect_triangulation",
            "skipArchitectTriangulation",
        ),
        description="No leer cola architect_plot_notes ni runas para triangulación.",
    )
    consume_architect_notes: bool = Field(
        True,
        validation_alias=AliasChoices(
            "consume_architect_notes",
            "consumeArchitectNotes",
        ),
        description="Si false, las notas en cola no pasan a is_processed tras generar.",
    )
    timeline_cascade_note: str = Field(
        default="",
        validation_alias=AliasChoices(
            "timeline_cascade_note",
            "timelineCascadeNote",
        ),
        description="Nota de paradoja / regeneración en cascada (BOND OS).",
    )


class GenerateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    day_number: int | None = Field(
        default=None,
        validation_alias=AliasChoices("day_number", "dayNumber"),
    )
    generation_config: GenerationConfigPayload | None = Field(
        default=None,
        validation_alias=AliasChoices("generation_config", "generationConfig"),
    )


class ApproveRequest(BaseModel):
    chapter_id: str
    status: str  # "approved" | "rejected"
    notes: str = ""


class RegenerateCascadeRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    plot_pivot_note: str = Field(
        default="",
        validation_alias=AliasChoices("plot_pivot_note", "plotPivotNote"),
        description="Instrucción de trama o detalle de lore a propagar.",
    )
    cascade_mode: str = Field(
        "hard_reset",
        validation_alias=AliasChoices("cascade_mode", "cascadeMode"),
        description="hard_reset: colapsar y regenerar · soft_enrich: refinar capítulos futuros sin borrarlos.",
    )
    max_future_chapters: int = Field(
        12,
        ge=1,
        le=24,
        validation_alias=AliasChoices("max_future_chapters", "maxFutureChapters"),
    )
    generation_config: GenerationConfigPayload | None = Field(
        default=None,
        validation_alias=AliasChoices("generation_config", "generationConfig"),
    )


class SyncLoreForwardRequest(BaseModel):
    """Sincronizar lore hacia el futuro (equivale a regenerate-cascade en modo soft_enrich)."""

    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    new_detail: str = Field(
        ...,
        min_length=1,
        validation_alias=AliasChoices("new_detail", "newDetail"),
        description="Detalle a integrar orgánicamente (runa, objeto, hecho).",
    )
    max_future_chapters: int = Field(
        12,
        ge=1,
        le=24,
        validation_alias=AliasChoices("max_future_chapters", "maxFutureChapters"),
    )


class ArchitectPlotNoteCreate(BaseModel):
    """Nota en cola para triangulación del GENERADOR (`architect_plot_notes`)."""

    model_config = ConfigDict(populate_by_name=True)

    # Capítulo largo / novela corta en una sola nota (~5M chars); Postgres `text` sin tope práctico.
    raw_plot_idea: str = Field(
        ...,
        min_length=1,
        max_length=5_000_000,
        validation_alias=AliasChoices("raw_plot_idea", "rawPlotIdea"),
    )
    title: str = Field(
        "",
        max_length=2000,
        validation_alias=AliasChoices("title",),
    )


class FinalizeChapterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    generate_hero_illustration: bool = Field(
        True,
        validation_alias=AliasChoices(
            "generate_hero_illustration",
            "generateHeroIllustration",
        ),
        description="Si hay REPLICATE_API_TOKEN, genera imagen Flux 16:9 y guarda URL en Supabase.",
    )
    generate_narration_audio: bool = Field(
        False,
        validation_alias=AliasChoices(
            "generate_narration_audio",
            "generateNarrationAudio",
        ),
        description="OpenAI TTS (tts-1-hd por defecto) + Supabase Storage. Requiere OPENAI_API_KEY y bucket.",
    )
    narration_voice: str | None = Field(
        None,
        validation_alias=AliasChoices("narration_voice", "narrationVoice"),
        description="Voz OpenAI TTS (p. ej. onyx, alloy). Por defecto OPENAI_TTS_VOICE o onyx.",
    )
    narration_model: str | None = Field(
        None,
        validation_alias=AliasChoices("narration_model", "narrationModel"),
        description="Modelo TTS (p. ej. tts-1-hd). Por defecto OPENAI_TTS_MODEL.",
    )


class NarrateChapterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    voice: str | None = Field(
        None,
        validation_alias=AliasChoices("voice", "voice_type", "voiceType"),
    )
    tts_model: str | None = Field(
        None,
        validation_alias=AliasChoices("tts_model", "ttsModel", "model"),
        description="Modelo OpenAI TTS (p. ej. tts-1-hd).",
    )
    text_source: str = Field(
        "script",
        validation_alias=AliasChoices("text_source", "textSource"),
        description="script | meta_summary | custom",
    )
    custom_text: str = Field(
        "",
        validation_alias=AliasChoices("custom_text", "customText"),
    )


class MangaIllustrateRequest(BaseModel):
    """Fase Manga: keyframes → Replicate (Solo Leveling style)."""

    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    max_panels: int = Field(
        6,
        ge=1,
        le=12,
        validation_alias=AliasChoices("max_panels", "maxPanels"),
    )
    overwrite: bool = Field(
        False,
        validation_alias=AliasChoices("overwrite",),
        description="Si true, regenera aunque el panel ya tenga image_url.",
    )


class VoiceLocalRequest(BaseModel):
    """
    TTS a disco local (`static/audio/`) — mismo patrón que el snippet del tutorial.
    Sin Supabase Storage; ideal para dev en localhost.
    """

    model_config = ConfigDict(populate_by_name=True)

    chapter_id: str = Field(validation_alias=AliasChoices("chapter_id", "chapterId"))
    text: str = Field(
        "",
        description="Si va vacío, se usa el guion del capítulo en Supabase (requiere DB).",
    )
    voice: str | None = Field(
        None,
        validation_alias=AliasChoices("voice", "voice_type", "voiceType"),
        description="Por defecto onyx (narrador tráiler / isekai).",
    )
    tts_model: str | None = Field(
        None,
        validation_alias=AliasChoices("tts_model", "ttsModel", "model"),
    )
    persist_in_chapter: bool = Field(
        False,
        validation_alias=AliasChoices("persist_in_chapter", "persistInChapter"),
        description="Si true, guarda las URLs en book_payload.narration (solo útil en dev; URLs son localhost).",
    )


class ReaderSettingsPayload(BaseModel):
    """Preferencias del panel de lectura (persistidas en `user_reader_settings`)."""

    model_config = ConfigDict(populate_by_name=True)

    profile_id: str = "default"
    font_size: int = Field(
        18,
        ge=14,
        le=32,
        validation_alias=AliasChoices("font_size", "fontSize"),
    )
    narration_enabled: bool = Field(
        True,
        validation_alias=AliasChoices(
            "narration_enabled",
            "narrationEnabled",
            "voice_enabled",
            "voiceEnabled",
        ),
    )


class EditRequest(BaseModel):
    chapter_id: str
    field: str  # "script" | "title" | "panels[0].dialogue"
    original: str
    edited: str
    reason: str = ""


class RuleRequest(BaseModel):
    rule: str
    priority: int = 5


class ArcRequest(BaseModel):
    name: str
    description: str
    day_start: int
    themes: list[str]
    symbols: list[str] = []


class StorySecretCreate(BaseModel):
    chapter_id: str
    secret_code: str
    hint_text: str = ""
    reward_data: dict = Field(default_factory=dict)


class StorySecretVerify(BaseModel):
    chapter_id: str
    secret_code: str


class VisualReferenceCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    label: str = Field(..., min_length=1)
    visual_description: str = Field(..., min_length=1)
    notes: str = ""
    sort_order: int = 0
    active: bool = True
    image_url: str | None = None


class VisualReferencePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str | None = None
    visual_description: str | None = None
    notes: str | None = None
    sort_order: int | None = None
    active: bool | None = None
    image_url: str | None = None


class ProactiveFeedbackRequest(BaseModel):
    """Motor de reacción proactiva — sugerencias creativas (no reescritura del capítulo)."""

    model_config = ConfigDict(extra="forbid")

    chapter_id: str | None = None
    chapter_content: str | None = None
    chapter_title: str = ""
    scientific_lore: str = ""
    include_visual_refs: bool = True


# ── Routes ───────────────────────────────────────────────────────────────────


@router.get("/health")
def story_engine_health():
    return {"status": "ok", "service": "story-engine"}


@router.get("/visual-master-prompt")
def get_laguna_legacy_visual_master():
    """
    Prompt maestro CONVERGEVERSE: THE LAGUNA LEGACY (nobleza + BOND OS) para Replicate / diseño.
    Incluye versión completa EN y compacta para límites de modelo.
    """
    from app.core.laguna_legacy_visual_master import get_visual_master_payload

    return get_visual_master_payload()


@router.get("/visual-references")
async def list_visual_references_route(
    include_inactive: bool = False,
    limit: int = 80,
):
    """
    Reglas visuales almacenadas en `visual_references` (inyectadas en cada generación activa).
    Por defecto solo `active=true`. SQL: docs/supabase_visual_references.sql
    """
    db = _get_db()
    try:
        rows = await db.list_visual_references_rows(
            active_only=not include_inactive,
            limit=min(120, max(1, limit)),
        )
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    return {"references": rows, "count": len(rows)}


@router.post("/visual-references")
async def create_visual_reference_route(body: VisualReferenceCreate):
    """Añade una regla visual (el generador la escanea antes de cada capítulo)."""
    db = _get_db()
    try:
        row = await db.insert_visual_reference(
            body.label,
            body.visual_description,
            notes=body.notes,
            sort_order=body.sort_order,
            active=body.active,
            image_url=body.image_url,
        )
    except StoryEngineError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("create_visual_reference_route")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
    return {"ok": True, "reference": row}


@router.post("/visual-references/upload-image")
async def upload_visual_reference_image_route(file: UploadFile = File(...)):
    """
    Sube una imagen al bucket `visual-references` (Storage) y devuelve `image_url`.
    Luego usa POST /visual-references con ese URL o PATCH para adjuntar a una fila existente.
    """
    db = _get_db()
    raw = await file.read()
    try:
        url = db.upload_visual_reference_image_bytes(
            raw,
            content_type=file.content_type or "application/octet-stream",
            original_filename=file.filename or "reference.png",
        )
    except StoryEngineError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("upload_visual_reference_image_route")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
    return {"ok": True, "image_url": url}


@router.patch("/visual-references/{ref_id}")
async def patch_visual_reference_route(ref_id: str, body: VisualReferencePatch):
    db = _get_db()
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Sin campos para actualizar.")
    try:
        row = await db.update_visual_reference(ref_id, updates)
    except StoryEngineError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("patch_visual_reference_route")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
    return {"ok": True, "reference": row}


@router.delete("/visual-references/{ref_id}")
async def delete_visual_reference_route(ref_id: str):
    db = _get_db()
    try:
        await db.delete_visual_reference(ref_id)
    except StoryEngineError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("delete_visual_reference_route")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
    return {"ok": True, "deleted_id": ref_id}


@router.post("/proactive-feedback")
async def proactive_feedback_route(body: ProactiveFeedbackRequest):
    """
    Asistente apasionado: lee guion + referencias visuales activas + (opcional) ciencia/lore,
    y propone mejoras (física creíble, visceralidad, hooks temporales). No sustituye /generate.
    Requiere `ANTHROPIC_API_KEY` o `OPENAI_API_KEY`. Ver `docs/PROACTIVE_FEEDBACK.md`.
    """
    from app.story_engine.proactivity_engine import run_proactivity_engine

    db = _get_db()
    content = (body.chapter_content or "").strip()
    title = (body.chapter_title or "").strip()

    if body.chapter_id:
        try:
            row = await db.get_chapter(body.chapter_id)
        except StoryEngineError as e:
            raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
        if not row:
            raise HTTPException(status_code=404, detail="Capítulo no encontrado.")
        content = (row.get("script") or "").strip()
        if not title:
            title = str(row.get("title") or "").strip()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Envía `chapter_id` con guion en Supabase o `chapter_content` no vacío.",
        )

    try:
        vrefs = (
            await db.fetch_active_visual_references(limit=80)
            if body.include_visual_refs
            else []
        )
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")

    ok, text, err = await run_proactivity_engine(
        chapter_content=content,
        chapter_title=title,
        visual_refs_rows=vrefs,
        scientific_lore=body.scientific_lore,
    )
    if not ok:
        raise HTTPException(
            status_code=503,
            detail=err or "El motor proactivo no pudo completar.",
        )
    return {
        "ok": True,
        "suggestions_markdown": text,
        "visual_references_used": len(vrefs),
        "chapter_title": title or None,
    }


@router.get("/database-status")
def story_engine_database_status():
    """Verifica Supabase + tablas del Story Engine (sin exponer secretos)."""
    return verify_story_engine_supabase()


@router.get("/memory-progress")
async def story_engine_memory_progress():
    """
    Memoria de avance: último capítulo canónico usado como ancla + `last_chapter_read`
    (narrative_memory). Útil para comprobar que la IA no «repite» sin contexto.
    """
    db = _get_db()
    try:
        anchor = await db.get_latest_canon_anchor_chapter()
        last_read = await db.get_last_chapter_read()
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    anchor_out = None
    if anchor:
        anchor_out = {
            "id": str(anchor.get("id", "")),
            "canon_chapter_number": anchor.get("canon_chapter_number"),
            "day_number": anchor.get("day_number"),
            "slot": anchor.get("slot"),
            "status": anchor.get("status"),
            "title": anchor.get("title"),
            "has_meta_summary": bool((anchor.get("meta_summary") or "").strip()),
        }
    return {
        "latest_canon_anchor": anchor_out,
        "last_chapter_read": last_read,
    }


@router.get("/reader-settings")
async def reader_settings_get(profile_id: str = "default"):
    """
    Ajustes del lector (tamaño de letra, narración activada).
    Tabla: `user_reader_settings` — ejecuta docs/supabase_user_reader_settings.sql.
    Sin Supabase: 200 con defaults y `persisted: false` (el front usa localStorage).
    """
    db = _get_db()
    return await db.get_reader_settings(profile_id)


@router.put("/reader-settings")
async def reader_settings_put(body: ReaderSettingsPayload):
    """Guarda preferencias (debounce recomendado en el cliente). Siempre 200 si el proceso termina."""
    db = _get_db()
    return await db.upsert_reader_settings(
        body.profile_id,
        body.font_size,
        body.narration_enabled,
    )


@router.post("/architect-plot-notes")
async def create_architect_plot_note(body: ArchitectPlotNoteCreate):
    """
    Encola una idea de trama para el espacio de trabajo del Arquitecto.
    El GENERADOR la triangula con runas del Libro Digital (~25 min / 3 actos).
    SQL: docs/supabase_architect_plot_notes.sql
    """
    db = _get_db()
    try:
        row = await db.insert_architect_plot_note(body.raw_plot_idea, body.title)
        out: dict = {"ok": True, "note": row}
        try:
            from app.story_engine.ideas_doc_sync import sync_ideas_doc_after_panel_note

            nid = str((row or {}).get("id") or "")
            if nid:
                out["ideas_document_sync"] = await sync_ideas_doc_after_panel_note(
                    note_id=nid,
                    raw_plot_idea=body.raw_plot_idea,
                    title=body.title or "",
                )
        except Exception as e:
            logger.warning("ideas_document_sync (panel): %s", e)
            out["ideas_document_sync"] = {"ok": False, "error": str(e)[:400]}
        return out
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    except Exception as e:
        logger.exception("create_architect_plot_note")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")


@router.get("/architect-plot-notes")
async def list_architect_plot_notes_route(pending_only: bool = True, limit: int = 40):
    """Lista notas del Arquitecto (por defecto solo pendientes de consumir)."""
    db = _get_db()
    notes = await db.list_architect_plot_notes(pending_only=pending_only, limit=limit)
    return {"notes": notes, "count": len(notes)}


@router.post("/generate")
async def generate_daily_chapters(http_req: Request, req: GenerateRequest):
    """
    Genera 3 capítulos para un día.
    Si no pasas day_number, auto-incrementa desde el último día guardado.
    Triangulación: cola `architect_plot_idea` + runas recientes del Legado (ver `architect_triangulation`).
    """
    # Rate limit: 10 generaciones/hora por IP (cada llamada consume créditos de LLM)
    ip = http_req.client.host if http_req.client else "unknown"
    if is_rate_limited(f"story-generate:{ip}", limit=10, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta de nuevo en una hora.")

    db = _get_db()
    engine = StoryEngine(db)

    day = req.day_number
    if day is None:
        current = await db.get_current_day()
        day = current + 1

    existing = await db.get_daily_chapters(day)
    if existing:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Day {day} already has {len(existing)} chapters. "
                "Use day_number to override or delete rows in Supabase."
            ),
        )

    config_dict: dict | None = None
    if req.generation_config is not None:
        config_dict = req.generation_config.model_dump(mode="python", exclude_none=True)

    try:
        chapters, gen_meta = await engine.generate_daily_chapters(day, generation_config=config_dict)
        cour_ctx = resolve_cour_context(day, config_dict)
        mg_on = master_generator_enabled(config_dict)
        result = {
            "day_number": day,
            "chapters": chapters,
            "count": len(chapters),
            "message": f"Generated {len(chapters)} chapters for day {day}. Review and approve.",
            "generation_config_applied": config_dict,
            "cour_context": cour_ctx,
            "master_generator": {"enabled": mg_on},
            **gen_meta,
        }
        # Notify BOND Bus (fire-and-forget)
        asyncio.ensure_future(emit_event(BondBusEvents.CHAPTER_GENERATED, {
            "day_number": day, "count": len(chapters)
        }))
        return result
    except StoryEngineError:
        raise
    except Exception as e:
        logger.exception("Error generating chapters for day %d", day)
        raise HTTPException(status_code=500, detail="Error interno al generar capítulos. Revisa los logs del servidor.") from e


@router.post("/chapters/regenerate-cascade")
async def regenerate_cascade_chapters(body: RegenerateCascadeRequest):
    """
    BOND OS — «Regenerar desde aquí»:
    - **hard_reset**: colapsa el futuro y regenera desde el pivote.
    - **soft_enrich**: mantiene capítulos futuros (approved/published) y refina su guion con LLM.
    """
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY no configurada en apps/api/.env",
        )
    mode = (body.cascade_mode or "hard_reset").strip().lower().replace("-", "_")
    if mode == "softenrich":
        mode = "soft_enrich"
    if mode not in ("hard_reset", "soft_enrich"):
        raise HTTPException(
            status_code=400,
            detail="cascade_mode debe ser 'hard_reset' o 'soft_enrich'.",
        )

    db = _get_db()
    engine = StoryEngine(db)
    try:
        pivot = await db.get_chapter(body.chapter_id)
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    if not pivot:
        raise HTTPException(status_code=404, detail="Chapter not found")
    st = (pivot.get("status") or "").strip().lower()
    if st == "obsolete":
        raise HTTPException(status_code=400, detail="Este capítulo ya está marcado como obsoleto.")
    if st not in ("draft", "approved", "published", "rejected"):
        raise HTTPException(
            status_code=400,
            detail=f"No se puede usar como pivote con estado '{st}'.",
        )

    day_d = int(pivot.get("day_number") or 0)
    slot_s = int(pivot.get("slot") or 1)
    if day_d < 1 or slot_s not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Pivote con día o slot inválido.")

    note = (body.plot_pivot_note or "").strip()
    if mode == "soft_enrich" and not note:
        raise HTTPException(
            status_code=400,
            detail="En modo enriquecer, plot_pivot_note (detalle de lore) es obligatorio.",
        )

    # ── Modo enriquecer (conservar futuro) ───────────────────────────────
    if mode == "soft_enrich":
        from app.story_engine.lore_forward_sync import run_soft_lore_forward

        event = await db.insert_timeline_event(
            pivot_chapter_id=str(pivot["id"]),
            pivot_canon_number=pivot.get("canon_chapter_number"),
            pivot_day_number=day_d,
            pivot_slot=slot_s,
            plot_pivot_note=note,
            chapters_removed=0,
            generation_day=day_d,
            generation_start_slot=slot_s,
            cascade_mode="soft_enrich",
            chapters_refined=0,
        )
        eid = event.get("id")
        try:
            result = await run_soft_lore_forward(
                db,
                pivot,
                note,
                max_chapters=body.max_future_chapters,
                timeline_event_id=str(eid) if eid else None,
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        except StoryEngineError:
            raise
        except Exception as e:
            logger.exception("regenerate_cascade_chapters (soft_enrich)")
            raise HTTPException(status_code=500, detail="Error interno del servidor.")

        if eid:
            await db.patch_timeline_event_refined_count(str(eid), int(result.get("count") or 0))

        return {
            "ok": True,
            "cascade_mode": "soft_enrich",
            "message": (
                f"Modo enriquecer: {result.get('count', 0)} capítulo(s) refinado(s). "
                "Los eventos principales se conservan; el detalle se integró con IA."
            ),
            "day_number": day_d,
            "start_slot": slot_s,
            "chapters_removed": 0,
            "refined_chapters": result.get("refined_chapters") or [],
            "sync_errors": result.get("errors") or [],
            "timeline_event": {**event, "chapters_refined": int(result.get("count") or 0)},
        }

    # ── Hard reset (comportamiento original) ───────────────────────────
    deleted_ids = db.collect_timeline_cascade_delete_ids(pivot)
    n_del = len(deleted_ids)

    event = await db.insert_timeline_event(
        pivot_chapter_id=str(pivot["id"]),
        pivot_canon_number=pivot.get("canon_chapter_number"),
        pivot_day_number=day_d,
        pivot_slot=slot_s,
        plot_pivot_note=body.plot_pivot_note,
        chapters_removed=n_del,
        generation_day=day_d,
        generation_start_slot=slot_s,
        cascade_mode="hard_reset",
        chapters_refined=0,
    )

    try:
        await db.delete_chapters_by_ids(deleted_ids)
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")

    config_dict: dict | None = None
    if body.generation_config is not None:
        config_dict = body.generation_config.model_dump(mode="python", exclude_none=True)
    merged: dict = dict(config_dict or {})
    if note:
        prev_arch = str(
            merged.get("architect_plot_idea") or merged.get("architectPlotIdea") or ""
        ).strip()
        tag = "[PÁRADOJA / REGENERACIÓN — el autor reescribe el futuro]"
        combo = f"{prev_arch}\n\n{tag}\n{note}" if prev_arch else f"{tag}\n{note}"
        merged["architect_plot_idea"] = combo[:12000]
        merged["timeline_cascade_note"] = note[:4000]

    try:
        chapters, gen_meta = await engine.generate_daily_chapters_from_slot(
            day_d,
            slot_s,
            generation_config=merged if merged else None,
        )
    except StoryEngineError:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.exception("regenerate_cascade_chapters")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

    eid = event.get("id")
    if eid:
        fresh = [
            c
            for c in chapters
            if int(c.get("day_number") or 0) == day_d
            and int(c.get("slot") or 0) >= slot_s
        ]
        await db.stamp_chapters_timeline_branch(
            [str(c.get("id")) for c in fresh if c.get("id")],
            str(eid),
        )

    cour_ctx = resolve_cour_context(day_d, merged if merged else None)
    return {
        "ok": True,
        "cascade_mode": "hard_reset",
        "message": (
            f"Línea temporal colapsada: eliminados {n_del} capítulo(s). "
            f"Nuevo borrador desde día {day_d}, slot {slot_s}. "
            "La continuidad usa el último canon previo (meta-resumen / memoria de avance)."
        ),
        "day_number": day_d,
        "start_slot": slot_s,
        "chapters_removed": n_del,
        "chapters": chapters,
        "timeline_event": event,
        "cour_context": cour_ctx,
        **gen_meta,
    }


@router.post("/chapters/sync-lore-forward")
async def sync_lore_forward_route(body: SyncLoreForwardRequest):
    """
    Libro digital / BOND OS — «Sincronizar lore en el futuro»: mismo flujo que
    `regenerate-cascade` con `cascade_mode=soft_enrich`.
    """
    if not os.getenv("ANTHROPIC_API_KEY", "").strip():
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY no configurada en apps/api/.env",
        )
    db = _get_db()
    try:
        pivot = await db.get_chapter(body.chapter_id)
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    if not pivot:
        raise HTTPException(status_code=404, detail="Chapter not found")
    st = (pivot.get("status") or "").strip().lower()
    if st == "obsolete":
        raise HTTPException(status_code=400, detail="Capítulo obsoleto.")
    if st not in ("draft", "approved", "published", "rejected"):
        raise HTTPException(status_code=400, detail=f"Estado no válido como pivote: '{st}'.")

    day_d = int(pivot.get("day_number") or 0)
    slot_s = int(pivot.get("slot") or 1)
    if day_d < 1 or slot_s not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Pivote con día o slot inválido.")

    from app.story_engine.lore_forward_sync import run_soft_lore_forward

    detail = body.new_detail.strip()
    event = await db.insert_timeline_event(
        pivot_chapter_id=str(pivot["id"]),
        pivot_canon_number=pivot.get("canon_chapter_number"),
        pivot_day_number=day_d,
        pivot_slot=slot_s,
        plot_pivot_note=detail,
        chapters_removed=0,
        generation_day=day_d,
        generation_start_slot=slot_s,
        cascade_mode="soft_enrich",
        chapters_refined=0,
    )
    eid = event.get("id")
    try:
        result = await run_soft_lore_forward(
            db,
            pivot,
            detail,
            max_chapters=body.max_future_chapters,
            timeline_event_id=str(eid) if eid else None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except StoryEngineError:
        raise
    except Exception as e:
        logger.exception("sync_lore_forward_route")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

    if eid:
        await db.patch_timeline_event_refined_count(str(eid), int(result.get("count") or 0))

    return {
        "ok": True,
        "cascade_mode": "soft_enrich",
        "message": f"Lore sincronizado: {result.get('count', 0)} capítulo(s) refinado(s).",
        "refined_chapters": result.get("refined_chapters") or [],
        "sync_errors": result.get("errors") or [],
        "timeline_event": {**event, "chapters_refined": int(result.get("count") or 0)},
    }


@router.get("/timeline-events")
async def list_story_timeline_events(limit: int = 30):
    """Cronología de decisiones (paradojas / regeneraciones)."""
    db = _get_db()
    events = await db.list_timeline_events(limit=limit)
    return {"events": events, "count": len(events)}


# Ruta literal ANTES que /chapters/{day_number}: si no, "latest" se parsea como int.
@router.get("/chapters/latest")
async def get_latest_chapters():
    """Último día con capítulos + cour_context para barra de temporada (Libro Digital)."""
    db = _get_db()
    current_day = await db.get_current_day()
    if current_day == 0:
        return {
            "day_number": 0,
            "chapters": [],
            "message": "No chapters generated yet.",
            "cour_context": cour_context_for_dashboard(0, None),
        }
    chapters = await db.get_daily_chapters(current_day)
    return {
        "day_number": current_day,
        "chapters": chapters,
        "cour_context": cour_context_for_dashboard(current_day, None),
    }


@router.post("/chapters/narrate")
async def narrate_chapter(body: NarrateChapterRequest):
    """
    «La Voz del Multiverso»: texto del capítulo → OpenAI TTS → .mp3 en Supabase Storage.
    Varias URLs si el texto supera el límite por petición (~4096 caracteres).
    """
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY no configurada en apps/api/.env",
        )
    db = _get_db()
    try:
        updated, meta = await _run_narration_for_chapter(
            db,
            body.chapter_id,
            voice=body.voice,
            model=body.tts_model,
            text_source=body.text_source,
            custom_text=body.custom_text,
        )
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("narrate_chapter")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
    return {
        "chapter_id": body.chapter_id,
        "chapter": updated,
        "narration": meta,
        "message": "Narración generada y guardada en Storage + book_payload.narration.",
    }


@router.post("/chapters/manga-illustrate")
async def manga_illustrate_chapter(body: MangaIllustrateRequest):
    """
    **Fase Manga** del ciclo Novela → Manga → Animación.

    Requiere capítulo **approved**, `production_phase` en `manga` o `animation`.
    Genera imágenes Flux por panel (estilo webtoon) y avanza a `animation` (listo para motor video futuro).

    SQL: `docs/supabase_production_phase.sql`
    """
    from app.story_engine.manga_pipeline import run_manga_keyframe_illustration

    db = _get_db()
    ch = await db.get_chapter(body.chapter_id)
    if not ch:
        raise HTTPException(status_code=404, detail="Chapter not found")

    if ch.get("status") != "approved":
        raise HTTPException(
            status_code=400,
            detail="Solo capítulos **approved** (novela en canon). Publica al Legado después.",
        )

    phase = str(ch.get("production_phase") or "novel").lower()
    if phase not in ("manga", "animation"):
        raise HTTPException(
            status_code=400,
            detail=(
                f"Fase de producción «{phase}». Tras aprobar, la fase debe ser «manga». "
                "Ejecuta docs/supabase_production_phase.sql si falta la columna."
            ),
        )

    try:
        new_panels, n, msg = await run_manga_keyframe_illustration(
            ch,
            max_panels=body.max_panels,
            overwrite=body.overwrite,
        )
        updated = await db.update_chapter_panels_and_production_phase(
            body.chapter_id,
            new_panels,
            "animation",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    except Exception as e:
        logger.exception("manga_illustrate_chapter")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

    return {
        "chapter_id": body.chapter_id,
        "chapter": updated,
        "panels_illustrated": n,
        "production_phase": updated.get("production_phase"),
        "message": msg,
    }


@router.post("/chapters/voice-local")
async def chapter_voice_local(body: VoiceLocalRequest):
    """
    OpenAI TTS → ``apps/api/static/audio/chapter_<id>.mp3`` (voz **onyx** por defecto).

    Reproduce desde el front: ``GET {API_PUBLIC_URL}/static/audio/chapter_<id>.mp3``
    (por defecto ``http://localhost:8000/...``). Alternativa sin disco: **POST /chapters/narrate** (Storage).
    """
    if not os.getenv("OPENAI_API_KEY", "").strip():
        raise HTTPException(
            status_code=503,
            detail="OPENAI_API_KEY no configurada en apps/api/.env",
        )
    from app.story_engine.narration_tts import generate_chapter_voice_local

    text = (body.text or "").strip()
    db = _get_db()
    if not text:
        try:
            ch = await db.get_chapter(body.chapter_id)
        except StoryEngineError as e:
            raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
        if not ch:
            raise HTTPException(status_code=404, detail="Chapter not found")
        text = (ch.get("script") or "").strip()
        if not text:
            raise HTTPException(status_code=400, detail="Capítulo sin guion y sin texto en el body.")

    try:
        result = await asyncio.to_thread(
            generate_chapter_voice_local,
            body.chapter_id,
            text,
            voice=body.voice,
            model=body.tts_model,
        )
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    except Exception as e:
        logger.exception("chapter_voice_local")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

    updated: dict | None = None
    if body.persist_in_chapter:
        try:
            updated = await db.attach_narration_audio(
                body.chapter_id,
                urls=list(result.get("urls") or []),
                voice=str(result.get("voice") or "onyx"),
                model=str(result.get("model") or "tts-1-hd"),
                text_source="script",
            )
        except Exception as e:
            logger.warning("voice-local persist_in_chapter: %s", e)

    out: dict = {
        "chapter_id": body.chapter_id,
        "url": result.get("url"),
        "urls": result.get("urls"),
        "voice": result.get("voice"),
        "model": result.get("model"),
        "segments": result.get("segments"),
        "message": (
            "Audio generado en static/audio. Sirve bajo /static/audio/… "
            "Ajusta API_PUBLIC_URL en .env si el front no está en el mismo host."
        ),
    }
    if updated:
        out["chapter"] = updated
    return out


@router.get("/chapters/{day_number}")
async def get_day_chapters(day_number: int):
    """Todos los capítulos de un día."""
    db = _get_db()
    chapters = await db.get_daily_chapters(day_number)
    if not chapters:
        raise HTTPException(status_code=404, detail=f"No chapters found for day {day_number}")
    return {"day_number": day_number, "chapters": chapters}


@router.post("/approve")
async def approve_chapter(req: ApproveRequest):
    """
    Aprueba o rechaza un capítulo.
    Si apruebas: canon (número global + slug), book_payload novela+manga + anexo de lore
    (bestiario, ficha Aren, diccionario rúnico), world_state fusionado.
    """
    if req.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    db = _get_db()
    try:
        updated = await db.update_chapter_status(req.chapter_id, req.status, req.notes)
    except StoryEngineError as e:
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    if not updated:
        raise HTTPException(status_code=404, detail="Chapter not found")
    out: dict = {"chapter_id": req.chapter_id, "status": req.status, "chapter": updated}
    if req.status == "approved":
        w_day, w_snap = await db.get_latest_world_state()
        out["world_state"] = w_snap
        out["world_state_anchor_day"] = w_day
        try:
            from app.story_engine.ideas_doc_sync import sync_ideas_doc_after_approve

            out["ideas_document_sync"] = await sync_ideas_doc_after_approve(updated, req.notes or "")
        except Exception as e:
            logger.warning("ideas_document_sync (approve): %s", e)
            out["ideas_document_sync"] = {"ok": False, "error": str(e)[:400]}
    return out


@router.post("/finalize")
async def finalize_chapter_legado(req: FinalizeChapterRequest):
    """
    Aprueba (canon) → **Publicado**: meta-resumen, índice diario (story_day_summaries),
    símbolos/Bond OS en narrative_memory. Coherencia para capítulos siguientes.
    """
    db = _get_db()
    try:
        updated = await db.finalize_chapter(req.chapter_id)
    except StoryEngineError as e:
        msg = str(e)
        code = 400 if "Solo se puede finalizar" in msg else 503
        raise HTTPException(status_code=code, detail=msg) from e
    if not updated:
        raise HTTPException(status_code=404, detail="Chapter not found")

    hero_url: str | None = None
    hero_scene: str | None = None
    hero_skipped: str | None = None
    if req.generate_hero_illustration:
        from app.story_engine.visual_motor import get_replicate_token, run_hero_illustration_pipeline

        if not get_replicate_token():
            hero_skipped = "REPLICATE_API_TOKEN no configurada en apps/api/.env"
        else:
            bp = updated.get("book_payload") or {}
            hero_existing = updated.get("hero_image_url") or (
                isinstance(bp, dict) and (bp.get("hero_image") or {}).get("url")
            )
            if hero_existing:
                hero_skipped = "Ya hay ilustración hero — no se regenera"
            else:
                try:
                    merged = {**updated}
                    url, scene = await run_hero_illustration_pipeline(merged)
                    hero_scene = scene or None
                    if url:
                        updated = await db.attach_hero_illustration(req.chapter_id, url, scene)
                        hero_url = url
                    else:
                        hero_skipped = "Replicate no devolvió URL (revisa logs y créditos)"
                except Exception as e:
                    logger.exception("Hero illustration pipeline")
                    hero_skipped = str(e)[:240]

    msg = "Capítulo integrado al Legado Laguna."
    if hero_url:
        msg += " Ilustración hero guardada (Replicate)."
    elif hero_skipped:
        msg += f" ({hero_skipped})"

    narr_urls: list[str] = []
    narr_skipped: str | None = None
    if req.generate_narration_audio:
        if not os.getenv("OPENAI_API_KEY", "").strip():
            narr_skipped = "OPENAI_API_KEY no configurada en apps/api/.env"
        else:
            try:
                updated, nmeta = await _run_narration_for_chapter(
                    db,
                    req.chapter_id,
                    voice=req.narration_voice,
                    model=req.narration_model,
                    text_source="script",
                    custom_text="",
                )
                narr_urls = list(nmeta.get("urls") or [])
                if narr_urls:
                    msg += " Narración TTS guardada (OpenAI + Storage)."
            except StoryEngineError as e:
                narr_skipped = str(e)[:280]
            except HTTPException as he:
                d = he.detail
                narr_skipped = (
                    str(d[0] if isinstance(d, list) and d else d)[:280]
                    if d is not None
                    else str(he)[:280]
                )
            except Exception as e:
                logger.exception("Narration TTS on finalize")
                narr_skipped = str(e)[:280]
        if narr_skipped:
            msg += f" (Narración: {narr_skipped})"

    return {
        "chapter_id": req.chapter_id,
        "status": "published",
        "chapter": updated,
        "hero_image_url": hero_url,
        "hero_scene_prompt_en": hero_scene,
        "hero_illustration_skipped": hero_skipped,
        "narration_audio_urls": narr_urls,
        "narration_skipped": narr_skipped,
        "message": msg,
    }


@router.post("/edit")
async def record_edit(req: EditRequest):
    """Registra una edición para que MemoryAgent aprenda."""
    db = _get_db()
    edit = await db.save_edit(
        chapter_id=req.chapter_id,
        field=req.field,
        original=req.original,
        edited=req.edited,
        reason=req.reason,
    )
    return {"edit_id": edit.get("id"), "message": "Edit recorded. MemoryAgent will learn from this."}


@router.post("/learn")
async def trigger_learning():
    """Procesa edits no aprendidos y actualiza reglas / memoria."""
    db = _get_db()
    agent = MemoryAgent(db)
    result = await agent.process_edits()
    return {
        "edits_processed": result["learned"],
        "new_rules": result["new_rules"],
        "memory_updates": result["memory_updates"],
        "message": (
            f"Learned from {result['learned']} edits. {len(result['new_rules'])} new rules added."
        ),
    }


@router.post("/rules")
async def add_rule(req: RuleRequest):
    """Añade una regla editorial manual."""
    db = _get_db()
    rule = await db.add_editorial_rule(req.rule, source="human", priority=req.priority)
    return {"rule_id": rule.get("id"), "rule": req.rule}


@router.post("/arcs")
async def create_arc(req: ArcRequest):
    """Crea un arco narrativo."""
    db = _get_db()
    arc = await db.create_arc(
        name=req.name,
        description=req.description,
        day_start=req.day_start,
        themes=req.themes,
        symbols=req.symbols,
    )
    return {"arc": arc}


@router.get("/symbols")
async def get_symbols():
    """Símbolos plantados (pistas de juego)."""
    db = _get_db()
    symbols = await db.get_all_symbols()
    return {"symbols": symbols, "count": len(symbols)}


@router.get("/world-state")
async def get_world_state():
    """Estado del mundo tras últimos capítulos canónicos (último snapshot en world_state)."""
    db = _get_db()
    w_day, state = await db.get_latest_world_state()
    return {"day_number": w_day, "world_state": state}


@router.get("/chronicle-book")
async def get_chronicle_book(limit: int = 200, legado: str | None = None):
    """
    Libro digital: entradas con canon_chapter_number.
    `legado=published` — solo publicados (meta-resumen + índice cerrado).
    """
    db = _get_db()
    pub_only = (legado or "").lower() in ("published", "legado", "1", "true", "yes")
    entries = await db.list_chronicle_book(
        limit=min(max(limit, 1), 500),
        published_only=pub_only,
    )
    return {
        "count": len(entries),
        "entries": entries,
        "published_only": pub_only,
        "message": (
            "Solo entradas publicadas al Legado (meta-resumen aplicado)."
            if pub_only
            else "Canon (approved o published). Usa ?legado=published para el índice cerrado."
        ),
    }


# ── "El libro es la llave" — story_secrets (Bond OS) ─────────────────────────


@router.post("/secrets")
async def create_story_secret(body: StorySecretCreate):
    """
    Alta de un secreto ligado a un capítulo (herramienta / pipeline).
    El jugador debe inferir secret_code leyendo la narrativa.
    """
    db = _get_db()
    try:
        row = await db.create_story_secret(
            chapter_id=body.chapter_id,
            secret_code=body.secret_code,
            hint_text=body.hint_text,
            reward_data=body.reward_data,
        )
    except Exception as e:
        logger.exception("create_story_secret")
        raise HTTPException(
            status_code=503,
            detail="No se pudo crear el secreto. Verifica que la tabla story_secrets esté creada.",
        ) from e
    if not row:
        raise HTTPException(status_code=400, detail="Insert sin filas devueltas")
    row.pop("secret_code", None)
    return {"secret": row}


@router.get("/secrets/chapter/{chapter_id}")
async def list_story_secrets_for_chapter(chapter_id: UUID):
    """Pistas y estado de bloqueo para el cliente de juego (sin revelar el código)."""
    db = _get_db()
    try:
        items = await db.list_story_secrets_for_chapter(str(chapter_id))
    except Exception as e:
        logger.exception("list_story_secrets_for_chapter")
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    return {"chapter_id": str(chapter_id), "secrets": items, "count": len(items)}


@router.post("/secrets/verify")
async def verify_story_secret(body: StorySecretVerify):
    """
    El jugador envía lo que cree haber leído en el libro.
    Si coincide, desbloquea reward_data (y marca is_discovered en Supabase).
    """
    db = _get_db()
    try:
        result = await db.verify_and_unlock_story_secret(body.chapter_id, body.secret_code)
    except Exception as e:
        logger.exception("verify_story_secret")
        raise HTTPException(status_code=503, detail="Servicio externo no disponible.")
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Código incorrecto o capítulo sin secretos — lee el capítulo con atención.",
        )
    return {"ok": True, **result}
