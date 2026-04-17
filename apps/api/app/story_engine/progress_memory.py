"""
Memoria de avance — evitar repetir historias al generar.

Antes de escribir el día D, el motor consulta el **último capítulo canónico**
(mayor `canon_chapter_number` entre approved/published) y prioriza su
`meta_summary` (Legado). Si aún no existe meta-resumen, usa un extracto del guion.

La orden editorial explícita empuja a Aren hacia la *siguiente* prueba sin reescribir
clímax ya cerrados en el resumen.

`last_chapter_read` se persiste en Supabase `narrative_memory` bajo la clave
`story_engine.last_chapter_read` tras cada `generate_daily_chapters` exitoso.
"""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

MEMORY_KEY_LAST_READ = "story_engine.last_chapter_read"

MEMORIA_DE_AVANCE_HEADER = (
    "═══════════════════════════════════════════════════════════\n"
    "MEMORIA DE AVANCE — No repetir historias\n"
    "═══════════════════════════════════════════════════════════"
)


def build_progress_memory_block(
    anchor_chapter: dict[str, Any] | None,
    last_read: dict[str, Any] | None,
    *,
    max_meta_chars: int = 4500,
    max_script_fallback: int = 1600,
) -> str:
    """
    Bloque de usuario para inyectar **antes** de Previously On / recientes.

    `anchor_chapter`: fila `chapters` con canon + meta/script.
    `last_read`: valor previo de last_chapter_read (auditoría / coherencia).
    """
    lines: list[str] = [MEMORIA_DE_AVANCE_HEADER, ""]

    if last_read and isinstance(last_read, dict):
        try:
            compact = {k: last_read[k] for k in last_read if k != "meta_summary_excerpt"}
            excerpt = last_read.get("meta_summary_excerpt")
            if excerpt:
                compact["meta_summary_excerpt"] = str(excerpt)[:400]
            lines.append("Registro previo del motor (`last_chapter_read`):")
            lines.append(json.dumps(compact, ensure_ascii=False, indent=2)[:1200])
            lines.append("")
        except Exception as e:
            logger.debug("progress_memory last_read serialize: %s", e)

    if not anchor_chapter:
        lines.append(
            "No hay capítulo canónico previo registrado (sin aprobaciones con número de libro "
            "o proyecto nuevo). Establece fundaciones, tono y apuestas de Aren sin depender de retcon."
        )
        return "\n".join(lines).strip()

    canon = anchor_chapter.get("canon_chapter_number")
    day = anchor_chapter.get("day_number")
    slot = anchor_chapter.get("slot")
    status = anchor_chapter.get("status")
    title = (anchor_chapter.get("title") or "").strip()

    meta = (anchor_chapter.get("meta_summary") or "").strip()
    script = (anchor_chapter.get("script") or "").strip()

    lines.append(
        f"Último capítulo canónico de referencia: **canon #{canon}** "
        f"(día narrativo {day}, slot {slot}, estado `{status}`)."
    )
    if title:
        lines.append(f"Título: «{title}»")
    lines.append("")

    if meta:
        lines.append(
            "META-RESUMEN (prioridad absoluta — el guion del nuevo día debe **continuar** desde aquí, "
            "no reiniciar ni contradecir estos hechos salvo giro explícito anotado en author_notes):"
        )
        body = meta[:max_meta_chars] + ("…" if len(meta) > max_meta_chars else "")
    else:
        lines.append(
            "(Aún sin `meta_summary` en BD — típico si el capítulo está **approved** pero no "
            "**published** al Legado. Usa extracto de guion hasta que exista meta-resumen.)"
        )
        body = script[:max_script_fallback] + ("…" if len(script) > max_script_fallback else "")

    lines.append(body)
    lines.append("")
    lines.append(
        "ORDEN EDITORIAL / VOZ SISTEMA:\n"
        "— Lee el bloque anterior como verdad narrativa estable del hilo principal.\n"
        "— Continúa la historia de **superación de Aren** (y el arco activo): nueva escena, "
        "nueva tensión, nueva prueba o consecuencia.\n"
        "— **NO repitas** escenas, réplicas largas, chistes ya resueltos o clímax emocionales "
        "que ese resumen ya cerró; avanza hacia la **siguiente** prueba, dilema o revelación.\n"
        "— Si necesitas memoria del pasado, aporta un **ángulo nuevo** (no copiar el mismo beat)."
    )

    return "\n".join(lines).strip()


def payload_for_last_chapter_read(
    anchor: dict[str, Any],
    *,
    generation_day_target: int,
) -> dict[str, Any]:
    """Serializa el ancla usada en esta corrida (para la siguiente generación)."""
    from datetime import datetime, timezone

    meta = (anchor.get("meta_summary") or "").strip()
    script = (anchor.get("script") or "").strip()
    excerpt_src = meta if meta else script
    return {
        "canon_chapter_number": anchor.get("canon_chapter_number"),
        "chapter_id": str(anchor.get("id", "")),
        "day_number": anchor.get("day_number"),
        "slot": anchor.get("slot"),
        "status": anchor.get("status"),
        "title": (anchor.get("title") or "")[:240],
        "meta_summary_excerpt": excerpt_src[:800],
        "generation_day_target": generation_day_target,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
