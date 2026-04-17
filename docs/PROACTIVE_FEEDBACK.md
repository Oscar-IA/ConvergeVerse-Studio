# Motor de reacción proactiva (`POST /proactive-feedback`)

El Story Engine no solo **genera** capítulos: puede **proponer** mejoras creativas leyendo el guion actual, la **biblia visual** (`visual_references` activas) y notas opcionales de **ciencia / lore** (p. ej. dilatación temporal, sacrificio en Ep 4, analogías con Interstellar).

## Endpoint

`POST /api/story-engine/proactive-feedback`

Body JSON:

| Campo | Obligatorio | Descripción |
|--------|-------------|-------------|
| `chapter_id` | uno de los dos | UUID del capítulo en Supabase — se usa el campo `script`. |
| `chapter_content` | uno de los dos | Guion pegado manualmente (si no usas `chapter_id`). |
| `chapter_title` | no | Contexto extra (si usas solo `chapter_content`). |
| `scientific_lore` | no | Tus notas de física, runas, continuidad (Interstellar, vikingos, etc.). |
| `include_visual_refs` | no (default `true`) | Si `false`, no se cargan referencias visuales de Supabase. |

Respuesta: `suggestions_markdown` (texto en español, secciones markdown), `visual_references_used`, `chapter_title`.

## Requisitos

- `ANTHROPIC_API_KEY` o `OPENAI_API_KEY` (misma pila que `app/core/llm_completion.py`).
- Opcional: `PROACTIVITY_MAX_CHAPTER_CHARS`, `PROACTIVITY_MAX_TOKENS`, `PROACTIVITY_TEMPERATURE` en `apps/api/.env`.
- Si **no** envías `scientific_lore`, el motor usa por defecto el texto de la **ancla de realismo** (`realism_anchor.py`) — ver **`docs/REALISM_ANCHOR.md`**.

## Código

- Lógica y prompt: `apps/api/app/story_engine/proactivity_engine.py`
- Ruta: `apps/api/app/story_engine/routes.py`

## UI

Panel **Motor de reacción proactiva** en `/story-engine` (selección de capítulo + notas de ciencia).

## Relación con otras piezas

- **Referencias visuales:** `docs/VISUAL_REFERENCES.md` — lo que el motor lee si `include_visual_refs=true`.
- **Biblia de producción:** `docs/PRODUCTION_BIBLE.md` — misma base que alimenta coherencia manga/anime.
- **Sincronizar lore al futuro:** `POST /sync-lore-forward` aplica cambios a guiones futuros; **proactive-feedback** solo **sugiere** (no modifica Supabase).
