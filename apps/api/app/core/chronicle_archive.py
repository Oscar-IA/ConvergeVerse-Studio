"""
Archivo de crónicas por capítulo: storage/chronicles/season_{n}/chapter_XX_slug/

- chapter_info.json
- novel_page.html (novela maquetada para leer como libro)
- manga_strip.png (tira horizontal de paneles)
- cover.jpg (carátula vía IA si hay REPLICATE_API_TOKEN)
"""

from __future__ import annotations

import asyncio
import html
import json
import logging
import os
import re
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

_CHRONICLE_ENABLED = os.getenv("CONVERGE_CHRONICLES", "true").lower() in ("1", "true", "yes")
_STRIP_MAX_HEIGHT = int(os.getenv("CHRONICLE_STRIP_MAX_HEIGHT", "900"))


def _slug(title: str | None, episode: int) -> str:
    t = (title or "").strip() or f"capitulo_{episode}"
    base = re.sub(r"[^\w\s-]", "", t, flags=re.UNICODE)
    base = re.sub(r"[-\s]+", "_", base.strip()).strip("_") or f"capitulo_{episode}"
    return base[:80]


def _chronicle_folder_name(episode: int, title: str | None) -> str:
    return f"chapter_{episode:02d}_{_slug(title, episode)}"


def chronicle_season_dir(storage_root: Path, season_number: int) -> Path:
    return storage_root / "chronicles" / f"season_{season_number}"


def _allocate_chapter_dir(season_dir: Path, episode: int, title: str | None) -> Path:
    base = _chronicle_folder_name(episode, title)
    candidate = season_dir / base
    if not candidate.exists():
        return candidate
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    return season_dir / f"{base}_{ts}"


def _escape_paragraph(p: str) -> str:
    return html.escape(p).replace("\n", "<br/>\n        ")


def _interleave_paragraphs_manga_panels(paragraphs: list[str], panel_urls: list[str]) -> str:
    """Inserta figuras de paneles entre bloques de prosa (Tomo / crónica ilustrada)."""
    if not paragraphs:
        return ""
    if not panel_urls:
        return "\n".join(f'        <p class="nv">{_escape_paragraph(p)}</p>' for p in paragraphs)

    n = len(paragraphs)
    m = len(panel_urls)
    after_idx: dict[int, list[str]] = {}
    for j, url in enumerate(panel_urls):
        k = min(n - 1, max(0, int((j + 1) * n / (m + 1)) - 1))
        after_idx.setdefault(k, []).append(url)

    lines: list[str] = []
    for i, p in enumerate(paragraphs):
        lines.append(f'        <p class="nv">{_escape_paragraph(p)}</p>')
        for u in after_idx.get(i, []):
            safe_u = html.escape(u, quote=True)
            lines.append(
                f'        <figure class="manga-panel" data-panel="chronicle">\n'
                f'          <img src="{safe_u}" alt="Panel manga ConvergeVerse" loading="lazy"/>\n'
                f"        </figure>"
            )
    return "\n".join(lines)


def _novel_to_html_body(
    novel: str,
    chapter_title: str | None,
    *,
    tome_series: str | None = None,
    panel_urls: list[str] | None = None,
) -> str:
    """Párrafos escapados; opcionalmente paneles manga entre párrafos."""
    safe_title = html.escape((chapter_title or "Capítulo").strip() or "Capítulo")
    safe_tome = html.escape((tome_series or "").strip()) if tome_series else ""
    blocks = [p.strip() for p in novel.strip().split("\n\n") if p.strip()]
    if not blocks:
        paras = f'        <p class="nv">{html.escape(novel.strip() or "(vacío)")}</p>'
    else:
        paras = _interleave_paragraphs_manga_panels(blocks, panel_urls or [])

    tome_line = (
        f'      <p class="tome">{safe_tome}</p>\n'
        if safe_tome
        else '      <p class="tome">Tomo 1 — Crónicas de Aethel-Arévalo</p>\n'
    )
    return f"""    <header class="hdr">
      <p class="series">CONVERGEVERSE</p>
{tome_line}      <h1 class="title">{safe_title}</h1>
    </header>
    <article class="body">
{paras}
    </article>"""


def build_novel_page_html(
    novel: str,
    chapter_title: str | None,
    *,
    tome_series: str | None = None,
    panel_urls: list[str] | None = None,
) -> str:
    inner = _novel_to_html_body(
        novel,
        chapter_title,
        tome_series=tome_series,
        panel_urls=panel_urls,
    )
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>{html.escape((chapter_title or "ConvergeVerse — Crónica").strip())}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Uncial+Antiqua&display=swap" rel="stylesheet"/>
  <style>
    :root {{
      --ink: #1a1510;
      --paper: #e8dcc4;
      --accent: #0a6e66;
      --neon: rgba(0, 255, 247, 0.35);
    }}
    body {{
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(ellipse at top, #2a2420 0%, #0d0c0a 55%);
      color: var(--ink);
      font-family: 'Cinzel', 'Palatino Linotype', Georgia, serif;
      padding: 2rem 1.25rem 3rem;
    }}
    .book {{
      max-width: 42rem;
      margin: 0 auto;
      background: linear-gradient(165deg, #f0e6d4 0%, #d8c8a8 45%, #c9b896 100%);
      border: 3px solid transparent;
      background-clip: padding-box;
      box-shadow:
        0 0 0 2px rgba(0, 255, 247, 0.45),
        0 0 40px rgba(0, 255, 247, 0.12),
        0 24px 48px rgba(0, 0, 0, 0.55);
      border-radius: 4px;
      padding: 2.25rem 2rem 2.5rem;
      position: relative;
    }}
    .book::before {{
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 2px;
      pointer-events: none;
      box-shadow: inset 0 0 60px rgba(255, 255, 255, 0.08);
    }}
    .hdr {{ text-align: center; margin-bottom: 2rem; border-bottom: 1px solid rgba(26, 21, 16, 0.2); padding-bottom: 1.25rem; }}
    .series {{
      font-family: 'Uncial Antiqua', serif;
      font-size: 0.95rem;
      letter-spacing: 0.25em;
      color: var(--accent);
      margin: 0 0 0.5rem;
    }}
    .tome {{
      font-family: 'Cinzel', Georgia, serif;
      font-size: 0.72rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: rgba(26, 21, 16, 0.55);
      margin: 0 0 0.75rem;
    }}
    .title {{
      font-size: clamp(1.35rem, 4vw, 1.85rem);
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin: 0;
      line-height: 1.2;
    }}
    .body .nv {{
      font-size: 1.05rem;
      line-height: 1.75;
      text-align: justify;
      margin: 0 0 1.15rem;
      hyphens: auto;
    }}
    .manga-panel {{
      margin: 1.25rem 0 1.5rem;
      text-align: center;
    }}
    .manga-panel img {{
      max-width: 100%;
      height: auto;
      border-radius: 6px;
      border: 2px solid rgba(0, 255, 247, 0.45);
      box-shadow: 0 0 24px rgba(0, 200, 255, 0.2), 0 12px 28px rgba(0, 0, 0, 0.35);
    }}
    footer {{
      text-align: center;
      margin-top: 2rem;
      font-size: 0.65rem;
      letter-spacing: 0.2em;
      color: rgba(26, 21, 16, 0.45);
    }}
  </style>
</head>
<body>
  <div class="book">
{inner}
    <footer>CONVERGEVERSE STUDIO · CRÓNICA ARCHIVADA</footer>
  </div>
</body>
</html>
"""


def _compose_manga_strip_sync(urls: list[str], out_path: Path) -> list[str]:
    """Descarga URLs y compone PNG horizontal. Devuelve lista de errores."""
    errors: list[str] = []
    try:
        from PIL import Image
    except ImportError:
        return ["Pillow no instalado: pip install Pillow"]

    images: list[Image.Image] = []
    for i, url in enumerate(urls):
        if not url or not str(url).startswith("http"):
            errors.append(f"panel_{i}: URL inválida")
            continue
        try:
            import httpx

            with httpx.Client(timeout=90.0, follow_redirects=True) as client:
                r = client.get(url)
                r.raise_for_status()
                data = r.content
            im = Image.open(BytesIO(data))
            if im.mode not in ("RGB", "RGBA"):
                im = im.convert("RGBA")
            images.append(im)
        except Exception as e:
            errors.append(f"panel_{i}: {e!s}"[:200])
            logger.warning("Chronicle strip panel %s: %s", i, e)

    if not images:
        # Placeholder
        im = Image.new("RGB", (1200, 400), (20, 18, 28))
        images = [im]
        errors.append("sin_imagenes: placeholder generado")

    target_h = min(_STRIP_MAX_HEIGHT, max(im.height for im in images))
    resized: list[Image.Image] = []
    for im in images:
        w, h = im.size
        if h <= 0:
            continue
        new_w = max(1, int(w * (target_h / h)))
        resized.append(im.resize((new_w, target_h), Image.Resampling.LANCZOS))

    if not resized:
        return errors + ["resize_failed"]

    total_w = sum(im.width for im in resized)
    strip = Image.new("RGBA", (total_w, target_h), (15, 12, 20, 255))
    x = 0
    for im in resized:
        if im.mode == "RGBA":
            strip.paste(im, (x, 0), im)
        else:
            strip.paste(im.convert("RGB"), (x, 0))
        x += im.width

    out_path.parent.mkdir(parents=True, exist_ok=True)
    strip.save(out_path, "PNG")
    return errors


async def _compose_manga_strip(urls: list[str], out_path: Path) -> list[str]:
    return await asyncio.to_thread(_compose_manga_strip_sync, urls, out_path)


def _replicate_cover_url_sync(prompt: str) -> str | None:
    token = os.getenv("REPLICATE_API_TOKEN")
    if not token:
        return None
    os.environ["REPLICATE_API_TOKEN"] = token
    try:
        import replicate

        max_p = int(os.getenv("CHRONICLE_REPLICATE_PROMPT_MAX", "1800"))
        out = replicate.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": prompt[: max(200, max_p)],
                "aspect_ratio": "2:3",
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
        logger.exception("Chronicle cover Replicate: %s", e)
    return None


async def _replicate_cover_url(prompt: str) -> str | None:
    return await asyncio.to_thread(_replicate_cover_url_sync, prompt)


def _save_cover_jpg_from_url_sync(url: str, dest: Path) -> str | None:
    try:
        from PIL import Image
    except ImportError:
        return "Pillow no instalado"
    try:
        import httpx

        with httpx.Client(timeout=120.0, follow_redirects=True) as client:
            r = client.get(url)
            r.raise_for_status()
        im = Image.open(BytesIO(r.content)).convert("RGB")
        dest.parent.mkdir(parents=True, exist_ok=True)
        im.save(dest, "JPEG", quality=90, optimize=True)
        return None
    except Exception as e:
        return str(e)[:300]


async def _save_cover_jpg(url: str, dest: Path) -> str | None:
    return await asyncio.to_thread(_save_cover_jpg_from_url_sync, url, dest)


def _cover_prompt(chapter_title: str | None, novel_excerpt: str, visual_bible: str) -> str:
    """Portada de crónica alineada al Prompt Maestro Laguna Legacy + gancho del capítulo."""
    from app.core.laguna_legacy_visual_master import build_laguna_legacy_cover_prompt

    use_full = os.getenv("CONVERGEVERSE_COVER_USE_FULL_MASTER", "true").lower() in (
        "1",
        "true",
        "yes",
    )
    max_p = int(os.getenv("CHRONICLE_REPLICATE_PROMPT_MAX", "1800"))
    return build_laguna_legacy_cover_prompt(
        chapter_title=chapter_title,
        novel_excerpt=novel_excerpt,
        visual_bible=visual_bible,
        use_full_master=use_full,
        max_chars=max_p,
    )


async def save_chronicle_chapter(
    *,
    storage_root: Path,
    season_number: int,
    episode_number: int,
    chapter_title: str | None,
    novel: str,
    script: str,
    panels: list[dict[str, Any]],
    production_dir: str | None,
    world_visual_bible: str = "",
    tome_series: str | None = None,
) -> tuple[str | None, dict[str, Any]]:
    """
    Persiste crónica del capítulo. Si CONVERGE_CHRONICLES=false, no hace nada.
    """
    if not _CHRONICLE_ENABLED:
        return None, {"skipped": True, "reason": "CONVERGE_CHRONICLES disabled"}

    errors: list[str] = []
    season_dir = chronicle_season_dir(storage_root, season_number)
    chapter_dir = _allocate_chapter_dir(season_dir, episode_number, chapter_title)

    try:
        chapter_dir.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        logger.exception("Chronicle mkdir: %s", e)
        return None, {"error": str(e)}

    try:
        storage_relative = str(chapter_dir.resolve().relative_to(storage_root.resolve()))
    except ValueError:
        storage_relative = str(chapter_dir)

    # URLs en orden de panel (antes del HTML para intercalar en el libro)
    urls: list[str] = []
    for p in sorted(panels, key=lambda x: int(x.get("scene_index", 0))):
        u = p.get("image_url")
        if u and isinstance(u, str) and u.startswith("http"):
            urls.append(u)

    # novel_page.html (prosa + paneles manga entre párrafos + línea de tomo)
    try:
        html_doc = build_novel_page_html(
            novel,
            chapter_title,
            tome_series=tome_series,
            panel_urls=urls,
        )
        (chapter_dir / "novel_page.html").write_text(html_doc, encoding="utf-8")
    except Exception as e:
        errors.append(f"novel_page.html: {e!s}")

    strip_path = chapter_dir / "manga_strip.png"
    strip_errs = await _compose_manga_strip(urls, strip_path)
    errors.extend(strip_errs)

    cover_path = chapter_dir / "cover.jpg"
    cover_note: str | None = None
    cover_prompt = _cover_prompt(chapter_title, novel[:1200], world_visual_bible)
    cover_url = await _replicate_cover_url(cover_prompt)
    if cover_url:
        err = await _save_cover_jpg(cover_url, cover_path)
        if err:
            errors.append(f"cover.jpg: {err}")
            cover_note = err
    else:
        cover_note = "REPLICATE_API_TOKEN ausente o Replicate falló — sin carátula IA"
        errors.append(cover_note)

    info: dict[str, Any] = {
        "format_version": 1,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "tome_series": tome_series or "Tomo 1 — Crónicas de Aethel-Arévalo",
        "season_number": season_number,
        "episode_number": episode_number,
        "chapter_title": chapter_title,
        "folder": chapter_dir.name,
        "novel_word_count": len(novel.split()),
        "script_chars": len(script or ""),
        "panel_count": len(panels),
        "image_urls": urls,
        "production_dir": production_dir,
        "storage_relative": storage_relative,
        "files": {
            "chapter_info": "chapter_info.json",
            "novel_page_html": "novel_page.html",
            "manga_strip_png": "manga_strip.png",
            "cover_jpg": "cover.jpg",
        },
        "cover_prompt": cover_prompt[:500],
        "cover_generated": cover_url is not None and cover_path.exists(),
        "chronicle_errors": errors,
    }

    try:
        with open(chapter_dir / "chapter_info.json", "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.exception("chapter_info.json: %s", e)
        info["chronicle_errors"] = list(info.get("chronicle_errors", [])) + [f"chapter_info.json: {e!s}"]

    logger.info("Chronicle saved: %s", chapter_dir)
    return str(chapter_dir), info
