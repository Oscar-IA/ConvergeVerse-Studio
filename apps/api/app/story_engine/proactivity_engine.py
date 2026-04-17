"""
Motor de reacción proactiva — el asistente propone mejoras (no solo obedece).

Tras leer guion + referencias visuales + (opcional) ciencia/lore aplicado,
genera sugerencias: física creíble, tono combativo «vikingo», hooks de lore.
"""

from __future__ import annotations

import os
from typing import Any

from app.core.llm_completion import llm_complete_text
from app.story_engine.realism_anchor import default_scientific_lore_for_proactivity
from app.story_engine.visual_context import build_visual_context_block

# Límite de caracteres del guion enviados al modelo (coste / contexto)
MAX_CHAPTER_CHARS = int(os.getenv("PROACTIVITY_MAX_CHAPTER_CHARS", "28000"))

PROACTIVITY_SYSTEM = """Eres el ASISTENTE CREATIVO #1 de CONVERGEVERSE (ciencia ficción y fantasía).
Tu pasión es que la historia sea memorable, físicamente sugerente y emocionalmente devastadora cuando toca.

Reglas:
- Respondes en **español**.
- **No resumas** el capítulo ni lo reescribas entero.
- **Propón** ideas concretas: dónde inyectar detalle, qué reforzar, cómo conectar con futuro/pasado.
- Sé específico (escenas, gestos, líneas de diálogo posibles, metáforas) sin fanfic largo.
- Si el usuario no dio «ciencia aplicada», puedes inspirarte en física real, relatividad (p. ej. dilatación temporal al estilo Interstellar), y en brutalidad ritual / honor nórdico solo como **sabor** combativo — siempre coherente con el tono del guion.
- Formato de salida: usa markdown con estas secciones exactas (puedes quedar breve en cada una si no aplica):

## Saludo al Arquitecto
(Una frase tipo «Arquitecto, si…» con tu idea más fuerte.)

## Física y magia creíble
(Bullets: dónde un detalle de física real o límite duro hace la magia más creíble.)

## Combate y visceralidad
(Bullets: cómo endurecer o «vikingizar» tensión física / riesgo sin traicionar el tono.)

## Lore: 3 conexiones temporales
(Exactamente 3 bullets: cada uno enlaza este capítulo con un **episodio futuro o pasado** posible, con efecto emocional esperado.)

## Riesgos
(1–3 bullets: qué podría salir mal si se abusa de la idea — para que el Arquitecto decida.)
"""


def _truncate(text: str, max_chars: int) -> tuple[str, bool]:
    t = (text or "").strip()
    if len(t) <= max_chars:
        return t, False
    return t[: max_chars - 1] + "…", True


def _format_scientific_lore(raw: str) -> str:
    s = (raw or "").strip()
    if not s:
        return default_scientific_lore_for_proactivity()
    return s


async def run_proactivity_engine(
    *,
    chapter_content: str,
    chapter_title: str = "",
    visual_refs_rows: list[dict[str, Any]] | None = None,
    scientific_lore: str = "",
) -> tuple[bool, str, str | None]:
    """
    Devuelve (ok, texto_markdown, error).
    """
    body, truncated = _truncate(chapter_content, MAX_CHAPTER_CHARS)
    if not body:
        return False, "", "chapter_content vacío."

    refs = visual_refs_rows or []
    visual_block = build_visual_context_block(refs, max_chars=10_000)
    if not visual_block.strip():
        visual_block = "(No hay referencias visuales activas en Supabase — enfócate en el guion y en la ciencia/lore proporcionados.)"

    science = _format_scientific_lore(scientific_lore)

    title_line = f"Título / contexto: {chapter_title.strip()}\n\n" if chapter_title.strip() else ""

    user_prompt = f"""{title_line}CONTENIDO DEL CAPÍTULO (guion; puede estar truncado={truncated}):
---
{body}
---

REFERENCIAS VISUALES (biblia de producción — respétalas al proponer):
{visual_block}

CIENCIA / LORE APLICADO (notas del Arquitecto + inspiraciones):
{science}

TAREA:
Analiza el capítulo. No lo resumas. ¡MEJÓRALO con las secciones indicadas en el system prompt!
1. ¿Dónde inyectar un detalle de física real o límite duro que haga la magia más creíble?
2. ¿Cómo hacer el combate o la confrontación más brutal y visceral (sabor «vikingo») donde encaje?
3. Tres mejoras de lore que conecten este capítulo con uno futuro o pasado (con impacto emocional explícito, p. ej. sacrificio + dilatación temporal si el guion lo permite).
"""

    ok, text, err = await llm_complete_text(
        PROACTIVITY_SYSTEM,
        user_prompt,
        max_tokens=min(8192, int(os.getenv("PROACTIVITY_MAX_TOKENS", "4096"))),
        temperature=float(os.getenv("PROACTIVITY_TEMPERATURE", "0.78")),
    )
    if not ok:
        return False, "", err or "LLM no disponible."
    return True, (text or "").strip(), None
