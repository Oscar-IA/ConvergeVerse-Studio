"""
Bond Converge / ConvergeVerse visual identity for image generation.
Every ImageAgent prompt MUST end with this suffix for brand consistency.

Libro-producto / portada crónica: ver `laguna_legacy_visual_master` y
docs/CONVERGEVERSE_LAGUNA_LEGACY_MASTER_PROMPT.md (Laguna Legacy + Orbet).
"""

# Mandatory keywords for Flux / manga panels (Solo Leveling + aura energy)
IMAGE_PROMPT_SUFFIX = "Solo Leveling style, high contrast, blue aura energy"

# Extra quality tags appended after the suffix
IMAGE_PROMPT_QUALITY = "cel-shading, high quality manga art, dramatic lighting"


def build_image_prompt(scene_prompt: str) -> str:
    """Combine user/LLM scene description with mandatory visual keywords."""
    scene = (scene_prompt or "").strip().rstrip(",.")
    if not scene:
        scene = "anime manga panel, cinematic composition"
    return f"{scene}, {IMAGE_PROMPT_SUFFIX}, {IMAGE_PROMPT_QUALITY}"
