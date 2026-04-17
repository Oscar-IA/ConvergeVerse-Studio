"""
Libro digital / canon — slug, número de capítulo global y payload novela+manga.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any


def slugify_chapter_base(title: str, day_number: int, slot: int) -> str:
    t = unicodedata.normalize("NFKD", title or "")
    t = t.encode("ascii", "ignore").decode("ascii")
    t = (t or "capitulo").lower()
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    if not t:
        t = "capitulo"
    return f"{t[:48]}-d{day_number}-s{slot}"


def build_book_payload(chapter: dict[str, Any]) -> dict[str, Any]:
    """
    Registro inmutable para el Libro Digital (novela + manga en el momento del visto bueno).

    `lore_annex` (bestiario, ficha técnica de Aren, diccionario rúnico) lo añade
    `NarrativeDB.promote_chapter_to_canon` tras `build_lore_annex_for_chapter`.
    """
    panels = chapter.get("panels") or []
    script = (chapter.get("script") or "").strip()
    return {
        "novela": {
            "text": script,
            "char_count": len(script),
        },
        "manga": {
            "panels": panels,
            "panel_count": len(panels) if isinstance(panels, list) else 0,
        },
        "meta": {
            "day_number": chapter.get("day_number"),
            "slot": chapter.get("slot"),
            "title": chapter.get("title"),
            "arc_position": chapter.get("arc_position"),
        },
    }


def allocate_unique_slug(
    client: Any,
    base_slug: str,
    canon_number: int,
) -> str:
    """
    Garantiza unicidad en `chapters.slug` probando base, base-cN, base-cN-2, ...
    `client` es el cliente Supabase sync (table API).
    """
    candidates = [f"{base_slug}-c{canon_number}", base_slug]
    seen: set[str] = set()
    for c in candidates:
        if c in seen:
            continue
        seen.add(c)
        if not _slug_taken(client, c):
            return c
    for n in range(2, 50):
        s = f"{base_slug}-c{canon_number}-{n}"
        if not _slug_taken(client, s):
            return s
    return f"{base_slug}-c{canon_number}-x{abs(hash(base_slug)) % 100000}"


def _slug_taken(client: Any, slug: str) -> bool:
    r = client.table("chapters").select("id").eq("slug", slug).limit(1).execute()
    return bool(r.data)
