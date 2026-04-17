"""
Compatibilidad: el pipeline maestro vive en ``production_pipeline``.
World Engine importa ``_synthesize_panels_from_beats`` desde aquí.
"""

from __future__ import annotations

from app.pipelines.production_pipeline import (
    _synthesize_panels_from_beats,
    run_production_pipeline,
)

__all__ = [
    "_synthesize_panels_from_beats",
    "run_manga_flow",
    "run_production_pipeline",
]


async def run_manga_flow(
    beats: list[str],
    *,
    chapter_number: int = 1,
    season_number: int = 1,
    chapter_title: str | None = None,
    narrative_language: str | None = None,
    tome_title: str | None = None,
):
    """Delega en ``run_production_pipeline`` (carpeta ``storage/S#/E#_slug/``)."""
    return await run_production_pipeline(
        beats,
        season_number=season_number,
        episode_number=chapter_number,
        chapter_title=chapter_title,
        narrative_language=narrative_language,
        tome_title=tome_title,
    )
