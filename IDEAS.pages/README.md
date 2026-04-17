# Banco de ideas del autor (`IDEAS.pages`)

Esta carpeta es un **directorio de texto/Markdown** para el Story Engine.

> Tu documento de **Apple Pages** anterior se guardó como **`IDEAS_Archivo_Pages.pages`** en la raíz del proyecto (sigue abriendo con Pages). La IA **no** lee ese formato; edita aquí **`IDEAS.md`** en Cursor/VS Code.

## Archivo que lee la IA

- **`IDEAS.md`** — escribe todas tus ideas, borradores de capítulo, notas de arco, etc.

## Variables (`apps/api/.env`)

| Variable | Descripción |
|----------|-------------|
| `CONVERGE_AUTHOR_IDEAS_FILE` | Ruta absoluta u otra ruta relativa al repo. |
| `CONVERGE_AUTHOR_IDEAS_MAX_CHARS` | Máx. caracteres al modelo (default `200000`). |
| `CONVERGE_AUTHOR_IDEAS_DISABLED` | `1` = no leer el archivo para generar. |
| `CONVERGE_IDEAS_DOC_SYNC_DISABLED` | `1` = no escribir registro al **aprobar** ni al **Guardar idea**. |

Al **aprobar** capítulos o **Guardar idea** en el panel, la API puede actualizar las zonas entre `<!-- CV_SYNC:… -->` en `IDEAS.md` (Claude; si no hay API key, append simple).

Más detalle: `docs/AUTHOR_IDEAS_FILE.md`.
