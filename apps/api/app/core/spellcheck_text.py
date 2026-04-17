"""Puente hacia CorrectionService (cerebro multilingüe es/en/fr + lore ConvergeVerse)."""

from __future__ import annotations

from typing import Tuple

from app.services.speller import get_correction_service


def guess_spell_lang(text: str) -> str:
    """Delega en la detección del servicio (Unicode + voto por diccionario)."""
    return get_correction_service().detect_language(text)


def spellcheck_narrative(text: str, lang: str | None = None) -> Tuple[str, int, str]:
    """
    Corrige ortografía; prioriza sugerencias alineadas con el léxico del lore.
    Returns: (corrected_text, replacement_count, language_used)
    """
    r = get_correction_service().correct(text, lang_hint=lang)
    return r.text, r.replacements, r.detected_language
