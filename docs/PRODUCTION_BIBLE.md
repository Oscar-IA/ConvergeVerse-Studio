# Biblia de producción (Production Bible)

En la fase **novela**, todo lo que fijas con intención —especialmente en **`visual_references`** (etiqueta + descripción técnica + imagen opcional)— no es solo adorno: es la **biblia de producción** del proyecto. Ese texto vive en Supabase y el Story Engine lo inyecta **antes de cada generación**, de modo que el mismo canon verbal acompaña al pipeline **Novela → Manga → Animación**.

## Por qué importa

| Etapa | Qué ganas |
|--------|-----------|
| **Novela** | El generador escribe `panels[].description` e `image_prompt` ya alineados con tus reglas (no “metal genérico” si tú definiste grabados rúnicos, silueta, paleta, etc.). |
| **Manga** | La IA que ilustra paneles (p. ej. Replicate) parte de **prompts en inglés** y descripciones de panel que **heredan** esas reglas: el brazo mecánico de la protagonista se describe con el mismo detalle (runas, no metal liso) que acordaste en la biblia. |
| **Anime / referencia animada** | Quien anime o use un futuro motor de vídeo dispone de una **descripción literaria canónica** que coincide con tus **artes conceptuales** (y URLs de referencia en el bloque de contexto), reduciendo deriva de diseño entre concept, boards y animación. |

## Dónde vive en el repo

- **Datos:** tabla `visual_references` — ver **`docs/VISUAL_REFERENCES.md`** y el panel **Visual Uploader** en `/story-engine`.
- **Prompt:** `app/story_engine/visual_context.py` → bloque «CONTEXTO VISUAL OBLIGATORIO» en el system prompt.
- **Ciclo:** fases `production_phase` — **`docs/PRODUCTION_CYCLE.md`**.

## Buenas prácticas

1. **Nombra con intención** (`label`): objeto o personaje tal como quieres que aparezca en notas de producción («Brazo mecánico · Aren», «Portal True World»).
2. **La descripción técnica es el contrato:** material, ornamentación, proporciones, lectura emocional, HUD, estilo 2D/3D — cuanto más preciso, menos ambigüedad en manga y downstream.
3. **Sube referencia visual** cuando puedas: la URL se cita en el bloque de contexto; la **descripción** sigue siendo lo que el modelo lee con más peso.
4. **Mantén `active` y `sort_order`:** prioriza lo que no puede fallar en continuidad episódica.

La biblia no sustituye el **prompt maestro** global (Laguna Legacy) ni el **anexo de lore** al aprobar: se **complementan**. La biblia fija **lectura visual recurrente**; el maestro, la marca; el anexo, enciclopedia de mundo.

Para **ideas proactivas** sobre un capítulo ya escrito (física, visceralidad, hooks de lore) sin tocar la base de datos, usa el **motor de reacción proactiva**: **`docs/PROACTIVE_FEEDBACK.md`**.

Las **reglas duras del multiverso** (portales, tiempo, BOND) están en la **ancla de realismo**: **`docs/REALISM_ANCHOR.md`** — se inyectan en cada generación salvo que desactives `LAGUNA_REALISM_ANCHOR`. El **desglose largo** (materia oscura, náusea de marea, Núcleo Rúnico, nanobiótica, ruinas Dyson/Yggdrasil, etc.) vive en **`docs/BOND_SYSTEM_CANON.md`** (`LAGUNA_BOND_EXTENDED_CANON`).
