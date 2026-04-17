# Sistema BOND — canon extendido (partículas, anatomía, química, ruinas)

Texto largo en código: `apps/api/app/story_engine/bond_extended_canon.py`. Se inyecta en la **ancla de realismo** del generador **después** de las viñetas `PHYSICS_RULES` y **antes** del bloque corto de honor BOND.

## Contenido (resumen)

1. **Física y espacio-tiempo** — Magia = **materia oscura**. Portales ER = **singularidades** + **energía negativa** para la garganta; **náusea de marea** al cruzar. **Núcleo Rúnico** y dilatación (ej. **1 h / 3 días**). **Entrelazamiento** de armas emparejadas.
2. **Adaptación al vacío** — Origen alta-G (**Jötunheimr-Prime**): hueso casi **cerámico**, ~**150 kg** en 1,70 m, corazón **cuatro cámaras** hipertrofiado. Runas = **nanobiótica** implantada que crece con el nervio y alimenta el HUD.
3. **Química rúnica** — Transmutación sólida, **isla de estabilidad**, runas de hielo **endotérmicas**, **sangre electrolítica** para armaduras/HUD.
4. **Arqueología rúnica** — Ruinas = **maquinaria planetaria**: **Dyson-Nodes**, **Yggdrasil-Cores**, **Criptas de Memoria**. Símbolos: **círculo incompleto** (entropía), **tres puntas** (convergencia temporal).

## Variable de entorno

| Valor | Efecto |
|--------|--------|
| `LAGUNA_BOND_EXTENDED_CANON=full` | (por defecto si la variable no está o es desconocido) texto completo. |
| `LAGUNA_BOND_EXTENDED_CANON=compact` | párrafo único resumido. |
| `LAGUNA_BOND_EXTENDED_CANON=off` | no inyectar este bloque (siguen `PHYSICS_RULES` si `LAGUNA_SCIENTIFIC_DNA` está activo). |

## Relación con `PHYSICS_RULES`

`scientific_dna.py` mantiene una **tabla corta** (magia/materia oscura, portales, dilatación, combate, entrelazamiento). El archivo `bond_extended_canon.py` **desglosa** el mismo universo para el modelo.

Ver también **`docs/SCIENTIFIC_DNA.md`** y **`docs/REALISM_ANCHOR.md`**.
