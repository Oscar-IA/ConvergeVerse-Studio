"""
Esquema maestro de datos: temporadas / capítulos / salidas renderizadas y lore mundial.
Usar ``BookChapter`` al importar desde ``app.models`` para no confundir con ``story.Chapter``.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class RenderOutput(BaseModel):
    """Salida consolidada de un capítulo tras el pipeline (novela + manga + anime)."""

    novel_content: str = Field(..., description="Texto narrativo final / corregido")
    manga_panels: list[str] = Field(
        default_factory=list,
        description="URLs de paneles (Replicate, Pollinations, placeholders, etc.)",
    )
    anime_vfx_config: dict[str, Any] = Field(
        default_factory=dict,
        description="Configuración de motion/VFX/SFX (p. ej. Camera_Movement, VFX_Blue_Sparks)",
    )
    language: str = Field(
        ...,
        description="Idioma dominante del capítulo (es, en, fr, …)",
    )


class Chapter(BaseModel):
    """
    Registro de capítulo en el catálogo (temporada + episodio + beat + render final).
    """

    id: str = Field(..., description="Identificador estable (UUID o slug)")
    title: str
    season: int = Field(..., ge=1, description="Temporada")
    episode: int = Field(..., ge=1, description="Capítulo / episodio dentro de la temporada")
    raw_beat: str = Field(..., description="Beat o borrador original del usuario")
    final_output: RenderOutput
    created_at: str = Field(..., description="ISO 8601 de creación")


class WorldLore(BaseModel):
    """Lore mundial serializable (personajes, lugares, terminología técnica)."""

    characters: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Personajes (Aren Valis, etc.) — dict flexible por esquema JSON",
    )
    locations: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Ubicaciones (Abyssal Domain, Aethel, …)",
    )
    terminology: dict[str, Any] = Field(
        default_factory=dict,
        description="Diccionario técnico del mundo (Orbets, facciones, siglas)",
    )
