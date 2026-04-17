"""
Calibración creativa por sesión — mezcla de tono, marketing Bond OS, secretos, lore extra.
Se inyecta en el system prompt del Story Engine.
"""

from __future__ import annotations

from typing import Any


def _normalize_tone_mix(tm: dict[str, Any] | None) -> tuple[float, float, float] | None:
    if not tm or not isinstance(tm, dict):
        return None
    h = float(tm.get("humor") or 0)
    e = float(tm.get("epic") or 0)
    s = float(tm.get("strategy") or 0)
    tot = h + e + s
    if tot <= 0:
        return None
    return h / tot, e / tot, s / tot


def build_generation_overlay_block(config: dict[str, Any] | None) -> str:
    """
    Texto a insertar en el system prompt. None / {} → cadena vacía.
    """
    if not config:
        return ""

    lines: list[str] = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "CALIBRACIÓN CREATIVA (esta generación — prioriza sobre proporciones genéricas del mix)",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ]

    mix = _normalize_tone_mix(config.get("tone_mix"))
    if mix:
        h, e, s = mix
        lines.append("Mezcla de tono solicitada por el autor:")
        lines.append(
            f"  · Humor / ingenio (Konosuba, Deadpool, timing cruel): ~{h:.0%}"
        )
        lines.append(
            f"  · Épica visual y amenaza (Solo Leveling, Jujutsu Kaisen): ~{e:.0%}"
        )
        lines.append(
            f"  · Estrategia, sistemas, mundo reglado (Log Horizon, SAO): ~{s:.0%}"
        )
        lines.append(
            "  Reparte la carga emocional y el ritmo del guion según estas proporciones (orientativo)."
        )
        lines.append("")

    mkt = str(config.get("inject_marketing") or "").strip()[:300]  # límite 300 chars — reduce superficie de prompt injection
    if mkt:
        lines.append(
            f"PRODUCTO / MARCA A INYECTAR (estilo Bond OS — nunca como publicidad explícita): «{mkt}»"
        )
        lines.append(
            "  Disfraza como facción, sello mercantil del Archivo, rumor de gremio, leyenda urbana o nombre de senda."
        )
        lines.append("")

    if bool(config.get("force_secret")):
        lines.append(
            "«EL LIBRO ES LA LLAVE» — OBLIGATORIO: planta en la narrativa al menos una pista sutil "
            "que pueda enlazarse con un `story_secrets` del juego (sin escribir el secret_code en claro). "
            "Ej.: cifra, gesto ritual, frecuencia, palabra en dialecto, anomalía del Orbet."
        )
        lines.append("")

    lore = str(config.get("background_lore") or "").strip()
    if lore:
        lines.append("LORE DE FONDO ADICIONAL (alta prioridad en flashbacks, diálogos o registros):")
        lines.append(f"  {lore[:2000]}{'…' if len(lore) > 2000 else ''}")
        lines.append("")

    cascade = str(
        config.get("timeline_cascade_note")
        or config.get("timelineCascadeNote")
        or ""
    ).strip()
    if cascade:
        lines.append(
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "BOND OS — PÁRADOJA TEMPORAL (máxima prioridad narrativa)\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        lines.append(
            "El autor ha **colapsado** una línea temporal y reescribe el futuro desde aquí. "
            "La «MEMORIA DE AVANCE» (último canon / meta-resumen) sigue siendo verdad hasta el "
            "último capítulo aprobado **anterior** a este punto; lo que sigue DEBE obedecer la corrección:"
        )
        lines.append(f"  «{cascade[:3500]}{'…' if len(cascade) > 3500 else ''}»")
        lines.append(
            "  Contradicción con borradores descartados: ignórala. Este guion es la nueva línea "
            "canónica en potencia hasta nuevo visto bueno."
        )
        lines.append("")

    if len(lines) <= 3:
        return ""

    return "\n".join(lines).strip()
