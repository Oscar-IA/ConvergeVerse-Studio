"""
Multi-Reference Blending — "Mix del Día".

No envía el catálogo completo de creative_references / ideation_vault al LLM:
muestreo determinista por día + instrucción maestra de proporciones (33/33/34).
"""

from __future__ import annotations

import random
from typing import Any


# Prompt maestro fijo (lógica interna solicitada)
DEFAULT_BLEND_INSTRUCTION = (
    "Genera el capítulo combinando el 33% de la epicidad visual de Solo Leveling/Jujutsu Kaisen, "
    "el 33% del ingenio/humor de Konosuba/Deadpool y el 34% de la construcción de mundo de "
    "One Piece/SAO. Prohibido copiar nombres; extrae la esencia de las mecánicas."
)


def _normalize_elements(raw: Any) -> list[str]:
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw if x is not None]
    if isinstance(raw, str):
        try:
            import json

            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except Exception:
            pass
        return [raw] if raw.strip() else []
    return []


def build_dna_mix_for_day(
    day_number: int,
    references: list[dict],
    ideas: list[dict],
    *,
    max_refs: int = 4,
    max_ideas: int = 2,
) -> str:
    """
    Construye el bloque de texto que va en el system prompt.
    `day_number` fija el muestreo (mismo mix para los 3 slots del día).
    """
    lines: list[str] = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "MULTI-REFERENCE BLENDING — MIX DEL DÍA",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        DEFAULT_BLEND_INSTRUCTION,
        "",
    ]

    rng = random.Random(day_number * 7919 + 104729)
    refs = list(references)
    ideas_pool = list(ideas)
    rng.shuffle(refs)
    rng.shuffle(ideas_pool)
    sample_refs = refs[: max_refs if max_refs > 0 else 0]
    sample_ideas = ideas_pool[: max_ideas if max_ideas > 0 else 0]

    if not sample_refs and not sample_ideas:
        lines.append(
            "(Biblioteca Supabase vacía o no disponible: aplica solo el canon 33/33/34 anterior. "
            "Opcional: añade filas en creative_references / ideation_vault vía Creative Hub.)"
        )
        lines.append("")
        lines.append(
            "En el texto final de ConvergeVerse: prohibido usar nombres propios de otras IPs; "
            "traduce todo a voces, ritmos y mecánicas originales del universo Bond Converge."
        )
        return "\n".join(lines)

    lines.append(
        "Muestreo del día (no es la lista completa): úsalo como brújula de ADN creativo. "
        "No hagas pastiche ni menciones marcas/títulos ajenos en el guion; solo esencia y mecánica."
    )
    lines.append("")

    for i, ref in enumerate(sample_refs, 1):
        title = str(ref.get("title") or "?")
        mt = str(ref.get("media_type") or "")
        els = _normalize_elements(ref.get("key_elements"))[:10]
        notes = str(ref.get("notes") or "").strip()
        el_txt = ", ".join(els) if els else "—"
        lines.append(f"  · Eje {i} [{mt}]: «{title}» — elementos: {el_txt}")
        if notes:
            lines.append(f"    Notas: {notes[:320]}")

    if sample_ideas:
        lines.append("")
        lines.append("  Bóveda de ideas (tono / lore) — muestreo:")
        for j, idea in enumerate(sample_ideas, 1):
            cn = str(idea.get("concept_name") or "")
            desc = str(idea.get("description") or "")[:220]
            cat = str(idea.get("category") or "")
            sty = str(idea.get("integration_style") or "")
            tail = f" [{cat}]" if cat else ""
            lines.append(f"  · Idea {j}{tail}: {cn}")
            if desc:
                lines.append(f"    {desc}")
            if sty:
                lines.append(f"    Integración deseada: {sty}")

    lines.append("")
    lines.append(
        "Fusiona el canon 33/33/34 con este muestreo. El guion y los image_prompt deben sonar 100% ConvergeVerse; "
        "prohibido copiar nombres de personajes u obras externas en la prosa o diálogos."
    )
    return "\n".join(lines)
