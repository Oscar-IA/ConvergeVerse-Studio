"""
Anexo de Lore (Libro Digital) — se genera al aprobar un capítulo (canon).

Secciones:
  · Bestiario — especies / entidades encontradas
  · Ficha técnica — evolución de habilidades de Aren
  · Diccionario rúnico — runas nuevas en el episodio
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


def _iso_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_structural_lore_annex(chapter: dict[str, Any]) -> dict[str, Any]:
    """Sin API: deduce entradas mínimas desde símbolos, paneles y extractos del guion."""
    title = str(chapter.get("title") or "Capítulo").strip()
    script = (chapter.get("script") or "").strip()
    excerpt = script[:900] + ("…" if len(script) > 900 else "")
    syms = chapter.get("symbols_planted") or []
    panels = chapter.get("panels") or []

    bestiary: list[dict[str, str]] = []
    if isinstance(syms, list):
        for s in syms[:8]:
            if not isinstance(s, dict):
                continue
            cat = str(s.get("category") or "símbolo narrativo")
            bestiary.append(
                {
                    "name": str(s.get("name") or "Entidad"),
                    "species_or_faction": cat.replace("_", " "),
                    "description": str(s.get("description") or "")[:480],
                    "threat_level": "—",
                }
            )
    if not bestiary and isinstance(panels, list):
        for i, p in enumerate(panels[:4]):
            if isinstance(p, dict):
                desc = str(p.get("description") or "").strip()
                if len(desc) > 20:
                    bestiary.append(
                        {
                            "name": f"Presencia escénica (panel {i + 1})",
                            "species_or_faction": "por confirmar",
                            "description": desc[:400],
                            "threat_level": "—",
                        }
                    )

    rune_tokens = re.findall(
        r"\b(?:runa|sello|glifo|inscripci[oó]n|sigilo)[\s:,\-–—]+([^\n\.]{3,80})",
        script,
        flags=re.IGNORECASE,
    )
    diccionario: list[dict[str, str]] = []
    seen: set[str] = set()
    for raw in rune_tokens[:12]:
        key = raw.strip()[:60]
        if key.lower() in seen:
            continue
        seen.add(key.lower())
        diccionario.append(
            {
                "glyph_or_name": key,
                "meaning": "Inferido del contexto del episodio; revisar en continuidad.",
                "usage_in_episode": "Mencionado o activado durante el transcurso del capítulo.",
            }
        )

    habilidades: list[str] = []
    for phrase in re.findall(
        r"(?:Aren|el protagonista)[^.!?]{0,120}(?:puede|logra|despierta|invoca|canaliza|rompe|sell[aó])[^.!?]{0,80}[.!?]",
        script,
        flags=re.IGNORECASE,
    ):
        t = phrase.strip()
        if len(t) > 15:
            habilidades.append(t[:200])

    if not habilidades:
        habilidades = [
            "Evolución no explícita en datos estructurados — revisar guion completo en el Libro Digital."
        ]

    return {
        "generated_at": _iso_now(),
        "source": "structural",
        "chapter_title_hint": title,
        "bestiary": bestiary[:6] or [
            {
                "name": "Sin entradas automáticas",
                "species_or_faction": "—",
                "description": "No se detectaron símbolos/paneles suficientes; enriquecer manualmente o regenerar con ANTHROPIC_API_KEY.",
                "threat_level": "—",
            }
        ],
        "ficha_tecnica": {
            "aren_snapshot": excerpt[:320] if excerpt else "—",
            "abilities_observed": habilidades[:5],
            "evolution_note": "Ficha técnica preliminar (modo sin LLM). Tras publicar al Legado, el meta-resumen refuerza continuidad.",
        },
        "diccionario_runico": diccionario[:8]
        or [
            {
                "glyph_or_name": "—",
                "meaning": "Ninguna runa nominal detectada por heurística.",
                "usage_in_episode": "—",
            }
        ],
    }


def _strip_fence(text: str) -> str:
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```\w*\n?", "", t)
        t = re.sub(r"\n?```$", "", t)
    return t.strip()


def _normalize_annex_payload(raw: dict[str, Any], chapter: dict[str, Any] | None = None) -> dict[str, Any]:
    """Garantiza claves esperadas y tipos listos para JSON en book_payload."""
    out: dict[str, Any] = {
        "generated_at": _iso_now(),
        "source": "llm",
        "bestiary": [],
        "ficha_tecnica": {},
        "diccionario_runico": [],
    }
    be = raw.get("bestiary")
    if isinstance(be, list):
        for item in be[:12]:
            if isinstance(item, dict):
                out["bestiary"].append(
                    {
                        "name": str(item.get("name") or "?")[:120],
                        "species_or_faction": str(item.get("species_or_faction") or item.get("species") or "")[:120],
                        "description": str(item.get("description") or "")[:2000],
                        "threat_level": str(item.get("threat_level") or "—")[:80],
                    }
                )
    ft = raw.get("ficha_tecnica")
    if isinstance(ft, dict):
        hab = ft.get("abilities_observed") or ft.get("habilidades") or []
        if isinstance(hab, str):
            hab = [hab]
        hab_list = [str(x)[:400] for x in hab[:12]] if isinstance(hab, list) else []
        out["ficha_tecnica"] = {
            "aren_snapshot": str(ft.get("aren_snapshot") or ft.get("resumen_aren") or "")[:2000],
            "abilities_observed": hab_list
            or ["—"],
            "evolution_note": str(ft.get("evolution_note") or ft.get("nota_evolucion") or "")[:2000],
        }
    else:
        out["ficha_tecnica"] = {
            "aren_snapshot": "",
            "abilities_observed": ["—"],
            "evolution_note": "",
        }

    dr = raw.get("diccionario_runico")
    if isinstance(dr, list):
        for item in dr[:16]:
            if isinstance(item, dict):
                out["diccionario_runico"].append(
                    {
                        "glyph_or_name": str(item.get("glyph_or_name") or item.get("runa") or "?")[:120],
                        "meaning": str(item.get("meaning") or item.get("significado") or "")[:1500],
                        "usage_in_episode": str(
                            item.get("usage_in_episode") or item.get("contexto_episodio") or ""
                        )[:1500],
                    }
                )

    if not out["bestiary"] and chapter is not None:
        out["bestiary"] = build_structural_lore_annex(chapter)["bestiary"]
    elif not out["bestiary"]:
        out["bestiary"] = [
            {
                "name": "Sin datos",
                "species_or_faction": "—",
                "description": "No se pudo extraer bestiario del modelo.",
                "threat_level": "—",
            }
        ]
    if not out["diccionario_runico"]:
        if chapter is not None:
            struct_dr = build_structural_lore_annex(chapter)["diccionario_runico"]
            if struct_dr and struct_dr[0].get("glyph_or_name") != "—":
                out["diccionario_runico"] = struct_dr
            else:
                out["diccionario_runico"] = [
                    {
                        "glyph_or_name": "—",
                        "meaning": "Ninguna runa explícita en la salida del modelo; revisar guion.",
                        "usage_in_episode": "—",
                    }
                ]
        else:
            out["diccionario_runico"] = [
                {
                    "glyph_or_name": "—",
                    "meaning": "El modelo no devolvió runas; revisar guion.",
                    "usage_in_episode": "—",
                }
            ]
    return out


async def generate_llm_lore_annex(chapter: dict[str, Any]) -> dict[str, Any] | None:
    """Claude → JSON del anexo. None si no hay clave o falla."""
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not key:
        return None

    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
    title = str(chapter.get("title") or "")
    script = (chapter.get("script") or "")[:14000]
    syms = json.dumps(chapter.get("symbols_planted") or [], ensure_ascii=False)[:6000]
    bonds = json.dumps(chapter.get("bond_os_signals") or [], ensure_ascii=False)[:4000]
    panels = json.dumps(chapter.get("panels") or [], ensure_ascii=False)[:8000]
    world = str(chapter.get("world") or "")

    system = """Eres el archivista del Libro Digital de ConvergeVerse. Devuelves SOLO JSON válido (sin markdown).
El anexo alimenta al lector: bestiario, evolución de Aren, runas del episodio.
Español, tono lore de enciclopedia in-universe (no meta-juego). Si el guion no menciona una sección, infiere con moderación o usa entradas mínimas honestas ("no consta en el episodio")."""

    user = f"""Episodio / capítulo: «{title}»
Mundo foco (clave motor): {world}

Símbolos plantados (JSON):
{syms}

Bond OS (JSON):
{bonds}

Paneles (JSON resumido):
{panels}

Guion (puede estar truncado):
{script}

Genera el ANEXO DE LORE con esta forma exacta:
{{
  "bestiary": [
    {{
      "name": "nombre común o nombre dado en el episodio",
      "species_or_faction": "especie, facción o tipo de entidad",
      "description": "2-5 frases: hábitat, comportamiento, relación con Aren o el plot",
      "threat_level": "baja | media | alta | desconocida"
    }}
  ],
  "ficha_tecnica": {{
    "aren_snapshot": "breve retrato del estado de Aren al cerrar el episodio",
    "abilities_observed": ["habilidad o progreso concreto visto en este capítulo", "..."],
    "evolution_note": "cómo cambia o se prueba su poder / comprensión rúnica respecto al inicio del episodio"
  }},
  "diccionario_runico": [
    {{
      "glyph_or_name": "nombre o descripción del glifo/sello",
      "meaning": "qué hace o qué representa en el mundo",
      "usage_in_episode": "momento en que aparece o se activa"
    }}
  ]
}}

Reglas:
- bestiary: 1-6 entradas (criaturas, constructos, facciones con «rostro», fenómenos casi vivos). No inventes nombres propios masivos si no hay pistas; puedes usar descriptores.
- ficha_tecnica: si Aren no usa poder explícito, documenta **superación emocional/inteligencia rúnica** o coste narrativo.
- diccionario_runico: 0-8 entradas; solo runas/sellos/glifos **nuevos o redefinidos** en este episodio. Si no hay ninguno, un array con un objeto que diga que no consta."""

    try:
        from anthropic import AsyncAnthropic

        client = AsyncAnthropic()
        msg = await client.messages.create(
            model=model,
            max_tokens=4096,
            temperature=0.55,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        blocks = getattr(msg, "content", None) or []
        text = "".join(getattr(b, "text", None) or "" for b in blocks).strip()
        text = _strip_fence(text)
        data = json.loads(text)
        if not isinstance(data, dict):
            return None
        return _normalize_annex_payload(data, chapter)
    except Exception as e:
        logger.warning("generate_llm_lore_annex: %s", e)
        return None


async def build_lore_annex_for_chapter(chapter: dict[str, Any]) -> dict[str, Any]:
    """LLM si hay API; si no, anexo estructural."""
    llm = await generate_llm_lore_annex(chapter)
    if llm:
        return llm
    return build_structural_lore_annex(chapter)
