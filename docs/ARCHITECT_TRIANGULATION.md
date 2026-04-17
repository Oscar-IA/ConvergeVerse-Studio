# Triangulación del GENERADOR (backend)

Al pulsar **GENERADOR** (`POST /api/story-engine/generate`), el motor puede **triangular**:

1. **Notas del Arquitecto** — filas en `architect_plot_notes` con `is_processed = false` (FIFO por `created_at`).
2. **Idea inline** — `generation_config.architect_plot_idea` (solo esa generación, no se guarda en cola).
3. **Runas del Libro Digital** — entradas de `book_payload.lore_annex.diccionario_runico` en capítulos **published** / **approved** recientes.

## SQL

Ejecuta en Supabase:

`docs/supabase_architect_plot_notes.sql`

## Bloque en el prompt

`app/story_engine/architect_triangulation.py` → `format_architect_triangulation_block(...)`

Incluye el mandato **showrunner** (~25 min, Deadpool + JJK, miedo de Aren, 3 actos) y lista las ideas + runas.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/story-engine/architect-plot-notes` | Body `{ raw_plot_idea, title? }` — encola nota |
| GET | `/api/story-engine/architect-plot-notes?pending_only=true` | Lista pendientes |

**POST /generate** devuelve además:

```json
"architect_triangulation": {
  "active": true,
  "plot_ideas_in_prompt": 2,
  "notes_from_queue": 1,
  "notes_marked_processed": 1,
  "skipped": false
}
```

## `generation_config`

- `architect_plot_idea` / `architectPlotIdea` — idea efímera.
- `skip_architect_triangulation` / `skipArchitectTriangulation` — no triangular.
- `consume_architect_notes` / `consumeArchitectNotes` — si `false`, las notas de cola **no** pasan a `is_processed` al terminar el día.

## UI

En `/story-engine`, el bloque **Workspace · Plot Architect** (`components/story-engine/ArchitectWorkspace.tsx`) usa **glassmorphism** (blur, bordes suaves, tipografía sistema/Inter) y botones **Guardar idea** → `POST /architect-plot-notes` y **Generar episodio** → mismo flujo que **GENERADOR** en la barra (incluye `architect_plot_idea` del textarea si no está vacío). Opciones de triangulación bajo la tarjeta.
