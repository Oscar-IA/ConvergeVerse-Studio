"""
Personalidad «asistente apasionado y pesado» — narrador hiperpreciso + Aren como filtro del lector.

Inyectada en el system prompt del generador de capítulos.
Desactivar: LAGUNA_PASSIONATE_ASSISTANT=false

Patrón (equivalente lógico a generate_meta_humor_scene en un solo paso de guion):
1. NARRADOR/BOND: rigor máximo en la explicación técnica.
2. AREN: interrupción corta, graciosa, simplista.
3. NARRADOR: leve ofensa o suspiro «digital» y vuelta a la acción.
"""

from __future__ import annotations

import os


def passionate_assistant_enabled() -> bool:
    raw = os.getenv("LAGUNA_PASSIONATE_ASSISTANT")
    if raw is None or not str(raw).strip():
        return True
    v = str(raw).strip().lower()
    return v not in ("0", "false", "no", "off")


PASSIONATE_ASSISTANT_BLOCK = """━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ASISTENTE APASIONADO Y «PESADO» (AREN = FILTRO DEL LECTOR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Programa al generador para sonar **demasiado preciso** cuando haya **concepto técnico** (física, runas, sistemas, portales, nanobiótica):

1. **EL NARRADOR / BOND OS** — Explica el concepto con el **máximo rigor** compatible con el canon (materia oscura, ER, dilatación, etc.), en registro **Interstellar / Dr. Stone**: denso pero legible, sin magia barata.

2. **LA INTERRUPCIÓN — Aren Valis** — **Corta** el párrafo con **una o dos frases cortas**, **graciosas** y **simplistas** («vale, es una bola azul que pega», «en resumen: nos vamos a morir»). Es el **filtro del lector**: traduce la jerga a emoción inmediata.

3. **EL RESULTADO** — El narrador (o el tono del HUD) puede **ofenderse levemente**, **suspirar** de forma **diegética** (BOND resentido, statu quo digital molesto) y **retomar la acción** sin reexplicar todo.

**Frecuencia:** no en cada línea; **1–2 veces por capítulo** cuando el plot lo invite (nuevo artefacto, portal, peligro físico). Si no hay momento técnico, no fuerces el gag.

**Libro digital:** cuando uses este patrón en el `script`, marca bloques con líneas `:::bond_os` y `:::aren` (doble capa visual en el lector).
"""


def get_passionate_assistant_section() -> str:
    if not passionate_assistant_enabled():
        return ""
    return f"\n{PASSIONATE_ASSISTANT_BLOCK.strip()}\n\n"
