import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.pipelines.manga_flow import run_manga_flow
from app.utils.rate_limit import is_rate_limited

logger = logging.getLogger(__name__)

router = APIRouter()


class MangaRequest(BaseModel):
    beats: list[str]
    """Persistencia en storage/S{season}/E{chapter}_NombreCapitulo/ (ver season_number, chapter_title)."""
    chapter_number: int = Field(default=1, ge=1)
    season_number: int = Field(default=1, ge=1)
    chapter_title: str | None = Field(default=None, description="Título del episodio para la carpeta E{n}_slug")
    narrative_language: Literal["es", "en", "fr"] | None = Field(
        default=None,
        description="Fuerza idioma de novela + corrector (omitir = inferir desde el beat).",
    )
    tome_title: str | None = Field(
        default=None,
        description='Línea de serie en la crónica HTML, ej. "Tomo 1 — Crónicas de Aethel-Arévalo".',
    )


@router.post("/pipeline/manga")
async def manga_pipeline(http_req: Request, request: MangaRequest):
    """Pipeline producción: beats corregidos → novela → diseño (world_lore lock) → imágenes → anime + animation_metadata → storage/S#/E#_slug/."""
    # Rate limit: 3 pipelines/hora por IP (cada pipeline puede generar imágenes y llamadas LLM)
    ip = http_req.client.host if http_req.client else "unknown"
    if is_rate_limited(f"manga-pipeline:{ip}", limit=3, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta de nuevo en una hora.")

    if not request.beats:
        raise HTTPException(status_code=400, detail="At least one beat is required")

    try:
        result = await run_manga_flow(
            beats=request.beats,
            chapter_number=request.chapter_number,
            season_number=request.season_number,
            chapter_title=request.chapter_title,
            narrative_language=request.narrative_language,
            tome_title=request.tome_title,
        )
        return result
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in manga pipeline (chapter=%d, season=%d)", request.chapter_number, request.season_number)
        raise HTTPException(status_code=500, detail="Error interno al ejecutar el pipeline.")
