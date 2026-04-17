# Storage: imágenes de `visual_references`

El endpoint `POST /api/story-engine/visual-references/upload-image` sube archivos al bucket de Supabase configurado por **`VISUAL_REFERENCES_BUCKET`** (por defecto: `visual-references`).

## Pasos en Supabase

1. **Storage → New bucket**  
   - Nombre: `visual-references` (o el que pongas en `.env`).  
   - Marca el bucket como **público** si quieres URLs directas en el prompt (`get_public_url`).

2. **Políticas**  
   Con **service_role** el backend suele saltarse RLS; si usas otro cliente, añade políticas de `INSERT`/`SELECT` según tu modelo de seguridad.

3. **Columna `image_url`**  
   Si la tabla ya existía sin imagen, ejecuta `docs/supabase_visual_references_image_url.sql`.

## Variables de entorno (`apps/api/.env`)

| Variable | Descripción |
|----------|-------------|
| `VISUAL_REFERENCES_BUCKET` | Nombre del bucket (default `visual-references`). |
| `VISUAL_REFERENCES_MAX_BYTES` | Tamaño máximo en bytes (default 8 MiB). |

## Tipos permitidos

JPEG, PNG, WebP, GIF (ver `visual_reference_storage.py`).
