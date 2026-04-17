"""
Meta-resumen canónico — ficha técnica para continuidad sin contradicciones.

Plantilla determinista + opcional mejora con LLM (ANTHROPIC_API_KEY).
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)


def build_structural_meta_summary(chapter: dict[str, Any]) -> str:
    """Resumen estable desde datos estructurados (sin API externa)."""
    title = str(chapter.get("title") or "?").strip()
    arc = str(chapter.get("arc_position") or "").strip()
    day = chapter.get("day_number")
    slot = chapter.get("slot")
    cnum = chapter.get("canon_chapter_number")
    script = (chapter.get("script") or "").strip()
    excerpt = script[:520] + ("…" if len(script) > 520 else "")

    lines: list[str] = [
        f"[META-RESUMEN — Canon nº {cnum} · Día {day} slot {slot}]",
        f"Título: {title}",
        f"Arco narrativo: {arc or '—'}",
        "",
        "Hechos y tensión (extracto guion):",
        excerpt,
        "",
    ]

    syms = chapter.get("symbols_planted") or []
    if isinstance(syms, list) and syms:
        lines.append("Símbolos / anomalías plantadas (mantener en continuidad):")
        for s in syms[:12]:
            if isinstance(s, dict):
                nm = str(s.get("name") or "?")
                desc = str(s.get("description") or "")[:200]
                cat = str(s.get("category") or "")
                gr = str(s.get("game_reveal") or "")[:160]
                lines.append(f"  · {nm} [{cat}]: {desc}")
                if gr:
                    lines.append(f"    → Revelación juego: {gr}")
        lines.append("")

    bonds = chapter.get("bond_os_signals") or []
    if isinstance(bonds, list) and bonds:
        lines.append("Señales Bond OS (disfraz narrativo — no romper en futuros capítulos):")
        for b in bonds[:8]:
            if isinstance(b, dict):
                lines.append(
                    f"  · {b.get('feature', '?')}: {str(b.get('narrative_element', ''))[:240]}"
                )
        lines.append("")

    notes = (chapter.get("author_notes") or "").strip()
    if notes:
        lines.append("Notas del motor (continuidad):")
        lines.append(notes[:400] + ("…" if len(notes) > 400 else ""))

    return "\n".join(lines).strip()


def _strip_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```\w*\n?", "", t)
        t = re.sub(r"\n?```$", "", t)
    return t.strip()


async def generate_llm_meta_summary(chapter: dict[str, Any]) -> str | None:
    """
    Redacta 120–240 palabras en español: hechos inmutables, decisiones, cliffhanger,
    símbolos y anomalías. Devuelve None si no hay clave o falla la llamada.
    """
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not key:
        return None

    title = str(chapter.get("title") or "")
    arc = str(chapter.get("arc_position") or "")
    script = (chapter.get("script") or "")[:12000]
    syms = chapter.get("symbols_planted") or []
    bonds = chapter.get("bond_os_signals") or []
    syms_s = json.dumps(syms, ensure_ascii=False)[:4000]
    bonds_s = json.dumps(bonds, ensure_ascii=False)[:4000]

    user = f"""Capítulo: «{title}»
Arco: {arc}
Símbolos (JSON resumido): {syms_s}
Bond OS (JSON resumido): {bonds_s}

Guion (puede estar truncado):
{script}

Tarea: escribe en español un META-RESUMEN CANÓNICO de 120 a 240 palabras.
- Lista hechos que NO deben contradecirse después.
- Menciona cliffhanger o estado emocional al cierre.
- Enumera símbolos/anomalías que quedan activas para el multiverso.
Sin introducción ni despedida; solo el texto de la ficha técnica."""

    try:
        from anthropic import AsyncAnthropic

        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
        client = AsyncAnthropic()
        msg = await client.messages.create(
            model=model,
            max_tokens=900,
            temperature=0.35,
            system=(
                "Eres el archivero técnico de ConvergeVerse. "
                "Prioridad absoluta: coherencia factual para escritores y sistemas posteriores."
            ),
            messages=[{"role": "user", "content": user}],
        )
        blocks = getattr(msg, "content", None) or []
        parts = [getattr(b, "text", None) for b in blocks]
        text = "".join(p for p in parts if p).strip()
        return _strip_fence(text) if text else None
    except Exception as e:
        logger.warning("generate_llm_meta_summary: %s", e)
        return None


async def resolve_meta_summary_for_publish(chapter: dict[str, Any]) -> str:
    llm = await generate_llm_meta_summary(chapter)
    if llm and len(llm) >= 80:
        return llm
    return build_structural_meta_summary(chapter)
