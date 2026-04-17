"""Errores del Story Engine (manejados en main → JSON 503 + CORS)."""


class StoryEngineError(Exception):
    """Configuración (.env) o Supabase / PostgREST."""
