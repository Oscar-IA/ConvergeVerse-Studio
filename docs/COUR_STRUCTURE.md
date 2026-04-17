# Arquitectura de temporada (Cour — 12 episodios)

Estándar de producción tipo anime integrado en el **Story Engine**.

## Convención

| Concepto | Definición |
|----------|------------|
| **Cour** | Bloque de **12 episodios** (configurable con `CONVERGE_COUR_LENGTH` o `generation_config.cour_length`). |
| **Episodio** | **1 día narrativo** en ConvergeVerse: los **3 slots** (setup / conflicto / misterio) son **partes del mismo episodio**, no tres episodios distintos. |
| **Temporada (índice)** | `temporada = ⌈día / 12⌉` en la práctica: `(día - 1) // 12 + 1` (días 1–12 → T1, 13–24 → T2, …). |
| **Episodio en el cour** | `(día - 1) % 12 + 1`. |

## Fases del cour (12 episodios)

| Episodios | Fase | Objetivo narrativo |
|-----------|------|---------------------|
| **1–3** | **Inicio** | Planteamiento del conflicto multiversal y superación inicial de Aren. |
| **4–8** | **Nudo** | Pruebas; aliados de otras especies / facciones; complicación del tablero. |
| **9–11** | **Clímax** | Enfrentamiento con el miedo o fallo más grande de Aren (no solo físico). |
| **12** | **Desenlace + cliffhanger** | Cierre del cour con gancho hacia la siguiente temporada o línea precuelar. |

En el **último episodio del cour** (p. ej. **12/12**), el motor añade automáticamente el bloque **«LIBRO DIGITAL — SEMILLAS DE PRECUELA»**: la IA debe plantar pistas hacia **ancestros Laguna** y **origen multiversal / Aethel–Bond Converge** sin hacer info-dump (ver `format_prequel_seeding_finale_block` en `cour_structure.py`).

El bloque base del cour se inyecta en el **system prompt** de Claude en cada generación (salvo que desactives el cour).

## API

- **POST /api/story-engine/generate** devuelve `cour_context`:

```json
{
  "cour_enabled": true,
  "cour_length": 12,
  "season_index": 1,
  "episode_in_cour": 3,
  "phase_key": "inicio",
  "phase_instruction": "...",
  "day_number": 3,
  "is_cour_finale": false,
  "prequel_seeding_active": false
}
```

En el episodio **12/12**, `is_cour_finale` y `prequel_seeding_active` son `true`.

**GET /api/story-engine/chapters/latest** también devuelve `cour_context` (incluso si `day_number` es 0: episodio `0` y fase `sin_inicio`) para la barra de temporada en el panel React.

### `generation_config` (opcional)

- `disableCourStructure`: `true` → no inyecta el bloque de cour.
- `seasonNumber`: sobrescribe el número de temporada en el prompt.
- `courLength`: 4–24 (default 12).
- `courEpisode` / `episodeInCour`: fuerza el episodio dentro del cour (útil para pruebas).

### Entorno

- `CONVERGE_COUR_LENGTH` en `apps/api/.env` — longitud del cour si no pasas `courLength` en el body.

## Código

- `apps/api/app/story_engine/cour_structure.py`
