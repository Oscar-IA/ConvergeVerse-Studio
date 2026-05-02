"""
Analiza dibujos de niños con Claude Vision y genera prompts para historietas profesionales.
"""
from __future__ import annotations
import base64
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

CLAUDE_MODEL = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")

ANALYSIS_SYSTEM_PROMPT = """You are a professional manga/comic art director specializing in transforming children's hand-drawn sketches into professional-quality comic panels.

When analyzing a child's drawing, you:
1. Identify all characters (describe their appearance from the sketch, give them names if not visible)
2. Understand the scene, setting, and story being told
3. Detect emotions, actions, and relationships between characters
4. Identify any text, speech bubbles, or written elements
5. Determine the mood and genre (adventure, comedy, fantasy, etc.)

You transform this into professional manga art direction while:
- PRESERVING the child's original story and creative intent completely
- Making characters more defined and expressive in manga style
- Creating dynamic panel compositions
- Adding professional lighting, atmosphere, and detail
- Using age-appropriate, child-friendly content always"""

ANALYSIS_USER_PROMPT = """Analyze this child's hand-drawn sketch and create a professional manga/comic story from it.

Return a JSON object with this exact structure:
{
  "story_title": "A creative title for this story",
  "genre": "adventure|fantasy|comedy|mystery|slice_of_life",
  "characters": [
    {
      "id": "char_1",
      "original_description": "What the child drew",
      "manga_description": "Professional manga character description for image generation",
      "name": "Character name (infer from drawing or create fitting one)",
      "role": "protagonist|antagonist|supporting"
    }
  ],
  "scene_description": "Overall scene and setting",
  "mood": "exciting|mysterious|funny|heartwarming|epic",
  "panels": [
    {
      "panel_number": 1,
      "description": "What happens in this panel",
      "dialogue": "Any speech or text (optional)",
      "image_prompt": "Detailed Stable Diffusion/Flux prompt for this panel in professional manga style",
      "composition": "close-up|medium-shot|wide-shot|action-shot",
      "emotion": "joy|surprise|determination|fear|wonder"
    }
  ],
  "style_notes": "Art direction notes for consistent style across all panels",
  "original_story_summary": "What the child's drawing was telling us"
}

Generate 4-6 panels that tell a complete, exciting story based on the drawing.
Make the image_prompt for each panel highly detailed and suitable for professional manga illustration."""


async def analyze_drawing(image_bytes: bytes, content_type: str, user_language: str = "es") -> dict:
    """
    Analiza un dibujo usando Claude Vision y devuelve la estructura de historieta.

    Args:
        image_bytes: Raw image bytes
        content_type: MIME type (image/jpeg, image/png, etc.)
        user_language: Language for story title and descriptions (es/en/fr)

    Returns:
        dict with story structure (characters, panels, etc.)
    """
    import anthropic
    import json

    api_key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not configured")

    # Encode image as base64
    image_b64 = base64.standard_b64encode(image_bytes).decode("utf-8")

    # Map content_type to Claude's accepted media types
    media_type_map = {
        "image/jpeg": "image/jpeg",
        "image/jpg": "image/jpeg",
        "image/png": "image/png",
        "image/gif": "image/gif",
        "image/webp": "image/webp",
    }
    media_type = media_type_map.get(content_type.split(";")[0].strip().lower(), "image/jpeg")

    client = anthropic.Anthropic(api_key=api_key)

    lang_note = {
        "es": "Provide story_title, scene_description, and dialogue in Spanish. Keep image_prompts in English for better image generation.",
        "fr": "Provide story_title, scene_description, and dialogue in French. Keep image_prompts in English.",
        "en": "Provide all text in English.",
    }.get(user_language, "")

    user_prompt = ANALYSIS_USER_PROMPT
    if lang_note:
        user_prompt += f"\n\nLanguage instruction: {lang_note}"

    message = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=2048,
        system=ANALYSIS_SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": media_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": user_prompt,
                    },
                ],
            }
        ],
    )

    response_text = message.content[0].text

    # Extract JSON from response
    try:
        # Claude might wrap JSON in markdown code blocks
        if "```json" in response_text:
            start = response_text.index("```json") + 7
            end = response_text.index("```", start)
            json_str = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.index("```") + 3
            end = response_text.index("```", start)
            json_str = response_text[start:end].strip()
        else:
            # Find JSON object
            start = response_text.index("{")
            end = response_text.rindex("}") + 1
            json_str = response_text[start:end]

        result = json.loads(json_str)
    except (ValueError, json.JSONDecodeError) as e:
        logger.error(
            "Failed to parse Claude response as JSON: %s\nResponse: %s",
            e,
            response_text[:500],
        )
        # Return a minimal valid structure
        result = {
            "story_title": "Mi Historia",
            "genre": "adventure",
            "characters": [],
            "scene_description": response_text[:500],
            "mood": "exciting",
            "panels": [],
            "style_notes": "Manga style, vibrant colors, child-friendly",
            "original_story_summary": "Drawing analyzed",
        }

    return result


async def generate_panel_images(panels: list[dict], style_notes: str) -> list[dict]:
    """
    Genera imágenes para cada panel usando el pipeline Replicate Flux / Pollinations
    que ya existe en ImageAgent._generate_one_panel.

    Returns panels with image_url, image_provider, image_note added.
    """
    from app.agents.image_agent import ImageAgent, AgentContext

    agent = ImageAgent()

    # Build panels_data list expected by ImageAgent (scene_index, image_prompt, description, dialogue)
    panels_data = []
    for panel in panels:
        prompt = panel.get("image_prompt", panel.get("description", ""))
        full_prompt = (
            f"{prompt}. Style: {style_notes}. "
            "Professional manga art, high quality, clean lines, dynamic composition, "
            "child-friendly, vibrant colors."
        )
        panels_data.append(
            {
                "scene_index": panel.get("panel_number", 1) - 1,
                "image_prompt": full_prompt,
                "description": panel.get("description", ""),
                "dialogue": panel.get("dialogue"),
            }
        )

    ctx = AgentContext(
        beats=[],
        chapter_id="drawing",
        extra={"panels_data": panels_data, "world_visual_bible": ""},
    )
    result = await agent.run(ctx)

    # Map generated panels back to original panel structure
    generated: dict[int, dict] = {}
    for gp in result.data.get("panels", []):
        generated[gp["scene_index"]] = gp

    enriched = []
    for panel in panels:
        idx = panel.get("panel_number", 1) - 1
        gp = generated.get(idx, {})
        enriched.append(
            {
                **panel,
                "image_url": gp.get("image_url"),
                "image_provider": gp.get("image_provider"),
                "image_note": gp.get("image_note"),
            }
        )

    return enriched
