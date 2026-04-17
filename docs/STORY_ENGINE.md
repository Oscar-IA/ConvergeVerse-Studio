# CONVERGEVERSE — STORY ENGINE SETUP

> **Integrado en el monorepo:** código en `apps/api/app/story_engine/`, dashboard en `apps/web/app/story-engine/page.tsx`, SQL en `docs/supabase_story_engine.sql`.

## Validación rápida

1. Ejecuta `docs/supabase_story_engine.sql` en Supabase (proyecto **sin** el esquema `supabase_chapters_edits_memory.sql`, o tablas conflictivas eliminadas).
   - **Libro digital / canon:** si el proyecto ya existía, aplica también `docs/supabase_chronicle_canon.sql` (columnas `slug`, `canon_chapter_number`, `book_payload`, etc.). Los borradores no actualizan `world_state`; solo al **aprobar** se fusiona el estado del mundo y se registra novela+manga en `book_payload`.
   - **Legado / meta-resumen:** `docs/supabase_chapter_meta_summary.sql` añade `meta_summary`. Tras aprobar, usa **Publicar al Legado** (`POST /api/story-engine/finalize`) para pasar a `published`: genera meta-resumen (LLM si hay `ANTHROPIC_API_KEY`, si no plantilla), escribe índice en `story_day_summaries`, sincroniza símbolos/Bond OS en `narrative_memory`. La continuidad en prompts usa solo capítulos **`published`**.
   - Opcional gamificación **«El libro es la llave»**: después ejecuta `docs/supabase_story_secrets.sql` (tabla `story_secrets` → API `/api/story-engine/secrets/...`).
   - Opcional **Previously On recursivo**: `docs/supabase_story_day_summaries.sql` — resumen técnico por `day_number`; si existe, el motor lo usa en lugar de extractos largos de N-1/N-2 (`NarrativeDB.upsert_story_day_summary`).
2. `cd apps/api && pip install -r requirements.txt` (incluye `supabase`, `anthropic`). Cliente Supabase con **timeouts** (`ClientOptions`: `SUPABASE_POSTGREST_TIMEOUT`, `SUPABASE_STORAGE_TIMEOUT`) — ver **`docs/SUPABASE_PYTHON_CLIENT.md`**.
3. Arranca API: `uvicorn app.main:app --reload --port 8000`
4. `curl -s http://localhost:8000/api/story-engine/database-status`
5. Next: `npm run dev` en `apps/web` → abre `/story-engine` (la raíz `/` redirige aquí).
6. **Prompt maestro visual** «CONVERGEVERSE: THE LAGUNA LEGACY»: `GET /api/story-engine/visual-master-prompt` (texto EN para Replicate) y `docs/CONVERGEVERSE_LAGUNA_LEGACY_MASTER_PROMPT.md`. Las crónicas en `storage/chronicles/.../cover.jpg` usan esta identidad si `REPLICATE_API_TOKEN` está configurado (`CHRONICLE_REPLICATE_PROMPT_MAX`, `CONVERGEVERSE_COVER_USE_FULL_MASTER` en `apps/api/.env`).
7. **Motor visual al publicar:** `docs/supabase_chapter_hero_image.sql` añade `hero_image_url`. Con `REPLICATE_API_TOKEN` en `apps/api/.env`, **POST /finalize** puede generar imagen Flux **16:9** (escena clave vía Claude si hay `ANTHROPIC_API_KEY`, si no heurística de panel/guion) y guardar URL + `book_payload.hero_image`. Body: `generate_hero_illustration: false` para omitir. Código: `app/story_engine/visual_motor.py`.
8. **Narración TTS (OpenAI):** `docs/supabase_narration_audio.sql` + bucket Storage (ver `docs/supabase_narration_audio.md`). Con `OPENAI_API_KEY`, **POST /api/story-engine/chapters/narrate** genera MP3 (`tts-1-hd`, voz p. ej. `onyx`) y sube a Storage; metadatos en `book_payload.narration`. En **POST /finalize** puedes enviar `generateNarrationAudio: true` para narrar el **script** tras publicar. Código: `app/story_engine/narration_tts.py`.
9. **Panel lector + memoria:** `docs/supabase_user_reader_settings.sql` crea `user_reader_settings` (font_size, narration_enabled). El front (`ReadingExperience`) llama **GET/PUT /api/story-engine/reader-settings** con debounce; respaldo en `localStorage`. Opcional `NEXT_PUBLIC_READER_PROFILE_ID` en `apps/web/.env.local`. **Diálogo de doble capa** (BOND OS vs Aren): marcadores `:::bond_os` / `:::aren` en el guion — **`docs/DIGITAL_BOOK_DOUBLE_LAYER.md`**.
10. **Cour (temporada anime):** 12 episodios por bloque; **1 día = 1 episodio** (3 slots = mismo episodio). Fases inicio / nudo / clímax / desenlace inyectadas en el prompt. En el **último episodio del cour** se inyectan **semillas de precuela** (Laguna / multiverso). Ver **`docs/COUR_STRUCTURE.md`** y `app/story_engine/cour_structure.py`. **POST /generate** y **GET /chapters/latest** devuelven `cour_context` (`is_cour_finale`, `prequel_seeding_active`, …) para la barra de temporada en el panel.
11. **Generador maestro (~25 min):** el botón **GENERADOR** usa por defecto **3 actos** (8+10+7 min): humor/exposición → conflicto rúnico → clímax multiversal + gancho; guion denso por slot y más tokens en Claude. Ver **`docs/MASTER_GENERATOR.md`** y `app/story_engine/master_generator.py`. Respuesta: `master_generator.enabled`.
12. **Anexo de Lore (Libro Digital):** al **aprobar** un capítulo se genera `book_payload.lore_annex`: **bestiario**, **ficha técnica de Aren**, **diccionario rúnico** (Claude si hay `ANTHROPIC_API_KEY`, si no heurística). Ver **`docs/LORE_ANNEX.md`** y `app/story_engine/lore_annex.py`.
13. **Triangulación del GENERADOR:** lee la cola **`architect_plot_notes`** (SQL `docs/supabase_architect_plot_notes.sql`), idea opcional inline en `generation_config` y **runas** recientes del anexo de lore en el Legado; inyecta bloque **showrunner** (~25 min, Aren, humor/acción). Ver **`docs/ARCHITECT_TRIANGULATION.md`** y `app/story_engine/architect_triangulation.py`.
14. **Memoria de avance (no repetir):** Antes de generar el día D, el motor consulta el capítulo con mayor `canon_chapter_number` entre **approved** y **published** e inyecta su **`meta_summary`** (si existe; si no, extracto de guion) más la orden explícita de avanzar la superación de Aren sin repetir clímax cerrados. Tras **POST /generate** exitoso, guarda `last_chapter_read` en `narrative_memory` (`key`: `story_engine.last_chapter_read`, categoría `world`). Inspección: **GET /api/story-engine/memory-progress**. Código: `app/story_engine/progress_memory.py`.
15. **Ciclo de producción Novela → Manga → Animación:** columna `production_phase` en `chapters` (`novel` → `manga` → `animation` → `complete`). Migración: `docs/supabase_production_phase.sql`. Ilustración manga: **POST /api/story-engine/chapters/manga-illustrate** (`manga_pipeline.py` + Replicate). Resumen: **`docs/PRODUCTION_CYCLE.md`**.
16. **Regeneración en cascada (BOND OS):** **POST /api/story-engine/chapters/regenerate-cascade** con `cascade_mode`: **`hard_reset`** (colapsa futuro y regenera) o **`soft_enrich`** (refina guiones de capítulos **approved/published** posteriores vía Claude, sin borrar filas). Atajo: **POST /chapters/sync-lore-forward** (`new_detail`). Columnas `cascade_mode` / `chapters_refined` en **`story_timeline_events`** — migración **`docs/supabase_timeline_soft_mode.sql`** si la tabla ya existía. Cronología: **GET /timeline-events**. Detalle: **`docs/TIMELINE_CASCADE.md`**.
17. **Contexto visual en el generador:** tabla **`visual_references`** (`label`, `visual_description`, `active`, `sort_order`, `image_url`). Antes de cada capítulo el motor las lee y añade el bloque «CONTEXTO VISUAL OBLIGATORIO» al system prompt (paneles + `image_prompt`). SQL: **`docs/supabase_visual_references.sql`** (incluido en `supabase_story_engine.sql` en instalaciones nuevas). API: **GET/POST/PATCH/DELETE /api/story-engine/visual-references** + **POST …/upload-image**. Código: **`visual_context.py`**. Detalle: **`docs/VISUAL_REFERENCES.md`**.
18. **Biblia de producción:** las referencias visuales en fase novela actúan como **Production Bible** para coherencia en **manga** (prompts de panel / ilustración) y **anime** (descripción alineada con concept art). Ver **`docs/PRODUCTION_BIBLE.md`** y **`docs/PRODUCTION_CYCLE.md`**.
19. **Motor de reacción proactiva:** **POST /api/story-engine/proactive-feedback** — lee guion (`chapter_id` o `chapter_content`) + referencias visuales activas + notas opcionales de ciencia/lore; el LLM **propone** mejoras (física creíble, visceralidad, hooks temporales) sin reescribir el capítulo. Código: **`proactivity_engine.py`**. Detalle: **`docs/PROACTIVE_FEEDBACK.md`**.
20. **Ancla de realismo (Multiverso Laguna):** bloque fijo en el system prompt del generador — portales como **Einstein-Rosen + energía oscura**, **dilatación temporal** (True World vs mundo de Aren), **BOND OS** como **código de honor digital** con coste físico (neurotransmisores). Código: **`realism_anchor.py`**. Desactivar: `LAGUNA_REALISM_ANCHOR=false`. Detalle: **`docs/REALISM_ANCHOR.md`**.
21. **ADN científico (manual de vuelo):** diccionario **`PHYSICS_RULES`** (`scientific_dna.py`) — magia/materia oscura, ER + energía negativa + marea, Núcleo Rúnico (1h/3d), combate, armas entrelazadas. **NOTA DE RIGOR** al final del user prompt. Detalle: **`docs/SCIENTIFIC_DNA.md`**.
22. **Canon extendido Sistema BOND:** `bond_extended_canon.py` — nanobiótica rúnica, Jötunheimr-Prime, alquimia sólida, Dyson-Nodes / Yggdrasil-Cores / Criptas de memoria, simbología. `LAGUNA_BOND_EXTENDED_CANON=full|compact|off`. Detalle: **`docs/BOND_SYSTEM_CANON.md`**.
23. **Asistente apasionado y «pesado»:** bloque de personalidad en el system prompt — narrador hiperpreciso (Interstellar/Dr. Stone), **Aren** como filtro del lector (interrupción + reacción BOND). `LAGUNA_PASSIONATE_ASSISTANT=false` para desactivar. Código: **`passionate_assistant.py`**. Detalle: **`docs/PASSIONATE_ASSISTANT.md`**.
24. **Banco de ideas en archivo (`IDEAS.pages/IDEAS.md`):** manuscrito local en la raíz del repo que el motor lee al generar (bloque en system prompt; límite `CONVERGE_AUTHOR_IDEAS_MAX_CHARS`, default 200k). Complementa la cola `architect_plot_notes`. **Escritura automática:** al **aprobar** (`POST /approve`) y al **Guardar idea** (`POST /architect-plot-notes`), `ideas_doc_sync.py` actualiza las secciones marcadas con `<!-- CV_SYNC:REGISTRO_CANON -->` y `<!-- CV_SYNC:PANEL_APP -->` (Claude si hay `ANTHROPIC_API_KEY`; si no, append estructurado). `CONVERGE_IDEAS_DOC_SYNC_DISABLED=1` desactiva. Detalle: **`docs/AUTHOR_IDEAS_FILE.md`** · **`author_ideas_file.py`** + **`ideas_doc_sync.py`**. **POST /generate** incluye `author_ideas_file` en la meta de triangulación.

---

# CONVERGEVERSE — STORY ENGINE SETUP (original)
# ════════════════════════════════════════════════════════════════

## ARCHIVOS EN EL REPO

```
docs/supabase_story_engine.sql     → Ejecutar en Supabase SQL Editor
apps/api/app/story_engine/
├── story_engine.py                → Motor narrativo (3 capítulos/día)
├── narrative_db.py                → Supabase + verify_story_engine_supabase()
├── dynamic_narrative_style.py     → Muestreo aleatorio de refs/ideas por capítulo (sabor fresco)
├── perfection_fusion.py           → Fusión explícita: ideas recientes + ADN + memoria (pre-escritura)
├── chronicle_canon.py             → Slug + book_payload (novela/manga) al promover a canon
├── lore_annex.py                  → Anexo de Lore (bestiario, Aren, runas) al aprobar
├── architect_triangulation.py     → Showrunner: notas Arquitecto + runas Legado → prompt
├── chapter_meta_summary.py        → Meta-resumen (plantilla + LLM opcional) al publicar
├── visual_motor.py               → Replicate Flux + escena clave → hero_image_url (Legado)
├── narration_tts.py              → OpenAI TTS → MP3 en Supabase Storage (narración)
├── progress_memory.py            → Memoria de avance + last_chapter_read (anti-repetición)
├── visual_context.py             → Bloque contexto visual desde tabla visual_references
├── cour_structure.py             → Cour 12 ep. / fases inicio–nudo–clímax–desenlace
├── master_generator.py           → Generador maestro: 3 actos / guion largo / max_tokens ↑
├── multi_reference_blend.py       → Mix del día (33/33/34 + muestreo determinista)
├── memory_agent.py
└── routes.py                      → Rutas FastAPI (antes story_engine_routes.py)
apps/web/app/story-engine/page.tsx → Dashboard Next.js
```

---

## PASO 1 — Supabase

1. Ve a https://supabase.com → crea un proyecto nuevo "convergeverse"
2. En el SQL Editor pega y ejecuta: `docs/supabase_story_engine.sql`
3. En Settings → API copia:
   - `Project URL` → SUPABASE_URL
   - `service_role` key → SUPABASE_SERVICE_KEY

---

## PASO 2 — Variables de entorno

Agrega a `apps/api/.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
```

---

## PASO 3 — Instalar dependencias Python

```bash
cd apps/api
source venv/bin/activate
pip install supabase
```

---

## PASO 4 — Copiar archivos al proyecto

```bash
# Crea el directorio del story engine
mkdir -p apps/api/app/story_engine

# Copia los archivos Python
cp story_engine.py     apps/api/app/story_engine/story_engine.py
cp narrative_db.py     apps/api/app/story_engine/narrative_db.py
cp memory_agent.py     apps/api/app/story_engine/memory_agent.py
cp story_engine_routes.py apps/api/app/story_engine/routes.py

# Crea el __init__.py
touch apps/api/app/story_engine/__init__.py

# Crea la página del dashboard
mkdir -p apps/web/app/story-engine
cp page.tsx apps/web/app/story-engine/page.tsx
```

---

## PASO 5 — Registrar rutas en main.py

Agrega esto en `apps/api/app/main.py`:

```python
from app.story_engine.routes import router as story_engine_router
app.include_router(story_engine_router, prefix="/api/story-engine", tags=["story-engine"])
```

---

## PASO 6 — Reiniciar servidor

```bash
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

---

## USO DIARIO

### Generar capítulos del día
```
POST http://localhost:8000/api/story-engine/generate
```
O desde el dashboard: `localhost:3000/story-engine` → botón "GENERAR DÍA"

### Revisar y aprobar
- Abre `localhost:3000/story-engine`
- Lee cada capítulo (SETUP / CONFLICTO / MISTERIO)
- Edita lo que no te guste → escribe por qué
- Aprueba o rechaza

### Enseñar a la IA
Después de editar varios capítulos, haz clic en "APRENDER DE EDITS"
o llama:
```
POST http://localhost:8000/api/story-engine/learn
```
La IA analiza tus cambios y genera nuevas reglas permanentes.

### Agregar una regla manualmente
```
POST http://localhost:8000/api/story-engine/rules
{ "rule": "Aren nunca usa palabras modernas como 'ok' o 'básicamente'", "priority": 2 }
```

---

## ARQUITECTURA

```
                    ┌─────────────────┐
                    │   Oscar (tú)    │
                    │  Dashboard /    │
                    │  story-engine   │
                    └────────┬────────┘
                             │ aprueba / edita / rechaza
                             ▼
                    ┌─────────────────┐
                    │  StoryEngine    │◄── Editorial Rules
                    │  3 caps/día     │◄── Narrative Memory
                    │  (Claude 3.5)   │◄── World State
                    └────────┬────────┘
                             │ genera
                             ▼
              ┌──────────────────────────────┐
              │           Supabase           │
              │  chapters / edits / memory   │
              │  symbols / world_state       │
              └──────────────┬───────────────┘
                             │ aprende de edits
                             ▼
                    ┌─────────────────┐
                    │  MemoryAgent    │
                    │  detecta        │
                    │  patrones →     │
                    │  nuevas reglas  │
                    └─────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Bond OS Game   │
                    │  símbolos ocultos│
                    │  se revelan     │
                    │  en el juego    │
                    └─────────────────┘
```

## SÍMBOLOS Y BOND OS

Cada capítulo planta automáticamente:
- **1 símbolo sutil** (pista para el juego Bond OS)
- **1 señal Bond OS** disfrazada como elemento del mundo

Categorías de símbolos:
- `orbet_hint` — pistas sobre poderes de Orbets
- `faction_signal` — movimientos secretos de facciones
- `character_omen` — presagios del arco de Aren
- `bond_os_feature` — features de Bond OS como magia/tecnología del mundo
- `game_mechanic_foreshadow` — mecánicas del juego que ya existen en el lore

Cuando el juego se lance, los jugadores podrán leer el libro y decir:
*"¡Lo vi venir desde el capítulo 3!"*
