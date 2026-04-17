# Asistente apasionado y «pesado»

El generador de capítulos incluye (por defecto) un bloque de **personalidad** en el **system prompt**: el narrador/BOND OS puede volverse **demasiado preciso** en explicaciones técnicas, y **Aren Valis** actúa como **filtro del lector** con interrupciones cortas y cómicas.

## Patrón de tres tiempos

1. **Narrador** — Rigor tipo **Interstellar / Dr. Stone** sobre el concepto (coherente con la ancla de realismo / BOND).
2. **Aren** — **Una o dos frases** simplistas y graciosas que cortan la jerga.
3. **Narrador / BOND** — **Ofensa leve** o **suspiro digital** y vuelta a la acción sin repetir la lección.

### Ejemplo de guion ya marcado

**Portal de inicio** (singularidad, métrica de Alcubierre, mareo, «Salta») — texto listo para `script` con `:::bond_os` / `:::aren`: ver **`docs/DIGITAL_BOOK_DOUBLE_LAYER.md`** (*Ejemplo canónico: El portal de inicio*).

**Frecuencia sugerida en prompt:** 1–2 veces por capítulo cuando el plot lo permita; no forzar en cada escena.

## Libro digital

En el `script`, usar **`:::bond_os`** / **`:::aren`** para el lector con doble capa visual — ver **`docs/DIGITAL_BOOK_DOUBLE_LAYER.md`**.

## Código

- `apps/api/app/story_engine/passionate_assistant.py` — `get_passionate_assistant_section()`
- Inyección en `story_engine.py` → sección **TONO Y ESTRUCTURA NARRATIVA** (antes de **ESTRUCTURA NARRATIVA**).

## Variable de entorno

| Variable | Efecto |
|----------|--------|
| `LAGUNA_PASSIONATE_ASSISTANT` | `false` / `0` / `no` / `off` → no inyectar el bloque. Sin definir → **activo**. |

## Nota sobre `generate_meta_humor_scene`

El pseudocódigo de un segundo LLM solo para «escena de metahumor» **no** está cableado: el capítulo se genera en **una** llamada; el bloque anterior **instruye** al mismo modelo para mezclar rigor + interrupción + reacción dentro del `script`. Si en el futuro quisieras un endpoint aparte, reutiliza el texto de `PASSIONATE_ASSISTANT_BLOCK` como system de esa mini-llamada.
