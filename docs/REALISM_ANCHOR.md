# Ancla de realismo — Multiverso Laguna

Canon de **inspiración científica e histórica** para que el isekai se sienta *internamente posible*: menos magia arbitraria, más consecuencias duras y lectura emocional fuerte.

## Las tres columnas

### 1. Física de los portales

Los **portales rúnicos** (p. ej. el de tu imagen de True World) **no son magia sin anclaje**: se tratan como **puentes de Einstein-Rosen** (agujeros de gusano) **estabilizados por energía oscura** (o análogo coherente en el lore). Las runas son **interfaz / gramática de estabilización**, no un sustituto de causa-efecto físico.

### 2. Dilatación temporal

Un **combate de ~25 minutos** en el **True World** puede ser **meses** en el **mundo original de Aren**. Eso añade **drama brutal** (culpa, pérdida, tiempo arrebatado a quienes esperan al otro lado), en la línea afectiva de *Interstellar*. Cuando la escena cruce mundos o el umbral, **no ignores el desfase** si ya lo has establecido.

### 3. Cultura vikinga y Sistema Bond

El **BOND OS** **no es un HUD de videojuego genérico**: es un **código de honor digital** (juramento, clan, palabra). Si fallas a tu palabra o a tu clan, el sistema **no solo muestra un debuff**: puede **penalizarte físicamente** (p. ej. vía **neurotransmisores** — dolor, temblor, debilitamiento), anclando la UI en cuerpo y honor, no en gamificación vacía.

## Implementación en el repo

| Pieza | Rol |
|--------|-----|
| `apps/api/app/story_engine/scientific_dna.py` | **`PHYSICS_RULES`** (manual de vuelo) + `inject_scientific_realism` + NOTA DE RIGOR en el **user prompt**. |
| `apps/api/app/story_engine/bond_extended_canon.py` | Canon largo: partículas/ER, anatomía vacío, química rúnica, ruinas maquinaria (`LAGUNA_BOND_EXTENDED_CANON`). Ver **`docs/BOND_SYSTEM_CANON.md`**. |
| `apps/api/app/story_engine/realism_anchor.py` | Compone ancla: reglas físicas (si ADN activo) + BOND / dilatación dramática + `get_realism_anchor_section()` |
| `story_engine.py` | Inyecta la ancla en el **system prompt** y aplica `append_rigor_to_user_prompt` al generar cada capítulo. |
| `proactivity_engine.py` | Si el panel no envía «ciencia/lore», usa el mismo núcleo como contexto por defecto. |

## Variables de entorno

| Variable | Efecto |
|----------|--------|
| `LAGUNA_REALISM_ANCHOR` | `false` / `0` / `no` / `off` → **no** inyectar el bloque en el generador. Sin definir → **activo** (comportamiento por defecto). |
| `LAGUNA_SCIENTIFIC_DNA` | `false` → quita las **tres** reglas de `PHYSICS_RULES` de la ancla (manteniendo BOND en la misma ancla si el ancla global sigue activa). Ver **`docs/SCIENTIFIC_DNA.md`**. |
| `LAGUNA_SCIENTIFIC_DNA_USER_RIGOR` | `false` → no añadir la NOTA DE RIGOR al final del user prompt. |
| `LAGUNA_SCIENTIFIC_DNA_CONDITIONAL_RIGOR` | `true` → NOTA DE RIGOR solo si el contexto sugiere portal/viaje (heurística). |
| `LAGUNA_BOND_EXTENDED_CANON` | `full` (defecto) \| `compact` \| `off` — bloque largo del Sistema BOND. Ver **`docs/BOND_SYSTEM_CANON.md`**. |

No afecta a la tabla `visual_references`: sigue siendo la **biblia visual**; la ancla es **reglas de mundo** compartidas.

## Documentos relacionados

- **`docs/SCIENTIFIC_DNA.md`** — tabla `PHYSICS_RULES`, `inject_scientific_realism`, flags finos.
- **`docs/PRODUCTION_BIBLE.md`** — coherencia visual y pipeline.
- **`docs/PROACTIVE_FEEDBACK.md`** — sugerencias creativas usando la misma base cuando no escribes notas propias.
