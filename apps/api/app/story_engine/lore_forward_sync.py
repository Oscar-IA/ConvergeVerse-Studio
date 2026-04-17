"""
Propagación orgánica de lore hacia capítulos futuros (modo «Enriquecer» / soft update).

No borra ni regenera: mantiene eventos principales e inyecta el nuevo detalle con LLM.
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
MAX_SCRIPT_CHARS = 120_000


def _build_refinement_system_prompt() -> str:
    return """Eres el «Córtex de continuidad» de ConvergeVerse (BOND OS).

Tu tarea es EDITAR un guion existente con cambios mínimos pero efectivos:
- Conserva la estructura de escenas, el orden de eventos principales, el clímax y el gancho.
- No reescribas el capítulo desde cero ni cambies el desenlace macro salvo que el nuevo detalle lo exija de forma inevitable.
- Integra el NUEVO DETALLE de forma orgánica: descripciones, diálogos breves, reacciones, una línea de narración, o un párrafo insertado donde encaje.
- Mantén voz en tercera persona, presente, tono épico con ironía, español impecable.
- Si el detalle es visual (runa, objeto, lugar), anclarlo donde ya haya una mención afín o en la primera aparición coherente.

FORMATO DE SALIDA: devuelve ÚNICAMENTE un JSON válido:
{"script": "texto completo del guion refinado"}

Sin markdown, sin comentarios fuera del JSON."""


def _build_refinement_user_prompt(
    *,
    pivot_title: str,
    pivot_canon: int | None,
    new_detail: str,
    chapter_title: str,
    chapter_canon: int | None,
    day_number: int,
    slot: int,
    current_script: str,
) -> str:
    canon_line = ""
    if chapter_canon is not None:
        canon_line = f"Este capítulo es canon nº {chapter_canon} (día narrativo {day_number}, slot {slot}).\n"
    pivot_line = f"El detalle fue establecido / reforzado en el capítulo pivote: «{pivot_title}»"
    if pivot_canon is not None:
        pivot_line += f" (canon #{pivot_canon})."
    else:
        pivot_line += "."
    script = current_script.strip()
    if len(script) > MAX_SCRIPT_CHARS:
        script = script[:MAX_SCRIPT_CHARS] + "\n\n[… texto truncado para el modelo — conserva coherencia en la porción visible …]"

    return f"""{canon_line}{pivot_line}

NUEVO DETALLE A INTEGRAR EN ESTE CAPÍTULO (debe quedar coherente con el resto de la saga):
«{new_detail.strip()}»

TÍTULO DEL CAPÍTULO A REFINAR: {chapter_title}

GUION ACTUAL (intacto salvo por tu integración del detalle):
---
{script}
---

Recuerda: MANTÉN los eventos principales; solo enriquece con el detalle. JSON con clave "script" únicamente."""


async def _call_claude_refinement(system_prompt: str, user_prompt: str) -> str:
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic()
    msg = await client.messages.create(
        model=DEFAULT_MODEL,
        max_tokens=8192,
        temperature=0.55,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    blocks = getattr(msg, "content", None) or []
    parts: list[str] = []
    for b in blocks:
        if hasattr(b, "text"):
            parts.append(str(b.text))
        elif isinstance(b, dict) and b.get("type") == "text":
            parts.append(str(b.get("text", "")))
    return "".join(parts).strip()


def _parse_script_json(raw: str) -> str:
    text = raw.strip()
    if "```" in text:
        m = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
        if m:
            text = m.group(1).strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict) and isinstance(data.get("script"), str):
            return data["script"].strip()
    except json.JSONDecodeError:
        pass
    i = text.find("{")
    j = text.rfind("}")
    if i >= 0 and j > i:
        try:
            data = json.loads(text[i : j + 1])
            if isinstance(data, dict) and isinstance(data.get("script"), str):
                return data["script"].strip()
        except json.JSONDecodeError:
            pass
    raise ValueError("El modelo no devolvió JSON válido con la clave script")


async def refine_future_chapter_script(
    *,
    pivot: dict[str, Any],
    target: dict[str, Any],
    new_detail: str,
) -> str:
    """Una pasada LLM: guion refinado."""
    sys_p = _build_refinement_system_prompt()
    user_p = _build_refinement_user_prompt(
        pivot_title=str(pivot.get("title") or "?"),
        pivot_canon=pivot.get("canon_chapter_number"),
        new_detail=new_detail,
        chapter_title=str(target.get("title") or "?"),
        chapter_canon=target.get("canon_chapter_number"),
        day_number=int(target.get("day_number") or 0),
        slot=int(target.get("slot") or 0),
        current_script=str(target.get("script") or ""),
    )
    raw = await _call_claude_refinement(sys_p, user_p)
    return _parse_script_json(raw)


async def run_soft_lore_forward(
    db: Any,
    pivot: dict[str, Any],
    new_detail: str,
    *,
    max_chapters: int = 12,
    timeline_event_id: str | None = None,
) -> dict[str, Any]:
    """
    Refina guiones de capítulos futuros (approved/published) sin borrarlos.

    Returns:
        dict con keys refined_chapters (list row dict), count, errors (list str).
    """
    detail = (new_detail or "").strip()
    if not detail:
        raise ValueError("new_detail / plot_pivot_note no puede estar vacío en modo enriquecer.")

    futures = await db.list_future_chapters_for_soft_sync(pivot, limit=max(1, min(24, int(max_chapters))))
    refined: list[dict] = []
    errors: list[str] = []

    sync_note = f"Lore forward: {detail[:280]}{'…' if len(detail) > 280 else ''}"

    for ch in futures:
        cid = str(ch.get("id") or "")
        if not cid:
            continue
        try:
            new_script = await refine_future_chapter_script(
                pivot=pivot, target=ch, new_detail=detail
            )
            if not new_script or len(new_script) < 80:
                errors.append(f"{cid}: guion refinado demasiado corto; se omite.")
                continue
            updated = await db.update_chapter_script_soft_sync(
                cid,
                new_script,
                sync_note,
                lore_event_id=timeline_event_id,
            )
            refined.append(updated)
        except Exception as e:
            logger.warning("soft lore sync chapter %s: %s", cid, e)
            errors.append(f"{cid}: {e!s}")

    return {
        "refined_chapters": refined,
        "count": len(refined),
        "errors": errors,
    }
