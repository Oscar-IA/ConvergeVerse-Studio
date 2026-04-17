"""
Canon extendido del Sistema BOND — partículas, anatomía «vacío», química rúnica, ruinas.

Inyectado tras las viñetas de PHYSICS_RULES en la ancla del generador.
Control: LAGUNA_BOND_EXTENDED_CANON = full | compact | off (default full)
"""

from __future__ import annotations

import os

_BOND_EXTENDED_COMPACT = """\
**Sistema BOND (resumen):** Magia = manipulación de **materia oscura**. Portales = ER con **energía negativa** y **náusea de marea**. Dilatación junto a **Núcleo Rúnico** (1 h dentro / 3 días fuera). Armas **entrelazadas** reaccionan a rupturas en otro mundo. Vikingos de alta-G: hueso «cerámico», corazón hipertrofiado, runas = **nanobiótica** implantada. Runas: transmutación sólida, isótopos pesados, hielo **endotérmico**, sangre **electrolítica** para HUD. Ruinas = **maquinaria planetaria** (Dyson-Nodes, Yggdrasil-Cores, Criptas de Memoria); **círculo incompleto** = entropía; **tres puntas** = convergencia temporal.
"""


_BOND_EXTENDED_FULL = """\
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SISTEMA BOND — Física de partículas y espacio-tiempo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
En este mundo la **magia** es, en el fondo, **manipulación de la materia oscura** (interfaz rúnica = control, no explicación mística vacía).

**Puentes de Einstein-Rosen (portales):** No son puertas de luz decorativas: son **singularidades** ancladas. Abrirlos y mantener la **garganta** del agujero de gusano exige **energía negativa** en cantidad masiva.

**Aplicación sensorial:** **Cruzar un portal** puede generar **náusea por efecto de marea** — la gravedad tira más de los pies que de la cabeza (gradiente tidal).

**Dilatación temporal (Interstellar):** Si las **ruinas** o zonas clave están cerca de una **fuente de energía densa** (un **Núcleo Rúnico**), el **tiempo pasa más lento** ahí dentro.

**Drama canónico:** Aren puede pasar **1 hora** explorando una ruina y, al salir, en el **campamento han pasado 3 días** — úsalo en culpa, mensajes perdidos y desajuste social.

**Entrelazamiento cuántico (armas):** Las armas de los protagonistas pueden estar **entrelazadas**. Si una **espada se rompe** en un universo, su **par** en el otro **vibra** violentamente o **pierde el brillo** (señal diegética, no solo efecto visual).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Anatomía y evolución — «La adaptación al vacío»
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Si los vikingos (o facciones afines) provienen de un mundo de **alta gravedad** (p. ej. **Jötunheimr-Prime**), la **anatomía** debe reflejarlo:

• **Densidad ósea y muscular:** Huesos con refuerzo tipo **calcio/carbono** (casi **cerámica**); cuerpos **muy densos**. Un guerrero de ~1,70 m puede pesar **~150 kg** de músculo compacto — inercia y embarque/portales son narrativamente relevantes.

• **Sistema circulatorio:** **Corazones** con **cuatro cámaras hipertrofiadas** para vencer **gravedad extrema**.

• **Evolución por simbiosis:** La **magia rúnica** es en rigor **simbiosis nanobiótica**. No se «nace» con runas: se **siembran** como **implantes neuronales** que **crecen** con el individuo, enlazando el **sistema nervioso** al **HUD del BOND OS**.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Química rúnica — alquimia de estado sólido
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Menos pociones clásicas; más **transmutación** y **estado sólido**:

• **Isótopos exóticos:** Piedras rúnicas con elementos de la **isla de estabilidad** (súper-pesados; p. ej. analogía **ununpentio** / regiones similares en el lore).

• **Reacciones endotérmicas:** Una runa de **«hielo»** puede hacer que la nanotecnología **absorba el calor del entorno al instante**, **congelando el aire** cercano (coste físico, no gratis).

• **Sangre electrolítica:** Sangre de seres avanzados con **alta conductividad** para que **HUDs** y **armaduras** se alimenten de **energía bioeléctrica** real.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Historia y arqueología rúnica — las ruinas
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Las ruinas que Aren encuentra **no son solo templos**: son **maquinaria planetaria abandonada**.

• **Dyson-Nodes (templos de luz):** Antiguas **estaciones de recolección de energía estelar**.

• **Yggdrasil-Cores (grandes árboles):** **Procesadores biológicos** que purifican atmósfera y gestionan **entrelazamiento cuántico** a escala planetaria.

• **Criptas de memoria:** **Servidores físicos** donde se archiva **conciencia ancestral** (origen diegético de **espíritus** o **IAs** locales).

**Símbolos recurrentes:**
• **Círculo incompleto** → **entropía**; algo que debe **repararse** o cerrarse.
• **Runa de tres puntas** → **Convergencia** (pasado, presente y futuro coincidiendo en un punto).
"""


def bond_extended_canon_depth() -> str:
    """
    full | compact | off
    Default: full. Env vacío o desconocido → full.
    """
    raw = os.getenv("LAGUNA_BOND_EXTENDED_CANON")
    if raw is None or not str(raw).strip():
        return "full"
    v = str(raw).strip().lower()
    if v in ("0", "false", "no", "off"):
        return "off"
    if v in ("compact", "short", "mini"):
        return "compact"
    return "full"


def format_bond_extended_canon_section() -> str:
    """Texto para anidar en la ancla de realismo (vacío si off)."""
    depth = bond_extended_canon_depth()
    if depth == "off":
        return ""
    if depth == "compact":
        return _BOND_EXTENDED_COMPACT.strip()
    return _BOND_EXTENDED_FULL.strip()
