"""
Pipeline de producción (Modo Director): Novela → Diseño (world_lore lock) → Anime → guardado S#/E#_slug/.
"""

from __future__ import annotations

import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from app.agents import ImageAgent
from app.agents.base import AgentContext
from app.core.llm_completion import llm_complete_text
from app.core.lore_loader import load_lore
from app.core.spellcheck_text import guess_spell_lang, spellcheck_narrative
from app.core.architect_quill import (
    format_architect_anime_hint,
    format_architect_cast_block,
    format_architect_manga_directive,
)
from app.core.chronicle_archive import save_chronicle_chapter
from app.core.world_visual import format_world_lore_design_lock, format_world_visual_bible

logger = logging.getLogger(__name__)

MAX_IMAGE_PANELS = 2
TARGET_NOVEL_WORDS = 500
MAX_VISUAL_BIBLE_CHARS = 1800


def _strip_json_fence(raw: str) -> str:
    content = raw.strip()
    if content.startswith("```"):
        parts = content.split("```")
        if len(parts) >= 2:
            content = parts[1]
            if content.lstrip().startswith("json"):
                content = content.lstrip()[4:].lstrip()
    return content.strip()


def _lore_snippet(lore: dict) -> str:
    """Resumen corto para etapas que no necesitan el candado completo."""
    parts: list[str] = []
    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else {}
    if wl.get("rules"):
        parts.append(str(wl["rules"]))
    for c in (wl.get("characters") or [])[:4]:
        if isinstance(c, dict):
            parts.append(f"{c.get('name')}: {c.get('traits', '')}")
    return "\n".join(parts)[:2000] if parts else "Bond Converge, NPC POV, Konosuba comedy + epic stakes."


def _format_world_lore_novel_lock(lore: dict) -> str:
    """
    Texto derivado de ``world_lore.json`` (Plano Maestro) para la fase novela:
    familia real, ubicaciones, reglas de tono y fichas de personaje.
    """
    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else {}
    if not wl:
        return ""

    lines: list[str] = [
        "=== WORLD_LORE.JSON — PLANO MAESTRO (consulta obligatoria para voces, acciones y escenarios) ===",
        f"Reino: {wl.get('kingdom', '')}",
        f"Arquitecto (metanarrativa): {wl.get('architect', '')}",
        f"Protagonista (trama): {wl.get('protagonist', '')}",
        "",
        "FAMILIA REAL Y CONSEJO — diálogos y gestos deben coincidir con el ROL (no genericar):",
    ]
    rf = wl.get("royal_family")
    if isinstance(rf, dict):
        for branch_key, branch in rf.items():
            if isinstance(branch, dict):
                lines.append(f"  [{branch_key}]")
                for name, desc in branch.items():
                    lines.append(f"    · {name}: {desc}")
    else:
        lines.append("  (sin bloque royal_family en JSON)")

    lines.append("")
    lines.append("UBICACIONES (mantener descripción alineada al lore si el beat las nombra):")
    locs = wl.get("locations")
    if isinstance(locs, dict):
        for place, blurb in locs.items():
            lines.append(f"  · {place}: {blurb}")
    elif isinstance(locs, list):
        for item in locs[:24]:
            if isinstance(item, dict):
                lines.append(f"  · {item.get('name', '?')}: {item.get('style', '')}")

    rules = wl.get("rules")
    if isinstance(rules, dict):
        lines.append("")
        lines.append("REGLAS DE TONO / VISUAL (archivo):")
        for k, v in rules.items():
            lines.append(f"  · {k}: {v}")

    lines.append("")
    lines.append("FICHAS PERSONAJE (secundarios + Aren) — coherencia con diálogo y reacciones:")
    for c in wl.get("characters") or []:
        if isinstance(c, dict) and (c.get("name") or "").strip():
            lines.append(
                f"  · {c.get('name')}: {c.get('traits', '')} | Visual: {c.get('visual', '')}"
            )

    blob = "\n".join(lines)
    return blob[:14000] if len(blob) > 14000 else blob


def _narrative_language_line(narrative_language: str | None) -> str:
    if narrative_language in ("es", "en", "fr"):
        names = {"es": "Spanish", "en": "English", "fr": "French"}
        return (
            f"OUTPUT LANGUAGE: Write the ENTIRE novel in {names[narrative_language]} ({narrative_language}). "
            "Use literary, grammatically impeccable prose; the pipeline will still run spellcheck."
        )
    return (
        "OUTPUT LANGUAGE: Match the language of the beats (same as the user's beat text). "
        "If beats mix languages, prefer the dominant language of the first non-empty beat."
    )


def _novel_tone_instructions() -> str:
    return """
TONE SPLIT (no mezclar estilos entre personajes de forma indiferenciada):
· Familia real y consejo (Luis, Fanny, Paula, Yaritza, Sara, Matheo): voz ÉPICA de corte fantasy —
  frases medidas, metáforas nobles, peso del deber y la historia. Sus diálogos deben reflejar su FUNCIÓN:
  Luis = estratega / ex-militar (orden, economía verbal, juicio táctico); Fanny = cohesión y diplomacia;
  Paula = sanadora / médica avanzada (precisión, compasión contenida, vocabulario de cuidado o magia de luz);
  Yaritza = eco-ingeniera (biomas, regeneración, tecnología limpia); Sara y Matheo = domadores (cielo / vacío, vínculo con bestias).
· Aren Valis (protagonista): comedia estilo KONOSUBA — torpeza, pánico interior, física cómica, contraste fuerte con la solemnidad real.
  Los nobles pueden reaccionar con fastidio épico o ceño frío mientras Aren desastrea.

GRAMMAR & STYLE: Orthography and grammar must be strict in the chosen language. Avoid typos; prefer consistent register.
""".strip()


def _fallback_novel(beats: list[str]) -> str:
    b = " ".join(beats).strip() or "Un momento decisivo en el Archivo."
    return (
        f"[NOVELA — fallback sin LLM]\n\n{b}\n\n"
        "Aren Valis aprieta los labios: el protocolo decía una cosa y el universo otra. "
        "A su lado, un guardia del Abismo funce el ceño con la expresión de quien ya redactó el parte de defunción colectiva. "
        "Las ruinas flotantes zumban; la luz cian del Orbet tiñe el polvo como burla cósmica. "
        "Nadie confía en el erudito estrella, y con razón: acaba de demostrar que puede tropezar incluso con el aire. "
        "Aun así, el fragmento encaja —o eso esperan— y el silencio que sigue huele a ironía dramática y a factura del taller de VFX.\n"
    )


def _correct_beats_multilingual(
    beats: list[str],
    *,
    lang_hint: str | None = None,
) -> tuple[list[str], list[dict], int]:
    """Fase previa: cada beat pasa por el corrector (idioma forzado es/en/fr si el usuario lo indica)."""
    out: list[str] = []
    per: list[dict] = []
    total_r = 0
    forced = lang_hint if lang_hint in ("es", "en", "fr") else None
    for b in beats:
        raw = (b or "").strip()
        if not raw:
            out.append(b or "")
            per.append({"language": None, "replacements": 0, "skipped": True})
            continue
        lang_guess = forced or guess_spell_lang(raw)
        fixed, repls, used_lang = spellcheck_narrative(raw, lang=lang_guess)
        out.append(fixed)
        total_r += int(repls)
        per.append({"language": used_lang, "replacements": int(repls)})
    if not any((x or "").strip() for x in out):
        return beats, [], 0
    return out, per, total_r


def _episode_folder_slug(title: str | None, episode: int) -> str:
    t = (title or "").strip() or f"Capitulo_{episode}"
    base = re.sub(r"[^\w\s-]", "", t, flags=re.UNICODE)
    base = re.sub(r"[-\s]+", "_", base.strip()).strip("_") or f"capitulo_{episode}"
    slug = f"E{episode}_{base}"
    return slug[:120]


def _storage_root() -> Path:
    raw = os.getenv("CONVERGE_STORAGE_ROOT", "").strip()
    if raw:
        return Path(raw).expanduser().resolve()
    return Path(__file__).resolve().parent.parent.parent / "storage"


def _save_production_bundle(
    season: int,
    episode: int,
    chapter_title: str | None,
    novel: str,
    script: str,
    panels: list,
    moments_three: list,
    anime_motion: list,
    animation_metadata: dict,
    beats_corrected: list[str],
    full_payload: dict,
) -> tuple[str | None, str | None]:
    """Guarda en storage/S{season}/E{ep}_Slug/"""
    try:
        root = _storage_root()
        slug = _episode_folder_slug(chapter_title, episode)
        folder = root / f"S{season}" / slug
        folder.mkdir(parents=True, exist_ok=True)

        (folder / "novel.txt").write_text(novel, encoding="utf-8")
        (folder / "script.txt").write_text(script or "", encoding="utf-8")
        (folder / "beats_corrected.txt").write_text("\n".join(f"- {b}" for b in beats_corrected), encoding="utf-8")

        with open(folder / "key_moments.json", "w", encoding="utf-8") as f:
            json.dump(moments_three, f, ensure_ascii=False, indent=2)
        with open(folder / "panels.json", "w", encoding="utf-8") as f:
            json.dump(panels, f, ensure_ascii=False, indent=2)
        with open(folder / "anime_motion.json", "w", encoding="utf-8") as f:
            json.dump(anime_motion, f, ensure_ascii=False, indent=2)
        with open(folder / "animation_metadata.json", "w", encoding="utf-8") as f:
            json.dump(animation_metadata, f, ensure_ascii=False, indent=2)

        run_path = folder / "full_run.json"
        out = {**full_payload, "saved_at": datetime.now(timezone.utc).isoformat()}
        with open(run_path, "w", encoding="utf-8") as fp:
            json.dump(out, fp, ensure_ascii=False, indent=2)
        return str(folder), str(run_path)
    except Exception as e:
        logger.exception("Persist production bundle: %s", e)
        return None, None


async def _stage_novel(
    beats: list[str],
    lore: dict,
    *,
    narrative_language: str | None = None,
    world_lore_block: str | None = None,
) -> tuple[str, int]:
    beats_text = "\n".join(f"- {b}" for b in beats)
    wl_block = world_lore_block if world_lore_block is not None else _format_world_lore_novel_lock(lore)
    lore_s = _lore_snippet(lore)
    arch = format_architect_cast_block(lore)
    arch_section = f"\n{arch}\n" if arch else ""
    wl_section = f"\n{wl_block}\n" if wl_block else f"\nLORE (resumen): {lore_s}\n"
    lang_line = _narrative_language_line(narrative_language)
    tone_block = _novel_tone_instructions()
    system = f"""You are the lead novelist for Bond Converge / ConvergeVerse (Aethel-Arévalo chronicles).

{lang_line}

{tone_block}

WORLD_LORE.JSON is the master plan for secondary characters (royal family, council, legacy). When any of them appear or speak,
their dialogue and actions MUST match their roles (e.g. Paula as healer/doctor and light-magic medic; Luis as strategist-king;
Yaritza as eco-engineer of biomes; etc.). Use locations from world_lore consistently when named in the beat.

THE ARCHITECT'S QUILL (studio cast) complements world_lore — honor both when they overlap.

CONTEXT:
{wl_section}
{arch_section}

Output JSON only: {{ "novel": "<prose ~{TARGET_NOVEL_WORDS} words>" }}
No markdown."""
    user = (
        "Expand these beats into one cohesive narrative scene. "
        "If the beat names a royal-family member or location from world_lore, keep voices and setting faithful to the Plano Maestro. "
        "Contrast epic royal register with Aren Valis's Konosuba-style comedy.\n\n"
        f"{beats_text}"
    )
    t0 = time.perf_counter()
    ok, text, err = await llm_complete_text(system, user, temperature=0.82, max_tokens=4096)
    ms = int((time.perf_counter() - t0) * 1000)
    if not ok or not text:
        logger.warning("Novel LLM failed: %s — fallback", err)
        return _fallback_novel(beats), ms
    try:
        data = json.loads(_strip_json_fence(text))
        novel = (data.get("novel") or "").strip()
        if len(novel.split()) < 80:
            return _fallback_novel(beats), ms
        return novel, ms
    except json.JSONDecodeError:
        return _fallback_novel(beats), ms


async def _stage_manga_moments(novel: str, lore: dict) -> tuple[str, list[dict], int]:
    lore_s = _lore_snippet(lore)
    arch = format_architect_cast_block(lore)
    manga_arch = f"\n{arch}\n{format_architect_manga_directive()}\n" if arch else ""
    system = f"""You are the manga storyboard director for Bond Converge.
{lore_s}
{manga_arch}
From the NOVEL, extract exactly 3 key visual moments (for pacing), then we will use the first 2 for images.
Output JSON only:
{{
  "script": "<short manga script: narration + dialogue ~150-400 words, same language as novel>",
  "moments": [
    {{
      "scene_index": 0,
      "description": "<visual>",
      "dialogue": "<optional>",
      "image_prompt": "<English, composition for image gen; no Solo Leveling suffix>"
    }}
  ]
}}
Exactly 3 objects in "moments", scene_index 0,1,2. No markdown."""
    user = f"NOVEL:\n{novel[:14000]}\n\nOutput JSON only."
    t0 = time.perf_counter()
    ok, text, err = await llm_complete_text(system, user, temperature=0.86, max_tokens=4096)
    ms = int((time.perf_counter() - t0) * 1000)
    if not ok or not text:
        logger.warning("Manga moments LLM failed: %s", err)
        return "", _synthesize_two_panels_from_novel(novel), ms
    try:
        data = json.loads(_strip_json_fence(text))
        script = data.get("script", "")
        moments = data.get("moments") or data.get("panels") or []
        if not isinstance(moments, list) or len(moments) < 2:
            return script or novel[:800], _synthesize_two_panels_from_novel(novel), ms
        out = []
        for i, m in enumerate(moments[:3]):
            if not isinstance(m, dict):
                continue
            out.append(
                {
                    "scene_index": int(m.get("scene_index", i)),
                    "description": m.get("description", ""),
                    "dialogue": m.get("dialogue"),
                    "image_prompt": m.get("image_prompt", m.get("description", "")),
                }
            )
        if len(out) < 2:
            return script or novel[:800], _synthesize_two_panels_from_novel(novel), ms
        return script, out, ms
    except json.JSONDecodeError:
        return "", _synthesize_two_panels_from_novel(novel), ms


def _synthesize_two_panels_from_novel(novel: str) -> list[dict]:
    text = novel.strip()[:900]
    return [
        {
            "scene_index": 0,
            "description": text[:400],
            "dialogue": None,
            "image_prompt": f"Cinematic manga panel, Konosuba NPC chaos, blue aura, {text[:220]}",
        },
        {
            "scene_index": 1,
            "description": "Comedic reaction shot, exaggerated faces, dark fantasy lighting",
            "dialogue": None,
            "image_prompt": "Anime reaction faces, electric blue sparks, archive scholars shouting, high contrast",
        },
    ]


def _synthesize_panels_from_beats(beats: list[str]) -> list[dict]:
    """Fallback cuando no hay paneles (World Engine); coherente con beats como mini-novela."""
    joined = " ".join((b or "").strip() for b in beats if (b or "").strip())[:900]
    if not joined:
        joined = "Un momento decisivo en el Archivo."
    return _synthesize_two_panels_from_novel(joined)


def _default_anime_motion(i: int) -> dict:
    return {
        "Camera_Movement": "slow_zoom_in + light handheld_shake on beat",
        "VFX_Blue_Sparks": "cyan Orbet discharge, blue rim light particles, subtle black static vignette",
        "SFX_Konosuba_Funny_Sound": "comedic_impact_sting + electric_zap + exaggerated_whoosh",
    }


async def _stage_anime_motion(novel: str, panels_two: list[dict]) -> tuple[list[dict], int]:
    summary = json.dumps(
        [
            {
                "i": p.get("scene_index"),
                "desc": (p.get("description") or "")[:180],
            }
            for p in panels_two
        ],
        ensure_ascii=False,
    )
    system = """You are the anime motion director (Bond Converge).
Output JSON only:
{ "anime_motion": [
    { "Camera_Movement": "<pan/zoom/shake + timing>",
      "VFX_Blue_Sparks": "<blue/cyan electrical particle description>",
      "SFX_Konosuba_Funny_Sound": "<comedic SFX cues for SoundAgent>" },
    { ... }
  ]
}
Exactly 2 objects matching panel order. Keys must match exactly (PascalCase with underscores as shown). No markdown."""
    user = f"Novel excerpt:\n{novel[:2200]}\n\nPanels:\n{summary}\n\nOutput JSON only."
    t0 = time.perf_counter()
    ok, text, err = await llm_complete_text(system, user, temperature=0.78, max_tokens=2048)
    ms = int((time.perf_counter() - t0) * 1000)
    if not ok or not text:
        logger.warning("Anime motion LLM failed: %s", err)
        return [_default_anime_motion(0), _default_anime_motion(1)], ms
    try:
        data = json.loads(_strip_json_fence(text))
        am = data.get("anime_motion") or []
        if not isinstance(am, list) or len(am) < 2:
            return [_default_anime_motion(0), _default_anime_motion(1)], ms
        fixed: list[dict] = []
        for i, row in enumerate(am[:2]):
            if not isinstance(row, dict):
                fixed.append(_default_anime_motion(i))
                continue
            fixed.append(
                {
                    "Camera_Movement": row.get("Camera_Movement")
                    or row.get("camera_movement")
                    or _default_anime_motion(i)["Camera_Movement"],
                    "VFX_Blue_Sparks": row.get("VFX_Blue_Sparks")
                    or row.get("vfx_blue_sparks")
                    or _default_anime_motion(i)["VFX_Blue_Sparks"],
                    "SFX_Konosuba_Funny_Sound": row.get("SFX_Konosuba_Funny_Sound")
                    or row.get("sfx_konosuba_funny_sound")
                    or _default_anime_motion(i)["SFX_Konosuba_Funny_Sound"],
                }
            )
        return fixed, ms
    except json.JSONDecodeError:
        return [_default_anime_motion(0), _default_anime_motion(1)], ms


def _default_animation_metadata_scenes(panels_two: list[dict], anime_motion: list[dict]) -> list[dict]:
    scenes: list[dict] = []
    for i, p in enumerate(panels_two[:2]):
        desc = (p.get("description") or "")[:200]
        am = anime_motion[i] if i < len(anime_motion) else _default_anime_motion(i)
        scenes.append(
            {
                "panel_index": i,
                "director_instruction": (
                    f"Plano dinámico sobre: {desc}. Expresión exagerada estilo comedia isekai (Konosuba), "
                    "contraste con fondo oscuro del Archivo."
                ),
                "particles_blue_light": am.get("VFX_Blue_Sparks", "Partículas de luz azul cian, chispas Orbet"),
                "timing_beat": f"Beat panel {i + 1}: {am.get('Camera_Movement', 'zoom suave')}",
            }
        )
    return scenes


async def _stage_animation_metadata(
    novel: str,
    panels_two: list[dict],
    anime_motion: list[dict],
    lore: dict,
) -> tuple[dict, int]:
    """Fase Anime: metadatos de director (lenguaje natural) + técnico."""
    lore_s = _lore_snippet(lore)
    panel_blob = json.dumps(
        [{"i": p.get("scene_index"), "desc": (p.get("description") or "")[:240]} for p in panels_two],
        ensure_ascii=False,
    )
    motion_blob = json.dumps(anime_motion, ensure_ascii=False)
    system = f"""You are the anime director for Bond Converge (Modo Director).
{lore_s[:600]}

Output JSON only:
{{
  "scenes": [
    {{
      "panel_index": 0,
      "director_instruction": "<natural language, Spanish OK: e.g. Zoom a la cara de Aren con expresión de pánico tipo Konosuba>",
      "particles_blue_light": "<e.g. Partículas de luz azul cian del Orbet, reflejo en iris>",
      "timing_beat": "<optional>"
    }},
    {{
      "panel_index": 1,
      "director_instruction": "<...>",
      "particles_blue_light": "<...>",
      "timing_beat": "<optional>"
    }}
  ],
  "overall_notes": "<tone for motion/VFX team>"
}}
Exactly 2 scenes in order of panels. Be specific and cinematic."""
    arch_vfx = format_architect_anime_hint(lore)
    arch_user = f"\n\nARCHITECT VFX HINT:\n{arch_vfx}\n" if arch_vfx else ""
    user = (
        f"NOVEL (excerpt):\n{novel[:2800]}\n\nPANELS:\n{panel_blob}\n\n"
        f"TECHNICAL anime_motion:\n{motion_blob}{arch_user}\n\nOutput JSON only."
    )
    t0 = time.perf_counter()
    ok, text, err = await llm_complete_text(system, user, temperature=0.8, max_tokens=2048)
    ms = int((time.perf_counter() - t0) * 1000)
    base = {
        "format_version": 2,
        "director_mode": True,
        "world": "ConvergeVerse",
        "anime_motion_technical": anime_motion,
    }
    if not ok or not text:
        logger.warning("Animation metadata LLM failed: %s", err)
        return {
            **base,
            "scenes": _default_animation_metadata_scenes(panels_two, anime_motion),
            "overall_notes": "Fallback: usar paneles + anime_motion técnico.",
        }, ms
    try:
        data = json.loads(_strip_json_fence(text))
        scenes = data.get("scenes") or []
        if not isinstance(scenes, list) or len(scenes) < 2:
            scenes = _default_animation_metadata_scenes(panels_two, anime_motion)
        else:
            norm: list[dict] = []
            for i, s in enumerate(scenes[:2]):
                if not isinstance(s, dict):
                    norm.append(_default_animation_metadata_scenes(panels_two, anime_motion)[i])
                    continue
                norm.append(
                    {
                        "panel_index": int(s.get("panel_index", i)),
                        "director_instruction": (s.get("director_instruction") or "")[:800]
                        or _default_animation_metadata_scenes(panels_two, anime_motion)[i]["director_instruction"],
                        "particles_blue_light": (s.get("particles_blue_light") or "")[:500]
                        or _default_animation_metadata_scenes(panels_two, anime_motion)[i]["particles_blue_light"],
                        "timing_beat": (s.get("timing_beat") or "")[:300],
                    }
                )
            scenes = norm
        return {**base, "scenes": scenes, "overall_notes": (data.get("overall_notes") or "")[:600]}, ms
    except json.JSONDecodeError:
        return {
            **base,
            "scenes": _default_animation_metadata_scenes(panels_two, anime_motion),
            "overall_notes": "JSON parse fallback",
        }, ms


def _build_design_phase_visual_bible(
    wc: dict,
    wl: dict | None,
) -> str:
    """Fase Diseño: bible + candado explícito desde world_lore (pelo, ropa)."""
    vb = format_world_visual_bible(wc if isinstance(wc, dict) else {}, world_lore=wl)
    lock = format_world_lore_design_lock(wl if isinstance(wl, dict) else None)
    if lock:
        vb = f"{vb} || DESIGN_LOCK_WORLD_LORE (mismo pelo, misma ropa en cada panel): {lock}"
    if len(vb) > MAX_VISUAL_BIBLE_CHARS:
        vb = vb[: MAX_VISUAL_BIBLE_CHARS - 3] + "..."
    return vb


def _default_tome_title(lore: dict) -> str:
    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else {}
    kingdom = (wl.get("kingdom") or "").strip() if isinstance(wl, dict) else ""
    if kingdom:
        return f"Tomo 1 — Crónicas de {kingdom}"
    return "Tomo 1 — Crónicas de Aethel-Arévalo"


def _strict_spellcheck_loop(
    text: str,
    *,
    lang_hint: str | None,
    max_passes: int = 2,
) -> tuple[str, int, str]:
    """Varias pasadas de ortografía (estricto) sobre la novela ya generada."""
    novel = text
    total_repl = 0
    spell_lang = "?"
    for _ in range(max(1, max_passes)):
        hint = lang_hint if lang_hint in ("es", "en", "fr") else guess_spell_lang(novel)
        novel, repls, spell_lang = spellcheck_narrative(novel, lang=hint)
        total_repl += int(repls)
        if repls == 0:
            break
    return novel, total_repl, spell_lang


async def run_production_pipeline(
    beats: list[str],
    *,
    season_number: int = 1,
    episode_number: int = 1,
    chapter_title: str | None = None,
    narrative_language: str | None = None,
    tome_title: str | None = None,
) -> dict:
    """
    1) Novela: beats → corrector multilingüe → LLM con world_lore (roles reales + tono) → ortografía estricta (pasadas).
    2) Diseño: world_lore design lock en la biblia visual del ImageAgent.
    3) Anime: anime_motion técnico + animation_metadata (instrucciones director).
    4) Guardado: storage/S{{season}}/E{{ep}}_{{slug}}/
    """
    t0 = time.perf_counter()
    lore = load_lore()
    wc = lore.get("world_config") or {}
    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else None

    lang_for_pipeline = narrative_language if narrative_language in ("es", "en", "fr") else None
    beats_corrected, beat_spell_meta, beat_total_r = _correct_beats_multilingual(
        beats, lang_hint=lang_for_pipeline
    )

    context = AgentContext(beats=beats_corrected, lore=lore)
    context.extra["world_visual_bible"] = _build_design_phase_visual_bible(
        wc if isinstance(wc, dict) else {},
        wl,
    )

    wl_novel_block = _format_world_lore_novel_lock(lore)
    novel_raw, novel_ms = await _stage_novel(
        beats_corrected,
        lore,
        narrative_language=narrative_language,
        world_lore_block=wl_novel_block,
    )
    novel, novel_spell_repls, spell_lang = _strict_spellcheck_loop(
        novel_raw, lang_hint=lang_for_pipeline
    )

    script, moments_three, manga_ms = await _stage_manga_moments(novel, lore)
    panels_data = moments_three[:MAX_IMAGE_PANELS]
    for i, p in enumerate(panels_data):
        p["scene_index"] = i

    context.extra["panels_data"] = panels_data
    context.extra["script"] = script
    context.extra["novel"] = novel

    anime_motion, anime_ms = await _stage_anime_motion(novel, panels_data)
    animation_metadata, anim_meta_ms = await _stage_animation_metadata(novel, panels_data, anime_motion, lore)

    image_agent = ImageAgent()
    t_img = time.perf_counter()
    image_result = await image_agent.generate(context)
    images_ms = int((time.perf_counter() - t_img) * 1000)

    image_errors: list[dict] = []
    if image_result.success:
        panels = image_result.data.get("panels", [])
        image_errors = image_result.data.get("image_errors", [])
    else:
        logger.error("ImageAgent.generate failed: %s", image_result.error)
        panels = [
            {
                "scene_index": p.get("scene_index", i),
                "description": p.get("description", ""),
                "dialogue": p.get("dialogue"),
                "image_url": None,
                "image_error": image_result.error or "Image agent failed",
                "prompt_used": p.get("image_prompt"),
            }
            for i, p in enumerate(panels_data)
        ]

    image_urls = [p["image_url"] for p in panels if p.get("image_url")]
    total_ms = int((time.perf_counter() - t0) * 1000)

    has_architect_cast = bool(format_architect_cast_block(lore))
    resolved_tome = (tome_title or "").strip() or _default_tome_title(lore)
    result_body = {
        "pipeline": "production_v2",
        "architects_quill": has_architect_cast,
        "production_flow": "architects_quill" if has_architect_cast else "standard",
        "narrative_language_requested": narrative_language,
        "tome_title": resolved_tome,
        "world_lore_novel_lock_chars": len(wl_novel_block),
        "pipeline_stages": [
            "beat_multilingual_correct",
            "novel_llm",
            "novel_spellcheck_strict",
            "manga_moments",
            "design_world_lore_lock",
            "anime_motion",
            "animation_director_metadata",
            "panel_images",
        ],
        "season_number": season_number,
        "episode_number": episode_number,
        "chapter_title": chapter_title,
        "production_folder_slug": _episode_folder_slug(chapter_title, episode_number),
        "beats_corrected": beats_corrected,
        "beat_spellcheck": {
            "per_beat": beat_spell_meta,
            "total_replacements": beat_total_r,
        },
        "novel": novel,
        "novel_word_count": len(novel.split()),
        "spellcheck": {
            "language": spell_lang,
            "replacements": novel_spell_repls,
        },
        "script": script,
        "key_moments_planned": len(moments_three),
        "panels": panels,
        "anime_motion": anime_motion,
        "animation_metadata": animation_metadata,
        "beats_processed": len(beats),
        "image_urls": image_urls,
        "images_generated": len(image_urls),
        "timings_ms": {
            "novel_llm": novel_ms,
            "manga_moments_llm": manga_ms,
            "anime_motion_llm": anime_ms,
            "animation_metadata_llm": anim_meta_ms,
            "images": images_ms,
            "total": total_ms,
        },
        "image_errors": image_errors,
    }

    prod_dir, run_json = _save_production_bundle(
        season_number,
        episode_number,
        chapter_title,
        novel,
        script,
        panels,
        moments_three,
        anime_motion,
        animation_metadata,
        beats_corrected,
        result_body,
    )
    result_body["production_dir"] = prod_dir
    result_body["persisted_path"] = run_json
    result_body["animation_metadata_path"] = (
        str(Path(prod_dir) / "animation_metadata.json") if prod_dir else None
    )

    # Crónica persistente (libro HTML, tira PNG, carátula) — storage/chronicles/season_n/
    chronicle_dir, chronicle_info = await save_chronicle_chapter(
        storage_root=_storage_root(),
        season_number=season_number,
        episode_number=episode_number,
        chapter_title=chapter_title,
        novel=novel,
        script=script,
        panels=panels,
        production_dir=prod_dir,
        world_visual_bible=context.extra.get("world_visual_bible") or "",
        tome_series=resolved_tome,
    )
    result_body["chronicle_dir"] = chronicle_dir
    result_body["chronicle_info"] = chronicle_info

    logger.info(
        "production_pipeline: novel %s words, %s panels, dir=%s chronicle=%s",
        result_body["novel_word_count"],
        len(panels),
        prod_dir,
        chronicle_dir,
    )

    return result_body
