# Libro Digital — diálogo de doble capa

En **`ReadingExperience`** (`/story-engine`, vista de lectura) el guion puede mostrar **dos capas visuales**:

| Capa | Uso visual |
|------|------------|
| **BOND OS · narrador técnico** | Explicación física, runas, sistemas — panel azul, tipografía monoespaciada. |
| **Aren · interrupción** | Voz coloquial que corta la jerga — panel ámbar, cursiva, serif. |

## Marcadores en el `script`

Cada **sección** empieza con una **línea que solo contiene** el marcador (sin texto extra):

```
:::bond_os
Al colisionar los isótopos de hidrógeno en la cámara rúnica, se genera una reacción de fusión fría confinada por campos magnéticos que…

:::aren
¡Ya, ya, ya! Bla, bla, bla… ¡Es una bola de fuego azul y lanza rayos, punto! ¡Céntrate en el gigante que me viene encima!
```

### Alias

| Marcador | Equivale a |
|----------|--------------|
| `:::bond` | `:::bond_os` |
| `:::narrator` / `:::narrador` | narración **plana** (mismo estilo que el cuerpo del artículo) |

Tras un marcador, el texto puede ocupar **varias líneas** hasta el siguiente `:::…`.

## Ejemplo canónico: *El portal de inicio*

Escena de referencia (singularidad + métrica tipo Alcubierre + náusea + suspiro BOND). **Pégala en el `script`** tal cual para probar doble capa + glosario Nerd (los dos bloques `:::bond_os` aparecen en el panel **◈ BOND** en modo **Acción**).

```
:::bond_os
La singularidad se está estabilizando. La métrica de Alcubierre sugiere que el espacio-tiempo se está contrayendo frente a nosotros a una velocidad de…

:::aren
¡Me voy a marear y voy a vomitar en el multiverso! ¡Dime «Salta» y ya!

:::bond_os
[Suspiro digital] «Salta, Arquitecto. Salta.»
```

| Capa | Rol |
|------|-----|
| 1.º `bond_os` | Rigor físico (portal / garganta / contracción local) — encaja con náusea de marea del canon BOND. |
| `aren` | Filtro del lector: cuerpo y pánico antes que la ecuación. |
| 2.º `bond_os` | **Paso 3** del asistente apasionado: reacción mínima (suspiro + orden) y vuelta a la acción. |

## Sin marcadores

Si no aparece ningún `:::`, el guion se muestra como **un solo bloque** (comportamiento anterior).

## Narración (TTS)

La **voz del navegador** lee el texto **sin** las líneas `:::…` (solo el contenido de cada bloque, unido por saltos). Los MP3 de API no se re-procesan aquí.

## Glosario de emergencia («Nerd»)

En **`ReadingExperience`**:

- **◈ BOND** abre un **panel lateral** con todas las notas `:::bond_os` del capítulo (física y sistemas sin perderse).
- **Acción** (por defecto si hay bloques BOND): el cuerpo principal muestra solo **narración plana + `:::aren`**; la jerga técnica queda en el panel.
- **Completo**: doble capa **en línea** como antes.
- Chip **NERD** en la cabecera cuando hay glosario disponible. **Esc** cierra el panel.

## Código

- Parser: `apps/web/lib/parseDoubleLayerDialogue.ts` (`extractBondGlossarySegments`)
- UI: `apps/web/components/story-engine/ReadingExperience.tsx`

El generador recibe en el **user prompt** viñetas que alinean `:::bond_os` / `:::aren` con el bloque **«Asistente apasionado y pesado»** del system prompt — ver **`docs/PASSIONATE_ASSISTANT.md`**.
