# ADN científico — Manual de vuelo (`scientific_dna.py`)

Tabla canónica **`PHYSICS_RULES`** que BOND OS y el generador usan para **rigor físico** cuando hay portales, viajes o gravedad anómala.

## Reglas (código) — `PHYSICS_RULES`

| Clave | Significado narrativo |
|--------|------------------------|
| `magic_dark_matter` | La **magia** = **manipulación de materia oscura**. |
| `portals` | ER = **singularidades**; **energía negativa** para la garganta; **náusea de marea** al cruzar. |
| `time_dilation` | **Núcleo Rúnico** / fuentes densas; ejemplo **1 h / 3 días**; sigue valiendo **Trono del Rey Luis**. |
| `combat_physics` | Gravedad anómala → **inercia** y **tercera ley** con hachas rúnicas. |
| `quantum_entanglement` | Armas **entrelazadas**: rotura en un mundo → **vibración** o pérdida de brillo del par. |

## Canon extendido (Sistema BOND)

Anatomía Jötunheimr-Prime, química rúnica, ruinas tipo Dyson/Yggdrasil/Criptas, símbolos (círculo incompleto, tres puntas): **`docs/BOND_SYSTEM_CANON.md`** → `bond_extended_canon.py`.

## Inyección en el pipeline

1. **System prompt** — Las reglas se formatean como viñetas dentro de **ANCLA DE REALISMO · MANUAL DE VUELO** (`realism_anchor.py` + `get_realism_anchor_section()`), salvo que desactives el ADN (ver abajo).
2. **User prompt** — Al final de cada petición de capítulo se añade **`inject_scientific_realism`** → **NOTA DE RIGOR** (dilatación como factor emocional, cuándo aplicar ER/Trono/inercia).

## Variables de entorno (`apps/api/.env`)

| Variable | Efecto |
|----------|--------|
| `LAGUNA_SCIENTIFIC_DNA` | `false` → no se inyectan las **tres** reglas físicas en la ancla (siguen los bullets de BOND / dilatación dramática si `LAGUNA_REALISM_ANCHOR` sigue activo). |
| `LAGUNA_SCIENTIFIC_DNA_USER_RIGOR` | `false` → no se añade la NOTA DE RIGOR al final del user prompt de `/generate`. |
| `LAGUNA_SCIENTIFIC_DNA_CONDITIONAL_RIGOR` | `true` → la NOTA DE RIGOR solo si el contexto del día (prev + reciente + slot) coincide con heurística de portal/viaje (`text_suggests_portal_or_travel`). |

## API de Python

- `PHYSICS_RULES` — diccionario fuente.
- `inject_scientific_realism(prompt)` — añade la NOTA DE RIGOR (patrón del «manual de vuelo»).
- `append_rigor_to_user_prompt(user_prompt, context_for_conditional=...)` — uso interno del Story Engine.

## Ver también

- **`docs/REALISM_ANCHOR.md`** — marco completo del multiverso.
- **`docs/PROACTIVE_FEEDBACK.md`** — motor proactivo (usa el mismo cuerpo por defecto vía `realism_anchor`).
