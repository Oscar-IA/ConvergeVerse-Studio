"""
Modelos Pydantic para organización narrativa: personajes, capítulos, universo.
Usados como contrato de datos (API, import/export JSON, validación).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class Character(BaseModel):
    """Personaje con fijación visual y quirk cómico (estilo Konosuba)."""

    name: str
    role: str
    visual_description: str
    personality_quirk: str = Field(
        ...,
        description="Tic de personalidad / comedia absurda tipo Konosuba (roasts, pánico, deadpan).",
    )


class Chapter(BaseModel):
    """
    Un capítulo bajo una temporada: novela, paneles manga (URLs Replicate + diálogos en dicts)
    y notas VFX para la capa anime.
    """

    season: int = Field(..., ge=1, description="Número de temporada")
    number: int = Field(..., ge=1, description="Número de capítulo dentro de la temporada")
    title: str
    novel_text: str = Field(default="", description="Prosa de la novela / escena larga")
    manga_panels: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Paneles: image_url, dialogue, scene_index, description, etc.",
    )
    vfx_notes: str | None = Field(
        default=None,
        description="Notas para animación / VFX (o serializar proposals del World Engine aquí).",
    )


class Universe(BaseModel):
    """Contenedor del canon ConvergeVerse: elenco, lugares e historial de capítulos."""

    name: str = "ConvergeVerse"
    characters: list[Character] = Field(default_factory=list)
    locations: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Ubicaciones: name, aesthetic, id, …",
    )
    history_log: list[Chapter] = Field(
        default_factory=list,
        description="Capítulos en orden narrativo (temporada + número + artefactos).",
    )
