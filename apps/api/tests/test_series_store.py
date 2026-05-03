"""
Tests for the series platform store logic — pure functions, no HTTP server needed.
Copies the helper logic from routes.py to test it in isolation.
Run: python3 tests/test_series_store.py  (from apps/api/)
"""
from __future__ import annotations
import json, os, sys, tempfile, time, uuid
from pathlib import Path

# ── Inline the store helpers (mirror of routes.py series section) ─────────────

_tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
_tmp.close()
_SERIES_STORE = Path(_tmp.name)


def _load_series_store() -> list[dict]:
    if _SERIES_STORE.exists():
        try:
            return json.loads(_SERIES_STORE.read_text()) or []
        except Exception:
            return []
    return []


def _save_series_store(data: list[dict]) -> None:
    _SERIES_STORE.write_text(json.dumps(data, ensure_ascii=False, indent=2))


def _reset():
    _SERIES_STORE.write_text("[]")


def _make_series(**kwargs) -> dict:
    defaults = dict(
        id=str(uuid.uuid4()),
        title="Test Series",
        description="",
        genre="action",
        style_id="solo_leveling",
        cover_url=None,
        tags=[],
        status="active",
        chapter_count=0,
        created_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        updated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )
    defaults.update(kwargs)
    return defaults


# ── Tests ─────────────────────────────────────────────────────────────────────

def test_load_empty():
    _reset()
    assert _load_series_store() == []


def test_save_and_load():
    _reset()
    series = [_make_series(title="My Manga"), _make_series(title="Other")]
    _save_series_store(series)
    loaded = _load_series_store()
    assert len(loaded) == 2
    titles = {s["title"] for s in loaded}
    assert "My Manga" in titles


def test_save_preserves_unicode():
    _reset()
    s = _make_series(title="マンガ — エピック物語 🎌")
    _save_series_store([s])
    loaded = _load_series_store()
    assert loaded[0]["title"] == "マンガ — エピック物語 🎌"


def test_load_invalid_json_returns_empty():
    _SERIES_STORE.write_text("NOT VALID JSON {{{{")
    result = _load_series_store()
    assert result == []
    _reset()


def test_save_and_reload_all_fields():
    _reset()
    s = _make_series(
        title="Epic Quest",
        description="A long journey",
        genre="fantasy",
        style_id="demon_slayer",
        tags=["magic", "adventure"],
        status="hiatus",
        chapter_count=12,
    )
    _save_series_store([s])
    loaded = _load_series_store()[0]
    assert loaded["genre"] == "fantasy"
    assert loaded["style_id"] == "demon_slayer"
    assert "magic" in loaded["tags"]
    assert loaded["status"] == "hiatus"
    assert loaded["chapter_count"] == 12


def test_sort_newest_first():
    _reset()
    old = _make_series(title="Old", created_at="2025-01-01T00:00:00Z")
    new = _make_series(title="New", created_at="2026-01-01T00:00:00Z")
    _save_series_store([old, new])
    store = _load_series_store()
    store_sorted = sorted(store, key=lambda x: x.get("created_at", ""), reverse=True)
    assert store_sorted[0]["title"] == "New"


def test_filter_by_status():
    _reset()
    active = _make_series(title="Active Series", status="active")
    hiatus = _make_series(title="Hiatus Series", status="hiatus")
    _save_series_store([active, hiatus])
    all_series = _load_series_store()
    actives = [s for s in all_series if s.get("status") == "active"]
    assert len(actives) == 1
    assert actives[0]["title"] == "Active Series"


def test_filter_by_genre():
    _reset()
    fantasy = _make_series(title="Fantasy", genre="fantasy")
    action = _make_series(title="Action", genre="action")
    _save_series_store([fantasy, action])
    store = _load_series_store()
    result = [s for s in store if s.get("genre") == "fantasy"]
    assert len(result) == 1
    assert result[0]["title"] == "Fantasy"


def test_patch_series():
    _reset()
    s = _make_series(title="Original", status="active")
    _save_series_store([s])
    store = _load_series_store()
    store[0].update({"title": "Updated", "status": "hiatus"})
    _save_series_store(store)
    reloaded = _load_series_store()[0]
    assert reloaded["title"] == "Updated"
    assert reloaded["status"] == "hiatus"


def test_delete_series():
    _reset()
    s1 = _make_series(title="Keep")
    s2 = _make_series(title="Delete Me")
    _save_series_store([s1, s2])
    store = _load_series_store()
    new_store = [s for s in store if s["id"] != s2["id"]]
    _save_series_store(new_store)
    reloaded = _load_series_store()
    assert len(reloaded) == 1
    assert reloaded[0]["title"] == "Keep"


# ── Cleanup + Runner ──────────────────────────────────────────────────────────

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
    try:
        os.unlink(_tmp.name)
    except Exception:
        pass
    print(f"\n{passed} passed, {failed} failed")
    sys.exit(failed)
