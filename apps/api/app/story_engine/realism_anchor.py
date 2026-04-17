"""
Ancla de realismo — Multiverso Laguna (física e historia).

La parte de **física / manual de vuelo** vive en `scientific_dna.py` (PHYSICS_RULES).
Aquí se compone con la columna **BOND / honor vikingo**.

Desactivar inyección en el generador: LAGUNA_REALISM_ANCHOR=false
"""

from __future__ import annotations

import os

from app.story_engine.bond_extended_canon import format_bond_extended_canon_section
from app.story_engine.scientific_dna import (
    format_physics_rules_as_anchor_bullets,
    scientific_dna_enabled,
)

BOND_OS_ANCHOR_BULLET = """\
• **Cultura vikinga y BOND OS:** El **Sistema Bond** no es un HUD de videojuego genérico: es un **código de honor digital** (juramento, clan, palabra). Fallar la palabra o al clan implica **consecuencias físicas** — p. ej. modulación de **neurotransmisores**, dolor, temblor, debilitamiento — no solo un icono de debuff en pantalla.
• **Dilatación dramática (narrativa):** Un tramo breve en True World puede equivaler a **semanas o meses** en el mundo de origen de Aren; úsalo para **drama brutal** (pérdida, culpa) cuando el guion cruce el umbral — coherente con la dilatación por **masa extrema** del manual de vuelo.
"""


def build_realism_anchor_body() -> str:
    chunks: list[str] = []
    if scientific_dna_enabled():
        chunks.append(format_physics_rules_as_anchor_bullets())
    ext = format_bond_extended_canon_section()
    if ext.strip():
        chunks.append(ext.strip())
    chunks.append(BOND_OS_ANCHOR_BULLET.strip())
    return "\n\n".join(chunks)


def _compose_anchor_block() -> str:
    body = build_realism_anchor_body()
    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ANCLA DE REALISMO · MANUAL DE VUELO (Multiverso Laguna)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Para que el isekai sea internamente «posible», obedece estas reglas cuando haya portales, viajes, gravedad anómala o BOND OS en escena:

{body}
Mantén **coherencia** entre narración, diálogo y `bond_os_signals` / paneles.
"""


def realism_anchor_enabled() -> bool:
    raw = os.getenv("LAGUNA_REALISM_ANCHOR")
    if raw is None or not str(raw).strip():
        return True
    v = str(raw).strip().lower()
    return v not in ("0", "false", "no", "off")


def get_realism_anchor_section() -> str:
    """Fragmento para concatenar al system prompt del Story Engine (vacío si desactivado)."""
    if not realism_anchor_enabled():
        return ""
    return f"\n{_compose_anchor_block().strip()}\n"


def default_scientific_lore_for_proactivity() -> str:
    """Texto por defecto cuando el panel proactivo no envía notas de ciencia/lore."""
    return (
        "Contexto canónico del Multiverso Laguna (ancla de realismo — aplícalo si el guion lo permite):\n\n"
        + build_realism_anchor_body()
    )
