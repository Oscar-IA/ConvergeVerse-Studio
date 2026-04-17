"""
Estilo narrativo dinámico — muestreo aleatorio de referencias del Creative Hub.

Cada capítulo recibe una triada distinta (epicidad / ingenio / lore) para evitar
anclarse en una sola IP; las ideas de la bóveda pueden añadir una veta opcional.
"""

from __future__ import annotations

import random
from typing import Any


def _ref_title(ref: dict[str, Any]) -> str:
    t = str(ref.get("title") or "").strip()
    return t or "referencia sin título"


def get_dynamic_narrative_style(
    user_references: list[dict[str, Any]],
    user_ideas: list[dict[str, Any]],
) -> str:
    """
    Selecciona hasta 3 referencias al azar y construye la directriz de estilo.

    `user_ideas` es opcional: si hay filas en ideation_vault, se elige una al azar
    como pivote creativo (una línea en el bloque).
    """
    refs = [r for r in user_references if str(r.get("title") or "").strip()]

    idea_note = ""
    if user_ideas:
        idea = random.choice(user_ideas)
        cn = str(idea.get("concept_name") or "").strip()
        desc = str(idea.get("description") or "").strip()[:200]
        if cn or desc:
            tail = f" — {desc}" if desc else ""
            idea_note = (
                f"\n    - VETA CREATIVA (bóveda de ideas): «{cn or 'concepto'}»{tail}. "
                "Déjala filtrar en un solo beat o imagen, sin pastiche."
            )

    if not refs:
        return _style_block_without_named_refs(idea_note)

    k = min(3, len(refs))
    selected = random.sample(refs, k=k)

    if k == 1:
        t = _ref_title(selected[0])
        mix_line = (
            f"    - No te ancles a un solo tono. De «{t}» extrae epicidad, ingenio y peso de mundo "
            "en proporciones que varíen a lo largo de la escena."
        )
    elif k == 2:
        a, b = _ref_title(selected[0]), _ref_title(selected[1])
        mix_line = (
            f"    - Mezcla la epicidad asociada a «{a}», el ingenio de «{b}» "
            f"y refuerza el lore alternando matices de «{a}» y «{b}» — sin centrarte en una sola referencia."
        )
    else:
        t0, t1, t2 = (
            _ref_title(selected[0]),
            _ref_title(selected[1]),
            _ref_title(selected[2]),
        )
        mix_line = (
            f"    - No te enfoques en un solo anime. Mezcla la epicidad de «{t0}», "
            f"el ingenio de «{t1}» y el lore de «{t2}»."
        )

    body = f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTILO NARRATIVO DINÁMICO (este capítulo — referencias muestreadas al azar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{mix_line}{idea_note}
    - TRAMA CENTRAL: El protagonista es un anti-héroe en un viaje de superación personal.
      Debe enfrentar sus miedos y arriesgarse a ser mejor, convirtiéndose en el más fuerte
      del multiverso por necesidad, no por deseo.
    - PISTAS OCULTAS: Introduce 'anomalías' en el mundo (objetos, códigos, comportamientos
      de NPCs) que sugieran que hay universos conectados, sin mencionar que es un juego.
    - TONO: Inspirador, estilo Isekai de alto nivel, con humor negro y sarcasmo sutil.

En diálogos y narración: no uses nombres propios de IPs ajenas en la prosa; solo esencia y mecánica."""
    return body.strip()


def _style_block_without_named_refs(idea_note: str) -> str:
    mix_line = (
        "    - Sin referencias nombradas en biblioteca: aplica mezcla épica + ingenio + lore "
        "tipo isekai de alto nivel (ver también MULTI-REFERENCE BLENDING en el system prompt)."
    )
    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTILO NARRATIVO DINÁMICO (este capítulo)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{mix_line}{idea_note}
    - TRAMA CENTRAL: El protagonista es un anti-héroe en un viaje de superación personal.
      Debe enfrentar sus miedos y arriesgarse a ser mejor, convirtiéndose en el más fuerte
      del multiverso por necesidad, no por deseo.
    - PISTAS OCULTAS: Introduce 'anomalías' en el mundo (objetos, códigos, comportamientos
      de NPCs) que sugieran que hay universos conectados, sin mencionar que es un juego.
    - TONO: Inspirador, estilo Isekai de alto nivel, con humor negro y sarcasmo sutil.

En diálogos y narración: voces 100% ConvergeVerse; sin nombres de obras externas.""".strip()
