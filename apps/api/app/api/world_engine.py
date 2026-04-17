import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.pipelines.world_engine_flow import run_world_engine_flow
from app.utils.rate_limit import is_rate_limited
from app.world_engine.repository import WorldRepository

logger = logging.getLogger(__name__)

router = APIRouter()


class WorldEnginePipelineRequest(BaseModel):
    beats: list[str] = Field(..., min_length=1)
    persist: bool = False
    season_slug: str | None = None
    season_title: str | None = None
    chapter_number: int | None = None
    chapter_title: str | None = None
    chapter_slug: str | None = None


@router.post("/world-engine/pipeline")
async def world_engine_pipeline(http_req: Request, request: WorldEnginePipelineRequest):
    """
    World Engine: Novel → Manga storyboard (from novel) → Anime VFX → images.
    Hierarchy in DB: Season > Chapter > formats (novel | manga | anime).
    """
    # Rate limit: 5 pipelines/hora por IP (cada llamada puede consumir créditos de OpenAI/Replicate)
    ip = http_req.client.host if http_req.client else "unknown"
    if is_rate_limited(f"world-pipeline:{ip}", limit=5, window_seconds=3600):
        raise HTTPException(status_code=429, detail="Demasiadas solicitudes. Intenta de nuevo en una hora.")

    if not request.beats:
        raise HTTPException(status_code=400, detail="At least one beat is required")

    if request.persist:
        if not request.season_slug or request.chapter_number is None:
            raise HTTPException(
                status_code=400,
                detail="When persist=true, season_slug and chapter_number are required",
            )

    try:
        return await run_world_engine_flow(
            request.beats,
            persist=request.persist,
            season_slug=request.season_slug,
            season_title=request.season_title,
            chapter_number=request.chapter_number,
            chapter_title=request.chapter_title,
            chapter_slug=request.chapter_slug,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in world-engine pipeline")
        raise HTTPException(status_code=500, detail="Error interno del servidor. Revisa los logs.") from e


@router.get("/world-engine/library")
def world_engine_library():
    """All seasons with chapters and which formats are saved."""
    try:
        repo = WorldRepository()
        tree = repo.library_tree()
        repo.close()
        return {"seasons": tree}
    except Exception:
        logger.exception("Error loading world-engine library")
        raise HTTPException(status_code=500, detail="Error interno del servidor.")


@router.get("/world-engine/chapters/{chapter_id}")
def world_engine_chapter(chapter_id: int):
    """Load all saved formats for a chapter."""
    try:
        repo = WorldRepository()
        ch = repo.get_chapter(chapter_id)
        if not ch:
            repo.close()
            raise HTTPException(status_code=404, detail="Chapter not found")
        novel = repo.get_format_content(chapter_id, "novel")
        manga = repo.get_format_content(chapter_id, "manga")
        anime = repo.get_format_content(chapter_id, "anime")
        repo.close()
        return {
            "chapter": ch,
            "novel": novel,
            "manga": manga,
            "anime": anime,
        }
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error loading chapter %d", chapter_id)
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
