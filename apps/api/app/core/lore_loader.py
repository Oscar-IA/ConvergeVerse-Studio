import json
from pathlib import Path
from typing import Any


def load_lore(base_path: Path | None = None) -> dict[str, Any]:
    """Load the Universe Bible (worlds, factions, characters, orbets) from lore/."""
    if base_path is None:
        # apps/api/app/core/ -> 5 levels up to project root
        base_path = Path(__file__).resolve().parent.parent.parent.parent.parent / "lore"

    lore: dict[str, Any] = {
        "worlds": [],
        "factions": [],
        "characters": [],
        "orbets": [],
        "creation_myth": "",
    }

    files = ["worlds.json", "factions.json", "characters.json", "orbets.json"]
    for f in files:
        p = base_path / f
        if p.exists():
            try:
                with open(p) as fp:
                    data = json.load(fp)
                key = f.replace(".json", "")
                lore[key] = data.get(key, data) if isinstance(data, dict) else data
                if key == "orbets" and isinstance(data, dict) and "creation_myth" in data:
                    lore["creation_myth"] = data["creation_myth"]
            except (json.JSONDecodeError, IOError):
                pass

    wc = base_path / "world_config.json"
    if wc.exists():
        try:
            with open(wc) as fp:
                lore["world_config"] = json.load(fp)
        except (json.JSONDecodeError, IOError):
            lore["world_config"] = {"characters": [], "locations": []}
    else:
        lore["world_config"] = {"characters": [], "locations": []}

    # Cerebro de Lore (API data/) — reglas de comedia, tema visual, personajes clave
    data_dir = Path(__file__).resolve().parent.parent.parent / "data" / "world_lore.json"
    if data_dir.exists():
        try:
            with open(data_dir) as fp:
                lore["world_lore"] = json.load(fp)
        except (json.JSONDecodeError, IOError):
            lore["world_lore"] = {}
    else:
        lore["world_lore"] = {}

    # Roles de casting / personajes Studio (apps/api/data/characters.json)
    cast_path = Path(__file__).resolve().parent.parent.parent / "data" / "characters.json"
    if cast_path.exists():
        try:
            with open(cast_path, encoding="utf-8") as fp:
                lore["studio_characters"] = json.load(fp)
        except (json.JSONDecodeError, IOError):
            lore["studio_characters"] = {}
    else:
        lore["studio_characters"] = {}

    return lore
