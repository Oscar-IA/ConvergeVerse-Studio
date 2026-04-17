"""
Generador Maestro — escritura larga por bloques (actos) para densidad ~25 min anime.

Convención: los 3 slots del día = Acto 1 + Acto 2 + Acto 3 del mismo episodio.
"""

from __future__ import annotations

from typing import Any

# Duración total objetivo del episodio (3 slots)
EPISODE_MINUTES = 25

ACT_DEFINITIONS: dict[int, dict[str, Any]] = {
    1: {
        "act_name": "ACTO 1 — Exposición y humor",
        "minutes": 8,
        "brief": (
            "Exposición viva del estado del mundo y del día a día de Aren; **humor** tipo Konosuba / "
            "ingenio irreverente tipo Deadpool (sin romper el tono épico base). Plantar semillas del "
            "conflicto del episodio sin resolverlo aún."
        ),
        "min_words": 900,
        "max_words": 1300,
        "panels_min": 5,
        "panels_max": 7,
    },
    2: {
        "act_name": "ACTO 2 — Conflicto y pruebas",
        "minutes": 10,
        "brief": (
            "**Conflicto** que escala; **pruebas rúnicas** o mecánicas del mundo (Orbets, sellos, "
            "archivos del Orden) que Aren debe sortear; **superación personal** con coste emocional "
            "visible. Los aliados o facciones pueden complicar o ayudar con matices."
        ),
        "min_words": 1100,
        "max_words": 1700,
        "panels_min": 6,
        "panels_max": 8,
    },
    3: {
        "act_name": "ACTO 3 — Clímax multiversal y gancho",
        "minutes": 7,
        "brief": (
            "**Clímax** del episodio: consecuencias físicas y revelación que insinúe el **telón "
            "multiversal** (Converge / Errantes / Orbet) sin explicarlo todo. **Gancho fuerte** hacia "
            "el siguiente episodio o hacia el cierre de cour si aplica."
        ),
        "min_words": 850,
        "max_words": 1200,
        "panels_min": 5,
        "panels_max": 7,
    },
}


def master_generator_enabled(config: dict[str, Any] | None) -> bool:
    """Por defecto activo; desactivar con disable_master_generator / use_master_generator=false."""
    if not config:
        return True
    if config.get("disable_master_generator") or config.get("disableMasterGenerator"):
        return False
    if config.get("use_master_generator") is False or config.get("useMasterGenerator") is False:
        return False
    if config.get("master_generator") is False or config.get("masterGenerator") is False:
        return False
    return True


def format_master_generator_system_block(season_index: int, episode_in_cour: int) -> str:
    """Bloque fijo de system prompt (marco del episodio ~25 min)."""
    return f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GENERADOR MAESTRO — Episodio de ~{EPISODE_MINUTES} minutos (producción tipo anime)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Enfoque del día: genera el **Episodio {episode_in_cour}** de la **Temporada {season_index}**.
Duración estimada del episodio completo (suma de los **tres slots / actos** del mismo día): **{EPISODE_MINUTES} minutos** de animación.

Estructura en **tres actos** (cada slot = un acto / bloque escénico):
- **Acto 1 (Slot 1 — ~8 min):** Exposición y humor (estilo Konosuba / Deadpool en ingenio y timing cómico).
- **Acto 2 (Slot 2 — ~10 min):** Conflicto, pruebas rúnicas y superación personal.
- **Acto 3 (Slot 3 — ~7 min):** Clímax, revelación multiversal y gancho hacia el siguiente episodio.

**Instrucción de escritura inmersiva:** Usa descripciones **sensoriales profundas** (olores, texturas, temperatura, peso del aire) y **sonidos** ligados al mundo — incluidos los **fenómenos que disfrazan al BOND OS** (ARIA, Pulso, Convergence Network, etc.) — para que el lector **«vea» el anime** mientras lee.

Reglas de bloques:
- Cada llamada genera **un acto completo**, no un resumen: escenas consecutivas, ritmo de episodio.
- Respeta continuidad con los **slots ya generados hoy** (actos anteriores del mismo episodio).
- En `sound_cues_sfx` y narración, refuerza **capa sonora** (UI diegética, zumbidos de Orbet, notificaciones del Pulso… como magia o tecnología arcana).
""".strip()


def slot_act_user_instructions(slot: int) -> str:
    """Párrafo para el user prompt del slot concreto."""
    if slot not in (1, 2, 3):
        return ""
    act = ACT_DEFINITIONS[slot]
    return (
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"BLOQUE ACTUAL — {act['act_name']} (~{act['minutes']} min de pantalla estimados)\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"{act['brief']}\n\n"
        f"Densidad obligatoria para **este slot solamente**: entre **{act['min_words']} y {act['max_words']}** palabras "
        f"en el campo `script` (español). No acortes artificialmente.\n"
        f"Paneles: genera entre **{act['panels_min']} y {act['panels_max']}** entradas en `panels`, cada una con "
        f"descripción visual distinta y, cuando proceda, `sound_cues_sfx` concretos.\n"
        f"Si este es el Acto 3, cierra el arco del episodio y termina en **gancho** claro.\n"
    ).strip()


def claude_max_tokens_master() -> int:
    """Tokens de salida ampliados para JSON largo (guion denso + muchos paneles)."""
    return 8192
