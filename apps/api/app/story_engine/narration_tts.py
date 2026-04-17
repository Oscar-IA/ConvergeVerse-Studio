"""
Narración con IA — «La Voz del Multiverso» (OpenAI TTS).

- Modelo recomendado: tts-1-hd (voz más natural).
- Voces OpenAI: alloy, echo, fable, onyx, nova, shimmer (onyx = grave / anti-héroe).
- Texto largo: se parte en segmentos (límite API ~4096 caracteres) y se suben varios .mp3.

ElevenLabs: no incluido aquí; misma URL pública en Storage sirve si generas audio allí.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from pathlib import Path
from typing import Any

from app.story_engine.errors import StoryEngineError

logger = logging.getLogger(__name__)

# OpenAI Speech API — máximo oficial por petición
OPENAI_TTS_MAX_INPUT = 4096
# Margen para no rozar el límite
_DEFAULT_CHUNK = 3800


def _tts_model(explicit: str | None) -> str:
    if explicit and str(explicit).strip():
        return str(explicit).strip()
    return (os.getenv("OPENAI_TTS_MODEL") or "tts-1-hd").strip()


def _tts_voice(requested: str | None) -> str:
    """Voz OpenAI TTS (p. ej. onyx, alloy). La API valida el valor."""
    v = (requested or os.getenv("OPENAI_TTS_VOICE") or "onyx").strip()
    if not v:
        v = "onyx"
    return v


def _narration_bucket() -> str:
    return (os.getenv("SUPABASE_STORAGE_BUCKET_NARRATION") or "narration").strip()


def chunk_text_for_tts(text: str, max_chars: int = _DEFAULT_CHUNK) -> list[str]:
    """Parte el texto en trozos <= max_chars respetando párrafos / frases cuando puede."""
    text = (text or "").strip()
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks: list[str] = []
    start = 0
    n = len(text)
    while start < n:
        end = min(start + max_chars, n)
        if end < n:
            window = text[start:end]
            cut = window.rfind("\n\n")
            if cut < max_chars // 3:
                cut = window.rfind("\n")
            if cut < max_chars // 3:
                cut = window.rfind(". ")
            if cut < max_chars // 3:
                cut = window.rfind(" ")
            if cut > 80:
                end = start + cut + (2 if window[cut : cut + 2] == ". " else 0)
        piece = text[start:end].strip()
        if piece:
            chunks.append(piece)
        start = end

    return chunks


def _synthesize_openai_sync(text: str, *, voice: str, model: str) -> bytes:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        raise StoryEngineError(
            "Falta OPENAI_API_KEY en apps/api/.env para generar narración TTS."
        )
    from openai import OpenAI

    client = OpenAI(api_key=key)
    if len(text) > OPENAI_TTS_MAX_INPUT:
        raise StoryEngineError(
            f"Segmento TTS demasiado largo ({len(text)} > {OPENAI_TTS_MAX_INPUT})."
        )

    resp = client.audio.speech.create(
        model=model,
        voice=voice,  # type: ignore[arg-type]
        input=text,
        response_format="mp3",
    )
    # openai>=1: HttpxBinaryResponseContent → .content son los bytes del MP3
    out = resp.content
    if not out:
        raise StoryEngineError("OpenAI TTS no devolvió bytes de audio.")
    return out


def _storage_public_url(client: Any, bucket: str, object_path: str) -> str:
    """Resuelve URL pública del objeto en Storage (storage3 devuelve str)."""
    try:
        url = client.storage.from_(bucket).get_public_url(object_path)
    except Exception as e:
        raise StoryEngineError(f"Supabase get_public_url: {e}") from e
    if isinstance(url, str) and url.strip():
        return url.strip().rstrip("?")
    raise StoryEngineError(
        "No se pudo obtener URL pública del Storage. ¿Bucket marcado como público?"
    )


def _upload_mp3(
    client: Any,
    bucket: str,
    object_path: str,
    mp3: bytes,
) -> str:
    try:
        client.storage.from_(bucket).upload(
            object_path,
            mp3,
            file_options={
                "content-type": "audio/mpeg",
                "upsert": "true",  # storage3 → cabecera x-upsert en POST
            },
        )
    except Exception as e:
        err = str(e).lower()
        if "bucket" in err or "not found" in err or "404" in err:
            raise StoryEngineError(
                f"No se pudo subir a Storage (bucket {bucket!r}). "
                "Crea el bucket en Supabase → Storage y marca políticas de lectura "
                "(ver docs/supabase_narration_audio.md)."
            ) from e
        raise StoryEngineError(f"Supabase Storage upload: {e}") from e
    return _storage_public_url(client, bucket, object_path)


def _api_root_dir() -> Path:
    """Directorio `apps/api` (donde vive `static/audio/`)."""
    return Path(__file__).resolve().parent.parent.parent


def _safe_chapter_file_id(chapter_id: str, max_len: int = 72) -> str:
    raw = (chapter_id or "chapter").strip()
    s = re.sub(r"[^\w\-]+", "_", raw, flags=re.UNICODE)
    s = re.sub(r"_+", "_", s).strip("_")
    return (s or "chapter")[:max_len]


def generate_chapter_voice_local(
    chapter_id: str,
    text: str,
    *,
    voice: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """
    Locución OpenAI TTS → archivos bajo ``apps/api/static/audio/``.

    Sirve desde FastAPI con ``app.mount("/static", StaticFiles(...))``:
    ``{API_PUBLIC_URL}/static/audio/chapter_<id>.mp3``

    Textos largos → varios archivos ``chapter_<id>_part00.mp3``, ...
    """
    v = _tts_voice(voice)
    m = _tts_model(model)
    parts = chunk_text_for_tts(text)
    if not parts:
        raise StoryEngineError("No hay texto para narrar.")

    audio_dir = _api_root_dir() / "static" / "audio"
    audio_dir.mkdir(parents=True, exist_ok=True)

    safe = _safe_chapter_file_id(chapter_id)
    base_url = (os.getenv("API_PUBLIC_URL") or "http://localhost:8000").strip().rstrip("/")

    relative_paths: list[str] = []
    public_urls: list[str] = []

    for i, segment in enumerate(parts):
        mp3 = _synthesize_openai_sync(segment, voice=v, model=m)
        if len(parts) == 1:
            name = f"chapter_{safe}.mp3"
        else:
            name = f"chapter_{safe}_part{i:02d}.mp3"
        path = audio_dir / name
        path.write_bytes(mp3)
        rel = f"static/audio/{name}"
        relative_paths.append(rel)
        public_urls.append(f"{base_url}/static/audio/{name}")
        logger.info(
            "TTS local escrito: %s (%d bytes, segmento %d/%d)",
            path,
            len(mp3),
            i + 1,
            len(parts),
        )

    return {
        "url": public_urls[0],
        "urls": public_urls,
        "paths_relative": relative_paths,
        "voice": v,
        "model": m,
        "segments": len(public_urls),
    }


def _safe_slug_part(s: str, max_len: int = 48) -> str:
    s = re.sub(r"[^\w\-]+", "-", (s or "").strip().lower(), flags=re.UNICODE)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return (s or "chapter")[:max_len]


async def generate_and_upload_chapter_narration(
    *,
    supabase_client: Any,
    chapter_id: str,
    text: str,
    voice: str | None = None,
    model: str | None = None,
    title_hint: str = "",
) -> dict[str, Any]:
    """
    Genera MP3 vía OpenAI TTS y sube cada segmento a Supabase Storage.

    Returns:
        dict con urls, voice, model, segments, bucket, object_prefix
    """
    v = _tts_voice(voice)
    m = _tts_model(model)

    parts = chunk_text_for_tts(text)
    if not parts:
        raise StoryEngineError("No hay texto para narrar.")

    bucket = _narration_bucket()
    slug = _safe_slug_part(title_hint)[:32]
    prefix = f"chapters/{chapter_id}/{slug}-narration"

    urls: list[str] = []
    for i, segment in enumerate(parts):
        object_path = f"{prefix}-{i:02d}.mp3"
        mp3 = await asyncio.to_thread(_synthesize_openai_sync, segment, voice=v, model=m)
        url = await asyncio.to_thread(_upload_mp3, supabase_client, bucket, object_path, mp3)
        urls.append(url)
        logger.info(
            "Narración TTS subida: chapter=%s segment=%d/%d bytes=%d",
            chapter_id,
            i + 1,
            len(parts),
            len(mp3),
        )

    return {
        "urls": urls,
        "voice": v,
        "model": m,
        "segments": len(urls),
        "bucket": bucket,
        "object_prefix": prefix,
    }
