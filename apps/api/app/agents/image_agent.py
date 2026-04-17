import asyncio
import logging
import os
import time
from urllib.parse import quote

from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.core.visual_style import build_image_prompt

logger = logging.getLogger(__name__)

_DEFAULT_TIMEOUT = int(os.getenv("REPLICATE_TIMEOUT_SEC", "180"))
_POLLINATIONS_FALLBACK = os.getenv("POLLINATIONS_FALLBACK", "true").lower() in ("1", "true", "yes")
_POLLINATIONS_MAX_PROMPT = 900
_POLLINATIONS_WIDTH = int(os.getenv("POLLINATIONS_WIDTH", "768"))
_POLLINATIONS_HEIGHT = int(os.getenv("POLLINATIONS_HEIGHT", "1024"))

# When Replicate fails: "pollinations" (default) then design preview; "design" = skip Pollinations, use static preview fast.
_REPLICATE_FAIL_FALLBACK = os.getenv("REPLICATE_FAIL_FALLBACK", "pollinations").strip().lower()
# Base URL of the Next app (e.g. http://localhost:3000) so <img> can load /public/manga-placeholders/*.svg
_WEB_APP_PUBLIC_URL = os.getenv("WEB_APP_PUBLIC_URL", "").strip().rstrip("/")

# Always-reachable sample URLs (no Replicate) — dark frames for manga layout preview
_SAMPLE_DESIGN_PLACEHOLDERS = [
    "https://placehold.co/768x1024/1a1224/e8b4ff/png?text=Panel+0+%C2%B7+preview",
    "https://placehold.co/768x1024/0f1620/7ec8e3/png?text=Panel+1+%C2%B7+preview",
    "https://placehold.co/768x1024/2d1b3d/f5e6ff/png?text=Panel+2+%C2%B7+preview",
    "https://placehold.co/768x1024/120c18/b8a0d4/png?text=Panel+3+%C2%B7+preview",
]


def _normalize_replicate_url(output) -> str | None:
    if output is None:
        return None
    if isinstance(output, str):
        out = output.strip()
        return out if out.startswith("http") else None
    if isinstance(output, (list, tuple)):
        if not output:
            return None
        return _normalize_replicate_url(output[0])
    url = getattr(output, "url", None)
    if url is not None:
        s = str(url).strip()
        return s if s.startswith("http") else None
    if hasattr(output, "__iter__") and not isinstance(output, (str, bytes, dict)):
        try:
            first = next(iter(output))
            return _normalize_replicate_url(first)
        except StopIteration:
            return None
    return None


def _build_pollinations_url(prompt: str) -> str:
    p = (prompt or "dark anime cinematic manga panel").strip()[:_POLLINATIONS_MAX_PROMPT]
    encoded = quote(p, safe="")
    return (
        f"https://image.pollinations.ai/prompt/{encoded}"
        f"?width={_POLLINATIONS_WIDTH}&height={_POLLINATIONS_HEIGHT}"
        f"&nologo=true&enhance=true"
    )


def _design_placeholder_url(scene_index: int) -> str:
    """
    Local assets from Next.js /public (set WEB_APP_PUBLIC_URL) or hosted sample URLs
    so the manga reader always shows frames + Konosuba-style script/dialogue.
    """
    idx = abs(int(scene_index))
    if _WEB_APP_PUBLIC_URL:
        n = idx % 2
        return f"{_WEB_APP_PUBLIC_URL}/manga-placeholders/panel-{n}.svg"
    return _SAMPLE_DESIGN_PLACEHOLDERS[idx % len(_SAMPLE_DESIGN_PLACEHOLDERS)]


async def _generate_replicate(prompt: str) -> str | None:
    import replicate

    def _run():
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={"prompt": prompt, "aspect_ratio": "3:4"},
        )
        return _normalize_replicate_url(output)

    return await asyncio.to_thread(_run)


class ImageAgent(BaseAgent):
    """
    Real image pipeline: Replicate Flux → optional Pollinations → design placeholders
    (SVG en /public si WEB_APP_PUBLIC_URL, si no URLs placehold.co) para ver el layout
    del manga aunque falle la API de imágenes.
    """

    name = "image_agent"

    async def generate(self, context: AgentContext) -> AgentResult:
        """Explicit entry point for the pipeline (alias of run)."""
        return await self.run(context)

    async def run(self, context: AgentContext) -> AgentResult:
        panels_data = context.extra.get("panels_data", [])
        if not panels_data:
            return AgentResult(
                success=True,
                data={"panels": [], "image_errors": []},
            )

        token = os.getenv("REPLICATE_API_TOKEN")
        if token:
            os.environ["REPLICATE_API_TOKEN"] = token

        visual_bible = (context.extra.get("world_visual_bible") or "").strip()
        # Parallel per panel: each awaits Replicate (or skips) then assigns fallback URLs
        tasks = [self._generate_one_panel(p, token, visual_bible) for p in panels_data]
        results = await asyncio.gather(*tasks)

        panels_out: list[dict] = []
        image_errors: list[dict] = []
        for panel_dict, err in results:
            panels_out.append(panel_dict)
            if err:
                image_errors.append(err)

        panels_out.sort(key=lambda x: x.get("scene_index", 0))

        return AgentResult(
            success=True,
            data={"panels": panels_out, "image_errors": image_errors},
        )

    async def _generate_one_panel(
        self,
        p: dict,
        token: str | None,
        world_visual_bible: str = "",
    ) -> tuple[dict, dict | None]:
        raw = p.get("image_prompt") or p.get("description", "anime manga panel, dramatic lighting")
        base_prompt = build_image_prompt(raw)
        if world_visual_bible:
            base_prompt = f"{base_prompt}, CHARACTER AND LOCATION CONSISTENCY: {world_visual_bible}"
        scene_idx = p.get("scene_index", 0)

        image_url: str | None = None
        image_provider: str | None = None
        image_note: str | None = None
        replicate_issue: str | None = None
        started = time.perf_counter()

        if token:
            try:
                image_url = await asyncio.wait_for(
                    _generate_replicate(base_prompt),
                    timeout=_DEFAULT_TIMEOUT,
                )
                elapsed = time.perf_counter() - started
                if image_url:
                    image_provider = "replicate"
                    logger.info("Panel %s: Replicate OK in %.1fs", scene_idx, elapsed)
                else:
                    replicate_issue = "Replicate returned no image URL."
                    logger.warning("Panel %s: %s", scene_idx, replicate_issue)
            except asyncio.TimeoutError:
                replicate_issue = f"Replicate timeout ({_DEFAULT_TIMEOUT}s)."
                logger.error("Panel %s: %s", scene_idx, replicate_issue)
            except Exception as e:
                replicate_issue = str(e)[:400]
                logger.exception("Replicate error panel %s", scene_idx)
        else:
            replicate_issue = "REPLICATE_API_TOKEN not set."

        use_pollinations = (
            not image_url
            and _POLLINATIONS_FALLBACK
            and not (replicate_issue and _REPLICATE_FAIL_FALLBACK == "design")
        )
        if use_pollinations:
            image_url = _build_pollinations_url(base_prompt)
            image_provider = "pollinations"
            image_note = (
                f"Pollinations.ai · {replicate_issue}" if replicate_issue else "Pollinations.ai (free)"
            )
            logger.info("Panel %s: Pollinations URL (browser loads image)", scene_idx)

        if not image_url:
            image_url = _design_placeholder_url(scene_idx)
            image_provider = "design_preview"
            src = "SVG local (WEB_APP_PUBLIC_URL)" if _WEB_APP_PUBLIC_URL else "URL de muestra (placehold.co)"
            image_note = (
                f"Vista previa manga · {src}"
                + (f" · Replicate: {replicate_issue}" if replicate_issue else "")
                + (" · Pollinations desactivado" if not _POLLINATIONS_FALLBACK else "")
            )
            logger.warning("Panel %s: placeholder de diseño (%s)", scene_idx, src)

        err_entry: dict | None = None
        if replicate_issue and image_provider != "replicate" and token:
            err_entry = {"scene_index": scene_idx, "error": replicate_issue}

        panel_dict = {
            "scene_index": scene_idx,
            "description": p.get("description", ""),
            "dialogue": p.get("dialogue"),
            "image_url": image_url,
            "image_error": None if image_url else replicate_issue,
            "image_provider": image_provider,
            "image_note": image_note,
            "prompt_used": base_prompt,
        }
        return panel_dict, err_entry
