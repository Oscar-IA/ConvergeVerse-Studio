"""
Subida de imágenes de referencia visual a Supabase Storage.
Bucket por defecto: visual-references (público). Env: VISUAL_REFERENCES_BUCKET
"""

from __future__ import annotations

import logging
import os
import re
import uuid
from typing import Any

from app.story_engine.errors import StoryEngineError
from app.story_engine.narration_tts import _storage_public_url

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = int(os.getenv("VISUAL_REFERENCES_MAX_BYTES", str(8 * 1024 * 1024)))
DEFAULT_BUCKET = os.getenv("VISUAL_REFERENCES_BUCKET", "visual-references").strip() or "visual-references"

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def _ext_from_content_type(ct: str) -> str:
    ct = (ct or "").split(";")[0].strip().lower()
    return ALLOWED_TYPES.get(ct, ".bin")


def _safe_filename(name: str) -> str:
    base = re.sub(r"[^\w.\-]+", "_", (name or "ref").strip(), flags=re.UNICODE)
    return (base[:120] or "ref").lstrip(".")


def upload_visual_reference_image(
    client: Any,
    file_bytes: bytes,
    *,
    content_type: str,
    original_filename: str = "image.png",
) -> tuple[str, str]:
    """
    Sube bytes al bucket y devuelve (public_url, object_path).
    """
    if len(file_bytes) > MAX_IMAGE_BYTES:
        raise StoryEngineError(
            f"Imagen demasiado grande (máx {MAX_IMAGE_BYTES // (1024 * 1024)} MB)."
        )
    ct = (content_type or "application/octet-stream").split(";")[0].strip().lower()
    if ct not in ALLOWED_TYPES:
        raise StoryEngineError(
            f"Tipo no permitido: {ct}. Usa JPEG, PNG, WebP o GIF."
        )

    ext = _ext_from_content_type(ct)
    safe = _safe_filename(original_filename)
    if "." not in safe:
        safe = f"{safe}{ext}"
    uid = uuid.uuid4().hex[:12]
    object_path = f"refs/{uid}_{safe}"

    bucket = DEFAULT_BUCKET
    try:
        client.storage.from_(bucket).upload(
            object_path,
            file_bytes,
            file_options={
                "content-type": ct,
                "upsert": "true",
            },
        )
    except Exception as e:
        err = str(e).lower()
        if "bucket" in err or "not found" in err or "404" in err:
            raise StoryEngineError(
                f"No se pudo subir la imagen (bucket {bucket!r}). "
                "Crea el bucket en Supabase → Storage, márcalo como público "
                "y añade políticas (ver docs/supabase_visual_references_storage.md)."
            ) from e
        logger.exception("upload_visual_reference_image")
        raise StoryEngineError(f"Supabase Storage: {e}") from e

    url = _storage_public_url(client, bucket, object_path)
    return url, object_path
