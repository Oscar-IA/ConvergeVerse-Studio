"""
NarrativeDB — Supabase interface for the Story Engine.
Handles all read/write operations for chapters, memory, symbols, and world state.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.story_engine.chapter_meta_summary import resolve_meta_summary_for_publish
from app.story_engine.progress_memory import MEMORY_KEY_LAST_READ
from app.story_engine.chronicle_canon import (
    allocate_unique_slug,
    build_book_payload,
    slugify_chapter_base,
)
from app.story_engine.errors import StoryEngineError

logger = logging.getLogger(__name__)


def _create_story_engine_supabase_client():
    """
    Cliente Supabase con timeouts explícitos (evita colgadas en PostgREST / Storage).

    No uses dict genérico en create_client: la API oficial es SyncClientOptions
    (ver https://supabase.com/docs/reference/python/initializing).

    Variables opcionales en apps/api/.env:
    - SUPABASE_POSTGREST_TIMEOUT — segundos para API REST/PostgREST (default 30).
    - SUPABASE_STORAGE_TIMEOUT — segundos para Storage (default 60; subidas grandes).
    - SUPABASE_DB_SCHEMA — schema PostgREST (default public).

    El cliente se reutiliza (singleton en NarrativeDB); httpx cierra conexiones inactivas
    según el pool; el timeout limita cada operación para que no queden abiertas indefinidamente.
    """
    from supabase import create_client
    from supabase.lib.client_options import SyncClientOptions

    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    postgrest_timeout = float(os.getenv("SUPABASE_POSTGREST_TIMEOUT", "30"))
    storage_timeout = int(float(os.getenv("SUPABASE_STORAGE_TIMEOUT", "60")))
    schema = (os.getenv("SUPABASE_DB_SCHEMA") or "public").strip() or "public"

    # Backend con service_role: sin sesión persistente en disco (menos estado colgante).
    # create_client() exige SyncClientOptions (incluye storage interno para auth).
    options = SyncClientOptions(
        schema=schema,
        postgrest_client_timeout=postgrest_timeout,
        storage_client_timeout=max(5, storage_timeout),
        auto_refresh_token=False,
        persist_session=False,
    )
    return create_client(url, key, options=options)


class NarrativeDB:
    """Supabase client wrapper for all Story Engine data operations."""

    def __init__(self):
        self.url = os.getenv("SUPABASE_URL", "")
        self.key = os.getenv("SUPABASE_SERVICE_KEY", "")
        self._client = None

    def _get_client(self):
        if not (self.url and self.key):
            raise StoryEngineError(
                "Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en apps/api/.env"
            )
        if self._client is None:
            try:
                self._client = _create_story_engine_supabase_client()
            except ImportError as e:
                raise StoryEngineError(
                    "Paquete supabase no instalado: pip install -r requirements.txt"
                ) from e
            except Exception as e:
                raise StoryEngineError(f"Supabase (create_client): {e}") from e
        return self._client

    # ── CREATIVE HUB (muestreo para Multi-Reference Blending) ──────────────

    async def fetch_creative_references_for_blend(self, limit: int = 40) -> list[dict]:
        """Pool acotado desde creative_references (el Mix del Día elige un subconjunto)."""
        try:
            client = self._get_client()
            result = (
                client.table("creative_references")
                .select("title,media_type,key_elements,notes")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except StoryEngineError:
            raise
        except Exception as e:
            logger.warning("creative_references (blend): %s", e)
            return []

    async def fetch_ideation_for_blend(self, limit: int = 30) -> list[dict]:
        """Pool acotado desde ideation_vault."""
        try:
            client = self._get_client()
            result = (
                client.table("ideation_vault")
                .select("concept_name,description,category,integration_style")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except StoryEngineError:
            raise
        except Exception as e:
            logger.warning("ideation_vault (blend): %s", e)
            return []

    async def fetch_active_visual_references(self, limit: int = 60) -> list[dict]:
        """Solo `active=true` — para el generador."""
        return await self.list_visual_references_rows(active_only=True, limit=limit)

    async def list_visual_references_rows(
        self, *, active_only: bool = True, limit: int = 100
    ) -> list[dict]:
        """
        Referencias visuales (`visual_references`).
        SQL: docs/supabase_visual_references.sql
        """
        try:
            client = self._get_client()
            q = (
                client.table("visual_references")
                .select(
                    "id,label,visual_description,notes,sort_order,active,image_url,created_at"
                )
                .order("sort_order")
                .order("created_at", desc=True)
                .limit(max(1, min(120, int(limit))))
            )
            if active_only:
                q = q.eq("active", True)
            result = q.execute()
            return list(result.data or [])
        except StoryEngineError:
            raise
        except Exception as e:
            logger.warning("visual_references: %s", e)
            return []

    async def insert_visual_reference(
        self,
        label: str,
        visual_description: str,
        *,
        notes: str = "",
        sort_order: int = 0,
        active: bool = True,
        image_url: str | None = None,
    ) -> dict:
        """Alta de una regla visual (API / tooling)."""
        from datetime import datetime, timezone

        client = self._get_client()
        row = {
            "label": (label or "").strip()[:500],
            "visual_description": (visual_description or "").strip()[:8000],
            "notes": (notes or "").strip()[:2000] or None,
            "sort_order": int(sort_order),
            "active": bool(active),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        img = (image_url or "").strip()
        if img:
            row["image_url"] = img[:2048]
        if not row["label"] or not row["visual_description"]:
            raise StoryEngineError("label y visual_description son obligatorios.")
        result = client.table("visual_references").insert(row).execute()
        return dict(result.data[0]) if result.data else row

    def upload_visual_reference_image_bytes(
        self,
        file_bytes: bytes,
        *,
        content_type: str,
        original_filename: str = "reference.png",
    ) -> str:
        """Sube imagen a Storage; devuelve URL pública."""
        from app.story_engine.visual_reference_storage import upload_visual_reference_image

        client = self._get_client()
        url, _ = upload_visual_reference_image(
            client,
            file_bytes,
            content_type=content_type,
            original_filename=original_filename,
        )
        return url

    async def update_visual_reference(
        self, ref_id: str, updates: dict[str, Any]
    ) -> dict:
        """Actualiza columnas permitidas de `visual_references`."""
        from datetime import datetime, timezone

        allowed = {
            "label",
            "visual_description",
            "notes",
            "sort_order",
            "active",
            "image_url",
        }
        clean: dict[str, Any] = {}
        for k, v in updates.items():
            if k not in allowed:
                continue
            if k == "label":
                clean[k] = str(v).strip()[:500]
            elif k == "visual_description":
                clean[k] = str(v).strip()[:8000]
            elif k == "notes":
                s = ("" if v is None else str(v)).strip()[:2000]
                clean[k] = s or None
            elif k == "sort_order":
                clean[k] = int(v)
            elif k == "active":
                clean[k] = bool(v)
            elif k == "image_url":
                if v is None:
                    clean[k] = None
                else:
                    s = str(v).strip()[:2048]
                    clean[k] = s or None

        if not clean:
            raise StoryEngineError("Nada que actualizar.")
        clean["updated_at"] = datetime.now(timezone.utc).isoformat()
        client = self._get_client()
        result = (
            client.table("visual_references").update(clean).eq("id", ref_id).execute()
        )
        rows = result.data or []
        if not rows:
            raise StoryEngineError(f"Referencia no encontrada: {ref_id}")
        return dict(rows[0])

    async def delete_visual_reference(self, ref_id: str) -> None:
        client = self._get_client()
        chk = (
            client.table("visual_references")
            .select("id")
            .eq("id", ref_id)
            .limit(1)
            .execute()
        )
        if not (chk.data or []):
            raise StoryEngineError(f"Referencia no encontrada: {ref_id}")
        client.table("visual_references").delete().eq("id", ref_id).execute()

    # ── ARQUITECTO — notas de trama (triangulación GENERADOR) ────────────────

    async def fetch_unprocessed_architect_plot_notes(self, limit: int = 8) -> list[dict]:
        """Cola FIFO: ideas no consumidas (`docs/supabase_architect_plot_notes.sql`)."""
        try:
            client = self._get_client()
            result = (
                client.table("architect_plot_notes")
                .select("id, raw_plot_idea, title, created_at")
                .eq("is_processed", False)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            return result.data or []
        except StoryEngineError:
            raise
        except Exception as e:
            logger.warning("architect_plot_notes (lectura): %s", e)
            return []

    async def mark_architect_plot_notes_processed(self, note_ids: list[str]) -> None:
        if not note_ids:
            return
        try:
            from datetime import datetime, timezone

            now = datetime.now(timezone.utc).isoformat()
            client = self._get_client()
            for nid in note_ids:
                if not nid:
                    continue
                (
                    client.table("architect_plot_notes")
                    .update({"is_processed": True, "processed_at": now})
                    .eq("id", nid)
                    .execute()
                )
        except Exception as e:
            logger.warning("mark_architect_plot_notes_processed: %s", e)

    async def insert_architect_plot_note(self, raw_plot_idea: str, title: str = "") -> dict:
        client = self._get_client()
        row = {
            "raw_plot_idea": raw_plot_idea.strip(),
            "title": (title or "").strip(),
            "is_processed": False,
        }
        result = client.table("architect_plot_notes").insert(row).execute()
        return result.data[0] if result.data else row

    async def list_architect_plot_notes(
        self,
        *,
        pending_only: bool = True,
        limit: int = 50,
    ) -> list[dict]:
        try:
            client = self._get_client()
            q = client.table("architect_plot_notes").select("*").order("created_at", desc=True).limit(limit)
            if pending_only:
                q = q.eq("is_processed", False)
            result = q.execute()
            return result.data or []
        except Exception as e:
            logger.warning("list_architect_plot_notes: %s", e)
            return []

    async def fetch_recent_rune_corpus_for_triangulation(self, limit_chapters: int = 8) -> list[str]:
        """
        Runas del anexo de lore en capítulos publicados/aprobados (Libro Digital).
        """
        try:
            client = self._get_client()
            result = (
                client.table("chapters")
                .select("book_payload, day_number, slot")
                .in_("status", ["published", "approved"])
                .order("day_number", desc=True)
                .order("slot", desc=True)
                .limit(limit_chapters)
                .execute()
            )
            lines: list[str] = []
            seen: set[str] = set()
            for row in result.data or []:
                bp = row.get("book_payload") or {}
                if not isinstance(bp, dict):
                    continue
                la = bp.get("lore_annex") or {}
                if not isinstance(la, dict):
                    continue
                for r in la.get("diccionario_runico") or []:
                    if not isinstance(r, dict):
                        continue
                    g = str(r.get("glyph_or_name") or "").strip()
                    if not g or g == "—":
                        continue
                    m = str(r.get("meaning") or "").strip()[:280]
                    key = g.lower()
                    if key in seen:
                        continue
                    seen.add(key)
                    lines.append(f"{g}: {m}" if m else g)
                    if len(lines) >= 24:
                        return lines
            return lines
        except Exception as e:
            logger.warning("fetch_recent_rune_corpus_for_triangulation: %s", e)
            return []

    # ── CHAPTERS ────────────────────────────────────────────────────────────

    async def save_chapter(self, chapter: dict) -> dict:
        """Save a generated chapter as draft."""
        client = self._get_client()
        data = {
            "day_number": chapter["day_number"],
            "slot": chapter["slot"],
            "title": chapter["title"],
            "script": chapter["script"],
            "panels": chapter.get("panels", []),
            "status": "draft",
            "arc_position": chapter.get("arc_position", "setup"),
            "symbols_planted": chapter.get("symbols_planted", []),
            "bond_os_signals": chapter.get("bond_os_signals", []),
            "author_notes": chapter.get("author_notes", ""),
        }
        result = client.table("chapters").upsert(data).execute()
        saved = result.data[0] if result.data else data
        # Also save symbols to symbols table
        for sym in chapter.get("symbols_planted", []):
            await self._save_symbol(sym, saved.get("id"))
        return saved

    async def get_chapter(self, chapter_id: str) -> dict | None:
        client = self._get_client()
        result = client.table("chapters").select("*").eq("id", chapter_id).execute()
        return result.data[0] if result.data else None

    async def get_daily_chapters(
        self,
        day_number: int,
        *,
        canon_only: bool = False,
        published_only: bool = False,
        exclude_obsolete: bool = True,
    ) -> list[dict]:
        try:
            client = self._get_client()
            q = client.table("chapters").select("*").eq("day_number", day_number)
            if exclude_obsolete:
                q = q.neq("status", "obsolete")
            if published_only:
                q = q.eq("status", "published")
            elif canon_only:
                q = q.in_("status", ["approved", "published"])
            result = q.order("slot").execute()
            return result.data or []
        except StoryEngineError:
            raise
        except Exception as e:
            raise StoryEngineError(
                f"Supabase al listar capítulos del día {day_number}: {e}"
            ) from e

    async def get_recent_chapters(
        self,
        limit: int = 6,
        *,
        canon_only: bool = False,
        published_only: bool = False,
    ) -> list[dict]:
        client = self._get_client()
        q = client.table("chapters").select(
            "day_number, slot, title, script, arc_position, status, meta_summary"
        )
        q = q.neq("status", "obsolete")
        if published_only:
            q = q.eq("status", "published")
        elif canon_only:
            q = q.in_("status", ["approved", "published"])
        result = (
            q.order("day_number", desc=True)
            .order("slot", desc=True)
            .limit(limit)
            .execute()
        )
        return result.data or []

    async def get_latest_canon_anchor_chapter(self) -> dict | None:
        """
        Último capítulo con número de libro (canon) — approved o published.
        Prioriza meta_summary al construir prompts (Memoria de avance).
        """
        try:
            client = self._get_client()
            result = (
                client.table("chapters")
                .select(
                    "id, day_number, slot, title, status, meta_summary, script, "
                    "canon_chapter_number"
                )
                .in_("status", ["approved", "published"])
                .gte("canon_chapter_number", 1)
                .order("canon_chapter_number", desc=True)
                .limit(1)
                .execute()
            )
            return result.data[0] if result.data else None
        except StoryEngineError:
            raise
        except Exception as e:
            logger.warning("get_latest_canon_anchor_chapter: %s", e)
            return None

    async def get_last_chapter_read(self) -> dict | None:
        """Registro `last_chapter_read` en narrative_memory (auditoría / continuidad)."""
        try:
            client = self._get_client()
            result = (
                client.table("narrative_memory")
                .select("value")
                .eq("key", MEMORY_KEY_LAST_READ)
                .limit(1)
                .execute()
            )
            if result.data:
                v = result.data[0].get("value")
                return dict(v) if isinstance(v, dict) else None
        except StoryEngineError:
            raise
        except Exception as e:
            logger.debug("get_last_chapter_read: %s", e)
        return None

    async def set_last_chapter_read(self, payload: dict) -> None:
        """Actualiza last_chapter_read tras una generación exitosa."""
        await self.upsert_memory(MEMORY_KEY_LAST_READ, payload, "world")

    # ── LECTOR — ajustes persistidos (Supabase user_reader_settings) ───────

    async def get_reader_settings(self, profile_id: str = "default") -> dict:
        """Preferencias de lectura: font_size, narration_enabled."""
        pid = (profile_id or "default").strip() or "default"
        default_row = {
            "profile_id": pid,
            "font_size": 18,
            "narration_enabled": True,
            "persisted": False,
        }
        try:
            client = self._get_client()
            result = (
                client.table("user_reader_settings")
                .select("*")
                .eq("profile_id", pid)
                .limit(1)
                .execute()
            )
            if result.data:
                row = dict(result.data[0])
                row["persisted"] = True
                return row
        except StoryEngineError as e:
            # Sin Supabase en .env: el front usa localStorage, no 503
            logger.warning("get_reader_settings (Supabase no disponible): %s", e)
            return {
                **default_row,
                "sync_error": str(e),
            }
        except Exception as e:
            logger.warning("get_reader_settings (¿tabla user_reader_settings?): %s", e)
        return default_row

    async def upsert_reader_settings(
        self,
        profile_id: str,
        font_size: int,
        narration_enabled: bool,
    ) -> dict:
        from datetime import datetime, timezone

        pid = (profile_id or "default").strip() or "default"
        fs = int(max(14, min(32, font_size)))
        row = {
            "profile_id": pid,
            "font_size": fs,
            "narration_enabled": bool(narration_enabled),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            client = self._get_client()
            result = client.table("user_reader_settings").upsert(row).execute()
            if result.data:
                out = dict(result.data[0])
                out["persisted"] = True
                return out
        except StoryEngineError as e:
            logger.warning("upsert_reader_settings (Supabase no disponible): %s", e)
            return {
                **row,
                "persisted": False,
                "sync_error": str(e),
            }
        except Exception as e:
            logger.warning("upsert_reader_settings: %s", e)
            return {
                **row,
                "persisted": False,
                "sync_error": (
                    "No se pudo guardar en Supabase. Ejecuta "
                    "docs/supabase_user_reader_settings.sql o revisa SUPABASE_* en .env."
                ),
            }
        row["persisted"] = True
        return row

    async def update_chapter_status(
        self, chapter_id: str, status: str, notes: str = ""
    ) -> dict:
        """Aprueba (promoción a canon + libro digital + world state) o rechaza."""
        if status == "approved":
            return await self.promote_chapter_to_canon(chapter_id, notes)
        client = self._get_client()
        update: dict = {"status": status}
        if notes:
            update["author_notes"] = notes
        result = (
            client.table("chapters")
            .update(update)
            .eq("id", chapter_id)
            .execute()
        )
        return result.data[0] if result.data else {}

    async def _next_canon_chapter_number(self) -> int:
        client = self._get_client()
        result = (
            client.table("chapters")
            .select("canon_chapter_number")
            .order("canon_chapter_number", desc=True)
            .limit(40)
            .execute()
        )
        nums = [
            int(x["canon_chapter_number"])
            for x in (result.data or [])
            if x.get("canon_chapter_number") is not None
        ]
        return max(nums) + 1 if nums else 1

    async def promote_chapter_to_canon(self, chapter_id: str, notes: str = "") -> dict:
        """
        Borrador → canon: asigna canon_chapter_number, slug, book_payload (novela+manga),
        fusiona world_state y marca approved. Idempotente si ya era canon.
        """
        from datetime import datetime, timezone

        client = self._get_client()
        res = client.table("chapters").select("*").eq("id", chapter_id).execute()
        if not res.data:
            return {}
        ch = res.data[0]
        # Idempotente: ya registrado en el libro (evita doble fusión de world_state).
        if ch.get("canon_chapter_number") is not None:
            return ch

        next_num = await self._next_canon_chapter_number()
        base = slugify_chapter_base(
            str(ch.get("title") or ""),
            int(ch.get("day_number") or 0),
            int(ch.get("slot") or 0),
        )
        slug = allocate_unique_slug(client, base, next_num)
        now = datetime.now(timezone.utc).isoformat()
        from app.story_engine.lore_annex import build_lore_annex_for_chapter

        try:
            lore_annex = await build_lore_annex_for_chapter(ch)
        except Exception as e:
            logger.warning("build_lore_annex_for_chapter: %s — usando anexo vacío mínimo", e)
            lore_annex = {
                "generated_at": now,
                "source": "error",
                "bestiary": [],
                "ficha_tecnica": {"aren_snapshot": "", "abilities_observed": ["—"], "evolution_note": str(e)[:200]},
                "diccionario_runico": [],
            }

        book = build_book_payload(ch)
        book["lore_annex"] = lore_annex

        update_row: dict = {
            "status": "approved",
            "canon_chapter_number": next_num,
            "slug": slug,
            "canon_registered_at": now,
            "book_payload": book,
            # Ciclo Novela → Manga: la novela queda en canon; siguiente paso paneles Replicate
            "production_phase": "manga",
        }
        if notes:
            prev_notes = (ch.get("author_notes") or "").strip()
            approval_line = f"[Visto bueno autor — canon #{next_num}] {notes}".strip()
            update_row["author_notes"] = (
                f"{prev_notes}\n{approval_line}".strip() if prev_notes else approval_line
            )

        try:
            result = (
                client.table("chapters")
                .update(update_row)
                .eq("id", chapter_id)
                .execute()
            )
        except Exception as e:
            logger.exception("promote_chapter_to_canon (¿migración supabase_chronicle_canon.sql?): %s", e)
            raise StoryEngineError(
                "No se pudo promover a canon. Ejecuta docs/supabase_chronicle_canon.sql en Supabase."
            ) from e

        updated = result.data[0] if result.data else {}
        if updated:
            await self.merge_approved_chapter_world_state(updated)
        return updated

    async def merge_approved_chapter_world_state(self, chapter: dict) -> dict:
        """Incorpora un capítulo aprobado al snapshot de world_state de su día narrativo."""
        day = int(chapter.get("day_number") or 0)
        if day < 1:
            return self._initial_world_state()

        client = self._get_client()
        res = (
            client.table("world_state")
            .select("snapshot, changes")
            .eq("day_number", day)
            .execute()
        )
        if res.data:
            new_state = dict(res.data[0]["snapshot"] or {})
            changes = list(res.data[0].get("changes") or [])
        else:
            new_state = dict(await self.get_world_state(day - 1))
            changes = []

        title = str(chapter.get("title") or "?")
        cnum = chapter.get("canon_chapter_number")
        changes.append(f"Canon nº {cnum}: {title} (día {day}, slot {chapter.get('slot')})")

        for sym in chapter.get("symbols_planted") or []:
            if not isinstance(sym, dict):
                continue
            s_name = sym.get("name", "")
            if s_name and s_name not in new_state.get("active_symbols", []):
                new_state.setdefault("active_symbols", []).append(s_name)
                changes.append(f"Símbolo canónico: {s_name}")

        new_state["chapters_published"] = int(new_state.get("chapters_published") or 0) + 1
        new_state["last_day"] = max(int(new_state.get("last_day") or 0), day)
        if cnum is not None:
            new_state["last_canon_chapter_number"] = cnum

        client.table("world_state").upsert({
            "day_number": day,
            "snapshot": new_state,
            "changes": changes,
        }).execute()
        return new_state

    async def sync_legado_bond_os_index(self, chapter: dict) -> int:
        """
        Registra símbolos y señales Bond OS en narrative_memory para el índice Legado
        (continuidad de producto / anomalías).
        """
        cid = str(chapter.get("id") or "")
        if not cid:
            return 0
        cnum = chapter.get("canon_chapter_number")
        count = 0
        for i, sig in enumerate(chapter.get("bond_os_signals") or []):
            if not isinstance(sig, dict):
                continue
            feat = str(sig.get("feature") or "signal")[:100]
            key = f"legado_bond_{cid}_{i}"
            await self.upsert_memory(
                key,
                {
                    "feature": feat,
                    "narrative_element": sig.get("narrative_element"),
                    "chapter_id": cid,
                    "canon_chapter_number": cnum,
                    "kind": "bond_os_publish",
                },
                "bond_os_signal",
            )
            count += 1
        for j, sym in enumerate(chapter.get("symbols_planted") or []):
            if not isinstance(sym, dict):
                continue
            name = str(sym.get("name") or "symbol")[:140]
            key = f"legado_sym_{cid}_{j}"
            await self.upsert_memory(
                key,
                {
                    "name": name,
                    "description": sym.get("description"),
                    "category": sym.get("category"),
                    "game_reveal": sym.get("game_reveal"),
                    "chapter_id": cid,
                    "canon_chapter_number": cnum,
                    "kind": "symbol_anomaly_publish",
                },
                "symbol",
            )
            count += 1
        return count

    async def merge_published_chapter_into_day_index(
        self, chapter: dict, meta_summary: str
    ) -> None:
        """Añade el meta-resumen al índice diario (story_day_summaries), si la tabla existe."""
        day = int(chapter.get("day_number") or 0)
        if day < 1:
            return
        cid = str(chapter.get("id") or "")
        client = self._get_client()
        try:
            res = (
                client.table("story_day_summaries")
                .select("summary_technical,based_on_chapter_ids")
                .eq("day_number", day)
                .execute()
            )
        except Exception as e:
            logger.warning("story_day_summaries (merge): %s", e)
            return

        prev_text = ""
        ids: list[str] = []
        if res.data:
            prev_text = str(res.data[0].get("summary_technical") or "")
            raw_ids = res.data[0].get("based_on_chapter_ids") or []
            if isinstance(raw_ids, list):
                ids = [str(x) for x in raw_ids]

        cnum = chapter.get("canon_chapter_number")
        title = str(chapter.get("title") or "?")
        block = (
            f"\n\n━━ Canon nº {cnum} · slot {chapter.get('slot')} · {title} ━━\n"
            f"{meta_summary.strip()}"
        )
        if cid and cid not in ids:
            ids.append(cid)

        new_text = (prev_text + block).strip()
        try:
            client.table("story_day_summaries").upsert({
                "day_number": day,
                "summary_technical": new_text,
                "based_on_chapter_ids": ids,
            }).execute()
        except Exception as e:
            logger.warning("story_day_summaries upsert: %s", e)

    async def finalize_chapter(self, chapter_id: str) -> dict:
        """
        approved → published: meta-resumen, índice del libro (día), Bond OS en memoria.
        Requiere canon (visto bueno previo). Idempotente si ya published.
        """
        client = self._get_client()
        res = client.table("chapters").select("*").eq("id", chapter_id).execute()
        if not res.data:
            return {}
        ch = res.data[0]
        if ch.get("status") == "published":
            return ch
        if ch.get("status") != "approved" or ch.get("canon_chapter_number") is None:
            raise StoryEngineError(
                "Solo se puede finalizar un capítulo en estado 'approved' con número de canon. "
                "Aprueba primero desde Story Engine."
            )

        meta = await resolve_meta_summary_for_publish(ch)
        indexed = await self.sync_legado_bond_os_index(ch)
        await self.merge_published_chapter_into_day_index(ch, meta)

        try:
            upd = (
                client.table("chapters")
                .update({
                    "status": "published",
                    "meta_summary": meta,
                    "production_phase": "complete",
                })
                .eq("id", chapter_id)
                .execute()
            )
        except Exception as e:
            logger.exception("finalize_chapter (¿meta_summary en DB?): %s", e)
            raise StoryEngineError(
                "No se pudo publicar. Ejecuta docs/supabase_chapter_meta_summary.sql en Supabase."
            ) from e

        out = upd.data[0] if upd.data else {}
        logger.info(
            "Capítulo integrado al Legado Laguna: id=%s canon=%s bond_os_rows=%d",
            chapter_id,
            ch.get("canon_chapter_number"),
            indexed,
        )
        return out

    async def attach_hero_illustration(
        self,
        chapter_id: str,
        image_url: str,
        scene_prompt: str = "",
    ) -> dict:
        """
        Guarda URL Replicate + metadatos en book_payload (y hero_image_url si la columna existe).
        """
        client = self._get_client()
        row = await self.get_chapter(chapter_id)
        if not row:
            return {}
        bp = row.get("book_payload")
        if not isinstance(bp, dict):
            bp = {}
        else:
            bp = dict(bp)
        bp["hero_image"] = {
            "url": image_url,
            "scene_prompt_en": (scene_prompt or "")[:2000],
            "source": "replicate_flux_legado",
        }
        update_payload: dict = {"book_payload": bp}
        try:
            update_payload["hero_image_url"] = image_url
            result = (
                client.table("chapters")
                .update(update_payload)
                .eq("id", chapter_id)
                .execute()
            )
        except Exception as e:
            logger.warning("attach_hero_illustration (¿sin columna hero_image_url?): %s", e)
            result = (
                client.table("chapters")
                .update({"book_payload": bp})
                .eq("id", chapter_id)
                .execute()
            )
        return result.data[0] if result.data else {}

    async def update_chapter_panels_and_production_phase(
        self,
        chapter_id: str,
        panels: list,
        production_phase: str,
    ) -> dict:
        """
        Persiste paneles (URLs Replicate manga) y avanza `production_phase`
        (p. ej. manga → animation). Sincroniza book_payload.manga.
        """
        from datetime import datetime, timezone

        client = self._get_client()
        row = await self.get_chapter(chapter_id)
        if not row:
            return {}
        now = datetime.now(timezone.utc).isoformat()
        bp = dict(row.get("book_payload") or {})
        bp["manga"] = {
            "panels": panels,
            "panel_count": len(panels) if isinstance(panels, list) else 0,
        }
        meta = bp.get("meta")
        if not isinstance(meta, dict):
            meta = {}
        else:
            meta = dict(meta)
        meta["manga_pipeline_at"] = now
        bp["meta"] = meta

        try:
            result = (
                client.table("chapters")
                .update(
                    {
                        "panels": panels,
                        "production_phase": production_phase,
                        "book_payload": bp,
                        "updated_at": now,
                    }
                )
                .eq("id", chapter_id)
                .execute()
            )
        except Exception as e:
            logger.exception("update_chapter_panels_and_production_phase: %s", e)
            raise StoryEngineError(
                "No se pudo guardar paneles manga. ¿Ejecutaste docs/supabase_production_phase.sql?"
            ) from e
        return result.data[0] if result.data else {}

    async def attach_narration_audio(
        self,
        chapter_id: str,
        *,
        urls: list[str],
        voice: str,
        model: str,
        text_source: str,
    ) -> dict:
        """
        Guarda URLs de narración TTS en book_payload y narration_audio_url (primera URL).
        """
        client = self._get_client()
        row = await self.get_chapter(chapter_id)
        if not row:
            return {}
        bp = row.get("book_payload")
        if not isinstance(bp, dict):
            bp = {}
        else:
            bp = dict(bp)
        bp["narration"] = {
            "urls": urls,
            "voice": voice,
            "model": model,
            "text_source": text_source,
            "segments": len(urls),
            "provider": "openai_tts",
        }
        update_payload: dict = {"book_payload": bp}
        primary = urls[0] if urls else None
        if primary:
            update_payload["narration_audio_url"] = primary
        try:
            result = (
                client.table("chapters")
                .update(update_payload)
                .eq("id", chapter_id)
                .execute()
            )
        except Exception as e:
            logger.warning("attach_narration_audio (¿sin columna narration_audio_url?): %s", e)
            result = (
                client.table("chapters")
                .update({"book_payload": bp})
                .eq("id", chapter_id)
                .execute()
            )
        return result.data[0] if result.data else {}

    async def list_chronicle_book(
        self, limit: int = 200, *, published_only: bool = False
    ) -> list[dict]:
        """Libro digital: entradas canónicas ordenadas por número global."""
        client = self._get_client()
        q = (
            client.table("chapters")
            .select(
                "id, canon_chapter_number, slug, day_number, slot, title, "
                "arc_position, canon_registered_at, book_payload, status, meta_summary, "
                "hero_image_url, narration_audio_url"
            )
            .gte("canon_chapter_number", 1)
        )
        if published_only:
            q = q.eq("status", "published")
        result = q.order("canon_chapter_number").limit(limit).execute()
        return result.data or []

    async def get_latest_world_state(self) -> tuple[int, dict]:
        """Último snapshot guardado (mayor day_number en world_state)."""
        client = self._get_client()
        result = (
            client.table("world_state")
            .select("day_number, snapshot")
            .order("day_number", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            row = result.data[0]
            return int(row["day_number"]), dict(row.get("snapshot") or {})
        return 0, self._initial_world_state()

    # ── STORY SECRETS — "El libro es la llave" (Bond OS / gamificación) ──────

    async def create_story_secret(
        self,
        chapter_id: str,
        secret_code: str,
        hint_text: str = "",
        reward_data: dict | None = None,
    ) -> dict:
        """Registra un secreto ligado a un capítulo (tras leer la narrativa)."""
        client = self._get_client()
        result = client.table("story_secrets").insert({
            "chapter_id": chapter_id,
            "secret_code": secret_code.strip(),
            "hint_text": hint_text,
            "reward_data": reward_data or {},
            "is_discovered": False,
        }).execute()
        return result.data[0] if result.data else {}

    async def list_story_secrets_for_chapter(self, chapter_id: str) -> list[dict]:
        """
        Listado para juego/UI: no expone secret_code.
        reward_data solo visible si is_discovered (si no, locked).
        """
        client = self._get_client()
        result = (
            client.table("story_secrets")
            .select("id,chapter_id,hint_text,reward_data,is_discovered")
            .eq("chapter_id", chapter_id)
            .execute()
        )
        rows = result.data or []
        sanitized: list[dict] = []
        for row in rows:
            discovered = bool(row.get("is_discovered"))
            item: dict = {
                "id": row["id"],
                "chapter_id": row["chapter_id"],
                "hint_text": row.get("hint_text"),
                "is_discovered": discovered,
            }
            if discovered:
                item["reward_data"] = row.get("reward_data") or {}
            else:
                item["reward_data"] = None
                item["locked"] = True
            sanitized.append(item)
        return sanitized

    async def verify_and_unlock_story_secret(self, chapter_id: str, code: str) -> dict | None:
        """
        Si code coincide con secret_code (case-insensitive, strip), marca descubierto
        y devuelve recompensa. Idempotente si ya estaba descubierto.
        """
        code_norm = (code or "").strip().lower()
        if not code_norm:
            return None
        client = self._get_client()
        result = (
            client.table("story_secrets")
            .select("*")
            .eq("chapter_id", chapter_id)
            .execute()
        )
        for row in result.data or []:
            sc = (row.get("secret_code") or "").strip().lower()
            if sc != code_norm:
                continue
            sid = row["id"]
            was_discovered = bool(row.get("is_discovered"))
            if not was_discovered:
                client.table("story_secrets").update({"is_discovered": True}).eq("id", sid).execute()
            return {
                "secret_id": sid,
                "chapter_id": chapter_id,
                "reward_data": row.get("reward_data") or {},
                "was_already_discovered": was_discovered,
            }
        return None

    # ── EDITS (learning) ─────────────────────────────────────────────────────

    async def save_edit(
        self,
        chapter_id: str,
        field: str,
        original: str,
        edited: str,
        reason: str = "",
    ) -> dict:
        """Record an edit Oscar made — MemoryAgent will learn from this."""
        client = self._get_client()
        result = client.table("chapter_edits").insert({
            "chapter_id": chapter_id,
            "field": field,
            "original": original,
            "edited": edited,
            "edit_reason": reason,
            "learned": False,
        }).execute()
        return result.data[0] if result.data else {}

    async def get_unlearned_edits(self) -> list[dict]:
        """Get all edits not yet processed by MemoryAgent."""
        client = self._get_client()
        result = (
            client.table("chapter_edits")
            .select("*")
            .eq("learned", False)
            .order("created_at")
            .execute()
        )
        return result.data or []

    async def mark_edits_learned(self, edit_ids: list[str]) -> None:
        client = self._get_client()
        client.table("chapter_edits").update({"learned": True}).in_(
            "id", edit_ids
        ).execute()

    # ── NARRATIVE MEMORY ─────────────────────────────────────────────────────

    async def get_full_memory(self) -> dict:
        """Get all narrative memory organized by category."""
        client = self._get_client()
        result = client.table("narrative_memory").select("*").execute()
        memory: dict = {
            "characters": {},
            "locations": {},
            "symbols": [],
            "world": {},
            "bond_os_signal": {},
        }
        for row in result.data or []:
            cat = row.get("category", "world")
            key = row.get("key", "")
            val = row.get("value", {})
            if cat == "symbol":
                memory["symbols"].append(val)
            elif cat in memory:
                memory[cat][key] = val
        return memory

    async def upsert_memory(
        self, key: str, value: dict, category: str
    ) -> None:
        client = self._get_client()
        client.table("narrative_memory").upsert(
            {"key": key, "value": value, "category": category}
        ).execute()

    # ── EDITORIAL RULES ──────────────────────────────────────────────────────

    async def get_editorial_rules(self) -> list[str]:
        client = self._get_client()
        result = (
            client.table("editorial_rules")
            .select("rule, priority")
            .eq("active", True)
            .order("priority")
            .execute()
        )
        return [r["rule"] for r in (result.data or [])]

    async def add_editorial_rule(
        self, rule: str, source: str = "human", priority: int = 5
    ) -> dict:
        client = self._get_client()
        result = client.table("editorial_rules").insert({
            "rule": rule,
            "source": source,
            "priority": priority,
        }).execute()
        return result.data[0] if result.data else {}

    # ── STORY ARCS ───────────────────────────────────────────────────────────

    async def get_active_arc(self) -> dict | None:
        client = self._get_client()
        result = (
            client.table("story_arcs")
            .select("*")
            .eq("status", "active")
            .order("day_start", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    async def create_arc(
        self,
        name: str,
        description: str,
        day_start: int,
        themes: list[str],
        symbols: list[str],
    ) -> dict:
        client = self._get_client()
        result = client.table("story_arcs").insert({
            "name": name,
            "description": description,
            "day_start": day_start,
            "themes": themes,
            "symbols": symbols,
            "status": "active",
        }).execute()
        return result.data[0] if result.data else {}

    # ── WORLD STATE ──────────────────────────────────────────────────────────

    async def get_world_state(self, day_number: int) -> dict:
        """
        Snapshot más reciente con day_number <= `day_number`.
        Así la generación del día D usa el estado real aunque el día D-1
        aún no tenga fila propia (pocos capítulos aprobados).
        """
        if day_number <= 0:
            return self._initial_world_state()
        try:
            client = self._get_client()
            result = (
                client.table("world_state")
                .select("snapshot")
                .lte("day_number", day_number)
                .order("day_number", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                return dict(result.data[0]["snapshot"] or {})
            return self._initial_world_state()
        except StoryEngineError:
            raise
        except Exception as e:
            raise StoryEngineError(
                f"Supabase al leer world_state (hasta día {day_number}): {e}"
            ) from e

    async def save_world_state(
        self, day_number: int, chapters: list[dict], previous_state: dict
    ) -> None:
        """Derive new world state from chapters and save it."""
        new_state = dict(previous_state)
        changes = []

        for ch in chapters:
            for sym in ch.get("symbols_planted", []):
                s_name = sym.get("name", "")
                if s_name and s_name not in new_state.get("active_symbols", []):
                    new_state.setdefault("active_symbols", []).append(s_name)
                    changes.append(f"Símbolo plantado: {s_name}")

        new_state["last_day"] = day_number
        new_state["chapters_published"] = (
            new_state.get("chapters_published", 0) + len(chapters)
        )

        client = self._get_client()
        client.table("world_state").upsert({
            "day_number": day_number,
            "snapshot": new_state,
            "changes": changes,
        }).execute()

    def _initial_world_state(self) -> dict:
        return {
            "last_day": 0,
            "chapters_published": 0,
            "active_symbols": [],
            "aren_status": "junior archivist, nervous, curious",
            "archive_order_status": "stable, investigating new Orbet activity",
            "sovereign_dominion_status": "expanding, rumored operations near Nova Terra",
            "null_syndicate_status": "unknown — possibly inactive",
            "wanderer_activity": "increasing — 3 Errantes confirmed in Nova Terra",
            "world_tension": 2,  # 1-10 scale
        }

    # ── SYMBOLS ──────────────────────────────────────────────────────────────

    async def _save_symbol(self, symbol: dict, chapter_id: str | None = None) -> None:
        client = self._get_client()
        try:
            client.table("symbols").upsert({
                "name": symbol.get("name", "unknown"),
                "description": symbol.get("description", ""),
                "first_seen": chapter_id,
                "category": symbol.get("category", "orbet_hint"),
                "game_reveal": symbol.get("game_reveal", ""),
            }).execute()
        except Exception as e:
            logger.warning("Could not save symbol: %s", e)

    async def get_all_symbols(self) -> list[dict]:
        client = self._get_client()
        result = (
            client.table("symbols")
            .select("*")
            .eq("active", True)
            .order("created_at")
            .execute()
        )
        return result.data or []

    # ── STORY DAY SUMMARIES (Previously On recursivo) ────────────────────────

    async def get_story_day_summary(self, day_number: int) -> str | None:
        """Texto técnico canónico para el día D (tabla opcional story_day_summaries)."""
        try:
            client = self._get_client()
            result = (
                client.table("story_day_summaries")
                .select("summary_technical")
                .eq("day_number", day_number)
                .limit(1)
                .execute()
            )
            if result.data:
                t = (result.data[0].get("summary_technical") or "").strip()
                return t or None
        except StoryEngineError:
            raise
        except Exception as e:
            logger.debug("story_day_summaries (read): %s", e)
        return None

    async def upsert_story_day_summary(
        self,
        day_number: int,
        summary_technical: str,
        based_on_chapter_ids: list[str] | None = None,
    ) -> dict:
        """Guarda o actualiza el resumen técnico del día (post-producción / tooling)."""
        client = self._get_client()
        row = {
            "day_number": day_number,
            "summary_technical": summary_technical.strip(),
            "based_on_chapter_ids": based_on_chapter_ids or [],
        }
        result = client.table("story_day_summaries").upsert(row).execute()
        return result.data[0] if result.data else row

    # ── CURRENT DAY ──────────────────────────────────────────────────────────

    def collect_timeline_cascade_delete_ids(self, pivot: dict) -> list[str]:
        """
        IDs de capítulos a eliminar al «colapsar el futuro» desde un pivote.
        Incluye el propio pivote, todo el día desde pivot.slot, días posteriores,
        y cualquier canon con número mayor al del pivote (si aplica).
        """
        day_d = int(pivot.get("day_number") or 0)
        slot_s = int(pivot.get("slot") or 1)
        canon_c = pivot.get("canon_chapter_number")
        try:
            client = self._get_client()
            result = (
                client.table("chapters")
                .select("id,day_number,slot,canon_chapter_number,status")
                .gte("day_number", day_d)
                .execute()
            )
        except Exception as e:
            logger.warning("collect_timeline_cascade_delete_ids: %s", e)
            return []

        ids: set[str] = set()
        for row in result.data or []:
            rid = str(row.get("id") or "")
            if not rid:
                continue
            d = int(row.get("day_number") or 0)
            s = int(row.get("slot") or 0)
            cnum = row.get("canon_chapter_number")
            if d > day_d:
                ids.add(rid)
            elif d == day_d and s >= slot_s:
                ids.add(rid)
            elif canon_c is not None and cnum is not None:
                try:
                    if int(cnum) > int(canon_c):
                        ids.add(rid)
                except (TypeError, ValueError):
                    pass
        return list(ids)

    async def delete_chapters_by_ids(self, chapter_ids: list[str]) -> int:
        """Borra filas chapters; desvincula symbols.first_seen para no violar FK."""
        if not chapter_ids:
            return 0
        client = self._get_client()
        n = 0
        try:
            client.table("symbols").update({"first_seen": None}).in_(
                "first_seen", chapter_ids
            ).execute()
        except Exception as e:
            logger.warning("delete_chapters_by_ids (symbols): %s", e)
        for cid in chapter_ids:
            try:
                client.table("chapters").delete().eq("id", cid).execute()
                n += 1
            except Exception as e:
                logger.warning("delete chapter %s: %s", cid, e)
        return n

    async def insert_timeline_event(
        self,
        *,
        pivot_chapter_id: str | None,
        pivot_canon_number: int | None,
        pivot_day_number: int,
        pivot_slot: int,
        plot_pivot_note: str,
        chapters_removed: int,
        generation_day: int,
        generation_start_slot: int,
        cascade_mode: str = "hard_reset",
        chapters_refined: int = 0,
    ) -> dict:
        """Registro para la Cronología de decisiones (UI estilo timeline)."""
        client = self._get_client()
        row = {
            "pivot_chapter_id": pivot_chapter_id,
            "pivot_canon_number": pivot_canon_number,
            "pivot_day_number": pivot_day_number,
            "pivot_slot": pivot_slot,
            "plot_pivot_note": (plot_pivot_note or "").strip()[:8000],
            "chapters_removed": int(chapters_removed),
            "generation_day": int(generation_day),
            "generation_start_slot": int(generation_start_slot),
            "cascade_mode": (cascade_mode or "hard_reset")[:32],
            "chapters_refined": int(chapters_refined),
        }
        try:
            result = client.table("story_timeline_events").insert(row).execute()
            return dict(result.data[0]) if result.data else row
        except Exception as e:
            logger.warning("insert_timeline_event (¿docs/supabase_timeline_cascade.sql?): %s", e)
            return {**row, "id": None, "insert_error": str(e)}

    async def patch_timeline_event_refined_count(self, event_id: str, chapters_refined: int) -> None:
        if not event_id:
            return
        try:
            client = self._get_client()
            client.table("story_timeline_events").update(
                {"chapters_refined": int(chapters_refined)}
            ).eq("id", event_id).execute()
        except Exception as e:
            logger.debug("patch_timeline_event_refined_count: %s", e)

    async def list_future_chapters_for_soft_sync(self, pivot: dict, limit: int = 24) -> list[dict]:
        """
        Capítulos approved/published estrictamente posteriores al pivote narrativo.
        Si el pivote tiene canon, usa canon_chapter_number; si no (borrador), día/slot.
        """
        lim = max(1, min(24, int(limit)))
        canon_p = pivot.get("canon_chapter_number")
        day_d = int(pivot.get("day_number") or 0)
        slot_s = int(pivot.get("slot") or 1)
        pid = str(pivot.get("id") or "")
        client = self._get_client()
        try:
            if canon_p is not None:
                try:
                    cn = int(canon_p)
                except (TypeError, ValueError):
                    cn = None
                if cn is not None:
                    result = (
                        client.table("chapters")
                        .select("*")
                        .in_("status", ["approved", "published"])
                        .gt("canon_chapter_number", cn)
                        .order("canon_chapter_number")
                        .limit(lim)
                        .execute()
                    )
                    return list(result.data or [])
            result = (
                client.table("chapters")
                .select("*")
                .in_("status", ["approved", "published"])
                .execute()
            )
            out: list[dict] = []
            for r in result.data or []:
                if str(r.get("id")) == pid:
                    continue
                d = int(r.get("day_number") or 0)
                s = int(r.get("slot") or 0)
                if d > day_d or (d == day_d and s > slot_s):
                    out.append(r)
            out.sort(
                key=lambda x: (
                    int(x.get("canon_chapter_number") or 10_000),
                    int(x.get("day_number") or 0),
                    int(x.get("slot") or 0),
                )
            )
            return out[:lim]
        except Exception as e:
            logger.warning("list_future_chapters_for_soft_sync: %s", e)
            return []

    async def update_chapter_script_soft_sync(
        self,
        chapter_id: str,
        new_script: str,
        sync_note: str,
        *,
        lore_event_id: str | None = None,
    ) -> dict:
        """Actualiza guion + book_payload.novela; conserva status (approved/published)."""
        from datetime import datetime, timezone

        ch = await self.get_chapter(chapter_id)
        if not ch:
            return {}
        client = self._get_client()
        bp = dict(ch.get("book_payload") or {})
        novela = dict(bp.get("novela") or {})
        novela["text"] = new_script
        novela["char_count"] = len(new_script)
        bp["novela"] = novela
        meta = dict(bp.get("meta") or {})
        meta["lore_soft_sync_at"] = datetime.now(timezone.utc).isoformat()
        if lore_event_id:
            meta["lore_soft_sync_event_id"] = str(lore_event_id)
        bp["meta"] = meta

        prev = (ch.get("author_notes") or "").strip()
        line = f"[Lore sync — {datetime.now(timezone.utc).isoformat()}] {sync_note[:500]}"
        author_notes = f"{prev}\n{line}".strip() if prev else line

        upd = {
            "script": new_script,
            "book_payload": bp,
            "author_notes": author_notes[:12000],
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            result = client.table("chapters").update(upd).eq("id", chapter_id).execute()
            return dict(result.data[0]) if result.data else {**ch, **upd}
        except Exception as e:
            logger.exception("update_chapter_script_soft_sync: %s", e)
            raise StoryEngineError(f"No se pudo guardar refinamiento: {e}") from e

    async def list_timeline_events(self, limit: int = 40) -> list[dict]:
        try:
            client = self._get_client()
            result = (
                client.table("story_timeline_events")
                .select("*")
                .order("created_at", desc=True)
                .limit(min(80, max(1, int(limit))))
                .execute()
            )
            return list(result.data or [])
        except Exception as e:
            logger.warning("list_timeline_events: %s", e)
            return []

    async def stamp_chapters_timeline_branch(
        self, chapter_ids: list[str], event_id: str | None
    ) -> None:
        """Marca borradores recién generados para efecto «paradoja» en el lector."""
        if not chapter_ids or not event_id:
            return
        from datetime import datetime, timezone

        stamp = datetime.now(timezone.utc).isoformat()
        client = self._get_client()
        for cid in chapter_ids:
            try:
                res = client.table("chapters").select("book_payload").eq("id", cid).execute()
                if not res.data:
                    continue
                bp = dict(res.data[0].get("book_payload") or {})
                meta = dict(bp.get("meta") or {})
                meta["timeline_branch_event_id"] = str(event_id)
                meta["timeline_branch_at"] = stamp
                bp["meta"] = meta
                client.table("chapters").update({"book_payload": bp}).eq("id", cid).execute()
            except Exception as e:
                logger.debug("stamp_chapters_timeline_branch %s: %s", cid, e)

    async def get_current_day(self) -> int:
        """Return the current story day number."""
        try:
            client = self._get_client()
            result = (
                client.table("chapters")
                .select("day_number")
                .neq("status", "obsolete")
                .order("day_number", desc=True)
                .limit(1)
                .execute()
            )
            if result.data:
                return int(result.data[0]["day_number"])
            return 0
        except StoryEngineError:
            raise
        except Exception as e:
            raise StoryEngineError(
                f"Supabase al leer chapters (¿schema docs/supabase_story_engine.sql?): {e}"
            ) from e


def verify_story_engine_supabase() -> dict[str, Any]:
    """
    Comprueba variables de entorno y que existan las tablas del Story Engine
    (schema en docs/supabase_story_engine.sql). No expone la clave.
    """
    import base64

    url = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()
    out: dict[str, Any] = {
        "story_engine_schema": True,
        "env": {"supabase_url_set": bool(url), "supabase_key_set": bool(key)},
        "connected": False,
        "chapters_table_ok": False,
        "message": None,
    }
    if not url or not key:
        out["message"] = "Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en apps/api/.env"
        return out
    try:
        db = NarrativeDB()
        client = db._get_client()
        client.table("chapters").select("id").limit(0).execute()
        out["connected"] = True
        out["chapters_table_ok"] = True
        out["message"] = "Story Engine: tablas alineadas con supabase_story_engine.sql."
        try:
            client.table("architect_plot_notes").select("id").limit(0).execute()
            out["architect_plot_notes_table_ok"] = True
        except Exception:
            out["architect_plot_notes_table_ok"] = False
            out["architect_plot_notes_hint"] = (
                "Opcional: ejecuta docs/supabase_architect_plot_notes.sql para cola del Arquitecto."
            )
        try:
            client.table("chapters").select("production_phase").limit(0).execute()
            out["production_phase_column_ok"] = True
        except Exception:
            out["production_phase_column_ok"] = False
            out["production_phase_hint"] = (
                "Ejecuta docs/supabase_production_phase.sql para el ciclo Novela→Manga→Animación."
            )
        try:
            client.table("story_timeline_events").select("id").limit(0).execute()
            out["story_timeline_events_table_ok"] = True
        except Exception:
            out["story_timeline_events_table_ok"] = False
            out["story_timeline_events_hint"] = (
                "Ejecuta docs/supabase_timeline_cascade.sql para regeneración en cascada + cronología."
            )
        try:
            client.table("story_timeline_events").select("cascade_mode,chapters_refined").limit(0).execute()
            out["story_timeline_soft_columns_ok"] = True
        except Exception:
            out["story_timeline_soft_columns_ok"] = False
            out["story_timeline_soft_columns_hint"] = (
                "Ejecuta docs/supabase_timeline_soft_mode.sql para modo Enriquecer (soft lore)."
            )
        try:
            client.table("visual_references").select("id").limit(0).execute()
            out["visual_references_table_ok"] = True
        except Exception:
            out["visual_references_table_ok"] = False
            out["visual_references_hint"] = (
                "Ejecuta docs/supabase_visual_references.sql para contexto visual en el generador."
            )
        try:
            client.table("visual_references").select("image_url").limit(0).execute()
            out["visual_references_image_url_ok"] = True
        except Exception:
            out["visual_references_image_url_ok"] = False
            out["visual_references_image_url_hint"] = (
                "Ejecuta docs/supabase_visual_references_image_url.sql para subir miniaturas."
            )
        # Diagnóstico JWT (sin verificar firma)
        try:
            parts = key.split(".")
            if len(parts) == 3:
                pad = "=" * (-len(parts[1]) % 4)
                payload = json.loads(
                    base64.urlsafe_b64decode((parts[1] + pad).encode("ascii"))
                )
                role = payload.get("role")
                if role:
                    out["env"]["jwt_role_hint"] = str(role)
                    if str(role) == "anon":
                        out["hint"] = (
                            "Para el backend suele ir la clave service_role "
                            "(Settings → API en Supabase)."
                        )
        except Exception:
            pass
        return out
    except Exception as e:
        out["message"] = str(e)
        out["hint"] = (
            "Ejecuta docs/supabase_story_engine.sql en el SQL Editor. "
            "Si antes usaste docs/supabase_chapters_edits_memory.sql, "
            "hay conflicto de tablas: usa otro proyecto Supabase o elimina tablas antiguas."
        )
        return out
