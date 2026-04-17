"""Build a compact visual bible from world_config + world_lore for ImageAgent consistency."""

from typing import Any


def iter_world_lore_locations(world_lore: dict[str, Any] | None) -> list[dict[str, Any]]:
    """
    ``locations`` puede ser lista {name, style} o mapa Plano Maestro ("Valle": "desc").
    """
    if not world_lore or not isinstance(world_lore, dict):
        return []
    raw = world_lore.get("locations")
    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict)]
    if isinstance(raw, dict):
        return [{"name": str(k), "style": str(v)} for k, v in raw.items()]
    return []


def format_world_visual_bible(
    world_config: dict[str, Any] | None,
    max_chars: int = 1200,
    *,
    world_lore: dict[str, Any] | None = None,
) -> str:
    parts: list[str] = []
    if world_config:
        for c in world_config.get("characters") or []:
            if not isinstance(c, dict):
                continue
            name = c.get("name", c.get("id", "NPC"))
            traits = (c.get("visual_traits") or "").strip()
            comedy = (c.get("comedy_factor") or "").strip()
            if traits:
                line = f"{name}: {traits}"
                if comedy:
                    line += f" | comedy: {comedy}"
                parts.append(line)
        for loc in world_config.get("locations") or []:
            if not isinstance(loc, dict):
                continue
            n = loc.get("name", "")
            aes = (loc.get("aesthetic") or "").strip()
            if n and aes:
                parts.append(f"Location {n}: {aes}")

    if world_lore:
        rules = world_lore.get("rules") or {}
        vt = (rules.get("visual_theme") or "").strip()
        if vt:
            parts.append(f"Global visual theme: {vt}")
        for c in world_lore.get("characters") or []:
            if not isinstance(c, dict):
                continue
            n = (c.get("name") or "").strip()
            vis = (c.get("visual") or "").strip()
            traits = (c.get("traits") or "").strip()
            if n and (vis or traits):
                parts.append(f"{n} (lore DB): {vis}" + (f" | {traits}" if traits else ""))
        for loc in iter_world_lore_locations(world_lore):
            n = (loc.get("name") or "").strip()
            st = (loc.get("style") or "").strip()
            if n and st:
                parts.append(f"Location {n} (lore DB): {st}")

    if not parts:
        return ""
    blob = " || ".join(parts)
    return blob[:max_chars] if len(blob) > max_chars else blob


def format_world_lore_design_lock(world_lore: dict[str, Any] | None, max_chars: int = 900) -> str:
    """
    Bloque explícito desde ``world_lore.json`` para Fase Diseño: pelo, ropa, rasgos fijos.
    El ImageAgent debe mantener el mismo look en todos los paneles.
    """
    if not world_lore or not isinstance(world_lore, dict):
        return ""
    parts: list[str] = []
    for c in world_lore.get("characters") or []:
        if not isinstance(c, dict):
            continue
        name = (c.get("name") or "").strip()
        visual = (c.get("visual") or "").strip()
        traits = (c.get("traits") or "").strip()
        if not name:
            continue
        line = f"{name}: KEEP_CONSISTENT — look: {visual}" if visual else f"{name}: (add visual in world_lore.json)"
        if traits:
            line += f" | comportamiento: {traits[:220]}"
        parts.append(line)
    for loc in iter_world_lore_locations(world_lore):
        n = (loc.get("name") or "").strip()
        st = (loc.get("style") or "").strip()
        if n and st:
            parts.append(f"SET {n}: {st}")
    if not parts:
        return ""
    blob = " | ".join(parts)
    return blob[:max_chars] if len(blob) > max_chars else blob
