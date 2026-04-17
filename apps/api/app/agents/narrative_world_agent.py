"""
3-step narrative pipeline for World Engine:
1) Novel prose from beats
2) Manga storyboard (script + panels) from that novel text
3) Anime VFX proposals from storyboard + novel
"""

import json
import logging
from typing import Any

from app.agents.base import BaseAgent, AgentContext, AgentResult
from app.agents.script_agent import ScriptAgent
from app.core.llm_completion import llm_complete_text
from app.core.world_visual import iter_world_lore_locations

logger = logging.getLogger(__name__)


def _strip_json_fence(raw: str) -> str:
    content = raw.strip()
    if content.startswith("```"):
        parts = content.split("```")
        if len(parts) >= 2:
            content = parts[1]
            if content.startswith("json"):
                content = content[4:]
    return content.strip()


def _world_config_prompt_snippet(lore: dict[str, Any]) -> str:
    wc = lore.get("world_config") or {}
    lines: list[str] = []
    for c in wc.get("characters") or []:
        if isinstance(c, dict):
            lines.append(
                f"- {c.get('name', '?')}: {c.get('description', '')} "
                f"[visual: {c.get('visual_traits', '')}] "
                f"[comedy/Konosuba: {c.get('comedy_factor', '')}]"
            )
    for loc in wc.get("locations") or []:
        if isinstance(loc, dict):
            lines.append(f"- {loc.get('name', '?')}: {loc.get('aesthetic', '')}")

    wl = lore.get("world_lore") if isinstance(lore.get("world_lore"), dict) else {}
    if wl:
        if wl.get("kingdom"):
            lines.append(f"- PLANO MAESTRO kingdom: {wl.get('kingdom')}")
        if wl.get("architect"):
            lines.append(f"- Architect: {wl.get('architect')}")
        if wl.get("protagonist"):
            lines.append(f"- Protagonist: {wl.get('protagonist')}")
        rf = wl.get("royal_family")
        if isinstance(rf, dict):
            for branch_key, branch in rf.items():
                if isinstance(branch, dict):
                    for nm, desc in branch.items():
                        lines.append(f"- royal_family.{branch_key} {nm}: {desc}")
        rules = wl.get("rules") or {}
        if rules.get("comedy_style"):
            lines.append(f"- LORE_DB comedy: {rules.get('comedy_style')}")
        if rules.get("visual_theme"):
            lines.append(f"- LORE_DB visual: {rules.get('visual_theme')}")
        for c in wl.get("characters") or []:
            if isinstance(c, dict) and c.get("name"):
                lines.append(
                    f"- {c.get('name')} (lore DB): {c.get('traits', '')} | look: {c.get('visual', '')}"
                )
        for loc in iter_world_lore_locations(wl):
            if loc.get("name"):
                lines.append(f"- {loc.get('name')} (lore DB): {loc.get('style', '')}")

    if not lines:
        return "(use Bond Converge lore from bible)"
    return "WORLD_CONFIG (lock voices & places):\n" + "\n".join(lines[:32])


class NarrativeWorldAgent(BaseAgent):
    name = "narrative_world_agent"

    async def run(self, context: AgentContext) -> AgentResult:
        """Not used — use run_three_step_pipeline."""
        return AgentResult(success=False, data={}, error="Use run_three_step_pipeline")

    async def run_three_step_pipeline(self, context: AgentContext) -> AgentResult:
        lore_prompt = _world_config_prompt_snippet(context.lore)
        beats_text = "\n".join(f"- {b}" for b in context.beats)

        # --- Step 1: Novel ---
        novel, err_novel = await self._step_novel(beats_text, lore_prompt)
        if err_novel:
            logger.warning("Novel step: %s — using fallback", err_novel)

        # --- Step 2: Manga from novel ---
        script, panels, err_manga = await self._step_manga_from_novel(
            context, beats_text, lore_prompt, novel
        )
        if err_manga:
            return AgentResult(success=False, data={"novel": novel}, error=err_manga)

        # --- Step 3: Anime VFX ---
        vfx, err_vfx = await self._step_anime_vfx(lore_prompt, novel, script, panels)
        if err_vfx:
            logger.warning("VFX step: %s — using fallback", err_vfx)

        return AgentResult(
            success=True,
            data={
                "novel": novel,
                "script": script,
                "panels": panels,
                "anime_vfx": vfx,
            },
        )

    async def _step_novel(self, beats_text: str, lore_prompt: str) -> tuple[str, str | None]:
        system = f"""You are the novelist for Bond Converge (NPC POV, epic + Konosuba absurdity).
{lore_prompt}

Output JSON only: {{ "novel": "<prose 500–1200 words, same language as beats; literary but comedic undercurrent>" }}
No markdown."""
        user = f"Story beats:\n{beats_text}\n\nExpand into a cohesive novel scene/chapter fragment."
        ok, text, err = await llm_complete_text(system, user, temperature=0.82)
        if not ok or not text:
            fb = self._fallback_novel(beats_text)
            return fb, err
        try:
            data = json.loads(_strip_json_fence(text))
            novel = (data.get("novel") or "").strip()
            if not novel:
                return self._fallback_novel(beats_text), "empty novel in JSON"
            return novel, None
        except json.JSONDecodeError as e:
            return self._fallback_novel(beats_text), f"novel JSON: {e}"

    async def _step_manga_from_novel(
        self,
        context: AgentContext,
        beats_text: str,
        lore_prompt: str,
        novel: str,
    ) -> tuple[str, list[dict], str | None]:
        system = f"""You are the manga storyboard director for Bond Converge.
{lore_prompt}

Adapt the NOVEL excerpt into a manga script + shot list. Konosuba-style reactions in dialogue.
Output JSON only:
{{
  "script": "<narration+dialogue 200–600 words, same language as novel>",
  "panels": [
    {{
      "scene_index": 0,
      "description": "<visual for artist>",
      "dialogue": "<optional>",
      "image_prompt": "<English scene composition; pipeline adds Solo Leveling style tags>"
    }}
  ]
}}
Minimum 2 panels. No markdown."""

        user = f"""Original beats (context):
{beats_text}

NOVEL to adapt:
{novel[:12000]}

Output JSON only."""

        ok, text, err = await llm_complete_text(system, user, temperature=0.86)
        if ok and text:
            try:
                data = json.loads(_strip_json_fence(text))
                script = data.get("script", "")
                panels = data.get("panels", [])
                if script and isinstance(panels, list) and len(panels) > 0:
                    return script, panels, None
            except json.JSONDecodeError:
                pass

        # Fallback: ScriptAgent from beats (ignores novel if LLM failed)
        sa = ScriptAgent()
        r = await sa.run(context)
        if not r.success:
            return "", [], r.error or "manga fallback failed"
        return r.data.get("script", ""), r.data.get("panels", []), None

    async def _step_anime_vfx(
        self,
        lore_prompt: str,
        novel: str,
        script: str,
        panels: list[dict],
    ) -> tuple[list[dict], str | None]:
        panel_summary = json.dumps(
            [
                {
                    "i": p.get("scene_index"),
                    "desc": (p.get("description") or "")[:200],
                    "dlg": (p.get("dialogue") or "")[:120],
                }
                for p in panels[:12]
            ],
            ensure_ascii=False,
        )
        system = f"""You are the anime VFX director for Bond Converge.
{lore_prompt}

Propose cinematic VFX for an anime adaptation: energy, particles, impact frames, environmental FX, color scripts.
Output JSON only:
{{
  "vfx_proposals": [
    {{
      "shot_index": 0,
      "panel_ref": 0,
      "title": "short label",
      "description": "what happens on screen",
      "vfx_type": "e.g. energy_burst | environmental | impact_frame | ui_hologram",
      "color_notes": "palette / grade",
      "timing_notes": "on beat / hold / smash cut",
      "reference_style": "optional film/anime reference"
    }}
  ]
}}
At least one proposal per panel when possible. No markdown."""

        user = f"""Novel excerpt (first 2500 chars):
{novel[:2500]}

Manga script (first 2000 chars):
{script[:2000]}

Panels summary:
{panel_summary}

Output JSON only."""

        ok, text, err = await llm_complete_text(system, user, temperature=0.78)
        if not ok or not text:
            return self._fallback_vfx(panels), err

        try:
            data = json.loads(_strip_json_fence(text))
            vfx = data.get("vfx_proposals") or data.get("vfx") or []
            if isinstance(vfx, list) and vfx:
                return vfx, None
        except json.JSONDecodeError:
            pass
        return self._fallback_vfx(panels), err or "vfx JSON parse failed"

    def _fallback_novel(self, beats_text: str) -> str:
        return (
            "NOVEL (fallback — configure LLM keys for full prose)\n\n"
            "The archive bells toll wrong. Somewhere between Neo-Aethel's wet neon and the Abyssal Domain's "
            "upward rain, our NPCs argue about competence while the cosmos unravels politely.\n\n"
            f"Beats woven in:\n{beats_text}\n\n"
            "[End fallback novel fragment.]"
        )

    def _fallback_vfx(self, panels: list[dict]) -> list[dict]:
        out: list[dict] = []
        for i, p in enumerate(panels[:8]):
            idx = p.get("scene_index", i)
            out.append(
                {
                    "shot_index": i,
                    "panel_ref": idx,
                    "title": f"Panel {idx} energy pass",
                    "description": "Cyan Orbet bloom + cel-shaded impact frame; debris suspended; comic sweatdrops preserved.",
                    "vfx_type": "energy_burst",
                    "color_notes": "Teal core, indigo shadows, Solo Leveling style blue aura rim",
                    "timing_notes": "0.4s wind-up, 6f impact hold",
                    "reference_style": "Konosuba reaction timing + cinematic fantasy anime",
                }
            )
        if not out:
            out.append(
                {
                    "shot_index": 0,
                    "panel_ref": 0,
                    "title": "Establishing VFX",
                    "description": "Environmental teal mist, holographic UI glitches, brutalist crystal silhouettes.",
                    "vfx_type": "environmental",
                    "color_notes": "Cold teal / warm accent separation",
                    "timing_notes": "Slow push-in",
                    "reference_style": "Original anime production notes",
                }
            )
        return out
