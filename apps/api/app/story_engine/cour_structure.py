"""
Arquitectura de temporada — estándar de industria (1 cour = 12 episodios).

Convención en ConvergeVerse Studio:
  · **1 día narrativo = 1 episodio** (los 3 slots del día = setup / conflicto / misterio del mismo episodio).
  · `episodio_en_cour` = ((día - 1) % 12) + 1; cada 12 días comienza un cour nuevo.
  · `temporada` (índice) = (día - 1) // 12 + 1 (Temporada 1 = días 1–12, etc.).

Override opcional vía `generation_config` o env `CONVERGE_COUR_LENGTH` (default 12).
"""

from __future__ import annotations

import os
from typing import Any

COUR_LENGTH_DEFAULT = 12

PHASE_INICIO = "inicio"
PHASE_NUDO = "nudo"
PHASE_CLIMAX = "climax"
PHASE_DESENLACE = "desenlace"


def _cour_length(config: dict[str, Any] | None) -> int:
    if config:
        raw = config.get("cour_length") or config.get("courLength")
        if raw is not None:
            try:
                n = int(raw)
                return max(4, min(24, n))
            except (TypeError, ValueError):
                pass
    env = os.getenv("CONVERGE_COUR_LENGTH", "").strip()
    if env:
        try:
            return max(4, min(24, int(env)))
        except ValueError:
            pass
    return COUR_LENGTH_DEFAULT


def _cour_disabled(config: dict[str, Any] | None) -> bool:
    if not config:
        return False
    return bool(
        config.get("disable_cour_structure")
        or config.get("disableCourStructure")
        or config.get("cour_disabled")
        or config.get("courDisabled")
    )


def phase_for_episode(episode_in_cour: int, cour_length: int) -> tuple[str, str]:
    """
    Devuelve (clave_fase, descripción_corta_para_prompt).
    Si cour_length != 12, se escalan proporcionalmente los cortes.
    """
    if cour_length <= 0:
        cour_length = COUR_LENGTH_DEFAULT
    # Mapeo proporcional al largo del cour (12 = estándar)
    if cour_length == 12:
        e = episode_in_cour
        if e <= 3:
            return (
                PHASE_INICIO,
                "INICIO — Planteamiento del conflicto multiversal y **superación inicial** de Aren; "
                "presentar apuestas claras sin resolver el arco mayor.",
            )
        if e <= 8:
            return (
                PHASE_NUDO,
                "NU — Desarrollo de **pruebas** escaladas; introduce o profundiza **aliados de otras "
                "especies / facciones** (voz distinta a la de Aren); complica el tablero político y emocional.",
            )
        if e <= 11:
            return (
                PHASE_CLIMAX,
                "CLÍMAX — Confrontación con el **miedo o fallo más grande** de Aren (no solo combate físico: "
                "vergüenza, abandono, inutilidad, traición interior); el coste debe sentirse real.",
            )
        return (
            PHASE_DESENLACE,
            "DESENLACE + CLIFFHANGER (cierre de cour) — Cierra el arco episódico del cour con consecuencias "
            "visibles; **termina en gancho fuerte** hacia la siguiente temporada o línea precuelar (sin resolver "
            "todo el misterio de ConvergeVerse).",
        )

    # Genérico: tercios aproximados
    third = max(1, cour_length // 3)
    if episode_in_cour <= third:
        return (
            PHASE_INICIO,
            "Fase de apertura del cour: plantear conflicto y apuestas; superación inicial del héroe.",
        )
    if episode_in_cour <= 2 * third:
        return (
            PHASE_NUDO,
            "Fase de desarrollo: pruebas, aliados inesperados, complicación del mundo y del interior de Aren.",
        )
    if episode_in_cour < cour_length:
        return (
            PHASE_CLIMAX,
            "Fase de clímax: enfrentar el mayor miedo o prueba moral de Aren; altas consecuencias.",
        )
    return (
        PHASE_DESENLACE,
        "Último episodio del cour: desenlace parcial + cliffhanger hacia la siguiente temporada.",
    )


def resolve_cour_context(day_number: int, generation_config: dict[str, Any] | None) -> dict[str, Any]:
    """
    Calcula temporada, episodio dentro del cour y fase narrativa.
    """
    if day_number < 1:
        day_number = 1

    L = _cour_length(generation_config)
    disabled = _cour_disabled(generation_config)

    season = (day_number - 1) // L + 1
    episode_in_cour = (day_number - 1) % L + 1

    if generation_config:
        sn = generation_config.get("season_number") or generation_config.get("seasonNumber")
        if sn is not None:
            try:
                season = max(1, int(sn))
            except (TypeError, ValueError):
                pass
        ov = (
            generation_config.get("cour_episode")
            or generation_config.get("courEpisode")
            or generation_config.get("episode_in_cour")
            or generation_config.get("episodeInCour")
        )
        if ov is not None:
            try:
                episode_in_cour = max(1, min(L, int(ov)))
            except (TypeError, ValueError):
                pass

    phase_key, phase_instruction = phase_for_episode(episode_in_cour, L)

    is_finale = (not disabled) and episode_in_cour == L

    return {
        "cour_enabled": not disabled,
        "cour_length": L,
        "season_index": season,
        "episode_in_cour": episode_in_cour,
        "phase_key": phase_key,
        "phase_instruction": phase_instruction,
        "day_number": day_number,
        "is_cour_finale": is_finale,
        "prequel_seeding_active": is_finale,
    }


def format_prequel_seeding_finale_block(ctx: dict[str, Any]) -> str:
    """
    Último episodio del cour (p. ej. 12/12): obliga a plantar semillas hacia la precuela
    (ancestros Laguna, origen multiversal) para el Libro Digital / continuidad.
    """
    if not ctx.get("cour_enabled") or not ctx.get("is_cour_finale"):
        return ""
    L = int(ctx.get("cour_length") or COUR_LENGTH_DEFAULT)
    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIBRO DIGITAL — SEMILLAS DE PRECUELA (cierre de cour · episodio {L}/{L})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este episodio es el **último del cour**. La IA debe **empezar ya** a plantar semillas narrativas hacia la **precuela**
(sin resolverla ni hacer info-dump):

  · **Ancestros de la familia Laguna** — rumores en el Archivo, retratos borrosos, apellidos en sellos rotos,
    sendas o títulos que «no cuadran» con el presente, deudas o pactos familiares mencionados al pasar.
  · **Origen del multiverso / Aethel–Bond Converge** — fragmentos de crónica, versos de cantares, visiones breves,
    artefactos que contradicen la historia oficial; sensación de que hay una **capa anterior** al mundo que Aren conoce.
  · **Gancho para el Libro Digital** — al menos **un** objeto, frase o símbolo que invite a la siguiente temporada
    o a la línea precuelar (documentar en `symbols_planted` / `author_notes`).

Distribución: intenta **una semilla tangible** (diálogo, objeto, registro o flashback muy corto) por **cada uno de los
tres slots** del día si el ritmo lo permite; si no, concentra pero **no omitas** el hilo precuelar en el episodio completo.
""".strip()


def cour_context_for_dashboard(day_number: int, generation_config: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Contexto de cour para el panel (Libro Digital): `day_number <= 0` → aún sin episodios (barra en 0).
    """
    if day_number <= 0:
        L = _cour_length(generation_config)
        disabled = _cour_disabled(generation_config)
        return {
            "cour_enabled": not disabled,
            "cour_length": L,
            "season_index": 1,
            "episode_in_cour": 0,
            "phase_key": "sin_inicio",
            "phase_instruction": (
                "Aún no hay episodios en el Libro Digital. El primer GENERADOR abrirá el episodio 1 del cour."
            ),
            "day_number": 0,
            "is_cour_finale": False,
            "prequel_seeding_active": False,
        }
    return resolve_cour_context(day_number, generation_config)


def format_cour_system_block(ctx: dict[str, Any]) -> str:
    """Bloque de system prompt (vacío si cour desactivado)."""
    if not ctx.get("cour_enabled"):
        return ""

    L = ctx["cour_length"]
    season = ctx["season_index"]
    ep = ctx["episode_in_cour"]
    phase_key = ctx["phase_key"]
    instr = ctx["phase_instruction"]

    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARQUITECTURA DE TEMPORADA — Cour de {L} episodios (estándar anime)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Convención de producción: **1 día narrativo = 1 episodio**; los tres slots del día (setup / conflicto / misterio)
son **partes del mismo episodio**, no episodios sueltos.

Estado actual:
  · **Temporada (bloque narrativo)** n.º {season}
  · **Episodio dentro del cour:** {ep} de {L}
  · **Fase del cour:** {phase_key.upper()}

Mandato de esta fase:
  · {instr}

Reglas globales del cour:
  · No diluyas la historia en «relleno» infinito: cada episodio debe **mover** trama, personaje o mito.
  · Si estás cerca del episodio {L}, refuerza **cierre + cliffhanger** sin traicionar la continuidad ya publicada.
  · En `author_notes`, indica en una frase cómo este episodio cumple la fase del cour (para el equipo editorial).

{format_prequel_seeding_finale_block(ctx)}
""".strip()


def cour_one_liner_for_user_prompt(ctx: dict[str, Any]) -> str:
    """Línea breve para el user prompt."""
    if not ctx.get("cour_enabled"):
        return ""
    base = (
        f"Contexto de producción: Temporada {ctx['season_index']}, episodio {ctx['episode_in_cour']}/{ctx['cour_length']} "
        f"del cour — fase **{ctx['phase_key']}**."
    )
    if ctx.get("is_cour_finale"):
        base += (
            " **Último episodio del cour:** planta semillas de **precuela** (ancestros Laguna, origen multiversal / "
            "Aethel–Bond Converge) como manda el bloque «LIBRO DIGITAL» del system prompt."
        )
    return base


def cour_prompt_parts(
    day_number: int,
    generation_config: dict[str, Any] | None,
) -> tuple[str, str, dict[str, Any]]:
    """(bloque_system, línea_user, ctx) — un solo resolve."""
    ctx = resolve_cour_context(day_number, generation_config)
    return format_cour_system_block(ctx), cour_one_liner_for_user_prompt(ctx), ctx
