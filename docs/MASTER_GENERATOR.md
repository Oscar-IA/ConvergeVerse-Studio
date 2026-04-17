# Generador maestro (escritura larga)

El botón **GENERADOR** en `/story-engine` dispara **POST /api/story-engine/generate** con el **Generador maestro** activado por defecto.

## Objetivo

- **Un día = un episodio** (~**25 minutos** de animación en conjunto).
- Cada **slot** (1–3) es un **acto / bloque escénico** con guion más denso que el modo compacto.
- Prompt de escritura inmersiva: **sensorial** (olores, texturas) + **sonidos** del mundo y fenómenos que **disfrazan BOND OS**, para que el lector «vea» el anime.

## Tres actos

| Slot | Acto | ~Min | Enfoque |
|------|------|------|---------|
| 1 | Acto 1 | 8 | Exposición y humor (Konosuba / Deadpool en timing) |
| 2 | Acto 2 | 10 | Conflicto, pruebas rúnicas, superación personal |
| 3 | Acto 3 | 7 | Clímax, revelación multiversal, gancho al siguiente episodio |

Rangos de palabras orientativos por slot están en `app/story_engine/master_generator.py` (`ACT_DEFINITIONS`).

## API

En `generation_config`:

- `use_master_generator` / `useMasterGenerator` — default **true** en el payload Pydantic.
- `disable_master_generator` / `disableMasterGenerator` — si **true**, desactiva el maestro (tiene prioridad).

La respuesta de **POST /generate** incluye:

```json
"master_generator": { "enabled": true }
```

## Implementación

- `app/story_engine/master_generator.py` — bloque de system prompt, instrucciones por acto, `max_tokens` ampliado (8192) en Claude.
- `app/story_engine/story_engine.py` — inyecta bloque + user prompt por slot; llama a Claude con más tokens si el maestro está activo.

## Desactivar desde la UI

En **Intensidad creativa**, desmarca **Generador maestro (~25 min · 3 actos)** antes de generar.
