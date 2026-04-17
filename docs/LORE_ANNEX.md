# Anexo de Lore (Libro Digital)

Al **aprobar** un capítulo (`POST /api/story-engine/approve` → promoción a canon), el motor genera automáticamente un **`book_payload.lore_annex`** persistido en Supabase junto a novela+manga.

## Secciones

| Clave | Contenido |
|-------|-----------|
| **bestiary** | Especies, entidades o «presencias» relevantes del episodio (nombre, facción/tipo, descripción, nivel de amenaza). |
| **ficha_tecnica** | Evolución de **Aren**: retrato al cierre, habilidades o progresos observados, nota de evolución (también superación emocional/rúnica si no hay combate explícito). |
| **diccionario_runico** | Runas, sellos o glifos **nuevos o redefinidos** en el episodio (nombre, significado, uso en escena). |

## Generación

- Con **`ANTHROPIC_API_KEY`**: Claude produce JSON rico en español (tono enciclopedia in-world).
- Sin clave: modo **`structural`** (heurísticas sobre símbolos, paneles y patrones «runa/sello» en el guion).

Campos comunes:

- `generated_at` — ISO 8601  
- `source` — `llm` | `structural` | `error`

## Código

- `apps/api/app/story_engine/lore_annex.py` — `build_lore_annex_for_chapter`, `promote_chapter_to_canon` lo invoca.
- `apps/web/components/story-engine/LoreAnnexSection.tsx` — panel colapsable en `/story-engine` (capítulos approved / published).

## Notas

- El anexo es **snapshot al aprobar**; si editas el guion después, el anexo no se regenera salvo que implementes un flujo manual.
- El **meta-resumen** al publicar al Legado sigue siendo independiente; ambos conviven en el Libro Digital.
