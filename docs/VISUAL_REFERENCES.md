# Referencias visuales (`visual_references`)

Antes de generar cada capítulo, el Story Engine **escanea** las filas con `active = true` y construye un bloque de texto que se inyecta en el **system prompt** (junto a reglas editoriales, mix del día, etc.).

## Esquema

| Columna | Uso |
|--------|-----|
| `label` | Nombre corto (personaje, objeto, facción…). |
| `visual_description` | Regla de diseño / lectura visual obligatoria. |
| `notes` | Opcional; se añade entre paréntesis en el bloque. |
| `active` | Solo las filas `true` entran en el generador. |
| `sort_order` | Orden ascendente dentro del bloque. |
| `image_url` | Opcional — URL pública (p. ej. Storage); el bloque de prompt la menciona para coherencia visual. |

## SQL

- Instalación nueva: incluido en `docs/supabase_story_engine.sql`.
- Proyecto existente: `docs/supabase_visual_references.sql`.
- Columna `image_url` en tablas ya creadas: `docs/supabase_visual_references_image_url.sql`.
- Bucket Storage: `docs/supabase_visual_references_storage.md`.

## API

- `GET /api/story-engine/visual-references` — por defecto solo activas; `?include_inactive=true` para listar todas.
- `POST /api/story-engine/visual-references` — body JSON: `label`, `visual_description`, opcional `notes`, `sort_order`, `active`, `image_url`.
- `POST /api/story-engine/visual-references/upload-image` — `multipart/form-data`, campo `file` → `{ image_url }`.
- `PATCH /api/story-engine/visual-references/{id}` — actualizar cualquier campo (incl. `image_url` o `null` para quitar).
- `DELETE /api/story-engine/visual-references/{id}` — borrar la fila.

## Comportamiento en el generador

1. `NarrativeDB.fetch_active_visual_references()` lee Supabase.
2. `build_visual_context_block()` en `app/story_engine/visual_context.py` formatea el texto.
3. `StoryEngine._build_system_prompt()` inserta el bloque **después** de calibración / mix / overlay.
4. El user prompt añade una viñeta explícita para obedecer ese bloque en `panels[].description` e `image_prompt`.

La respuesta de **POST /generate** incluye `visual_context: { references_loaded, block_chars }` para depuración.

## Relación con el prompt maestro Laguna Legacy

- **`visual-master-prompt`**: identidad global EN para Replicate / portadas.
- **`visual_references`**: reglas **por proyecto** en español (y coherencia con paneles) al escribir cada episodio.

Pueden complementarse: el maestro define la marca; las referencias fijan detalles recurrentes (Aren, Orbets, paleta, etc.).

## Biblia de producción (novela → manga → anime)

Al documentar aquí los detalles en la fase de **novela**, estás construyendo una **Production Bible**: el mismo texto guía las descripciones de panel y los prompts de imagen que luego alimentan el **manga** (evitando, por ejemplo, un brazo mecánico como “metal liso” si definiste **runas grabadas**) y deja una **descripción literaria canónica** alineada con tus **artes conceptuales** para **anime** u otros pasos downstream, limitando que el diseño se desvíe del concept.

→ Marco completo: **`docs/PRODUCTION_BIBLE.md`** · ciclo de fases: **`docs/PRODUCTION_CYCLE.md`**.
