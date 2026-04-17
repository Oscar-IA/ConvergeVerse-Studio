# Banco de ideas en archivo (`IDEAS.pages/IDEAS.md`)

## Propósito

Centralizar **todas** las ideas del autor en **un solo archivo** dentro del repo, para:

- No depender solo de notas sueltas en Supabase (`architect_plot_notes`).
- Mantener un manuscrito largo (incluso borradores de capítulo) editable en VS Code / Cursor.

## Ubicación por defecto

Desde la raíz del monorepo:

`IDEAS.pages/IDEAS.md`

(`IDEAS.pages` debe ser una **carpeta** con el Markdown dentro. Si tenías un documento de **Apple Pages** llamado `IDEAS.pages`, el repo lo respaldó como `IDEAS_Archivo_Pages.pages` en la raíz.)

## Cómo lo usa el motor

Al preparar cada generación de día, la API:

1. Lee el archivo (si existe y no está desactivado).
2. Recorta a `CONVERGE_AUTHOR_IDEAS_MAX_CHARS` (default **200000**) para no saturar el contexto del modelo.
3. Inyecta un bloque **«BANCO DE IDEAS DEL AUTOR»** en el **system prompt**, con instrucciones de **adaptar solo lo pertinente** al slot/cour, sin volcar el archivo entero en un solo capítulo.

Sigue siendo válido usar el **Workspace · Plot Architect** y la cola en Supabase para ideas puntuales del día.

## Escritura automática (registro organizado)

Entre los comentarios `<!-- CV_SYNC:REGISTRO_CANON -->` … `<!-- /CV_SYNC:REGISTRO_CANON -->` y `<!-- CV_SYNC:PANEL_APP -->` … `<!-- /CV_SYNC:PANEL_APP -->` el backend **actualiza** el Markdown:

| Acción en la app | Qué hace la IA en `IDEAS.md` |
|------------------|------------------------------|
| **Aprobar** un capítulo (`POST /approve` → approved) | Fusiona en **Registro automático — canon** resumen de avance narrativo, lore/símbolos según datos del capítulo. |
| **Guardar idea** en el Plot Architect | Fusiona en **Ideas desde la app** la nota nueva de forma ordenada (con `id` de nota). |

Requiere `ANTHROPIC_API_KEY`. Si no hay clave, se hace un **append** estructurado simple (sin LLM).

Desactivar todas las escrituras: `CONVERGE_IDEAS_DOC_SYNC_DISABLED=1` en `apps/api/.env`.

Código: `app/story_engine/ideas_doc_sync.py`.

## Variables de entorno (`apps/api/.env`)

```env
# Opcional: ruta absoluta a otro archivo
# CONVERGE_AUTHOR_IDEAS_FILE=/ruta/a/mis_ideas.md

# Opcional: límite de caracteres leídos (default 200000)
# CONVERGE_AUTHOR_IDEAS_MAX_CHARS=200000

# Opcional: desactivar lectura del archivo
# CONVERGE_AUTHOR_IDEAS_DISABLED=1
```
