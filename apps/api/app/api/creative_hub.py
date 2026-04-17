"""
Creative Hub — referencias creativas + bóveda de ideas (Supabase).
Rutas bajo prefijo /api → /api/creative-hub, /api/add-reference, /api/add-idea
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.story_engine.errors import StoryEngineError
from app.story_engine.narrative_db import NarrativeDB

logger = logging.getLogger(__name__)

router = APIRouter(tags=["creative-hub"])


def _supabase():
    return NarrativeDB()._get_client()


class CreativeReferenceCreate(BaseModel):
    title: str
    media_type: str = "anime"
    key_elements: list[str] = Field(default_factory=list)
    notes: str = ""


class IdeationIdeaCreate(BaseModel):
    concept_name: str
    description: str = ""
    category: str = ""
    integration_style: str = ""


@router.get("/creative-hub")
async def get_creative_hub():
    """Lista referencias + ideas desde Supabase."""
    try:
        client = _supabase()
        refs = client.table("creative_references").select("*").order("created_at", desc=True).execute()
        ideas = client.table("ideation_vault").select("*").order("created_at", desc=True).execute()
        return {
            "references": refs.data or [],
            "ideas": ideas.data or [],
        }
    except StoryEngineError:
        raise
    except Exception:
        logger.exception("get_creative_hub")
        raise HTTPException(
            status_code=503,
            detail="Servicio de base de datos no disponible. ¿Ejecutaste docs/supabase_creative_hub.sql?",
        )


@router.post("/add-reference")
async def add_reference(ref: CreativeReferenceCreate):
    """Inserta una referencia: title, media_type, key_elements, notes."""
    try:
        client = _supabase()
        row = {
            "title": ref.title,
            "media_type": ref.media_type,
            "key_elements": ref.key_elements,
            "notes": ref.notes or None,
        }
        result = client.table("creative_references").insert(row).execute()
        return {"ok": True, "data": result.data[0] if result.data else row}
    except StoryEngineError:
        raise
    except Exception as e:
        logger.exception("add_reference")
        raise HTTPException(status_code=503, detail="Error al acceder a la base de datos.")


@router.post("/add-idea")
async def add_idea(idea: IdeationIdeaCreate):
    """Inserta idea: concept_name, description, category, integration_style."""
    try:
        client = _supabase()
        row = {
            "concept_name": idea.concept_name,
            "description": idea.description or None,
            "category": idea.category or None,
            "integration_style": idea.integration_style or None,
        }
        result = client.table("ideation_vault").insert(row).execute()
        return {"ok": True, "data": result.data[0] if result.data else row}
    except StoryEngineError:
        raise
    except Exception as e:
        logger.exception("add_idea")
        raise HTTPException(status_code=503, detail="Error al acceder a la base de datos.")
