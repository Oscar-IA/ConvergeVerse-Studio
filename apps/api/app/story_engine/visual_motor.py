"""
Motor visual BOND OS — Replicate (Flux) + Prompt Maestro Laguna Legacy.

La clave va SOLO en el entorno: REPLICATE_API_TOKEN en apps/api/.env
(nunca en código; load_dotenv en main.py la carga al arrancar uvicorn).
"""

from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from app.core.laguna_legacy_visual_master import COMPACT_COVER_PROMPT_EN
from app.core.llm_completion import llm_complete_text

logger = logging.getLogger(__name__)

DEFAULT_FLUX_MODEL = os.getenv("REPLICATE_FLUX_MODEL", "black-forest-labs/flux-schnell")
DEFAULT_ASPECT = os.getenv("REPLICATE_HERO_ASPECT_RATIO", "16:9")
MANGA_PANEL_ASPECT = os.getenv("REPLICATE_MANGA_ASPECT_RATIO", "2:3")
MAX_PROMPT_CHARS = int(os.getenv("REPLICATE_HERO_PROMPT_MAX", "1900"))
MAX_MANGA_PANEL_PROMPT_CHARS = int(os.getenv("REPLICATE_MANGA_PROMPT_MAX", "1600"))


def get_replicate_token() -> str:
    """Token desde entorno (misma variable que ImageAgent / crónicas)."""
    return (os.getenv("REPLICATE_API_TOKEN") or "").strip()


def build_hero_illustration_prompt(
    chapter_title: str,
    scene_description: str,
) -> str:
    """
    Prompt maestro del Libro de Crónicas + escena clave (manga en el interior del libro).
    Inglés para mejor adherencia en Flux.
    """
    title = (chapter_title or "ConvergeVerse").strip()[:160]
    scene = (scene_description or "").strip().replace("\n", " ")
    if len(scene) > 900:
        scene = scene[:897] + "…"

    core = (
        f"Cinematic product photography, open ancient chronicle book «CONVERGEVERSE: THE LAGUNA LEGACY», "
        f"chapter mood «{title}». Dark weathered leather cover, gold leaf tree-of-life crest entwined with sword. "
        f"Inner spread: yellowed cream parchment #f4ecd8, thin neon cyan digital frames Bond OS Orbet. "
        f"Embedded manga panels Solo Leveling cinematic lighting, scholar with Konosuba exaggerated comedy face, "
        f"royal observers serious. KEY SCENE TO DEPICT IN PANELS: {scene}. "
        f"Hyperrealistic, 8k detail, subtle neon glow, dramatic chiaroscuro, single cohesive shot."
    )
    # Refuerzo con compact Laguna si cabe
    tail = COMPACT_COVER_PROMPT_EN[:400]
    out = f"{core} {tail}"
    return out[:MAX_PROMPT_CHARS]


def _replicate_run_sync(prompt: str, aspect_ratio: str) -> str | None:
    token = get_replicate_token()
    if not token:
        logger.warning("REPLICATE_API_TOKEN no configurada — omite ilustración Replicate.")
        return None
    os.environ["REPLICATE_API_TOKEN"] = token
    try:
        import replicate

        out = replicate.run(
            DEFAULT_FLUX_MODEL,
            input={
                "prompt": prompt[:MAX_PROMPT_CHARS],
                "aspect_ratio": aspect_ratio,
            },
        )
        if isinstance(out, str) and out.startswith("http"):
            return out
        if isinstance(out, (list, tuple)) and out:
            u = out[0]
            if isinstance(u, str) and u.startswith("http"):
                return u
        url = getattr(out, "url", None)
        if url and str(url).startswith("http"):
            return str(url)
    except Exception as e:
        logger.exception("Replicate hero illustration: %s", e)
    return None


async def generate_chapter_illustration_url(
    chapter_title: str,
    scene_description: str,
    *,
    aspect_ratio: str | None = None,
) -> str | None:
    """Devuelve URL de imagen o None si no hay token / fallo."""
    ar = aspect_ratio or DEFAULT_ASPECT
    prompt = build_hero_illustration_prompt(chapter_title, scene_description)
    return await asyncio.to_thread(_replicate_run_sync, prompt, ar)


def fallback_scene_from_chapter(chapter: dict[str, Any]) -> str:
    """Sin LLM: primera descripción de panel o extracto de guion."""
    panels = chapter.get("panels") or []
    if isinstance(panels, list):
        for p in panels:
            if isinstance(p, dict):
                d = (p.get("description") or "").strip()
                if d:
                    return d[:900]
    script = (chapter.get("script") or "").strip().replace("\n", " ")
    return script[:700] if script else "A scholar archivist reacts to a mysterious glowing Orbet in a royal archive hall."


async def extract_key_scene_visual_description(chapter: dict[str, Any]) -> str:
    """
    «Cerebro» BOND OS: una frase/ párrafo corto EN para la imagen.
    Usa BOND Central → Anthropic directo → heurística como fallback.
    """
    script = (chapter.get("script") or "").strip()
    meta = (chapter.get("meta_summary") or "").strip()
    if not script and not meta:
        return fallback_scene_from_chapter(chapter)

    try:
        ok, text, _ = await llm_complete_text(
            system=(
                "You output ONE short English paragraph (max 80 words) describing the single "
                "strongest visual scene for a manga panel inside a fantasy chronicle book. "
                "No dialogue in quotes; focus on composition, characters, lighting, Orbet/cyan glow if relevant."
            ),
            user=(
                f"Chapter title: {chapter.get('title', '')}\n\n"
                f"Meta-summary:\n{meta[:2000]}\n\nScript excerpt:\n{script[:6000]}"
            ),
            max_tokens=400,
            temperature=0.4,
        )
        if ok and text and len(text) > 20:
            return text[:900]
    except Exception as e:
        logger.warning("extract_key_scene_visual_description LLM: %s", e)

    return fallback_scene_from_chapter(chapter)


def build_manga_webtoon_panel_prompt(
    description_es: str,
    image_prompt_en: str | None,
    chapter_title: str,
    panel_index: int,
) -> str:
    """
    Prompt EN estilo Solo Leveling / manhwa para un keyframe de panel (Replicate Flux).
    """
    title = (chapter_title or "ConvergeVerse").strip()[:120]
    scene = (image_prompt_en or description_es or "").strip().replace("\n", " ")
    if len(scene) > 700:
        scene = scene[:697] + "…"

    core = (
        f"Solo Leveling webtoon manhwa style, vertical comic panel, cinematic lighting, "
        f"sharp ink lines, glowing magical runes and cyan Orbet energy accents, "
        f"dramatic shadows, Korean action manhwa composition, panel {panel_index + 1} "
        f"of chapter «{title}». Scholar archivist NPC aesthetic mixed with epic fantasy scale. "
        f"KEY VISUAL: {scene}. "
        f"No speech bubbles, no UI text, high detail digital illustration."
    )
    tail = COMPACT_COVER_PROMPT_EN[:280]
    out = f"{core} {tail}"
    return out[:MAX_MANGA_PANEL_PROMPT_CHARS]


async def generate_manga_panel_image_url(prompt: str) -> str | None:
    """Un panel manga 2:3 (o ratio env) vía Replicate."""
    if not get_replicate_token():
        return None
    return await asyncio.to_thread(_replicate_run_sync, prompt, MANGA_PANEL_ASPECT)


async def run_hero_illustration_pipeline(chapter: dict[str, Any]) -> tuple[str | None, str]:
    """
    Escena clave → Replicate → URL.
    Returns (image_url_or_none, scene_prompt_used).
    """
    if not get_replicate_token():
        return None, ""
    title = str(chapter.get("title") or "")
    scene = await extract_key_scene_visual_description(chapter)
    url = await generate_chapter_illustration_url(title, scene)
    return url, scene
