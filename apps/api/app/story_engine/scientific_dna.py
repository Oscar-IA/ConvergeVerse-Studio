"""
ADN científico — «Manual de vuelo» para BOND OS y el generador.

Reglas explícitas de física cuando hay portales, viajes o gravedad anómala.
Desactivar solo las reglas físicas en la ancla: LAGUNA_SCIENTIFIC_DNA=false
Desactivar la NOTA DE RIGOR al final del user prompt: LAGUNA_SCIENTIFIC_DNA_USER_RIGOR=false
"""

from __future__ import annotations

import os
import re
from typing import Final

# ── Manual de vuelo (tabla canónica) ─────────────────────────────────────────

PHYSICS_RULES: Final[dict[str, str]] = {
    "magic_dark_matter": (
        "La **magia** operativa es **manipulación de materia oscura** (interfaz rúnica = control coherente, no incantación vacía)."
    ),
    "portals": (
        "**Puentes Einstein-Rosen:** no son puertas de luz; son **singularidades** ancladas. Mantener la **garganta** abierta requiere **energía negativa** masiva. "
        "**Cruzar** puede causar **náusea por marea gravitatoria** (más tirón en pies que en cabeza)."
    ),
    "time_dilation": (
        "**Dilatación (Interstellar):** junto a un **Núcleo Rúnico** u otra **fuente densa**, el tiempo **va más lento** dentro. "
        "Ejemplo: **1 h** en ruina ↔ **3 días** en el campamento — drama y desajuste emocional. Sigue valiendo masa extrema (p. ej. **Trono del Rey Luis**)."
    ),
    "combat_physics": (
        "En **gravedad cero o reducida**, la **inercia** manda: **hachas rúnicas** y armas pesadas cambian de manejo; cada golpe → **reacción igual y opuesta**."
    ),
    "quantum_entanglement": (
        "**Armas entrelazadas:** si una **espada rompe** en un universo, el **par** en otro **vibra** o **apaga su brillo** — consecuencia diegética, no solo FX."
    ),
}

_PHYSICS_LABELS: Final[dict[str, str]] = {
    "magic_dark_matter": "Magia y materia oscura",
    "portals": "Portales (ER) y travesía",
    "time_dilation": "Dilatación / Núcleo Rúnico",
    "combat_physics": "Combate e inercia",
    "quantum_entanglement": "Entrelazamiento (armas)",
}

_PHYSICS_ORDER: Final[tuple[str, ...]] = (
    "magic_dark_matter",
    "portals",
    "time_dilation",
    "combat_physics",
    "quantum_entanglement",
)

# Heurística: ¿el contexto ya habla de travesías / anomalías donde conviene recordar el manual?
_PORTAL_TRAVEL_PATTERN = re.compile(
    r"\b(portals?|orbets?|true\s*world|gusano|einstein|rosen|umbral|trono|n[uú]cleo\s+r[uú]nico"
    r"|dyson|yggdrasil|cripta(s)?\s+de\s+memoria|entrelaz|materia\s+oscura"
    r"|viaje\s+entre|traves[ií]a|isekai|teletransport|teleport|agujeros?)\b",
    re.IGNORECASE,
)


def scientific_dna_enabled() -> bool:
    """Incluir reglas físicas en la ancla de system prompt y textos por defecto."""
    raw = os.getenv("LAGUNA_SCIENTIFIC_DNA")
    if raw is None or not str(raw).strip():
        return True
    v = str(raw).strip().lower()
    return v not in ("0", "false", "no", "off")


def scientific_dna_user_rigor_enabled() -> bool:
    """Añadir NOTA DE RIGOR al final del user prompt de /generate."""
    raw = os.getenv("LAGUNA_SCIENTIFIC_DNA_USER_RIGOR")
    if raw is None or not str(raw).strip():
        return True
    v = str(raw).strip().lower()
    return v not in ("0", "false", "no", "off")


def text_suggests_portal_or_travel(text: str) -> bool:
    if not (text or "").strip():
        return False
    return bool(_PORTAL_TRAVEL_PATTERN.search(text))


def format_physics_rules_as_anchor_bullets() -> str:
    """Bullets en español para concatenar en ANCLA DE REALISMO."""
    lines: list[str] = []
    for key in _PHYSICS_ORDER:
        label = _PHYSICS_LABELS[key]
        lines.append(f"• **{label}:** {PHYSICS_RULES[key]}")
    return "\n".join(lines)


def scientific_rigor_note(*, compact: bool = False) -> str:
    """NOTA DE RIGOR para user prompt o inyecciones."""
    if compact:
        return (
            "NOTA DE RIGOR (Manual de vuelo): si hay portal o viaje, aplica ER + materia oscura; "
            "si hay gravedad extrema o mundos múltiples, haz la **dilatación temporal** explícita en el **peso emocional**; "
            "en combate anómalo, **inercia y reacción** a hachas rúnicas."
        )
    return (
        "NOTA DE RIGOR (Manual de vuelo / BOND OS): Revisa **portales, viajes, Núcleos Rúnicos/ruinas densas, combate anómalo, armas entrelazadas**. "
        "Aplica el system prompt: **materia oscura**, ER + **energía negativa**, **náusea de marea** al cruzar, **dilatación** (1h/3d u otras ratios), "
        "**inercia/reacción**, **vibración del par** si rompes una hoja entrelazada. La dilatación debe **pesar emocionalmente**."
    )


def inject_scientific_realism(prompt: str) -> str:
    """
    Añade la NOTA DE RIGOR al final de un prompt arbitrario (patrón del usuario).
    """
    base = (prompt or "").rstrip()
    note = scientific_rigor_note()
    if not base:
        return note
    return f"{base}\n\n{note}"


def append_rigor_to_user_prompt(user_prompt: str, *, context_for_conditional: str = "") -> str:
    """
    Sufijo para el user prompt del Story Engine.
    Por defecto siempre añade rigor si `LAGUNA_SCIENTIFIC_DNA_USER_RIGOR` está activo.
    Si `LAGUNA_SCIENTIFIC_DNA_CONDITIONAL_RIGOR=true`, solo si el contexto dispara heurística.
    """
    if not scientific_dna_enabled() or not scientific_dna_user_rigor_enabled():
        return user_prompt

    cond_raw = os.getenv("LAGUNA_SCIENTIFIC_DNA_CONDITIONAL_RIGOR")
    conditional = str(cond_raw or "").strip().lower() in ("1", "true", "yes", "on")
    if conditional and not text_suggests_portal_or_travel(context_for_conditional):
        return user_prompt

    return inject_scientific_realism(user_prompt)
