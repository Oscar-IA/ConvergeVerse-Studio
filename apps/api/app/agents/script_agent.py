import json
import os

from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.core.world_visual import iter_world_lore_locations
from app.core.llm_completion import llm_complete_text


def _build_lore_prompt(lore: dict) -> str:
    """Build a condensed lore context for the LLM."""
    parts = []

    if lore.get("creation_myth"):
        parts.append(f"CREATION MYTH: {lore['creation_myth']}")

    if lore.get("worlds"):
        worlds = lore["worlds"]
        if isinstance(worlds, list):
            world_names = [w.get("name", str(w)) for w in worlds[:6]]
        else:
            world_names = list(worlds.keys())[:6]
        parts.append(f"WORLDS: {', '.join(str(n) for n in world_names)}")

    if lore.get("factions"):
        factions = lore["factions"]
        if isinstance(factions, list):
            faction_desc = []
            for f in factions[:5]:
                name = f.get("name", f.get("id", str(f)))
                goal = f.get("goal", "")
                faction_desc.append(f"{name}: {goal}" if goal else name)
        else:
            faction_desc = list(factions.keys())[:5]
        parts.append("FACTIONS: " + "; ".join(str(d) for d in faction_desc))

    if lore.get("characters"):
        chars = lore["characters"]
        if isinstance(chars, list):
            main = next(
                (c for c in chars if c.get("role") == "protagonist" or c.get("main")),
                chars[0] if chars else None,
            )
            if main:
                parts.append(
                    f"MAIN NPC: {main.get('name')} — {main.get('role', '')} | {main.get('goal', '')}"
                )
        elif isinstance(chars, dict):
            main = chars.get("aren_valis") or chars.get("protagonist")
            if main:
                parts.append(
                    f"MAIN NPC: {main.get('name', 'Aren Valis')} — {main.get('goal', '')}"
                )

    parts.append(
        "NARRATIVE RULES: Story is told from NPC perspective. "
        "Players are 'Wanderers' — mysterious beings with Orbets. "
        "NPCs observe, fear, worship, or hunt them. Never break NPC POV."
    )
    parts.append(
        "TONE: Hybrid of EPIC DRAMA (stakes, fate of worlds, Orbets, Architect) and ABSURD COMEDY "
        "in the vein of Konosuba — melodramatic reactions, deadpan insults, panic that undercuts the grandeur. "
        "Other NPCs openly doubt the focal character's competence. "
        "The scholar (e.g. Aren Valis) can flop or protest weakly — still competent enough to advance the plot."
    )

    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else {}
    if wl:
        rules = wl.get("rules") or {}
        comedy = rules.get("comedy_style", "")
        visual = rules.get("visual_theme", "")
        if comedy or visual:
            parts.append(
                f"WORLD_LORE_DB (do not contradict): comedy_style={comedy!r}; visual_theme={visual!r}"
            )
        for c in wl.get("characters") or []:
            if isinstance(c, dict) and c.get("name"):
                parts.append(
                    f"CHAR LOCK — {c.get('name')}: traits={c.get('traits', '')!r} | visual={c.get('visual', '')!r}"
                )
        for loc in iter_world_lore_locations(wl):
            if loc.get("name"):
                parts.append(f"LOCATION — {loc.get('name')}: {loc.get('style', '')!r}")

    return "\n".join(parts)


class ScriptAgent(BaseAgent):
    """Generates script and panel descriptions from story beats using LLM."""

    name = "script_agent"

    async def run(self, context: AgentContext) -> AgentResult:
        try:
            lore_prompt = _build_lore_prompt(context.lore)
            beats_text = "\n".join(f"- {b}" for b in context.beats)

            # ── Detect language of the beat so Claude writes in the same language ──
            beat_sample = " ".join(context.beats)
            lang_instruction = (
                "Escribe el guion y los diálogos en ESPAÑOL. "
                "Los 'image_prompt' siempre en inglés para el pipeline de imágenes."
                if _is_likely_spanish(beat_sample)
                else "Write the script and dialogue in ENGLISH. Image prompts also in English."
            )

            system_prompt = f"""You are the narrative engine for Bond Converge, an anime/manga universe.

{lore_prompt}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LANGUAGE RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{lang_instruction}
Spelling and grammar must be PERFECT. Zero typos. Zero mixed languages in the same field.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NARRATIVE STRUCTURE — follow this arc exactly
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The beats you receive describe ONE scene. Your job is to expand that single scene — not invent new plots.

STRUCTURE (apply in this order):
1. SETUP      — Establish location and characters from the beat. One or two lines of narration.
2. CONFLICT   — The central tension of the beat plays out. A supporting NPC challenges or complicates things.
3. ESCALATION — The situation gets worse or more absurd. The main NPC tries something. It half-works.
4. PUNCHLINE  — A short comedic or dramatic button that closes the scene. One punchy line of dialogue or narration.

RULES:
- Stay inside the beat. Do NOT add unrelated subplots, new characters not implied by the beat, or time jumps.
- Every panel must be a direct visual continuation of the previous one (same scene, advancing action).
- Dialogue must be sharp: max 2 lines per character per panel. No monologues.
- At least one supporting NPC must doubt or mock the main character.
- NPC POV only. No Wanderer/player inner thoughts as narrator.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Return ONLY a valid JSON object. No markdown fences. No commentary outside the JSON.

{{
  "script": "<full scene script, 200–400 words, perfect spelling, same language as the beat>",
  "panels": [
    {{
      "scene_index": 0,
      "description": "<visual description of the panel in the same language as the beat>",
      "dialogue": "<ONE punchy line of dialogue, or null>",
      "image_prompt": "<English-only visual prompt for Flux image generation — describe composition, lighting, character poses; do NOT add style tags, the pipeline adds them>",
      "camera_movement": "<one of: static_tripod | slow_zoom_in | slow_zoom_out | pan_left | pan_right | pan_up | pan_down | handheld_shake | whip_pan | dolly_in | dolly_out>",
      "particle_effects": "<e.g. blue electricity arcs, cyan Orbet sparks, black static vignette>",
      "sound_cues_sfx": "<concise SFX list for SoundAgent>"
    }}
  ]
}}

Generate between 3 and 5 panels. Each panel advances the scene; no panel repeats what the previous one already showed."""

            user_prompt = f"""Story beats (expand into ONE coherent scene):
{beats_text}

Output JSON only. Perfect spelling. No markdown."""

            ok, raw_content, llm_err = await llm_complete_text(
                system_prompt, user_prompt, max_tokens=4096, temperature=0.65
            )
            if not ok:
                # Fall back to heuristic script if no AI provider is configured
                content: str = _fallback_script(context.beats, lore_prompt) if not llm_err else "{}"
                if llm_err and llm_err not in ("", None):
                    # Non-config errors (e.g. Anthropic 500) — propagate
                    if "No AI provider" not in llm_err:
                        return AgentResult(success=False, data={}, error=llm_err)
            else:
                content = raw_content or "{}"

            # ── Clean up possible markdown fences ──
            content = content.strip()
            if content.startswith("```"):
                content = content.split("```")[1]
                if content.startswith("json"):
                    content = content[4:]
            content = content.strip()

            data = json.loads(content)

            return AgentResult(
                success=True,
                data={
                    "script": data.get("script", ""),
                    "panels": data.get("panels", []),
                },
            )

        except json.JSONDecodeError as e:
            return AgentResult(success=False, data={}, error=f"JSON parse error: {e}")
        except Exception as e:
            return AgentResult(success=False, data={}, error=str(e))


# ── Helpers ──────────────────────────────────────────────────────────────────


def _is_likely_spanish(text: str) -> bool:
    if any(c in text for c in "áéíóúñü¿¡ÁÉÍÓÚÑÜ"):
        return True
    t = f" {text.lower()} "
    return any(
        f" {w} " in t
        for w in ("el", "la", "los", "las", "un", "una", "con", "que", "se", "del", "está", "frente")
    )


def _fallback_script(beats: list[str], _lore: str) -> str:
    """Fallback when no LLM API key is available."""
    beat = beats[0] if beats else "Un evento misterioso ocurre."
    if _is_likely_spanish(beat):
        script = (
            "ESCENA — POV NPC: Aren Valis\n\n"
            f"NARRADOR: {beat}\n\n"
            "AREN (sudando): Según el protocolo esto debería funcionar. En teoría.\n\n"
            "GUARDIÁN KORR: ¿TÚ eres el archivista estrella? ¡Acabas de meter cristal en un Orbet como si fuera sopa!\n\n"
            "AREN: ¡El manual decía 'insertar fragmento'! ¡No juzgues mi currículum cuando el mundo se desgarra!\n\n"
            "El Orbet pulsa. La luz azul ciega a ambos. Korr murmura que si mueren, será culpa del peor archivista de la historia.\n\n"
            "KORR (alejándose): Redactaré el informe de incidente como 'muerte por arrogancia académica'.\n\n"
            "[Bond Converge — épico + absurdo, POV NPC]"
        )
        panels = [
            {
                "scene_index": 0,
                "description": "Aren frente al Orbet inestable, mano temblando, guardia al fondo con gesto de desesperación.",
                "dialogue": "¿Enviaron a ESTE para salvar el archivo?",
                "image_prompt": "Dark fantasy archive hall, young scholar with trembling hand near glowing unstable orb, guard facepalming in background, dramatic blue lighting, anime style",
                "camera_movement": "slow_zoom_in",
                "particle_effects": "cyan Orbet sparks, thin blue electricity arcs",
                "sound_cues_sfx": "low_rumble, crystal_hum, guard_mutter",
            },
            {
                "scene_index": 1,
                "description": "El Orbet explota en luz. Aren grita. Korr ya está retrocediendo con calma.",
                "dialogue": "¡Esto sigue siendo recopilación de datos!",
                "image_prompt": "Crystalline orb exploding with blue-white light, young scholar screaming arms wide, guard calmly walking away, shockwave distortion effect, anime dramatic lighting",
                "camera_movement": "handheld_shake",
                "particle_effects": "blue energy burst, holographic glitch shards, black static vignette",
                "sound_cues_sfx": "orb_burst, comedic_sting, bass_drop",
            },
        ]
    else:
        script = (
            "SCENE — NPC POV: Aren Valis\n\n"
            f"NARRATOR: {beat}\n\n"
            "AREN (sweating): The manual was very clear. Mostly. There was a footnote.\n\n"
            "GUARD MYRA: YOU'RE our expert?! You tripped over your cloak twice getting here!\n\n"
            "AREN: The Wanderers break physics — I'm doing my best!\n\n"
            "MYRA: Your best is why we have seventeen new liability forms.\n\n"
            "The Orbet hums. Reality holds its breath — and then remembers who they sent.\n\n"
            "MYRA (backing away): I'm filing the incident report under 'scholarly arrogance'.\n\n"
            "[Bond Converge — epic stakes + Konosuba-flavored NPC banter]"
        )
        panels = [
            {
                "scene_index": 0,
                "description": "Wide shot: Aren standing before the Orbet, guard arms-crossed behind him, archive hall stretching into darkness.",
                "dialogue": "WE trusted the Archive and got… HIM?!",
                "image_prompt": "Epic fantasy archive hall, young scholar in robes facing glowing orb, female guard arms crossed looking skeptical, dramatic vertical lighting, anime style",
                "camera_movement": "static_tripod",
                "particle_effects": "distant blue lightning, dust motes in light beams",
                "sound_cues_sfx": "wind_low, orb_hum_bed",
            },
            {
                "scene_index": 1,
                "description": "Close-up: both faces in shock as the Orbet flares — sweat drops, wide eyes, mouths open.",
                "dialogue": "This is NOT in the employee handbook!!!",
                "image_prompt": "Close-up two NPCs faces in comedic shock, exaggerated sweat drops, glowing light from below, dark anime lighting, motion lines",
                "camera_movement": "whip_pan",
                "particle_effects": "cyan flare bloom, black TV static crawl",
                "sound_cues_sfx": "shout_peak, comedic_boing, electric_arc_stinger",
            },
        ]
    return json.dumps({"script": script, "panels": panels})
