"""
Tests for style_engine.py — no external dependencies required.
Run: python -m pytest apps/api/tests/test_style_engine.py -v
  or: python3 tests/test_style_engine.py  (from apps/api/)
"""
from __future__ import annotations
import sys, os

# Allow running directly without pytest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.story_engine.style_engine import (
    list_styles,
    get_style,
    build_styled_prompt,
    STYLES,
    DEFAULT_STYLE,
)


def test_list_styles_not_empty():
    styles = list_styles()
    assert len(styles) >= 5, "Expected at least 5 anime styles"


def test_list_styles_schema():
    for s in list_styles():
        assert "id" in s
        assert "name" in s
        assert "description" in s
        assert "genre_tags" in s
        assert isinstance(s["genre_tags"], list)
        assert "sample_keywords" in s
        assert "aspect_ratio" in s


def test_get_style_known():
    style = get_style("solo_leveling")
    assert style.id == "solo_leveling"
    assert style.name
    assert style.model.startswith("black-forest-labs") or style.model


def test_get_style_fallback():
    style = get_style("nonexistent_style_xyz")
    assert style.id == DEFAULT_STYLE


def test_build_styled_prompt_returns_string():
    prompt, params = build_styled_prompt(
        scene_description="A warrior stands on a mountain peak at dawn",
        style_id="solo_leveling",
    )
    assert isinstance(prompt, str)
    assert len(prompt) > 50
    assert "model" in params
    assert "params" in params
    assert "prompt" in params["params"]


def test_build_styled_prompt_character_context():
    prompt, _ = build_styled_prompt(
        scene_description="Running through the forest",
        style_id="demon_slayer",
        character_context="tall teenage boy, red and black hair",
    )
    assert "CHARACTER CONSISTENCY" in prompt or "tall teenage boy" in prompt


def test_build_styled_prompt_composition():
    prompt, _ = build_styled_prompt(
        scene_description="Close-up of eyes glowing blue",
        style_id="solo_leveling",
        panel_composition="close-up",
    )
    assert "close" in prompt.lower() or "COMPOSITION" in prompt


def test_prompt_length_cap():
    very_long_desc = "A" * 3000
    prompt, _ = build_styled_prompt(very_long_desc, "naruto")
    assert len(prompt) <= 1550  # 1500 + some tolerance for the ellipsis


def test_all_styles_build_prompt():
    """Smoke test: every style can generate a prompt without errors."""
    for style_id in STYLES:
        prompt, params = build_styled_prompt("test scene", style_id=style_id)
        assert len(prompt) > 0
        assert params["model"]


# ── Standalone runner ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    tests = [v for k, v in list(globals().items()) if k.startswith("test_")]
    passed = failed = 0
    for t in tests:
        try:
            t()
            print(f"  ✓  {t.__name__}")
            passed += 1
        except Exception as e:
            print(f"  ✗  {t.__name__}: {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(failed)
