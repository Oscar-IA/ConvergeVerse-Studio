"""
MemoryAgent — processes Oscar's edits and teaches the StoryEngine.

Every time Oscar edits a chapter:
1. The edit is recorded in chapter_edits table
2. MemoryAgent runs (daily or on-demand) and analyzes patterns
3. It derives new editorial rules and updates narrative memory
4. Future chapters automatically reflect these learnings
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)


class MemoryAgent:
    """
    Analyzes Oscar's edits → extracts patterns → updates editorial rules and memory.
    This is how the AI learns your creative voice over time.
    """

    def __init__(self, narrative_db: Any):
        self.db = narrative_db
        self.model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

    async def process_edits(self) -> dict:
        """
        Main entry point. Process all unlearned edits and update the system.
        Returns a summary of what was learned.
        """
        edits = await self.db.get_unlearned_edits()
        if not edits:
            return {"learned": 0, "new_rules": [], "memory_updates": []}

        logger.info("MemoryAgent: processing %d unlearned edits", len(edits))

        # Analyze patterns with Claude
        analysis = await self._analyze_edits(edits)

        # Apply learnings
        new_rules = []
        memory_updates = []

        for rule in analysis.get("new_rules", []):
            if rule.get("rule"):
                saved = await self.db.add_editorial_rule(
                    rule=rule["rule"],
                    source="ai_derived",
                    priority=rule.get("priority", 5),
                )
                new_rules.append(rule["rule"])
                logger.info("New rule learned: %s", rule["rule"])

        for mem in analysis.get("memory_updates", []):
            if mem.get("key") and mem.get("value"):
                await self.db.upsert_memory(
                    key=mem["key"],
                    value=mem["value"],
                    category=mem.get("category", "character"),
                )
                memory_updates.append(mem["key"])

        # Mark edits as learned
        edit_ids = [e["id"] for e in edits]
        await self.db.mark_edits_learned(edit_ids)

        logger.info(
            "MemoryAgent: learned %d rules, %d memory updates",
            len(new_rules),
            len(memory_updates),
        )

        return {
            "learned": len(edits),
            "new_rules": new_rules,
            "memory_updates": memory_updates,
        }

    async def _analyze_edits(self, edits: list[dict]) -> dict:
        """Use Claude to find patterns in the edits."""
        edits_text = json.dumps(
            [
                {
                    "field": e["field"],
                    "original": e["original"][:300],
                    "edited": e["edited"][:300],
                    "reason": e.get("edit_reason", ""),
                }
                for e in edits
            ],
            ensure_ascii=False,
            indent=2,
        )

        system_prompt = """Eres el analizador de aprendizaje del Story Engine de ConvergeVerse.

Tu trabajo: analizar las ediciones que Oscar hizo a los capítulos generados y extraer:
1. Patrones de estilo — ¿qué tipo de frases reemplazó? ¿más cortas, más épicas, más humorísticas?
2. Reglas de personaje — ¿cambió cómo habla alguien? ¿la personalidad?
3. Reglas de mundo — ¿corrigió algún detalle cultural o de lore?
4. Preferencias narrativas — ¿qué tipo de estructura prefiere?

Devuelve ÚNICAMENTE JSON:
{
  "patterns_found": ["descripción de patrones observados"],
  "new_rules": [
    {
      "rule": "regla editorial clara y específica que el engine debe seguir",
      "priority": 1-10,
      "source_edits": ["descripción breve de qué edición originó esta regla"]
    }
  ],
  "memory_updates": [
    {
      "key": "aren_valis.speech_pattern",
      "value": {"pattern": "descripción actualizada"},
      "category": "character"
    }
  ]
}"""

        user_prompt = f"""Analiza estas {len(edits)} ediciones de Oscar y extrae reglas y actualizaciones de memoria:

{edits_text}

Sé específico. Si Oscar cambió "dijo" por "rugió", la regla es que Aren usa lenguaje más dramático.
Si eliminó una línea de humor, tal vez ese tipo de humor no encaja en ese contexto."""

        content = await self._call_claude(system_prompt, user_prompt)
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.warning("MemoryAgent: could not parse Claude response")
            return {"new_rules": [], "memory_updates": []}

    async def _call_claude(self, system_prompt: str, user_prompt: str) -> str:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic()
        msg = await client.messages.create(
            model=self.model,
            max_tokens=2048,
            temperature=0.3,
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
