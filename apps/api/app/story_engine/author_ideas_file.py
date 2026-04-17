"""
Lectura del manuscrito de ideas del autor (`IDEAS.pages/IDEAS.md` en la raíz del repo).

Evita saturar la cola en Supabase: un solo archivo largo que el generador incorpora al system prompt.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

logger = logging.getLogger(__name__)


def _repo_root() -> Path:
    """Raíz del monorepo (directorio que contiene `apps/`)."""
    # …/apps/api/app/story_engine → 4× parent → repo root
    here = Path(__file__).resolve().parent
    return here.parent.parent.parent.parent


def resolve_author_ideas_path() -> Path | None:
    """
    Ruta al archivo de ideas. None si está desactivado por env.
    """
    if (os.getenv("CONVERGE_AUTHOR_IDEAS_DISABLED") or "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    ):
        return None
    override = (os.getenv("CONVERGE_AUTHOR_IDEAS_FILE") or "").strip()
    if override:
        p = Path(override).expanduser()
        return p if p.is_absolute() else (_repo_root() / p).resolve()
    return (_repo_root() / "IDEAS.pages" / "IDEAS.md").resolve()


def max_chars_for_author_ideas() -> int:
    raw = (os.getenv("CONVERGE_AUTHOR_IDEAS_MAX_CHARS") or "").strip()
    if raw:
        try:
            n = int(raw, 10)
            return max(8_000, min(n, 5_000_000))
        except ValueError:
            pass
    return 200_000


def load_author_ideas_raw() -> tuple[str, dict]:
    """
    Lee texto del archivo de ideas.
    Returns: (texto_para_prompt_o_vacío, meta para logs / dashboard)
    """
    path = resolve_author_ideas_path()
    meta: dict = {
        "path": str(path) if path else None,
        "loaded": False,
        "chars_total": 0,
        "chars_in_prompt": 0,
        "truncated": False,
        "error": None,
    }
    if path is None:
        meta["error"] = "disabled_by_env"
        return "", meta
    if not path.is_file():
        meta["error"] = "file_missing"
        return "", meta
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        logger.warning("author_ideas: no se pudo leer %s: %s", path, e)
        meta["error"] = f"read_error:{e}"
        return "", meta

    stripped = text.strip()
    meta["loaded"] = bool(stripped)
    meta["chars_total"] = len(stripped)
    if not stripped:
        return "", meta

    cap = max_chars_for_author_ideas()
    truncated = len(stripped) > cap
    body = stripped[:cap] if truncated else stripped
    meta["truncated"] = truncated
    meta["chars_in_prompt"] = len(body)

    if truncated:
        body = (
            f"{body}\n\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"[AVISO — recorte automático] El archivo supera CONVERGE_AUTHOR_IDEAS_MAX_CHARS "
            f"({cap} caracteres). Prioriza las ideas del inicio del manuscrito o sube el límite en .env.\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
        meta["chars_in_prompt"] = len(body)

    return body, meta


def format_author_ideas_bank_block(body: str) -> str:
    """Bloque de system prompt (vacío si no hay cuerpo)."""
    b = (body or "").strip()
    if not b:
        return ""
    return (
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "BANCO DE IDEAS DEL AUTOR (archivo local — IDEAS.pages/IDEAS.md o CONVERGE_AUTHOR_IDEAS_FILE)\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        "El autor centraliza aquí ideas, borradores y notas para no multiplicar registros en base de datos.\n"
        "REGLAS PARA TI (modelo):\n"
        "  · **Adapta** organicamente al día, slot y fase del cour solo lo que encaje con continuidad y tono.\n"
        "  · **No** vuelques el manuscrito entero en un solo capítulo; selecciona beats, giros y detalles útiles.\n"
        "  · **Coherencia** con el Legado (runas, aprobados) y con la triangulación del Arquitecto si está activa.\n"
        "  · Si el texto es contradictorio, prioriza **Legado + reglas editoriales** y usa el archivo como guía suave.\n"
        "\n"
        f"{b}\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
    )
