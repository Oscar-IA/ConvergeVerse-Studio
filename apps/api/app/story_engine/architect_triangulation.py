"""
Triangulación del GENERADOR — notas del Arquitecto (Supabase) + runas del Libro Digital.

El bloque inyecta la «voz showrunner» que expande la idea del workspace al formato ~25 min (3 actos).
"""

from __future__ import annotations

from typing import Any


def format_architect_triangulation_block(
    *,
    target_episode: int,
    season_index: int,
    plot_notes: list[dict[str, Any]],
    rune_corpus: list[str],
) -> str:
    """
    System prompt: prioridad absoluta a las ideas del Arquitecto, integradas con runas ya canonizadas.
    `plot_notes`: filas con al menos `raw_plot_idea` (y opcional `title`).
    """
    if not plot_notes and not rune_corpus:
        return ""

    lines: list[str] = [
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        "TRIANGULACIÓN DEL GENERADOR — Showrunner ConvergeVerse",
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
        f"Episodio objetivo (cour / Libro Digital): **{target_episode}** · Temporada (bloque narrativo) **{season_index}**.",
        "",
        "ERES EL SHOWRUNNER: convierte la idea del Arquitecto en **novela-guion detallada** por actos.",
        "DURACIÓN mental del episodio completo (3 slots del día): **~25 min** de ritmo anime.",
        "",
        "MANDATO DE ESTILO:",
        "  · Narrativa inmersiva e **introspección de Aren** (anti-héroe creíble, fallos y ironía).",
        "  · **Humor negro** tipo Deadpool + **acción** tensa tipo Jujutsu Kaisen (escala y consecuencias).",
        "  · El protagonista debe **superar un miedo o fallo específico** para evolucionar en el episodio.",
        "  · Integra **sutilmente** runas ya descubiertas en el canon y **pistas del multiverso** (sin info-dump).",
        "",
        "ESTRUCTURA (ya alineada con los 3 slots del motor):",
        "  · Acto I (slot 1) — Introducción, tono, apuesta emocional y comedia/disonancia.",
        "  · Acto II (slot 2) — Nudo, pruebas rúnicas o sociales, escalada.",
        "  · Acto III (slot 3) — Clímax, superación del miedo, revelación/gancho.",
        "",
    ]

    if plot_notes:
        lines.append("IDEA(S) DEL ARQUITECTO (espacio de trabajo — **máxima prioridad narrativa**):")
        for i, n in enumerate(plot_notes, 1):
            title = str(n.get("title") or "").strip()
            raw = str(n.get("raw_plot_idea") or "").strip()
            if not raw:
                continue
            head = f"  [{i}]"
            if title:
                head += f" «{title[:120]}»"
            lines.append(head)
            for chunk in _chunk_text(raw, 480):
                lines.append(f"      {chunk}")
        lines.append("")
    else:
        lines.append("(No hay notas nuevas en cola — prioriza continuidad del Legado y calibración creativa.)")
        lines.append("")

    if rune_corpus:
        lines.append("RUNAS / SELLOS YA ASENTADOS EN EL LIBRO DIGITAL (triangula, no contradigas sin giro explícito):")
        for r in rune_corpus[:18]:
            lines.append(f"  · {r}")
        lines.append("")

    lines.append(
        "Regla: cada slot sigue siendo **JSON con guion + paneles** del motor; "
        "no sustituyas el formato de salida — **materializa** estas directrices en el contenido."
    )

    return "\n".join(lines).strip()


def _chunk_text(text: str, max_len: int) -> list[str]:
    t = text.replace("\r\n", "\n").strip()
    if len(t) <= max_len:
        return [t] if t else []
    out: list[str] = []
    start = 0
    while start < len(t):
        out.append(t[start : start + max_len])
        start += max_len
    return out


def merge_inline_architect_idea(
    notes_from_db: list[dict[str, Any]],
    generation_config: dict[str, Any] | None,
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Añade idea efímera desde generation_config (sin id — no se marca processed en BD).
    Devuelve (notas_combinadas, ids_solo_bd).
    """
    merged = list(notes_from_db)
    ids_only = [str(n["id"]) for n in notes_from_db if n.get("id")]
    if not generation_config:
        return merged, ids_only
    inline = (
        generation_config.get("architect_plot_idea")
        or generation_config.get("architectPlotIdea")
        or ""
    ).strip()
    if inline:
        merged.append(
            {
                "id": None,
                "raw_plot_idea": inline,
                "title": "Calibración inline (esta generación)",
            }
        )
    return merged, ids_only


def triangulation_enabled(config: dict[str, Any] | None) -> bool:
    if not config:
        return True
    if config.get("skip_architect_triangulation") or config.get("skipArchitectTriangulation"):
        return False
    return True


def consume_architect_notes_enabled(config: dict[str, Any] | None) -> bool:
    if not config:
        return True
    if config.get("consume_architect_notes") is False or config.get("consumeArchitectNotes") is False:
        return False
    return True
