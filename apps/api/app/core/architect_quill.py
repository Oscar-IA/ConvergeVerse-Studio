"""
The Architect's Quill — el beat se expande integrando el reparto familiar (studio_characters).
"""

from __future__ import annotations

from typing import Any


def format_architect_cast_block(lore: dict[str, Any]) -> str:
    """Bloque de prompt con roles de ``apps/api/data/characters.json`` (lore['studio_characters'])."""
    sc = lore.get("studio_characters")
    if not isinstance(sc, dict):
        return ""
    chars = sc.get("characters") or []
    if not chars:
        return ""

    lines = [
        "ARCHITECT'S QUILL — CAST (integrate naturally; this is the author's family saga inside Bond Converge):",
    ]
    for c in chars:
        if not isinstance(c, dict):
            continue
        name = (c.get("name") or "?").strip()
        cls = (c.get("class") or "").strip()
        ability = (c.get("ability") or "").strip()
        role = (c.get("role") or "").strip()
        personality = (c.get("personality") or "").strip()
        tail = personality or role
        lines.append(f"- {name}: class «{cls}» | ability: {ability}. {tail}")

    lines.append(
        "Rules: Use these names and roles in prose when the beat allows. "
        "Aren Valis stays Konosuba-style comic disaster / straight man under pressure. "
        "Paula heals with High Healer / cellular-regeneration flavor (grounded, competent). "
        "Luis as General King — strategic sighs, command presence. "
        "Yaritza restores biomes (Eco-Engineer). Sara & Matheo as Beast Tamers (mentor + apprentice). "
        "Do not force every character every time; choose who fits the beat, but prefer rich ensemble moments."
    )
    return "\n".join(lines)


def format_architect_manga_directive() -> str:
    """Solo la directiva visual (el cast ya va aparte en el mismo system prompt)."""
    return (
        "ARCHITECT MANGA — VISUAL DIRECTIVE:\n"
        "Extract 3 moments; moments 0 and 1 become the 2 published panels.\n"
        "Prefer shots where multiple cast members READ clearly when the novel features them "
        "(e.g. King Luis sighing at Aren's clumsiness while Yaritza repairs a damaged forest edge; "
        "Paula healing Aren after a ridiculous fall chasing a butterfly).\n"
        "image_prompt must be English, cinematic manga composition; describe recognizable roles "
        "(king/general, healer, eco-engineer, beast tamers mentor/apprentice, scholar/vanguard)."
    )


def format_architect_anime_hint(lore: dict[str, Any]) -> str:
    """Una línea para metadatos VFX (habilidades del reparto)."""
    sc = lore.get("studio_characters")
    if not isinstance(sc, dict) or not (sc.get("characters") or []):
        return ""
    return (
        "Architect note: tie VFX to cast abilities where relevant — "
        "cyan Orbet/healing glow for Paula, regreening particles for Yaritza, "
        "command aura or banner light for Luis, beast silhouettes for Sara & Matheo, "
        "comedic impact + sparks for Aren."
    )
