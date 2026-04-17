"""
StoryEngine — generates 3 narrative chapters per day.

Each day produces:
  Slot 1: Setup / world-building chapter
  Slot 2: Conflict / action chapter
  Slot 3: Mystery / symbol chapter (plants game hints)

The engine reads narrative memory from Supabase, generates with Claude,
and writes back updated world state.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any

from app.story_engine.continuity import LORE_FLASHBACK_BLOCK, build_previously_on_block
from app.story_engine.cour_structure import cour_prompt_parts
from app.story_engine.master_generator import (
    claude_max_tokens_master,
    format_master_generator_system_block,
    master_generator_enabled,
    slot_act_user_instructions,
)
from app.story_engine.architect_triangulation import (
    consume_architect_notes_enabled,
    format_architect_triangulation_block,
    merge_inline_architect_idea,
    triangulation_enabled,
)
from app.story_engine.author_ideas_file import format_author_ideas_bank_block, load_author_ideas_raw
from app.story_engine.progress_memory import (
    build_progress_memory_block,
    payload_for_last_chapter_read,
)
from app.story_engine.dynamic_narrative_style import get_dynamic_narrative_style
from app.story_engine.generation_config import build_generation_overlay_block
from app.story_engine.multi_reference_blend import build_dna_mix_for_day
from app.story_engine.perfection_fusion import build_perfection_fusion_block
from app.story_engine.passionate_assistant import get_passionate_assistant_section
from app.story_engine.realism_anchor import get_realism_anchor_section
from app.story_engine.scientific_dna import append_rigor_to_user_prompt
from app.story_engine.visual_context import build_visual_context_block

logger = logging.getLogger(__name__)

# ── World constants ──────────────────────────────────────────────────────────

WORLDS = {
    "nova_terra": {
        "name": "Nova Terra",
        "type": "fantasy medieval",
        "culture": "feudal honor, knightly codes, political intrigue, medieval Latin-inspired speech",
        "threats": ["Sovereign Dominion expansion", "Orbet instability", "plague of void energy"],
        "mood": "epic drama with political tension",
    },
    "astra_nexus": {
        "name": "Astra Nexus",
        "type": "sci-fi interdimensional",
        "culture": "technocratic meritocracy, cold logic, corporate hierarchy, formal speech",
        "threats": ["dimensional gate collapse", "Null Syndicate sabotage", "AI gone rogue"],
        "mood": "thriller with existential dread",
    },
    "verdant_sphere": {
        "name": "Verdant Sphere",
        "type": "nature druidic",
        "culture": "animistic spirituality, oral tradition, distrust of metal, poetic speech",
        "threats": ["deforestation by Dominion", "beast tribe wars", "memory loss epidemic"],
        "mood": "wonder and ancient mystery",
    },
    "abyssal_domain": {
        "name": "Abyssal Domain",
        "type": "dark horror survival",
        "culture": "survivor mentality, dark humor, brutal pragmatism, whispered speech",
        "threats": ["void monsters", "Wanderer activity destabilizing reality", "Cult fanaticism"],
        "mood": "horror comedy — laugh or you'll cry",
    },
}

SLOT_ROLES = {
    1: {
        "name": "SETUP",
        "arc": "setup",
        "focus": "Establish the world, introduce or deepen a character, plant a cultural detail. "
                 "One comedic beat required. End with a small mystery.",
        "symbol_type": "orbet_hint",
    },
    2: {
        "name": "CONFLICT",
        "arc": "rising",
        "focus": "The situation escalates. A faction makes a move. Aren is caught in the middle. "
                 "One genuine danger moment required. End with a cliffhanger or revelation.",
        "symbol_type": "faction_signal",
    },
    3: {
        "name": "MYSTERY",
        "arc": "resolution",
        "focus": "A symbol is planted that readers will only understand later. "
                 "A Bond OS product feature appears disguised as world lore. "
                 "End with an eerie calm — the storm is coming.",
        "symbol_type": "bond_os_feature",
    },
}

# Bond OS signals — appear as natural world elements, not ads
BOND_OS_SIGNALS = [
    {
        "feature": "Bond OS Assistant",
        "disguise": "The Archive's holographic assistant 'ARIA' — an ancient AI that predates the Architect",
        "hint": "ARIA sometimes answers questions before they are asked.",
    },
    {
        "feature": "Bond OS Real-time Collaboration",
        "disguise": "The Convergence Network — Orbets that let scholars share memories instantly",
        "hint": "Two archivists in different worlds finish each other's sentences.",
    },
    {
        "feature": "Bond OS Task Automation",
        "disguise": "The Architect's Constructs — golems that execute commands without being told twice",
        "hint": "A construct completes a task Aren forgot he assigned three days ago.",
    },
    {
        "feature": "Bond OS Version Control",
        "disguise": "The Echo Orbet — records every action and can rewind to any moment",
        "hint": "Aren discovers a version of a scroll that 'shouldn't exist yet'.",
    },
    {
        "feature": "Bond OS Notifications",
        "disguise": "The Pulse — a magical phenomenon where important events send ripples felt by sensitives",
        "hint": "Aren feels a 'pulse' before a major event — every single time.",
    },
]


class StoryEngine:
    """
    Generates 3 chapters per day with full narrative coherence.
    Reads/writes to Supabase via the narrative_db module.
    """

    def __init__(self, narrative_db: Any):
        self.db = narrative_db
        self.anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

    async def _prepare_day_generation_context(
        self,
        day_number: int,
        generation_config: dict | None,
    ) -> dict[str, Any]:
        """Contexto compartido: día completo o regeneración parcial desde un slot."""
        memory = await self.db.get_full_memory()
        editorial_rules = await self.db.get_editorial_rules()
        world_state = await self.db.get_world_state(day_number - 1)
        active_arc = await self.db.get_active_arc()
        recent_chapters = await self.db.get_recent_chapters(limit=6, published_only=True)

        ref_pool = await self.db.fetch_creative_references_for_blend()
        idea_pool = await self.db.fetch_ideation_for_blend()
        dna_mix_block = build_dna_mix_for_day(day_number, ref_pool, idea_pool)
        logger.info(
            "Multi-Reference Blending: day=%s refs_pool=%d ideas_pool=%d",
            day_number,
            len(ref_pool),
            len(idea_pool),
        )

        previously_on_block = await build_previously_on_block(self.db, day_number)
        logger.info(
            "Previously On block built for day=%s (chars=%d)",
            day_number,
            len(previously_on_block),
        )

        anchor_chapter = await self.db.get_latest_canon_anchor_chapter()
        last_read = await self.db.get_last_chapter_read()
        progress_memory_block = build_progress_memory_block(anchor_chapter, last_read)
        logger.info(
            "Memoria de avance: chars=%d anchor_canon=%s",
            len(progress_memory_block),
            (anchor_chapter or {}).get("canon_chapter_number"),
        )

        generation_overlay_block = build_generation_overlay_block(generation_config)
        if generation_overlay_block:
            logger.info("Generation overlay active (chars=%d)", len(generation_overlay_block))

        perfection_fusion_block = build_perfection_fusion_block(ref_pool, idea_pool)
        logger.info(
            "Perfection fusion block (ideas=%d refs=%d, chars=%d)",
            len(idea_pool),
            len(ref_pool),
            len(perfection_fusion_block),
        )

        visual_ref_rows = await self.db.fetch_active_visual_references(limit=60)
        visual_context_block = build_visual_context_block(visual_ref_rows)
        if visual_context_block:
            logger.info(
                "Contexto visual obligatorio: %d referencia(s), %d caracteres en bloque",
                len(visual_ref_rows),
                len(visual_context_block),
            )

        cour_structure_block, cour_user_line, cour_ctx = cour_prompt_parts(
            day_number,
            generation_config,
        )
        if cour_ctx.get("cour_enabled"):
            logger.info(
                "Cour: temporada=%s episodio=%s/%s fase=%s",
                cour_ctx.get("season_index"),
                cour_ctx.get("episode_in_cour"),
                cour_ctx.get("cour_length"),
                cour_ctx.get("phase_key"),
            )

        use_master = master_generator_enabled(generation_config)
        master_gen_block = ""
        if use_master:
            master_gen_block = format_master_generator_system_block(
                int(cour_ctx.get("season_index") or 1),
                int(cour_ctx.get("episode_in_cour") or 1),
            )
            logger.info(
                "Generador maestro activo (~25 min / 3 actos); bloque system chars=%d",
                len(master_gen_block),
            )

        author_raw, author_ideas_meta = await asyncio.to_thread(load_author_ideas_raw)
        author_ideas_bank_block = format_author_ideas_bank_block(author_raw)
        if author_ideas_bank_block.strip():
            logger.info(
                "Banco de ideas (IDEAS.pages/IDEAS.md): prompt_chars=%s file_chars=%s truncated=%s path=%s",
                author_ideas_meta.get("chars_in_prompt"),
                author_ideas_meta.get("chars_total"),
                author_ideas_meta.get("truncated"),
                author_ideas_meta.get("path"),
            )

        architect_triangulation_block = ""
        architect_note_ids_to_consume: list[str] = []
        notes_db_count = 0
        merged_plot_ideas_count = 0
        if triangulation_enabled(generation_config):
            notes_db = await self.db.fetch_unprocessed_architect_plot_notes(limit=8)
            notes_db_count = len(notes_db)
            merged_notes, ids_only = merge_inline_architect_idea(notes_db, generation_config)
            merged_plot_ideas_count = len(merged_notes)
            if consume_architect_notes_enabled(generation_config):
                architect_note_ids_to_consume = ids_only
            rune_lines = await self.db.fetch_recent_rune_corpus_for_triangulation(limit_chapters=8)
            if merged_notes or rune_lines:
                architect_triangulation_block = format_architect_triangulation_block(
                    target_episode=int(cour_ctx.get("episode_in_cour") or 1),
                    season_index=int(cour_ctx.get("season_index") or 1),
                    plot_notes=merged_notes,
                    rune_corpus=rune_lines,
                )
                logger.info(
                    "Triangulación Arquitecto: ideas=%d runas_corpus=%d chars=%d",
                    merged_plot_ideas_count,
                    len(rune_lines),
                    len(architect_triangulation_block),
                )

        architect_active = bool(architect_triangulation_block.strip())
        return {
            "memory": memory,
            "editorial_rules": editorial_rules,
            "world_state": world_state,
            "active_arc": active_arc,
            "recent_chapters": recent_chapters,
            "ref_pool": ref_pool,
            "idea_pool": idea_pool,
            "dna_mix_block": dna_mix_block,
            "previously_on_block": previously_on_block,
            "anchor_chapter": anchor_chapter,
            "progress_memory_block": progress_memory_block,
            "generation_overlay_block": generation_overlay_block,
            "perfection_fusion_block": perfection_fusion_block,
            "cour_structure_block": cour_structure_block,
            "cour_user_line": cour_user_line,
            "cour_ctx": cour_ctx,
            "use_master": use_master,
            "master_gen_block": master_gen_block,
            "author_ideas_bank_block": author_ideas_bank_block,
            "author_ideas_meta": author_ideas_meta,
            "architect_triangulation_block": architect_triangulation_block,
            "architect_note_ids_to_consume": architect_note_ids_to_consume,
            "notes_db_count": notes_db_count,
            "merged_plot_ideas_count": merged_plot_ideas_count,
            "architect_active": architect_active,
            "generation_config": generation_config,
            "visual_context_block": visual_context_block,
            "visual_reference_count": len(visual_ref_rows),
        }

    def _tri_meta_from_context(self, ctx: dict[str, Any]) -> dict[str, Any]:
        gen_cfg = ctx.get("generation_config")
        return {
            "architect_triangulation": {
                "active": bool(ctx.get("architect_active")),
                "plot_ideas_in_prompt": int(ctx.get("merged_plot_ideas_count") or 0),
                "notes_from_queue": int(ctx.get("notes_db_count") or 0),
                "notes_marked_processed": len(ctx.get("architect_note_ids_to_consume") or []),
                "skipped": not triangulation_enabled(gen_cfg),
            },
            "visual_context": {
                "references_loaded": int(ctx.get("visual_reference_count") or 0),
                "block_chars": len((ctx.get("visual_context_block") or "").strip()),
            },
            "author_ideas_file": {
                "loaded": bool((ctx.get("author_ideas_meta") or {}).get("loaded")),
                "chars_in_prompt": (ctx.get("author_ideas_meta") or {}).get("chars_in_prompt"),
                "chars_total": (ctx.get("author_ideas_meta") or {}).get("chars_total"),
                "truncated": (ctx.get("author_ideas_meta") or {}).get("truncated"),
                "path": (ctx.get("author_ideas_meta") or {}).get("path"),
                "error": (ctx.get("author_ideas_meta") or {}).get("error"),
            },
        }

    async def _generate_and_save_slot(
        self,
        day_number: int,
        slot: int,
        chapters_so_far: list[dict],
        ctx: dict[str, Any],
    ) -> dict:
        chapter = await self._generate_one_chapter(
            day_number=day_number,
            slot=slot,
            memory=ctx["memory"],
            editorial_rules=ctx["editorial_rules"],
            world_state=ctx["world_state"],
            active_arc=ctx["active_arc"],
            previous_chapters=chapters_so_far,
            recent_chapters=ctx["recent_chapters"],
            dna_mix_block=ctx["dna_mix_block"],
            previously_on_block=ctx["previously_on_block"],
            progress_memory_block=ctx["progress_memory_block"],
            cour_structure_block=ctx["cour_structure_block"],
            cour_user_line=ctx["cour_user_line"],
            generation_overlay_block=ctx["generation_overlay_block"],
            perfection_fusion_block=ctx["perfection_fusion_block"],
            creative_refs=ctx["ref_pool"],
            creative_ideas=ctx["idea_pool"],
            master_generator_block=ctx["master_gen_block"],
            use_master_generator=ctx["use_master"],
            architect_triangulation_block=ctx["architect_triangulation_block"],
            architect_triangulation_active=ctx["architect_active"],
            visual_context_block=str(ctx.get("visual_context_block") or ""),
            author_ideas_bank_block=str(ctx.get("author_ideas_bank_block") or ""),
        )
        return await self.db.save_chapter(chapter)

    async def _after_generation_writes(
        self,
        ctx: dict[str, Any],
        day_number: int,
    ) -> None:
        anchor_chapter = ctx.get("anchor_chapter")
        if anchor_chapter:
            try:
                await self.db.set_last_chapter_read(
                    payload_for_last_chapter_read(
                        anchor_chapter,
                        generation_day_target=day_number,
                    )
                )
            except Exception as e:
                logger.warning("set_last_chapter_read: %s", e)

        note_ids = ctx.get("architect_note_ids_to_consume") or []
        if note_ids:
            await self.db.mark_architect_plot_notes_processed(note_ids)

    async def generate_daily_chapters(
        self,
        day_number: int,
        generation_config: dict | None = None,
    ) -> tuple[list[dict], dict[str, Any]]:
        """
        Generate all 3 chapters for a given day.

        Returns (chapters, meta) donde meta incluye `architect_triangulation` para la API.
        """
        ctx = await self._prepare_day_generation_context(day_number, generation_config)
        chapters: list[dict] = []
        for slot in [1, 2, 3]:
            logger.info("Generating Day %s Slot %s...", day_number, slot)
            saved = await self._generate_and_save_slot(day_number, slot, chapters, ctx)
            chapters.append(saved)
            logger.info("Slot %s saved: %s", slot, saved.get("title", "?"))

        await self._after_generation_writes(ctx, day_number)
        return chapters, self._tri_meta_from_context(ctx)

    async def generate_daily_chapters_from_slot(
        self,
        day_number: int,
        start_slot: int,
        generation_config: dict | None = None,
    ) -> tuple[list[dict], dict[str, Any]]:
        """
        Regenera desde el slot indicado hasta el 3, manteniendo slots anteriores del mismo día.
        Usado tras colapsar la línea temporal (BOND OS / paradoja).
        """
        if start_slot < 1 or start_slot > 3:
            raise ValueError("start_slot must be 1..3")
        ctx = await self._prepare_day_generation_context(day_number, generation_config)
        existing = await self.db.get_daily_chapters(day_number, exclude_obsolete=True)
        chapters: list[dict] = [
            c
            for c in existing
            if int(c.get("slot") or 0) < start_slot
        ]
        chapters.sort(key=lambda c: int(c.get("slot") or 0))
        for slot in range(start_slot, 4):
            logger.info("Regen Day %s Slot %s...", day_number, slot)
            saved = await self._generate_and_save_slot(day_number, slot, chapters, ctx)
            chapters.append(saved)
            logger.info("Slot %s saved: %s", slot, saved.get("title", "?"))

        await self._after_generation_writes(ctx, day_number)
        return chapters, self._tri_meta_from_context(ctx)

    async def _generate_one_chapter(
        self,
        day_number: int,
        slot: int,
        memory: dict,
        editorial_rules: list[str],
        world_state: dict,
        active_arc: dict | None,
        previous_chapters: list[dict],
        recent_chapters: list[dict],
        dna_mix_block: str,
        previously_on_block: str,
        progress_memory_block: str = "",
        cour_structure_block: str = "",
        cour_user_line: str = "",
        generation_overlay_block: str = "",
        perfection_fusion_block: str = "",
        creative_refs: list[dict] | None = None,
        creative_ideas: list[dict] | None = None,
        master_generator_block: str = "",
        use_master_generator: bool = False,
        architect_triangulation_block: str = "",
        architect_triangulation_active: bool = False,
        visual_context_block: str = "",
        author_ideas_bank_block: str = "",
    ) -> dict:
        slot_config = SLOT_ROLES[slot]

        dynamic_style_block = get_dynamic_narrative_style(
            creative_refs or [],
            creative_ideas or [],
        )
        logger.info(
            "Dynamic narrative style block for day=%s slot=%s (chars=%d)",
            day_number,
            slot,
            len(dynamic_style_block),
        )

        # Pick world focus for this slot
        world_keys = list(WORLDS.keys())
        world_key = world_keys[(day_number + slot) % len(world_keys)]
        world = WORLDS[world_key]

        # Bond OS signal for mystery slot
        bond_signal = None
        if slot == 3:
            bond_signal = BOND_OS_SIGNALS[(day_number - 1) % len(BOND_OS_SIGNALS)]

        system_prompt = self._build_system_prompt(
            editorial_rules=editorial_rules,
            world=world,
            slot_config=slot_config,
            memory=memory,
            world_state=world_state,
            active_arc=active_arc,
            bond_signal=bond_signal,
            dna_mix_block=dna_mix_block,
            perfection_fusion_block=perfection_fusion_block,
            dynamic_narrative_style_block=dynamic_style_block,
            lore_flashback_block=LORE_FLASHBACK_BLOCK,
            cour_structure_block=cour_structure_block,
            generation_overlay_block=generation_overlay_block,
            master_generator_block=master_generator_block,
            use_master_generator=use_master_generator,
            architect_triangulation_block=architect_triangulation_block,
            visual_context_block=visual_context_block,
            author_ideas_bank_block=author_ideas_bank_block,
        )

        user_prompt = self._build_user_prompt(
            day_number=day_number,
            slot=slot,
            slot_config=slot_config,
            previous_chapters=previous_chapters,
            recent_chapters=recent_chapters,
            previously_on_block=previously_on_block,
            progress_memory_block=progress_memory_block,
            cour_user_line=cour_user_line,
            use_master_generator=use_master_generator,
            architect_triangulation_active=architect_triangulation_active,
            include_visual_context=bool((visual_context_block or "").strip()),
        )

        max_out = claude_max_tokens_master() if use_master_generator else 4096
        content = await self._call_claude(system_prompt, user_prompt, max_tokens=max_out)

        try:
            data = json.loads(content)
        except json.JSONDecodeError:
            # Try to extract JSON from response
            import re
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                data = json.loads(match.group())
            else:
                raise ValueError(f"Claude did not return valid JSON: {content[:200]}")

        return {
            "day_number": day_number,
            "slot": slot,
            "title": data.get("title", f"Capítulo {day_number}.{slot}"),
            "script": data.get("script", ""),
            "panels": data.get("panels", []),
            "arc_position": slot_config["arc"],
            "symbols_planted": data.get("symbols_planted", []),
            "bond_os_signals": data.get("bond_os_signals", []),
            "author_notes": data.get("author_notes", ""),
            "status": "draft",
            "world": world_key,
        }

    def _build_system_prompt(
        self,
        editorial_rules: list[str],
        world: dict,
        slot_config: dict,
        memory: dict,
        world_state: dict,
        active_arc: dict | None,
        bond_signal: dict | None,
        dna_mix_block: str = "",
        perfection_fusion_block: str = "",
        dynamic_narrative_style_block: str = "",
        lore_flashback_block: str = "",
        cour_structure_block: str = "",
        generation_overlay_block: str = "",
        master_generator_block: str = "",
        use_master_generator: bool = False,
        architect_triangulation_block: str = "",
        visual_context_block: str = "",
        author_ideas_bank_block: str = "",
    ) -> str:

        rules_text = "\n".join(f"  {i+1}. {r}" for i, r in enumerate(editorial_rules))
        fusion_section = perfection_fusion_block.strip()
        if fusion_section:
            fusion_section = f"\n{fusion_section}\n"
        mix_section = dna_mix_block.strip()
        if mix_section:
            mix_section = f"\n{mix_section}\n"
        dynamic_style_section = dynamic_narrative_style_block.strip()
        if dynamic_style_section:
            dynamic_style_section = f"\n{dynamic_style_section}\n"
        overlay_section = generation_overlay_block.strip()
        if overlay_section:
            overlay_section = f"\n{overlay_section}\n"

        visual_section = (visual_context_block or "").strip()
        if visual_section:
            visual_section = f"\n{visual_section}\n"

        realism_section = get_realism_anchor_section()
        passionate_assistant_section = get_passionate_assistant_section()

        cour_section = ""
        cs = (cour_structure_block or "").strip()
        if cs:
            cour_section = f"\n{cs}\n\n"

        master_section = ""
        mg = (master_generator_block or "").strip()
        if mg:
            master_section = f"\n{mg}\n\n"

        architect_section = ""
        arch = (architect_triangulation_block or "").strip()
        if arch:
            architect_section = f"\n{arch}\n\n"

        author_bank_section = ""
        bank = (author_ideas_bank_block or "").strip()
        if bank:
            author_bank_section = f"\n{bank}\n\n"

        characters_text = json.dumps(memory.get("characters", {}), ensure_ascii=False, indent=2)
        locations_text = json.dumps(memory.get("locations", {}), ensure_ascii=False, indent=2)
        symbols_text = json.dumps(memory.get("symbols", []), ensure_ascii=False, indent=2)

        arc_text = ""
        if active_arc:
            arc_text = f"""
ARCO ACTIVO: {active_arc.get('name', '?')}
Descripción: {active_arc.get('description', '')}
Temas: {', '.join(active_arc.get('themes', []))}
Símbolos del arco: {', '.join(active_arc.get('symbols', []))}
"""

        world_state_text = json.dumps(world_state, ensure_ascii=False, indent=2) if world_state else "{}"

        bond_signal_text = ""
        if bond_signal:
            bond_signal_text = f"""
SEÑAL BOND OS A PLANTAR (de forma sutil, como elemento natural del mundo):
  Feature real: {bond_signal['feature']}
  Disfraz narrativo: {bond_signal['disguise']}
  Pista al lector: {bond_signal['hint']}
"""

        panels_count_rule = (
            "- 5-8 paneles por capítulo (GENERADOR MAESTRO): cada panel = corte de storyboard denso"
            if use_master_generator
            else "- 4-5 paneles por capítulo"
        )
        script_json_hint = (
            "guion completo del ACTO actual: cumple el rango de palabras del user prompt "
            "(GENERADOR MAESTRO); español perfecto, ritmo de episodio"
            if use_master_generator
            else "guion completo, 300-500 palabras, español perfecto"
        )

        return f"""Eres el motor narrativo de ConvergeVerse — una historia isekai épica contada desde el punto de vista de un NPC que no sabe que está dentro de un juego.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGLAS EDITORIALES ABSOLUTAS (nunca las violes)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{rules_text}
{fusion_section}{mix_section}{dynamic_style_section}{overlay_section}{visual_section}{realism_section}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIVERSO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MITO DE CREACIÓN: El Arquitecto diseñó la realidad como una red de mundos. Creó los Orbets para acelerar la evolución. Conciencias externas (los Errantes/Jugadores) comenzaron a entrar a través de los Orbets. Los NPCs los llaman "Los Errantes".
CANON AETHEL / BOND CONVERGE: El **Reino de Aethel** es núcleo feudal e histórico del mundo Converge (su precuela política y sagrada antecede a la red pública de Orbets). **BOND CONVERGE** nombra tanto la leyenda civil del pacto de convergencia como la infraestructura onírico-tecnológica que los archivistas apenas comprenden.

MUNDO DE ESTE CAPÍTULO: {world['name']} ({world['type']})
Cultura: {world['culture']}
Amenazas activas: {', '.join(world['threats'])}
Tono: {world['mood']}

FACCIONES:
- The Archive Order: eruditos que documentan Orbets y Errantes. Neutral. Aren pertenece aquí.
- The Sovereign Dominion: imperialistas que capturan Orbets para dominar mundos. Antagonista.
- The Wanderer Cult: fanáticos que adoran a los jugadores como dioses. Caótico.
- The Null Syndicate: sociedad secreta que destruye Orbets para evitar el colapso de la realidad. Opera en sombras — nunca confirmado, siempre implicado.

PERSONAJES EN MEMORIA:
{characters_text}

LOCACIONES ESTABLECIDAS:
{locations_text}

SÍMBOLOS YA PLANTADOS:
{symbols_text}
{arc_text}
ESTADO ACTUAL DEL MUNDO:
{world_state_text}
{cour_section}{master_section}{author_bank_section}{architect_section}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROL DE ESTE CAPÍTULO: {slot_config['name']}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{slot_config['focus']}
{bond_signal_text}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TONO Y ESTRUCTURA NARRATIVA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
La historia debe contener TODOS estos elementos en cada capítulo:
- DRAMA ÉPICO: las apuestas son reales, la vida de personas importa
- HUMOR ABSURDO: al estilo Konosuba — pánico exagerado, insultos deadpan, burocracia ridícula ante el apocalipsis
- MIEDO GENUINO: un momento donde algo claramente malo está ocurriendo
- CULTURA VIVA: referencias a comida, leyes, religión, economía del mundo actual
- SÍMBOLO OCULTO: algo que parecerá inocente ahora pero será crucial en el juego
{lore_flashback_block}{passionate_assistant_section}ESTRUCTURA NARRATIVA:
1. APERTURA — establece escena y estado emocional del personaje (2-3 líneas de narración)
2. DETONANTE — algo interrumpe el status quo
3. ESCALADA — la situación se complica, un NPC secundario complica más las cosas
4. CLÍMAX — el momento más intenso del capítulo (peligro O revelación O humor máximo)
5. GANCHO — última línea que deja al lector queriendo más

REGLAS DE ESCRITURA:
- Ya aplicaste el «FLUJO DE PERFECCIONAMIENTO AUTOMÁTICO» arriba: mantén prioridad a ideas del autor y continuidad, con pulido de guion (ritmo, claridad, gancho).
- Español perfecto, sin errores ortográficos, sin anglicismos innecesarios
- Diálogos cortos y punzantes — máximo 2 líneas por personaje por escena
- Narración en tercera persona, tiempo presente, voz épica con destellos de ironía
- Cada panel debe ser visualmente distinto al anterior
{panels_count_rule}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATO DE SALIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Devuelve ÚNICAMENTE un objeto JSON válido. Sin markdown, sin comentarios fuera del JSON.

{{
  "title": "título épico del capítulo en español",
  "script": "{script_json_hint}",
  "panels": [
    {{
      "scene_index": 0,
      "description": "descripción visual del panel en español",
      "dialogue": "una línea de diálogo impactante, o null",
      "image_prompt": "English-only prompt for Flux image generation — describe scene, composition, lighting, character expressions",
      "camera_movement": "static_tripod | slow_zoom_in | slow_zoom_out | pan_left | pan_right | handheld_shake | whip_pan | dolly_in",
      "particle_effects": "describe visual FX",
      "sound_cues_sfx": "SFX list for SoundAgent"
    }}
  ],
  "symbols_planted": [
    {{
      "name": "nombre del símbolo",
      "description": "cómo aparece en este capítulo (inocente)",
      "category": "orbet_hint | faction_signal | character_omen | world_event | bond_os_feature | game_mechanic_foreshadow",
      "game_reveal": "qué revelará este símbolo cuando el juego se lance"
    }}
  ],
  "bond_os_signals": [
    {{
      "feature": "nombre del feature de Bond OS",
      "narrative_element": "cómo aparece disfrazado en la historia"
    }}
  ],
  "author_notes": "notas del motor: decisiones de continuidad + qué capa de flashback precuelar usaste (Aethel / Bond Converge) para el día siguiente"
}}"""

    def _build_user_prompt(
        self,
        day_number: int,
        slot: int,
        slot_config: dict,
        previous_chapters: list[dict],
        recent_chapters: list[dict],
        previously_on_block: str,
        progress_memory_block: str = "",
        cour_user_line: str = "",
        use_master_generator: bool = False,
        architect_triangulation_active: bool = False,
        include_visual_context: bool = False,
    ) -> str:
        pm = (progress_memory_block or "").strip()
        pm_section = f"{pm}\n\n" if pm else ""
        cu = (cour_user_line or "").strip()
        cu_section = f"{cu}\n\n" if cu else ""
        act_block = slot_act_user_instructions(slot) if use_master_generator else ""
        act_section = f"{act_block}\n\n" if act_block else ""

        prev_text = ""
        if previous_chapters:
            prev_text = "\nCAPÍTULOS DE HOY YA GENERADOS (mantén continuidad):\n"
            for ch in previous_chapters:
                prev_text += f"  Slot {ch['slot']}: {ch['title']}\n  Resumen: {ch['script'][:200]}...\n\n"

        recent_text = ""
        if recent_chapters:
            recent_text = "\nÚLTIMOS CAPÍTULOS PUBLICADOS (Legado — prioriza meta-resumen si existe):\n"
            for ch in recent_chapters[:4]:
                recent_text += f"  Día {ch['day_number']} Slot {ch['slot']}: {ch['title']}\n"
                meta = (ch.get("meta_summary") or "").strip()
                if meta:
                    recent_text += f"  Meta-resumen: {meta[:320]}{'…' if len(meta) > 320 else ''}\n"
                else:
                    script = (ch.get("script") or "").strip()
                    recent_text += f"  Extracto: {script[:200]}{'…' if len(script) > 200 else ''}\n"

        po = (previously_on_block or "").strip()
        po_section = f"\n{po}\n\n" if po else ""

        rigor_context = "\n".join(
            [
                str(slot_config.get("name") or ""),
                str(slot_config.get("focus") or ""),
                pm,
                po,
                prev_text,
                recent_text,
            ]
        )

        base_user = f"""Genera el capítulo del Día {day_number}, Slot {slot} ({slot_config['name']}).
{cu_section}{act_section}{pm_section}{po_section}{prev_text}{recent_text}
Este capítulo debe:
- Respetar la **ARQUITECTURA DE TEMPORADA (cour)** del system prompt si está activa: el episodio entero (los 3 slots del día) debe cumplir la fase del cour.
- Respetar primero «MEMORIA DE AVANCE» (meta-resumen del último canon): avanza la historia, no repitas lo ya cerrado ahí.
- Respetar el bloque «PREVIAMENTE EN CONVERGEVERSE»: no contradigas hechos de N-1/N-2 salvo giro narrativo explícito (traición, falso recuerdo) que dejes anclado en author_notes.
- Seguir «FLUJO DE PERFECCIONAMIENTO AUTOMÁTICO»: fusionar ideas recientes + ADN de referencia + memoria narrativa; pulir como guion profesional sin traicionar la voz del autor.
- Aplicar «MULTI-REFERENCE BLENDING — MIX DEL DÍA» (33/33/34 + muestreo), «ESTILO NARRATIVO DINÁMICO» de este capítulo y, si existe, «CALIBRACIÓN CREATIVA» del autor.
- Conectar directamente con el estado actual del mundo
- Introducir o desarrollar exactamente UN conflicto central
- Plantar exactamente UN símbolo sutil de tipo: {slot_config['symbol_type']}
- Terminar con un gancho narrativo que justifique leer el siguiente capítulo
{"- Cumplir el **GENERADOR MAESTRO**: este slot es un acto del episodio (~25 min total); no acortes el guion por debajo del mínimo de palabras indicado arriba." if use_master_generator else ""}
{"- **TRIANGULACIÓN ARQUITECTO:** materializa en este acto la idea del workspace y las runas del canon listadas en el system prompt; Aren debe avanzar en su miedo/fallo clave del episodio." if architect_triangulation_active else ""}
{"- **CONTEXTO VISUAL OBLIGATORIO:** cada `panels[].description` (español) y `panels[].image_prompt` (inglés) debe obedecer el bloque homónimo del system prompt." if include_visual_context else ""}
- **Libro digital — diálogo de doble capa (opcional):** si mezclas **voz técnica BOND OS** (física, runas) con **interrupciones de Aren**, en el `script` usa líneas de sección solas: `:::bond_os` o `:::bond`, luego el párrafo técnico; `:::aren`, luego la interrupción coloquial. Alterna bloques si hace falta; sin marcas el lector muestra texto plano. Alinea esto con el bloque «ASISTENTE APASIONADO Y PESADO» del system prompt (1–2 beats por capítulo cuando haya concepto técnico).
- Tras la interrupción de Aren, deja **reacción breve** del narrador/BOND (ofensa leve o suspiro) antes de seguir.

JSON únicamente. Ortografía perfecta."""

        return append_rigor_to_user_prompt(
            base_user,
            context_for_conditional=rigor_context,
        )

    async def _call_claude(self, system_prompt: str, user_prompt: str, max_tokens: int = 4096) -> str:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic()
        msg = await client.messages.create(
            model=self.model,
            max_tokens=max_tokens,
            temperature=0.72,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        blocks = getattr(msg, "content", None) or []
        parts = [getattr(b, "text", None) for b in blocks]
        content = "".join(p for p in parts if p).strip()
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return content.strip()
