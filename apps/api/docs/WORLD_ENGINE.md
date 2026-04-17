# World Engine

## Jerarquía (SQLite)

`Season` → `Chapter` → **formatos** `novel` | `manga` | `anime`.

- Base por defecto: `apps/api/data/convergeverse.db` (override: `CONVERGE_DB_PATH`).
- Tablas: `seasons`, `chapters`, `chapter_formats` (`content_json` por formato).

## World building (`lore/world_config.json`)

- **characters**: `name`, `description`, `visual_traits`, `comedy_factor` (Konosuba).
- **locations**: `name`, `aesthetic`.

Se fusiona en `load_lore()` como `lore["world_config"]` y alimenta prompts + **ImageAgent** (`world_visual_bible`).

## Pipeline de 3 pasos + imágenes

1. **Novela** — prosa larga desde beats (JSON `novel`).
2. **Manga** — guion + `panels` **a partir del texto de la novela** (fallback: `ScriptAgent` por beats si falla el LLM).
3. **Anime** — `anime_vfx` / `vfx_proposals` (FX, color, timing, referencias).
4. **Imágenes** — mismo `ImageAgent` que Manga-Flow.

## API

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/world-engine/pipeline` | Body: `beats`, opcional `persist`, `season_slug`, `chapter_number`, … |
| GET | `/api/world-engine/library` | Árbol temporadas / capítulos / formatos guardados |
| GET | `/api/world-engine/chapters/{id}` | Novel + manga + anime guardados |

### Ejemplo `POST /api/world-engine/pipeline`

```json
{
  "beats": ["Aren activa un Orbet en el Abyssal Domain; Korr grita."],
  "persist": true,
  "season_slug": "s01",
  "season_title": "Season 1 — Bond Converge",
  "chapter_number": 1,
  "chapter_title": "El protocolo equivocado"
}
```

El pipeline clásico **`POST /api/pipeline/manga`** sigue igual (solo manga + imágenes, sin paso novela/VFX).
