"""Lectura pública del inventario visual (personajes / ubicaciones) para el dashboard web."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.core.lore_loader import load_lore
from app.core.world_visual import iter_world_lore_locations

router = APIRouter()


def _dedupe_key(name: str) -> str:
    return (name or "").strip().lower()


@router.get("/lore/inventory")
def lore_inventory() -> dict[str, Any]:
    """
    Personajes y ciudades/ubicaciones desde ``world_lore.json`` + ``world_config.json``.
    """
    lore = load_lore()
    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else {}
    wc = lore.get("world_config") if isinstance(lore.get("world_config"), dict) else {}

    chars: list[dict[str, Any]] = []
    seen_c: set[str] = set()

    for c in wl.get("characters") or []:
        if not isinstance(c, dict):
            continue
        name = (c.get("name") or "").strip()
        if not name:
            continue
        k = _dedupe_key(name)
        if k in seen_c:
            continue
        seen_c.add(k)
        chars.append(
            {
                "name": name,
                "visual": (c.get("visual") or "").strip() or None,
                "traits": (c.get("traits") or "").strip() or None,
                "source": "world_lore",
            }
        )

    for c in wc.get("characters") or []:
        if not isinstance(c, dict):
            continue
        name = (c.get("name") or c.get("id") or "").strip()
        if not name:
            continue
        k = _dedupe_key(name)
        if k in seen_c:
            continue
        seen_c.add(k)
        vt = (c.get("visual_traits") or "").strip() or None
        desc = (c.get("description") or "").strip() or None
        comedy = (c.get("comedy_factor") or "").strip() or None
        chars.append(
            {
                "name": name,
                "visual": vt,
                "traits": desc or comedy,
                "comedy_factor": comedy,
                "source": "world_config",
            }
        )

    locs: list[dict[str, Any]] = []
    seen_l: set[str] = set()

    for loc in iter_world_lore_locations(wl if isinstance(wl, dict) else None):
        name = (loc.get("name") or "").strip()
        if not name:
            continue
        k = _dedupe_key(name)
        if k in seen_l:
            continue
        seen_l.add(k)
        st = (loc.get("style") or "").strip() or None
        locs.append({"name": name, "style": st, "source": "world_lore"})

    for loc in wc.get("locations") or []:
        if not isinstance(loc, dict):
            continue
        name = (loc.get("name") or loc.get("id") or "").strip()
        if not name:
            continue
        k = _dedupe_key(name)
        if k in seen_l:
            continue
        seen_l.add(k)
        aesthetic = (loc.get("aesthetic") or loc.get("style") or "").strip() or None
        locs.append({"name": name, "style": aesthetic, "source": "world_config"})

    out: dict[str, Any] = {"characters": chars, "locations": locs}
    sc = lore.get("studio_characters") if isinstance(lore.get("studio_characters"), dict) else {}
    cast_list = sc.get("characters") if isinstance(sc.get("characters"), list) else []
    if cast_list:
        out["studio_cast"] = cast_list

    return out
