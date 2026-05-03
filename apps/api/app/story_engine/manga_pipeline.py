"""
Fase Manga — keyframes desde paneles del guion → Replicate (estilo Solo Leveling).

Los paneles y `image_prompt` se generaron en fase novela con el contexto de
`visual_references` (biblia de producción); coherencia manga/anime depende de
esa base. Ver docs/PRODUCTION_BIBLE.md.

Requiere capítulo en fase `manga` (novela ya aprobada en canon).
Tras éxito → `production_phase = animation` (listo para motor de video futuro).
"""

from __future__ import annotations

import logging
from typing import Any

from app.story_engine.visual_motor import (
    build_manga_webtoon_panel_prompt,
    generate_manga_panel_image_url,
    generate_styled_panel_image_url,
    get_replicate_token,
)
from app.story_engine.style_engine import build_styled_prompt, get_style

logger = logging.getLogger(__name__)


async def run_manga_keyframe_illustration(
    chapter: dict[str, Any],
    *,
    max_panels: int = 6,
    overwrite: bool = False,
    style_id: str | None = None,
) -> tuple[list[dict[str, Any]], int, str]:
    """
    Ilustra hasta `max_panels` paneles que tengan descripción.

    Returns:
        (panels_actualizados, count_con_url_nueva, mensaje)
    """
    if not get_replicate_token():
        raise ValueError("REPLICATE_API_TOKEN no configurada — no se pueden generar paneles manga.")

    raw = chapter.get("panels") or []
    if not isinstance(raw, list) or not raw:
        raise ValueError(
            "No hay paneles en el capítulo. Genera primero con el GENERADOR (JSON con `panels`)."
        )

    title = str(chapter.get("title") or "")
    new_panels: list[dict[str, Any]] = []
    illustrated = 0
    budget = max(1, min(max_panels, 12))

    for i, p in enumerate(raw):
        if not isinstance(p, dict):
            new_panels.append({})
            continue

        panel = dict(p)
        desc = str(panel.get("description") or "").strip()
        if not desc:
            new_panels.append(panel)
            continue

        has_url = bool((panel.get("image_url") or "").strip())
        if has_url and not overwrite:
            new_panels.append(panel)
            continue

        if illustrated >= budget:
            new_panels.append(panel)
            continue

        ip = panel.get("image_prompt")
        ip_s = str(ip).strip() if ip else None

        if style_id:
            # Use style engine for prompt + model selection
            styled_prompt, style_params = build_styled_prompt(
                scene_description=desc,
                style_id=style_id,
                panel_composition=str(panel.get("composition") or ""),
            )
            try:
                url = await generate_styled_panel_image_url(
                    prompt=styled_prompt,
                    model=style_params["model"],
                    aspect_ratio=style_params["params"].get("aspect_ratio"),
                    extra_params={
                        k: v
                        for k, v in style_params["params"].items()
                        if k not in ("prompt", "aspect_ratio")
                    },
                )
            except Exception as e:
                logger.warning("manga panel %s styled replicate: %s", i, e)
                url = None
        else:
            prompt = build_manga_webtoon_panel_prompt(desc, ip_s, title, i)
            try:
                url = await generate_manga_panel_image_url(prompt)
            except Exception as e:
                logger.warning("manga panel %s replicate: %s", i, e)
                url = None

        if url:
            panel["image_url"] = url
            panel["image_provider"] = "replicate_flux_manga"
            illustrated += 1
            logger.info("Manga panel %s illustrado: %s…", i, url[:48])
        new_panels.append(panel)

    msg = f"Paneles manga: {illustrated} imagen(es) nuevas (tope {budget})."
    return new_panels, illustrated, msg
