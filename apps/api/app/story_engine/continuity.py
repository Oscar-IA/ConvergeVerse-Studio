"""
Precuelas y continuidad — «Previously On» + flashbacks de lore (Aethel / BOND CONVERGE).

Antes del capítulo del día N, se inyecta contexto de los días N-1 y N-2:
  1) Si existe `story_day_summaries.summary_technical` para ese día, se usa (recursivo).
  2) Si no, se construye un digest técnico desde los 3 slots guardados en Supabase.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# Instrucción maestra: ~20 % del guion = fragmento de pasado (Aethel / origen Bond Converge)
LORE_FLASHBACK_BLOCK = """
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLASHBACK DE LORE / PRECUELA (~20% del guion «script»)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Entre el 15% y el 25% de la extensión total del campo «script» debe revelar un fragmento del pasado del **Reino de Aethel** (sus casas, leyes, guerras frías, santos laicos o fracturas dinásticas) y/o del **origen mítico-tecnológico de BOND CONVERGE** (pre-red de Orbets, primer pacto de convergencia, fallo del Arquitecto, semilla del Archive Order).
- Integración orgánica: rumor, pergamino quemado, eco en un Orbet, testimonio de anciano, registro censurado del Archivo, sueño inducido, relieve tallado.
- No repitas el mismo mito con las mismas palabras en capítulos consecutivos; cada entrega aporta **un ángulo nuevo** (política, teología civil, ingeniería onírica, economía del vacío, traición olvidada).
- Puede contrastar «historia oficial» vs «versión herética» siempre que quede como duda narrativa, no como contradicción gratuita con el estado del mundo.
- En «author_notes» indica en una frase qué capa de lore precuelar activaste (Aethel / Bond Converge) para evitar reiteración en el día siguiente.
"""

PREVIOUSLY_ON_TITLE = (
    "═══════════════════════════════════════════════════════════\n"
    "PREVIAMENTE EN CONVERGEVERSE — Continuidad (días N-1 y N-2)\n"
    "═══════════════════════════════════════════════════════════\n"
)


def _symbol_names(ch: dict) -> str:
    raw = ch.get("symbols_planted") or []
    if not isinstance(raw, list):
        return ""
    names = []
    for s in raw:
        if isinstance(s, dict) and s.get("name"):
            names.append(str(s["name"]))
        elif isinstance(s, str):
            names.append(s)
    return ", ".join(names[:12])


def _digest_chapter(ch: dict, max_script: int) -> list[str]:
    slot = ch.get("slot", "?")
    title = ch.get("title", "?")
    arc = ch.get("arc_position", "")
    meta = (ch.get("meta_summary") or "").strip()
    script = (ch.get("script") or "").strip()
    excerpt = script[:max_script] + ("…" if len(script) > max_script else "")
    notes = (ch.get("author_notes") or "").strip()
    lines = [
        f"  · Slot {slot} — {title} [{arc}]",
    ]
    syms = _symbol_names(ch)
    if syms:
        lines.append(f"    Símbolos: {syms}")
    if notes:
        lines.append(f"    Notas motor: {notes[:220]}{'…' if len(notes) > 220 else ''}")
    if meta:
        m = meta[: max_script + 120] + ("…" if len(meta) > max_script + 120 else "")
        lines.append(f"    META-RESUMEN (canon / Legado): {m}")
    else:
        lines.append(f"    Extracto: {excerpt}")
    return lines


async def build_previously_on_block(
    narrative_db: Any,
    current_day: int,
    *,
    max_script_chars: int = 380,
) -> str:
    """
    Construye el bloque «Previously On» leyendo N-1 y N-2 (orden: más reciente primero).
    """
    chunks: list[str] = []
    # N-1 primero (lo más urgente para continuidad), luego N-2
    for rel in (1, 2):
        d = current_day - rel
        if d < 1:
            continue
        label = "DÍA N-1 (inmediatamente anterior)" if rel == 1 else "DÍA N-2 (contexto profundo)"
        summary: str | None = None
        try:
            if hasattr(narrative_db, "get_story_day_summary"):
                summary = await narrative_db.get_story_day_summary(d)
        except Exception as e:
            logger.debug("get_story_day_summary(%s): %s", d, e)

        chunks.append(f"── {label}: día narrativo {d} ──")

        if summary:
            chunks.append("  [Resumen técnico canónico — tabla story_day_summaries]")
            chunks.append(summary.strip())
            chunks.append("")
            continue

        try:
            chapters = await narrative_db.get_daily_chapters(d, published_only=True)
        except Exception as e:
            chunks.append(f"  (No se pudieron cargar capítulos: {e})")
            chunks.append("")
            continue

        if not chapters:
            chunks.append(
                "  (Ningún capítulo **publicado** (Legado) para este día — "
                "aprobar no basta: usa «Publicar al Legado» para generar meta-resumen e índice canónico.)"
            )
            chunks.append("")
            continue

        ordered = sorted(chapters, key=lambda c: c.get("slot", 0))
        for ch in ordered:
            chunks.extend(_digest_chapter(ch, max_script_chars))
        chunks.append("")

    if not chunks:
        return (
            f"{PREVIOUSLY_ON_TITLE}"
            "(Aún no existen días N-1 / N-2 en el archivo: es el arranque de la saga o la base está vacía. "
            "Establece fundaciones claras del Reino de Aethel y de la leyenda de Bond Converge sin depender de retcon.)"
        )

    return PREVIOUSLY_ON_TITLE + "\n".join(chunks).strip()
