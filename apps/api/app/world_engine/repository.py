import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from app.world_engine.db import get_connection, init_schema


def get_default_db_path() -> Path:
    raw = os.getenv("CONVERGE_DB_PATH", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    # apps/api/app/world_engine/repository.py -> apps/api/data/convergeverse.db
    return Path(__file__).resolve().parent.parent.parent / "data" / "convergeverse.db"


class WorldRepository:
    """Season > Chapter > Format(novel|manga|anime) persistence."""

    def __init__(self, db_path: Path | None = None):
        self._path = db_path or get_default_db_path()
        self._conn = get_connection(self._path)
        init_schema(self._conn)

    def close(self) -> None:
        self._conn.close()

    # --- Seasons ---

    def upsert_season(self, slug: str, title: str, sort_order: int = 0) -> int:
        cur = self._conn.execute(
            "SELECT id FROM seasons WHERE slug = ?",
            (slug,),
        )
        row = cur.fetchone()
        if row:
            self._conn.execute(
                "UPDATE seasons SET title = ?, sort_order = ? WHERE id = ?",
                (title, sort_order, row["id"]),
            )
            self._conn.commit()
            return int(row["id"])
        self._conn.execute(
            "INSERT INTO seasons (slug, title, sort_order) VALUES (?, ?, ?)",
            (slug, title, sort_order),
        )
        self._conn.commit()
        return int(self._conn.execute("SELECT last_insert_rowid()").fetchone()[0])

    def list_seasons(self) -> list[dict[str, Any]]:
        cur = self._conn.execute(
            "SELECT id, slug, title, sort_order, created_at FROM seasons ORDER BY sort_order, id"
        )
        return [dict(r) for r in cur.fetchall()]

    # --- Chapters ---

    def upsert_chapter(
        self,
        season_id: int,
        chapter_number: int,
        slug: str,
        title: str | None = None,
    ) -> int:
        cur = self._conn.execute(
            "SELECT id FROM chapters WHERE season_id = ? AND chapter_number = ?",
            (season_id, chapter_number),
        )
        row = cur.fetchone()
        if row:
            self._conn.execute(
                "UPDATE chapters SET slug = ?, title = ? WHERE id = ?",
                (slug, title, row["id"]),
            )
            self._conn.commit()
            return int(row["id"])
        self._conn.execute(
            "INSERT INTO chapters (season_id, chapter_number, slug, title) VALUES (?, ?, ?, ?)",
            (season_id, chapter_number, slug, title),
        )
        self._conn.commit()
        return int(self._conn.execute("SELECT last_insert_rowid()").fetchone()[0])

    def list_chapters(self, season_id: int) -> list[dict[str, Any]]:
        cur = self._conn.execute(
            """SELECT id, season_id, chapter_number, slug, title, created_at
               FROM chapters WHERE season_id = ? ORDER BY chapter_number""",
            (season_id,),
        )
        return [dict(r) for r in cur.fetchall()]

    def get_chapter(self, chapter_id: int) -> dict[str, Any] | None:
        cur = self._conn.execute(
            "SELECT * FROM chapters WHERE id = ?",
            (chapter_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None

    # --- Formats ---

    def save_format_content(self, chapter_id: int, format_name: str, content: dict[str, Any]) -> None:
        if format_name not in ("novel", "manga", "anime"):
            raise ValueError("format must be novel, manga, or anime")
        payload = json.dumps(content, ensure_ascii=False)
        self._conn.execute(
            """INSERT INTO chapter_formats (chapter_id, format, content_json, updated_at)
               VALUES (?, ?, ?, datetime('now'))
               ON CONFLICT(chapter_id, format) DO UPDATE SET
                 content_json = excluded.content_json,
                 updated_at = datetime('now')""",
            (chapter_id, format_name, payload),
        )
        self._conn.commit()

    def get_format_content(self, chapter_id: int, format_name: str) -> dict[str, Any] | None:
        cur = self._conn.execute(
            "SELECT content_json FROM chapter_formats WHERE chapter_id = ? AND format = ?",
            (chapter_id, format_name),
        )
        row = cur.fetchone()
        if not row:
            return None
        return json.loads(row["content_json"])

    def list_formats_for_chapter(self, chapter_id: int) -> list[str]:
        cur = self._conn.execute(
            "SELECT format FROM chapter_formats WHERE chapter_id = ? ORDER BY format",
            (chapter_id,),
        )
        return [r["format"] for r in cur.fetchall()]

    def library_tree(self) -> list[dict[str, Any]]:
        seasons = self.list_seasons()
        out: list[dict[str, Any]] = []
        for s in seasons:
            chs = self.list_chapters(s["id"])
            enriched = []
            for c in chs:
                enriched.append(
                    {
                        **c,
                        "formats_saved": self.list_formats_for_chapter(c["id"]),
                    }
                )
            out.append({**s, "chapters": enriched})
        return out
