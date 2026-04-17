"""
Progreso de novela por capítulo — storage/season_1/cap_X_novela.json (Legacy Book auto-save).
"""

from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter()


def _storage_root() -> Path:
    raw = os.getenv("CONVERGE_STORAGE_ROOT", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parent.parent.parent / "storage"


class NovelProgressBody(BaseModel):
    chapter_number: int = Field(ge=1, description="Número de capítulo (X en cap_X_novela.json)")
    novel_text: str = Field(..., min_length=0, max_length=2_000_000)
    season_folder: str = Field(default="season_1", description="Carpeta bajo storage/, p.ej. season_1")
    chapter_title: str | None = None


@router.get("/chapters/novel-progress")
def get_novel_progress(
    chapter_number: int = Query(..., ge=1),
    season_folder: str = Query(default="season_1"),
):
    """
    Lee cap_{chapter_number}_novela.json si existe (Legacy Book / crónica).
    """
    root = _storage_root()
    season = (season_folder or "season_1").strip().replace("..", "").strip("/\\") or "season_1"
    path = root / season / f"cap_{chapter_number}_novela.json"
    if not path.is_file():
        # 200 evita ruido 404 en consola del navegador cuando aún no hay borrador guardado
        return {
            "ok": True,
            "found": False,
            "chapter_number": chapter_number,
            "season_folder": season,
            "chapter_title": None,
            "saved_at": None,
            "novel_text": "",
            "relative": f"{season}/cap_{chapter_number}_novela.json",
        }
    try:
        with open(path, encoding="utf-8") as fp:
            data = json.load(fp)
    except (OSError, json.JSONDecodeError) as e:
        logger.exception("novel-progress read: %s", e)
        raise HTTPException(status_code=500, detail="Error interno del servidor.")
    text = (data.get("novel_text") or "") if isinstance(data, dict) else ""
    return {
        "ok": True,
        "found": True,
        "chapter_number": chapter_number,
        "season_folder": season,
        "chapter_title": data.get("chapter_title") if isinstance(data, dict) else None,
        "saved_at": data.get("saved_at") if isinstance(data, dict) else None,
        "novel_text": text,
        "relative": f"{season}/cap_{chapter_number}_novela.json",
    }


@router.post("/chapters/novel-progress")
def save_novel_progress(body: NovelProgressBody):
    """
    Guarda el texto de novela corregido para el capítulo indicado.
    Ruta: {storage}/{season_folder}/cap_{chapter_number}_novela.json
    """
    root = _storage_root()
    season = (body.season_folder or "season_1").strip().replace("..", "").strip("/\\") or "season_1"
    out_dir = root / season
    try:
        out_dir.mkdir(parents=True, exist_ok=True)
    except OSError as e:
        logger.exception("novel-progress mkdir: %s", e)
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

    filename = f"cap_{body.chapter_number}_novela.json"
    path = out_dir / filename

    payload = {
        "format_version": 1,
        "chapter_number": body.chapter_number,
        "season_folder": season,
        "chapter_title": body.chapter_title,
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "source": "legacy_book_auto",
        "novel_text": body.novel_text,
        "char_count": len(body.novel_text),
        "word_count": len(body.novel_text.split()),
    }

    try:
        with open(path, "w", encoding="utf-8") as fp:
            json.dump(payload, fp, ensure_ascii=False, indent=2)
    except OSError as e:
        logger.exception("novel-progress write: %s", e)
        raise HTTPException(status_code=500, detail="Error interno del servidor.")

    logger.info("Novel progress saved: %s", path)
    return {
        "ok": True,
        "path": str(path),
        "relative": f"{season}/{filename}",
        "chapter_number": body.chapter_number,
    }
