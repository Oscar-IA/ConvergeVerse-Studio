"""
CONVERGEVERSE: THE LAGUNA LEGACY — Prompt maestro para portada / libro producto.

- Nobleza Laguna Arévalo (cuero, escudo, árbol de la vida, espada, báculo, oro Cinzel).
- BOND OS / Orbet (marcos neón cian, integración digital en pergamino).

Documentación humana: docs/CONVERGEVERSE_LAGUNA_LEGACY_MASTER_PROMPT.md
"""

from __future__ import annotations

# Inglés: mejor adherencia en Flux / Replicate. Sin saltos para pegar en APIs.
FULL_MASTER_PROMPT_EN = """CONVERGEVERSE: THE LAGUNA LEGACY — definitive book product hero shot.

VISUAL STYLE: Hyperrealistic cinematic product photography, dramatic studio chiaroscuro lighting, rich tactile textures, shallow depth of field.

MAIN SUBJECT: One open chronicle book resting on dark weathered leather desk surface. LEFT visible cover, RIGHT visible spread interior.

LEFT — COVER: Dark aged military-grade leather binding, rough heavy grain, patina. Central embossed aged metal coat of arms: stylized Tree of Life (Yaritza biosphere / Paula healing motif) with roots and branches intricately intertwined with a sword and a runic staff. Title typography engraved in brilliant gold leaf, majestic blackletter serif in the spirit of Cinzel font, exact readable title text: "CONVERGEVERSE: THE LAGUNA LEGACY". Subtle pulsing cyan neon glow along cover edges and small runic engravings — Orbet energy, Aren Valis signature hue.

RIGHT — INTERIOR SPREAD: Thick cream-yellow aged parchment pages color reference #f4ecd8, visible fiber texture. Thin flickering cyan neon digital frame tracing page margins — Bond OS integration into ancient lore, not sci-fi chrome. Narrative paragraphs in clean modern humanist sans similar to Inter, multilingual snippets Spanish English French implied, highly legible. Between paragraphs: embedded dark cinematic manga panels Solo Leveling inspired lighting; young archivist scholar with wildly exaggerated comedic reactions Konosuba style; royal family figures Luis and Paula observing with stern dignified composure in same panels.

BOTTOM RIGHT MODULE: Dedicated bordered decoder box on the page: archaic stylized symbols blending Egyptian hieroglyphs, Nordic Futhark, Mayan glyphs, cuneiform marks, Celtic knot motifs; each symbol with small modern phonetic or concept label underneath as cipher key.

LIGHTING: Low ambient key light emphasizing gold leaf gleam, leather grain, cyan luminescence, mysterious inspiring atmosphere. No extra logos. Single cohesive artifact photograph."""

# Recorte para pipelines con límite bajo (p. ej. flux-schnell input truncado en chronicle_archive).
COMPACT_COVER_PROMPT_EN = (
    "Hyperrealistic cinematic product photo, dark weathered leather desk. Open chronicle book: "
    "LEFT cover dark aged military leather, embossed metal coat of arms Tree of Life intertwined "
    "with sword and runic staff, gold leaf engraved title text CONVERGEVERSE THE LAGUNA LEGACY "
    "Cinzel majestic serif, subtle pulsing cyan neon on runes and edges Orbet Aren Valis energy. "
    "RIGHT spread thick cream parchment #f4ecd8 ancient texture, thin flickering cyan neon digital "
    "margins Bond OS, clean Inter-like modern text paragraphs multilingual, dark cinematic manga "
    "panels Solo Leveling lighting, comedic exaggerated scholar Konosuba faces, royal couple Luis "
    "Paula dignified serious observers. Bottom right runic decoder box Egyptian Nordic Mayan "
    "cuneiform Celtic symbols with phonetic labels. Dramatic chiaroscuro, gold leather cyan glow."
)


def build_laguna_legacy_cover_prompt(
    *,
    chapter_title: str | None = None,
    novel_excerpt: str = "",
    visual_bible: str = "",
    use_full_master: bool = True,
    max_chars: int | None = None,
) -> str:
    """
    Combina el prompt maestro con gancho opcional del capítulo (título + extracto + bible).
    `use_full_master=False` usa la variante compacta (mejor para límites ~900 chars).
    """
    base = FULL_MASTER_PROMPT_EN if use_full_master else COMPACT_COVER_PROMPT_EN
    parts: list[str] = [base.strip()]
    t = (chapter_title or "").strip()
    if t:
        parts.append(f"Chapter mood anchor (do not replace title on cover): «{t[:140]}».")
    ex = (novel_excerpt or "").strip().replace("\n", " ")
    if ex:
        parts.append(f"Interior narrative mood: {ex[:380]}{'…' if len(ex) > 380 else ''}")
    vb = (visual_bible or "").strip()
    if vb:
        parts.append(f"Cast continuity: {vb[:320]}{'…' if len(vb) > 320 else ''}")
    out = " ".join(parts)
    if max_chars is not None and len(out) > max_chars:
        # Prioriza compact + hooks
        short = COMPACT_COVER_PROMPT_EN
        tail = []
        if t:
            tail.append(f"Mood: {t[:100]}")
        if ex:
            tail.append(ex[:200])
        combo = short + " " + " ".join(tail)
        return combo[:max_chars] if len(combo) > max_chars else combo
    return out


def get_visual_master_payload() -> dict[str, str]:
    """Para GET API: prompts listos para copiar en Replicate / diseño."""
    return {
        "project_title": "CONVERGEVERSE: THE LAGUNA LEGACY",
        "full_prompt_en": FULL_MASTER_PROMPT_EN,
        "compact_prompt_en": COMPACT_COVER_PROMPT_EN,
        "doc_path": "docs/CONVERGEVERSE_LAGUNA_LEGACY_MASTER_PROMPT.md",
        "notes": "Use full_prompt_en in Replicate for best fidelity; compact for automated chronicle covers with tight token limits.",
    }
