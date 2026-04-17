# Ciclo de evolución: Novela → Manga → Animación

El **status de producción** (`chapters.production_phase`) fija el orden del pipeline creativo.

| Fase | Valor DB | Qué ocurre |
|------|-----------|------------|
| **Novela** | `novel` | Borrador: generador maestro (~25 min lectura/voz), edición y aprobación. |
| **Manga** | `manga` | Tras **aprobar**, el capítulo entra en fase manga: keyframes en paneles → **POST `/api/story-engine/chapters/manga-illustrate`** (Replicate / estilo webtoon). |
| **Animación (referencia)** | `animation` | Tras ilustrar paneles: referencia para un futuro motor de vídeo (paneles + audio). |
| **Completo** | `complete` | Tras **Publicar al Legado** (`finalize`): capítulo `published` y ciclo cerrado en legado. |

## Transiciones

1. **Aprobar** (`promote_chapter_to_canon`): `production_phase` → `manga`.
2. **Manga illustrate**: requiere `status === approved` y fase `manga` o `animation`; al terminar → `animation` y URLs en paneles (`image_provider`: `replicate_flux_manga`).
3. **Finalize**: `production_phase` → `complete` (y `published`).

## SQL

- Proyectos nuevos: `docs/supabase_story_engine.sql` (incluye `production_phase`).
- Proyectos existentes: ejecutar **`docs/supabase_production_phase.sql`**.

## Entorno API

- `REPLICATE_API_TOKEN` (obligatorio para paneles).
- Opcional: variables de aspect ratio / longitud de prompt en `visual_motor` / `.env` (ver comentarios en código).

## UI

En `/story-engine`, capítulos **aprobados** en fase manga/animación muestran **Generar paneles manga** antes del bloque **Publicar al Legado**.

## Biblia de producción (coherencia manga / anime)

Lo que defines en fase **novela** en **`visual_references`** (Visual Uploader) es la **biblia de producción**: el generador escribe paneles y `image_prompt` ya alineados con esos detalles; en **manga**, la ilustración no asume diseños genéricos si tú fijaste, por ejemplo, grabados rúnicos en un brazo mecánico; en **anime / referencia animada**, la descripción canónica encaja con tus artes conceptuales y reduce deriva entre concept y animación.

→ Detalle: **`docs/PRODUCTION_BIBLE.md`** · referencias: **`docs/VISUAL_REFERENCES.md`**.
