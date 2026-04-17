"""
Sincroniza `IDEAS.pages/IDEAS.md` con:
- capítulos **aprobados** (registro de avance de la historia, organizado por IA)
- ideas guardadas desde el **panel** (Guardar idea → architect_plot_notes reflejado en el doc)

Usa marcadores HTML para no pisar el manuscrito manual del autor.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.story_engine.author_ideas_file import resolve_author_ideas_path
from app.core.llm_completion import llm_complete_text

logger = logging.getLogger(__name__)

REG_START = "<!-- CV_SYNC:REGISTRO_CANON -->"
REG_END = "<!-- /CV_SYNC:REGISTRO_CANON -->"
PANEL_START = "<!-- CV_SYNC:PANEL_APP -->"
PANEL_END = "<!-- /CV_SYNC:PANEL_APP -->"

_ideas_write_lock = asyncio.Lock()


def sync_writes_disabled() -> bool:
    return (os.getenv("CONVERGE_IDEAS_DOC_SYNC_DISABLED") or "").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def _read_full(path: Path) -> str:
    if not path.is_file():
        return ""
    return path.read_text(encoding="utf-8", errors="replace")


def _atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(
        suffix=".md",
        dir=str(path.parent),
        text=True,
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(content)
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def ensure_sync_markers(content: str) -> str:
    """Añade secciones con marcadores al final si faltan."""
    if REG_START in content and REG_END in content and PANEL_START in content and PANEL_END in content:
        return content
    suffix = f"""

---

## Registro automático — canon aprobado

{REG_START}
*(La IA organiza aquí el avance de la historia cuando **apruebas** capítulos.)*
{REG_END}

## Ideas desde la app (Plot Architect)

{PANEL_START}
*(La IA incorpora aquí lo que guardas con **Guardar idea** en el Story Engine.)*
{PANEL_END}
"""
    return (content.rstrip() + suffix) if content.strip() else f"# Manuscrito de ideas — ConvergeVerse Studio\n{suffix}"


def _extract_block(full: str, start: str, end: str) -> str:
    i = full.find(start)
    j = full.find(end)
    if i < 0 or j < 0 or j <= i:
        return ""
    return full[i + len(start) : j].strip()


def _replace_block(full: str, start: str, end: str, inner: str) -> str:
    i = full.find(start)
    j = full.find(end)
    if i < 0 or j < 0 or j <= i:
        full = ensure_sync_markers(full)
        i = full.find(start)
        j = full.find(end)
        if i < 0 or j < 0 or j <= i:
            raise ValueError("ideas_doc_sync: no se pudieron colocar marcadores")
    inner_stripped = inner.strip()
    return full[: i + len(start)] + "\n\n" + inner_stripped + "\n\n" + full[j:]


def _chapter_payload_for_llm(ch: dict[str, Any]) -> str:
    bp = ch.get("book_payload") if isinstance(ch.get("book_payload"), dict) else {}
    lore = bp.get("lore_annex") if isinstance(bp.get("lore_annex"), dict) else {}
    lore_compact = json.dumps(lore, ensure_ascii=False, indent=2) if lore else "{}"
    if len(lore_compact) > 12000:
        lore_compact = lore_compact[:12000] + "\n… [recorte]"
    script = (ch.get("script") or "").strip()
    if len(script) > 8000:
        script = script[:8000] + "\n… [recorte]"
    parts = [
        f"título: {ch.get('title')}",
        f"día: {ch.get('day_number')} slot: {ch.get('slot')}",
        f"slug: {ch.get('slug')}",
        f"canon_chapter_number: {ch.get('canon_chapter_number')}",
        f"meta_summary: {ch.get('meta_summary') or ''}",
        f"author_notes: {ch.get('author_notes') or ''}",
        f"notas de aprobación (API): {ch.get('_approve_notes') or ''}",
        f"script:\n{script}",
        f"lore_annex (resumen JSON):\n{lore_compact}",
    ]
    return "\n".join(parts)


async def _call_claude_text(system: str, user: str, *, max_tokens: int = 8192) -> str:
    ok, text, _ = await llm_complete_text(system, user, max_tokens=max_tokens, temperature=0.35)
    return text if ok else ""


def _fallback_append_registro(prev_inner: str, ch: dict[str, Any], notes: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    line = (
        f"\n### {now} · Día {ch.get('day_number')} slot {ch.get('slot')} — **{ch.get('title')}**\n"
        f"- Canon #{ch.get('canon_chapter_number')} · `{ch.get('slug')}`\n"
    )
    if ch.get("meta_summary"):
        line += f"- Resumen: {ch.get('meta_summary')}\n"
    if notes:
        line += f"- Notas al aprobar: {notes}\n"
    return (prev_inner.strip() + line).strip()


def _fallback_append_panel(prev_inner: str, raw: str, title: str, note_id: str) -> str:
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    head = title.strip() if title.strip() else "(sin título)"
    snippet = raw.strip()
    if len(snippet) > 2000:
        snippet = snippet[:2000] + "…"
    block = f"\n### {now} · {head}\n`id`: `{note_id}`\n\n{snippet}\n"
    return (prev_inner.strip() + block).strip()


async def sync_ideas_doc_after_approve(chapter: dict[str, Any], approve_notes: str = "") -> dict[str, Any]:
    """
    Tras POST /approve con status approved. Actualiza REGISTRO_CANON en IDEAS.md.
    """
    meta: dict[str, Any] = {"ok": False, "mode": None, "error": None}
    if sync_writes_disabled():
        meta["error"] = "sync_disabled_by_env"
        return meta
    path = resolve_author_ideas_path()
    if path is None:
        meta["error"] = "ideas_file_disabled"
        return meta

    ch = dict(chapter)
    ch["_approve_notes"] = approve_notes

    async with _ideas_write_lock:

        def _work() -> tuple[str, str]:
            full = ensure_sync_markers(_read_full(path))
            prev = _extract_block(full, REG_START, REG_END)
            return full, prev

        full, prev_inner = await asyncio.to_thread(_work)

        system = """Eres el archivista narrativo de ConvergeVerse Studio.
Te pasan el REGISTRO ACTUAL (Markdown) y los datos de un capítulo RECIÉN APROBADO (canon).
Debes devolver ÚNICAMENTE el cuerpo Markdown nuevo para la sección «Registro de avance canon» (sin título H1; puedes usar H3/H4 y listas).

Reglas:
- Integra el capítulo aprobado en el registro: qué avanzó la historia, conflictos, símbolos, lore nuevo si aparece en los datos.
- Conserva entradas anteriores salvo redundancia obvia; puedes reagrupar con subtítulos (ej. «Hilos abiertos», «Hechos asentados»).
- Español, tono técnico-claro para el autor.
- No uses los comentarios HTML <!-- ... --> en tu respuesta.
- No inventes hechos que no estén en los datos del capítulo."""

        user = (
            "REGISTRO ACTUAL (solo esta sección, puede estar vacío al inicio):\n\n"
            f"{prev_inner[:80000] or '(vacío)'}\n\n"
            "---\n\n"
            "CAPÍTULO APROBADO (datos del motor):\n\n"
            f"{_chapter_payload_for_llm(ch)[:95000]}"
        )

        try:
            new_inner = await _call_claude_text(system, user, max_tokens=8192)
            if not new_inner:
                new_inner = _fallback_append_registro(prev_inner, ch, approve_notes)
                meta["mode"] = "fallback_append"
            else:
                meta["mode"] = "llm_merge"
            updated = _replace_block(full, REG_START, REG_END, new_inner)
            await asyncio.to_thread(_atomic_write, path, updated)
            meta["ok"] = True
            meta["path"] = str(path)
        except Exception as e:
            logger.exception("ideas_doc_sync approve")
            meta["error"] = str(e)[:500]
    return meta


async def sync_ideas_doc_after_panel_note(
    *,
    note_id: str,
    raw_plot_idea: str,
    title: str = "",
) -> dict[str, Any]:
    """Tras POST /architect-plot-notes. Actualiza PANEL_APP en IDEAS.md."""
    meta: dict[str, Any] = {"ok": False, "mode": None, "error": None}
    if sync_writes_disabled():
        meta["error"] = "sync_disabled_by_env"
        return meta
    path = resolve_author_ideas_path()
    if path is None:
        meta["error"] = "ideas_file_disabled"
        return meta

    async with _ideas_write_lock:

        def _work() -> tuple[str, str]:
            full = ensure_sync_markers(_read_full(path))
            prev = _extract_block(full, PANEL_START, PANEL_END)
            return full, prev

        full, prev_inner = await asyncio.to_thread(_work)

        system = """Eres el archivista del banco de ideas de ConvergeVerse.
Te pasan la sección actual «Ideas desde la app» y una NUEVA idea guardada por el autor desde el panel Plot Architect.
Devuelve ÚNICAMENTE el Markdown nuevo para esa sección (sin H1; H3 para cada idea o grupo temático).

Reglas:
- Incorpora la nueva idea de forma clara (puedes resumir si es muy larga, pero conserva nombres propios y beats clave).
- Mantén ideas previas; agrupa por tema si ayuda.
- Español. Sin comentarios HTML.
- Incluye al final de la nueva entrada un pie con `id` de nota entre backticks para trazabilidad."""

        user = (
            "SECCIÓN ACTUAL:\n\n"
            f"{prev_inner[:60000] or '(vacío)'}\n\n"
            "---\n\n"
            f"NUEVA IDEA (id={note_id}, título={title!r}):\n\n"
            f"{raw_plot_idea[:100000]}"
        )

        try:
            new_inner = await _call_claude_text(system, user, max_tokens=8192)
            if not new_inner:
                new_inner = _fallback_append_panel(prev_inner, raw_plot_idea, title, note_id)
                meta["mode"] = "fallback_append"
            else:
                meta["mode"] = "llm_merge"
            updated = _replace_block(full, PANEL_START, PANEL_END, new_inner)
            await asyncio.to_thread(_atomic_write, path, updated)
            meta["ok"] = True
            meta["path"] = str(path)
        except Exception as e:
            logger.exception("ideas_doc_sync panel")
            meta["error"] = str(e)[:500]
    return meta
