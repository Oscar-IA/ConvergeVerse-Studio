"""
Flujo de perfeccionamiento automático — fusión explícita antes de escribir.

Antes de redactar, el modelo debe integrar:
  1) Ideas recientes (Creative Hub / ideation_vault)
  2) ADN de referencia (mix de animes + bloques de estilo)
  3) Memoria narrativa (JSON en el prompt + continuidad en user prompt)

Objetivo: capítulo que se sienta del autor, con pulido de guion profesional.
"""

from __future__ import annotations

from typing import Any


def _truncate(text: str, max_len: int) -> str:
    t = (text or "").strip().replace("\n", " ")
    if len(t) <= max_len:
        return t
    return t[: max_len - 1] + "…"


def _format_recent_ideas(ideas: list[dict[str, Any]], max_items: int) -> list[str]:
    lines: list[str] = []
    for i, row in enumerate(ideas[:max_items], 1):
        name = str(row.get("concept_name") or "").strip() or "(sin nombre)"
        desc = _truncate(str(row.get("description") or ""), 240)
        cat = str(row.get("category") or "").strip()
        sty = str(row.get("integration_style") or "").strip()
        tail = f" [{cat}]" if cat else ""
        lines.append(f"  {i}. «{name}»{tail}")
        if desc:
            lines.append(f"     {desc}")
        if sty:
            lines.append(f"     Integración deseada: {_truncate(sty, 160)}")
    return lines


def _format_recent_refs(refs: list[dict[str, Any]], max_items: int) -> list[str]:
    lines: list[str] = []
    for i, row in enumerate(refs[:max_items], 1):
        title = str(row.get("title") or "").strip() or "(sin título)"
        mt = str(row.get("media_type") or "").strip()
        notes = _truncate(str(row.get("notes") or ""), 200)
        mt_part = f" — {mt}" if mt else ""
        lines.append(f"  {i}. «{title}»{mt_part}")
        if notes:
            lines.append(f"     {notes}")
    return lines


def build_perfection_fusion_block(
    reference_pool: list[dict[str, Any]],
    idea_pool: list[dict[str, Any]],
    *,
    max_recent_refs: int = 6,
    max_recent_ideas: int = 12,
) -> str:
    """
    `reference_pool` e `idea_pool` deben venir ordenados por `created_at` descendente
    (como en `NarrativeDB.fetch_*_for_blend`): lo más nuevo = lo que acaba de escribir el autor.
    """
    idea_lines = _format_recent_ideas(idea_pool, max_recent_ideas)
    ref_lines = _format_recent_refs(reference_pool, max_recent_refs)

    ideas_body = (
        "\n".join(idea_lines)
        if idea_lines
        else "  (Aún no hay ideas en ideation_vault — añádelas desde Creative Hub en la app.)"
    )
    refs_body = (
        "\n".join(ref_lines)
        if ref_lines
        else "  (Aún no hay referencias en creative_references — añádelas desde Creative Hub.)"
    )

    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FLUJO DE PERFECCIONAMIENTO AUTOMÁTICO (fusión antes de escribir)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Antes de redactar el capítulo, fusiona en una sola voz narrativa:

  A) TUS IDEAS RECIENTES — lo último que el autor guardó en la app (prioridad alta):
{ideas_body}

  B) ADN DE REFERENCIA — el mix de animes / obras (esencia, no copia; ver bloques
     «MULTI-REFERENCE BLENDING» y «ESTILO NARRATIVO DINÁMICO» más abajo).
     Referencias añadidas recientemente en la app (contexto del autor):
{refs_body}

  C) MEMORIA NARRATIVA — ancla en hechos ya establecidos:
     · En ESTE prompt: PERSONAJES EN MEMORIA, LOCACIONES, SÍMBOLOS, ESTADO DEL MUNDO, ARCO ACTIVO.
     · En el mensaje del usuario: «PREVIAMENTE EN CONVERGEVERSE», capítulos de hoy ya generados
       y últimos capítulos publicados. No contradigas continuidad salvo giro explícito en author_notes.

RESULTADO DESEADO:
  · El capítulo debe sentirse 100% alineado con las ideas recientes del autor (A) y la continuidad (C).
  · Pulir con criterio de guionista profesional: ritmo, claridad, tensión, diálogo elástico y cierre con gancho
    — sin apagar la voz del autor ni sustituir sus conceptos por otros genéricos.
  · Las referencias (B) afinan tono y mecánica; nunca sustituyen (A) ni violan (C).

Orden de prioridad si hay tensión: REGLAS EDITORIALES > continuidad (C) > ideas recientes (A) > ADN (B), salvo
que «CALIBRACIÓN CREATIVA» del autor indique lo contrario para esta generación.""".strip()
