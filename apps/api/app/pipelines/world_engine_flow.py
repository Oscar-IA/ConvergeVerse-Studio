import logging
import re
import time

from app.agents import ImageAgent
from app.agents.base import AgentContext
from app.agents.narrative_world_agent import NarrativeWorldAgent
from app.core.lore_loader import load_lore
from app.core.world_visual import format_world_visual_bible
from app.pipelines.manga_flow import _synthesize_panels_from_beats
from app.world_engine.repository import WorldRepository

logger = logging.getLogger(__name__)


def _slug(s: str) -> str:
    x = re.sub(r"[^a-z0-9]+", "-", (s or "").lower()).strip("-")
    return x or "chapter"


async def run_world_engine_flow(
    beats: list[str],
    *,
    persist: bool = False,
    season_slug: str | None = None,
    season_title: str | None = None,
    chapter_number: int | None = None,
    chapter_title: str | None = None,
    chapter_slug: str | None = None,
) -> dict:
    """
    3-step pipeline: Novel prose → Manga storyboard (from novel) → Anime VFX proposals → panel images.
    Optionally persists each format under Season > Chapter in SQLite.
    """
    t0 = time.perf_counter()
    lore = load_lore()
    world_cfg = lore.get("world_config") or {}
    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else None
    visual_bible = format_world_visual_bible(
        world_cfg if isinstance(world_cfg, dict) else {},
        world_lore=wl,
    )

    context = AgentContext(beats=beats, lore=lore)
    context.extra["world_visual_bible"] = visual_bible

    narrative = NarrativeWorldAgent()
    t_n = time.perf_counter()
    n_result = await narrative.run_three_step_pipeline(context)
    novel_ms = int((time.perf_counter() - t_n) * 1000)

    if not n_result.success:
        return {
            "workflow": ["novel", "manga", "anime_vfx", "images"],
            "novel": n_result.data.get("novel", ""),
            "script": "",
            "panels": [],
            "anime_vfx": [],
            "error": n_result.error,
            "timings_ms": {"narrative_three_step": novel_ms, "images": 0, "total": int((time.perf_counter() - t0) * 1000)},
            "image_urls": [],
            "images_generated": 0,
            "image_errors": [],
            "persisted": None,
        }

    novel = n_result.data.get("novel", "")
    script = n_result.data.get("script", "")
    panels_data = n_result.data.get("panels", [])
    anime_vfx = n_result.data.get("anime_vfx", [])

    if not panels_data:
        logger.warning("World engine: 0 panels — synthesizing from beats")
        panels_data = _synthesize_panels_from_beats(beats)

    context.extra["panels_data"] = panels_data
    context.extra["script"] = script
    context.extra["novel"] = novel

    image_agent = ImageAgent()
    t_i = time.perf_counter()
    image_result = await image_agent.generate(context)
    images_ms = int((time.perf_counter() - t_i) * 1000)

    image_errors: list[dict] = []
    if image_result.success:
        panels = image_result.data.get("panels", [])
        image_errors = image_result.data.get("image_errors", [])
    else:
        panels = [
            {
                "scene_index": p.get("scene_index", i),
                "description": p.get("description", ""),
                "dialogue": p.get("dialogue"),
                "image_url": None,
                "image_error": image_result.error,
                "prompt_used": p.get("image_prompt"),
            }
            for i, p in enumerate(panels_data)
        ]

    image_urls = [p["image_url"] for p in panels if p.get("image_url")]
    total_ms = int((time.perf_counter() - t0) * 1000)

    persisted: dict | None = None
    if persist and season_slug and chapter_number is not None:
        try:
            repo = WorldRepository()
            stitle = season_title or season_slug
            sid = repo.upsert_season(season_slug, stitle)
            cslug = chapter_slug or _slug(chapter_title or f"ch-{chapter_number}")
            ct = chapter_title or f"Chapter {chapter_number}"
            cid = repo.upsert_chapter(sid, chapter_number, cslug, ct)

            repo.save_format_content(
                cid,
                "novel",
                {"prose": novel, "beats": beats, "timings_ms": {"narrative": novel_ms}},
            )
            repo.save_format_content(
                cid,
                "manga",
                {
                    "script": script,
                    "panels_data": panels_data,
                    "panels_rendered": panels,
                    "image_urls": image_urls,
                    "image_errors": image_errors,
                    "timings_ms": {"images": images_ms},
                },
            )
            repo.save_format_content(
                cid,
                "anime",
                {"vfx_proposals": anime_vfx, "source_novel_excerpt": novel[:4000]},
            )
            persisted = {
                "season_id": sid,
                "chapter_id": cid,
                "formats": ["novel", "manga", "anime"],
            }
            repo.close()
        except Exception as e:
            logger.exception("Persist failed")
            persisted = {"error": str(e)}

    return {
        "workflow": ["novel", "manga_storyboard", "anime_vfx", "panel_images"],
        "novel": novel,
        "script": script,
        "panels": panels,
        "anime_vfx": anime_vfx,
        "beats_processed": len(beats),
        "image_urls": image_urls,
        "images_generated": len(image_urls),
        "timings_ms": {
            "narrative_three_step": novel_ms,
            "images": images_ms,
            "total": total_ms,
        },
        "image_errors": image_errors,
        "persisted": persisted,
    }
