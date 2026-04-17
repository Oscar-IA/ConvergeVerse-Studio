# Regenerar desde aquí — cascada temporal (BOND OS)

## Comportamiento

1. Eliges un **capítulo pivote** (borrador, aprobado, publicado o rechazado).
2. Escribes una **nota de trama** (ej. *Aren no escapa; lo capturan*).
3. El backend **elimina** de `chapters`:
   - el pivote y todos los del **mismo día** con `slot >= slot` del pivote;
   - todos los capítulos en **días posteriores**;
   - cualquier fila con **`canon_chapter_number` mayor** que el del pivote (si el pivote tenía canon).
4. Se registra un evento en **`story_timeline_events`** (cronología de decisiones).
5. El motor vuelve a generar **desde el slot pivote hasta el slot 3** de ese día, con:
   - **Memoria de avance**: último capítulo **approved/published** con canon (típicamente el «episodio 3» con `meta_summary` si ya está en Legado).
   - Bloque **PÁRADOJA TEMPORAL** en el prompt (`timeline_cascade_note` + `architect_plot_idea` mezclados).
   - Misma **calibración** que envías en `generation_config` (tono, generador maestro, triangulación, etc.).

Los borradores nuevos llevan en `book_payload.meta` `timeline_branch_event_id` para el efecto visual **RAMA ALTERNATIVA** en el lector.

## API

| Método | Ruta | Uso |
|--------|------|-----|
| `POST` | `/api/story-engine/chapters/regenerate-cascade` | Body: `chapter_id`, `plot_pivot_note`, `cascade_mode`: `hard_reset` (default) o `soft_enrich`, `max_future_chapters` (1–24, solo soft), opcional `generation_config`. |
| `POST` | `/api/story-engine/chapters/sync-lore-forward` | Igual que soft: `chapter_id`, `new_detail`, `max_future_chapters`. Atajo desde el editor (Libro digital). |
| `GET` | `/api/story-engine/timeline-events?limit=30` | Lista de decisiones para la UI «Cronología». |

## SQL

- Proyectos nuevos: `docs/supabase_story_engine.sql` (tabla + RLS + `cascade_mode` / `chapters_refined`).
- Ya en marcha: **`docs/supabase_timeline_cascade.sql`**, y si faltan columnas soft: **`docs/supabase_timeline_soft_mode.sql`**.

## UI

En `/story-engine`, cada capítulo expandible incluye **Zona de paradoja** y la cronología bajo el workspace del Arquitecto.

## Notas

- Operación **destructiva**: no hay rollback automático.
- Referencias `symbols.first_seen` a capítulos borrados se ponen a `null` antes del delete.
- Tras cascada, vuelve a **aprobar** en orden si necesitas canon y Legado coherentes.
