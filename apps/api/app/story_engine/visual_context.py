"""
Contexto visual global — reglas de diseño inyectadas en el generador (paneles + image_prompt).
"""

from __future__ import annotations

from typing import Any


def build_visual_context_block(rows: list[dict[str, Any]], *, max_chars: int = 12_000) -> str:
    """
    Construye el bloque de system prompt a partir de filas `visual_references`.
    Espera al menos `label` y `visual_description` por fila.
    """
    if not rows:
        return ""

    lines: list[str] = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "CONTEXTO VISUAL OBLIGATORIO (diseño, storyboard, prompts de imagen)",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "REGLAS VISUALES OBLIGATORIAS — respétalas al escribir narración, "
        "`panels[].description`, y sobre todo `panels[].image_prompt` (inglés para Flux/Replicate):",
        "",
    ]
    for r in rows:
        label = str(r.get("label") or r.get("title") or "").strip() or "Referencia"
        desc = str(r.get("visual_description") or r.get("description") or "").strip()
        if not desc:
            continue
        extra = str(r.get("notes") or "").strip()
        if extra:
            lines.append(f"- **{label}**: {desc} (nota: {extra[:400]}{'…' if len(extra) > 400 else ''})")
        else:
            lines.append(f"- **{label}**: {desc}")
        img = str(r.get("image_url") or "").strip()
        if img:
            lines.append(
                f"  · URL imagen de referencia (coherencia visual / True World): {img[:500]}"
                f"{'…' if len(img) > 500 else ''}"
            )
        lines.append("")

    lines.append(
        "Si una escena toca un elemento listado arriba, la descripción visual y el image_prompt "
        "deben ser coherentes con esa referencia (silueta, paleta, lectura emocional)."
    )

    out = "\n".join(lines).strip()
    if len(out) > max_chars:
        out = out[: max_chars - 1] + "…"
    return out
