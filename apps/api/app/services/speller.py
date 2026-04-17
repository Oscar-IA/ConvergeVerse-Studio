"""
Cerebro multilingüe de corrección: pyspellchecker + léxico Bond Converge / ConvergeVerse.

Detecta idioma en {es, en, fr} y corrige con la sugerencia más cercana; si hay varias
candidatas de Hunspell, prioriza términos presentes en el lore (nombres propios, lugares).
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Literal

from app.core.lore_loader import load_lore
from app.core.world_visual import iter_world_lore_locations

logger = logging.getLogger(__name__)

Lang = Literal["es", "en", "fr"]


def cast_lang(h: str | None) -> Lang:
    if h in ("es", "en", "fr"):
        return h  # type: ignore[return-value]
    return "en"


# Base técnica (siempre válida en los tres idiomas como token)
_BASE_LORE_TOKENS = frozenset(
    {
        "orbet",
        "orbets",
        "aren",
        "valis",
        "konosuba",
        "convergeverse",
        "wanderer",
        "wanderers",
        "abyssal",
        "aethel",
        "neo",
        "bond",
        "converge",
        "architect",
    }
)

_WORD_RE = re.compile(r"[A-Za-zÀ-ÿ']+")


def _char_hint_lang(text: str) -> Lang | None:
    if any(c in text for c in "áéíóúñüÁÉÍÓÚÑÜ¿¡"):
        return "es"
    if any(c in text for c in "àâçéèêëîïôùûüÿœæÀÂÇÉÈÊËÎÏÔÙÛÜŸŒÆ"):
        return "fr"
    return None


def _tokenize(text: str) -> list[str]:
    return _WORD_RE.findall(text)


def _add_words_from_string(bucket: set[str], s: str | None) -> None:
    if not s:
        return
    for part in _WORD_RE.findall(s):
        pl = part.lower()
        if len(pl) > 1:
            bucket.add(pl)


def _extract_lore_lexicon(lore: dict[str, Any]) -> set[str]:
    """Tokens en minúsculas: nombres, lugares y vocabulario explícito del lore."""
    words: set[str] = set(_BASE_LORE_TOKENS)

    wl = lore.get("world_lore")
    if isinstance(wl, dict):
        for c in wl.get("characters") or []:
            if isinstance(c, dict):
                _add_words_from_string(words, c.get("name"))
                _add_words_from_string(words, c.get("traits"))
                _add_words_from_string(words, c.get("visual"))
        for loc in iter_world_lore_locations(wl):
            _add_words_from_string(words, loc.get("name"))
            _add_words_from_string(words, loc.get("style"))

    wc = lore.get("world_config")
    if isinstance(wc, dict):
        for c in wc.get("characters") or []:
            if isinstance(c, dict):
                _add_words_from_string(words, c.get("name"))
                _add_words_from_string(words, c.get("id"))
                _add_words_from_string(words, c.get("description"))
                _add_words_from_string(words, c.get("visual_traits"))
        for loc in wc.get("locations") or []:
            if isinstance(loc, dict):
                _add_words_from_string(words, loc.get("name"))
                _add_words_from_string(words, loc.get("aesthetic"))

    for key in ("worlds", "factions", "characters"):
        block = lore.get(key)
        if isinstance(block, list):
            for item in block:
                if isinstance(item, dict):
                    _add_words_from_string(words, item.get("name"))
                    _add_words_from_string(words, item.get("id"))
                    _add_words_from_string(words, str(item.get("goal", "")))
        elif isinstance(block, dict):
            for v in block.values():
                if isinstance(v, dict):
                    _add_words_from_string(words, v.get("name"))

    if lore.get("creation_myth"):
        _add_words_from_string(words, str(lore["creation_myth"])[:4000])

    return words


def _match_case(correction: str, original: str) -> str:
    if not original:
        return correction
    if original.isupper():
        return correction.upper()
    if original[0].isupper():
        return correction[:1].upper() + correction[1:] if correction else correction
    return correction


def _pick_suggestion_lore_aware(
    word_lower: str,
    suggestions: list[str],
    lore_lower: set[str],
) -> str | None:
    """
    Elige la sugerencia más cercana; si varias son plausibles, prioriza la que
    aparece en el léxico del universo (nombres propios, topónimos).
    """
    if not suggestions:
        return None
    s_lower = [s.lower() for s in suggestions]
    for i, sl in enumerate(s_lower):
        if sl in lore_lower:
            return suggestions[i]
    return suggestions[0]


@dataclass
class CorrectionResult:
    text: str
    detected_language: Lang
    replacements: int
    """Palabras sustituidas (orig → sugerencia de pyspellchecker, priorizando lore)."""


class CorrectionService:
    """
    Servicio de corrección multilingüe (es / en / fr) con refuerzo léxico ConvergeVerse.
    """

    def __init__(self) -> None:
        self._lore_words: frozenset[str] | None = None
        self._spell_by_lang: dict[Lang, Any] = {}

    def _ensure_lore(self) -> frozenset[str]:
        if self._lore_words is None:
            try:
                lore = load_lore()
                self._lore_words = frozenset(_extract_lore_lexicon(lore))
            except Exception as e:
                logger.warning("Lore load for speller: %s", e)
                self._lore_words = frozenset(_BASE_LORE_TOKENS)
        return self._lore_words

    def _get_spell(self, lang: Lang):
        try:
            from spellchecker import SpellChecker
        except ImportError:
            logger.warning("pyspellchecker not installed")
            return None

        if lang not in self._spell_by_lang:
            try:
                sp = SpellChecker(language=lang)
            except Exception as e:
                logger.warning("SpellChecker(%s): %s — using en", lang, e)
                sp = SpellChecker(language="en")
            lore = self._ensure_lore()
            try:
                sp.word_frequency.load_words(list(w for w in lore if len(w) > 1))
            except Exception as e:
                logger.debug("load_words lore: %s", e)
            self._spell_by_lang[lang] = sp
        return self._spell_by_lang[lang]

    def detect_language(self, text: str) -> Lang:
        """Detecta idioma dominante en {es, en, fr}: pistas Unicode + voto por aciertos."""
        stripped = text.strip()
        if not stripped:
            return "en"

        hinted = _char_hint_lang(stripped)
        if hinted:
            return hinted

        tokens = [t.lower() for t in _tokenize(stripped) if len(t) > 1][:240]
        if len(tokens) < 5:
            return "en"

        best: Lang = "en"
        best_ratio = -1.0
        for lang in ("es", "en", "fr"):
            sp = self._get_spell(lang)
            if sp is None:
                continue
            ok = sum(1 for t in tokens if t in sp)
            ratio = ok / len(tokens)
            if ratio > best_ratio:
                best_ratio = ratio
                best = lang
        return best

    def correct(self, text: str, lang_hint: str | None = None) -> CorrectionResult:
        """
        Devuelve el texto corregido. Si ``lang_hint`` es es|en|fr se respeta salvo vacío;
        si no, se detecta automáticamente.
        """
        if not text.strip():
            return CorrectionResult(text=text, detected_language=cast_lang(lang_hint), replacements=0)

        if lang_hint in ("es", "en", "fr"):
            detected: Lang = cast_lang(lang_hint)
        else:
            detected = self.detect_language(text)

        sp = self._get_spell(detected)
        lore_lower = set(self._ensure_lore())
        if sp is None:
            return CorrectionResult(text=text, detected_language=detected, replacements=0)

        replacements = 0

        def replace_one(m: re.Match[str]) -> str:
            nonlocal replacements
            w = m.group(0)
            lw = w.lower().strip("'")
            if len(lw) < 2:
                return w
            if lw in lore_lower:
                return w
            if lw in sp:
                return w
            raw_cand = None
            try:
                raw_cand = sp.candidates(lw)
            except (TypeError, AttributeError, ValueError):
                raw_cand = None
            # pyspellchecker puede devolver None o un iterable vacío según versión / palabra
            suggests = list(raw_cand) if raw_cand is not None else []
            if not suggests:
                c = sp.correction(lw)
                suggests = [c] if c else []

            cand = _pick_suggestion_lore_aware(lw, suggests, lore_lower)
            if not cand:
                cand = sp.correction(lw)
            if cand and cand.lower() != lw:
                replacements += 1
                return _match_case(cand, w)
            return w

        corrected = _WORD_RE.sub(replace_one, text)
        return CorrectionResult(
            text=corrected,
            detected_language=detected,
            replacements=replacements,
        )


# Instancia lazy para el resto de la app
_default_service: CorrectionService | None = None


def get_correction_service() -> CorrectionService:
    global _default_service
    if _default_service is None:
        _default_service = CorrectionService()
    return _default_service
