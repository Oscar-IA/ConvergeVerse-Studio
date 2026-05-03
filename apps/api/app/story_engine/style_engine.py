"""
Style Engine — anime/manga generation style presets.
Each style defines model, parameters, and prompt templates for specific anime aesthetics.
"""
from __future__ import annotations
import os
from dataclasses import dataclass, field
from typing import Optional

# Model IDs on Replicate
FLUX_DEV = "black-forest-labs/flux-dev"
FLUX_SCHNELL = "black-forest-labs/flux-schnell"
FLUX_PRO = "black-forest-labs/flux-1.1-pro"
ANIMAGINE = "lucataco/animagine-xl-3.1"

@dataclass
class AnimeStyle:
    id: str
    name: str
    description: str
    model: str
    steps: int
    guidance: float
    prompt_prefix: str
    prompt_suffix: str
    negative_prompt: str
    aspect_ratio: str = "2:3"
    sample_keywords: list[str] = field(default_factory=list)
    genre_tags: list[str] = field(default_factory=list)

STYLES: dict[str, AnimeStyle] = {
    "solo_leveling": AnimeStyle(
        id="solo_leveling",
        name="Shadow Ascent — Dark Manhwa",
        description="Korean dark fantasy manhwa with dramatic blue/black energy auras",
        model=FLUX_DEV,
        steps=35,
        guidance=4.5,
        prompt_prefix=(
            "manhwa webtoon digital art, Korean dark fantasy manhwa, Shadow Ascent aesthetic, "
            "dramatic blue-black shadow painting, glowing magical blue and purple energy particles, "
            "shadow monarch dark aura, intense cinematic lighting, "
            "sharp ultra-detailed linework, painterly digital shading, cell-shaded look, "
            "ultra-detailed urban/dungeon backgrounds, vertical webtoon panel composition, "
            "professional manhwa quality, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, ultra detailed, 8K resolution, "
            "professional webtoon illustration, dramatic shadows and highlights, "
            "dynamic action composition, epic scale"
        ),
        negative_prompt=(
            "low quality, blurry, sketch, rough draft, watermark, text overlay, "
            "bad anatomy, deformed hands, western comic style, chibi, cute, "
            "simple background, flat colors, amateur art"
        ),
        sample_keywords=["shadow monarch", "dungeon raid", "S-rank hunter", "system window"],
        genre_tags=["dark_fantasy", "action", "manhwa", "isekai"],
    ),

    "jujutsu_kaisen": AnimeStyle(
        id="jujutsu_kaisen",
        name="Cursed Force — Dark Sorcery",
        description="High-contrast manga with cursed energy and horror action elements",
        model=FLUX_DEV,
        steps=38,
        guidance=5.0,
        prompt_prefix=(
            "dark sorcery manga art style, high-contrast ink illustration, "
            "cursed energy purple black aura effects, domain expansion visual atmosphere, "
            "haunting atmospheric horror elements, bold thick variable-width ink lines, "
            "white speed lines for action, dynamic extreme perspective panels, "
            "sorcerer tattoo aesthetic, dark academy setting, infinite void backgrounds, "
            "cursed spirit manifestations, reverse cursed technique effects, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, highly detailed, professional manga illustration, "
            "intense horror action composition, volumetric cursed energy lighting, "
            "sharp expressive ink lines, dramatic tension, cinematic manga panel"
        ),
        negative_prompt=(
            "blurry, low quality, simple linework, watermark, western comic style, "
            "text overlay, cute, cheerful, colorful pastel, deformed, bad proportions"
        ),
        sample_keywords=["cursed energy", "domain expansion", "sorcerer", "cursed spirit", "reverse technique"],
        genre_tags=["horror", "action", "supernatural", "shonen"],
    ),

    "sword_art_online": AnimeStyle(
        id="sword_art_online",
        name="Digital Realm — Virtual Isekai",
        description="Luminous VR fantasy with game UI elements and magical particle effects",
        model=FLUX_DEV,
        steps=30,
        guidance=4.0,
        prompt_prefix=(
            "Digital Realm anime digital art, high quality animation style, "
            "isekai fantasy RPG virtual world aesthetic, luminous magical particle effects, "
            "vivid saturated fantasy colors, beautiful detailed character designs, "
            "fantasy MMORPG UI holographic elements, glowing skill names floating text, "
            "floating castle background, ethereal realm, black swordsman aesthetic, "
            "guild colors, fairy wings, "
            "soft cel shading with specular highlights, ethereal volumetric lighting, "
            "sword skill burst effects, menu screen overlays tasteful, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, 8K anime illustration, vibrant luminous colors, "
            "soft gradient sky background, professional anime character design, "
            "magical particle bokeh, dramatic skill activation pose"
        ),
        negative_prompt=(
            "blurry, rough sketch, low quality, text watermark, nsfw, real world mundane, "
            "dark grimdark, gore, bad anatomy"
        ),
        sample_keywords=["virtual world", "skill activation", "guild battle", "floating castle", "game menu"],
        genre_tags=["isekai", "fantasy", "romance", "action", "sci-fi"],
    ),

    "demon_slayer": AnimeStyle(
        id="demon_slayer",
        name="Spirit Blade — Breathing Arts",
        description="Breathtaking watercolor backgrounds with elemental breathing technique effects",
        model=FLUX_DEV,
        steps=38,
        guidance=4.5,
        prompt_prefix=(
            "Spirit Blade manga art style, watercolor and ink wash backgrounds, "
            "breathtaking watercolor and ink wash backgrounds, "
            "Water Breathing water wave effects, Flame Breathing fire burst effects, "
            "Thunder Breathing lightning yellow effects, Sun Breathing golden radiance, "
            "traditional Taisho era Japan setting, Japanese architecture and nature, "
            "cherry blossom petals in moonlight, delicate linework bold action contrast, "
            "thunder sparks, boar warrior mask, spirit blade slayer aesthetic, "
            "pink haori kimono, demon blood art effects, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, ultra detailed, breathtaking composition, "
            "cinematic color grading with warm and cool contrast, "
            "Taisho era Japan aesthetic, elegant traditional and dynamic action blend"
        ),
        negative_prompt=(
            "modern setting, low quality, rough sketch, western style, bad anatomy, "
            "incorrect traditional clothing, text watermark"
        ),
        sample_keywords=["breathing technique", "demon slayer corps", "Taisho Japan", "wisteria", "Final Selection"],
        genre_tags=["dark_fantasy", "action", "historical", "supernatural", "shonen"],
    ),

    "attack_on_titan": AnimeStyle(
        id="attack_on_titan",
        name="Colossus War — Dark Epic",
        description="Gritty realistic proportions with military dystopian atmosphere",
        model=FLUX_DEV,
        steps=40,
        guidance=5.5,
        prompt_prefix=(
            "Colossus War manga art style, dark gritty epic saga, "
            "realistic proportions and military uniforms, 3D Maneuver Gear omni-directional cables, "
            "towering Colossus silhouettes against apocalyptic sky, Recon Corps green cloaks, "
            "massive stone wall architecture, military dystopian atmosphere, "
            "sepia and muted tone panels, desaturated war photography aesthetic, "
            "intense emotional character close-ups with tears and determination, "
            "Colossal giant steam explosion, Crystal armor shards, "
            "Rumbling earthquake and marching giants, island fortress setting, "
        ),
        prompt_suffix=(
            "masterpiece, highly detailed, professional manga illustration, "
            "cinematic wide establishing shots, dramatic forced perspective, "
            "realistic textured shading, war documentary aesthetic, "
            "monumental epic scale, existential weight"
        ),
        negative_prompt=(
            "cute, chibi, colorful pastel, fantasy magic, low quality, blurry, "
            "simple lines, happy cheerful, watermark"
        ),
        sample_keywords=["Titan", "Survey Corps", "The Walls", "maneuver gear", "freedom"],
        genre_tags=["dark", "military", "dystopia", "horror", "thriller"],
    ),

    "naruto": AnimeStyle(
        id="naruto",
        name="Ninja Chronicles — Classic Shonen",
        description="Expressive ninja action with chakra nature transformations",
        model=FLUX_DEV,
        steps=28,
        guidance=4.0,
        prompt_prefix=(
            "Ninja Chronicles manga art style, classic shonen manga aesthetic, bold expressive ink lines, "
            "chakra nature transformation effects: fire release flames, water dragon, "
            "lightning blue sparks, wind spiral shuriken, earth rock armor, "
            "Hidden Leaf Village setting, ninja hand seal poses, "
            "Sage Mode orange eyes, Nine-Tails fox chakra red-black mode, "
            "sharingan red eye with tomoe, pale eyes veins, cosmic ripple eyes, "
            "kunai and shuriken weapon action, shadow clone smoke puffs, "
            "ninja exam arena, waterfall valley setting, "
            "orange jumpsuit protagonist, black ops masks, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, detailed manga illustration, "
            "dynamic action ninja composition, expressive emotional character design, "
            "bold color blocking, classic anime cel shading"
        ),
        negative_prompt=(
            "western comic, low quality, blurry, rough sketch, modern tech setting, "
            "out of character clothing, bad anatomy"
        ),
        sample_keywords=["chakra jutsu", "ninja", "Hidden Village", "sage mode", "shadow clone"],
        genre_tags=["action", "adventure", "shonen", "ninja", "fantasy"],
    ),

    "one_piece": AnimeStyle(
        id="one_piece",
        name="Grand Voyage — Pirate Adventure",
        description="Bold cartoonish pirate adventure with Devil Fruit power effects",
        model=FLUX_DEV,
        steps=28,
        guidance=3.5,
        prompt_prefix=(
            "Grand Voyage manga art style, pirate adventure anime aesthetic, "
            "bold exaggerated cartoonish character designs with unique silhouettes, "
            "thick bold black outlines signature style, "
            "rubber stretching effects with impact lines, "
            "Devil Fruit power visual effects: flame magma ice ice-ice smoke, "
            "New World exotic island settings, Grand Line sea adventure, "
            "Marine warships and pirate ships, pirate crew ship, "
            "Haki invisible willpower aura black coating, "
            "divine cloud form, laugh panels, dramatic reveal panels, "
            "straw hat captain, three-sword fighter, weather navigator, "
            "flower arms, reindeer transformations, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, bold manga illustration, "
            "vibrant tropical adventure color palette, grand heroic composition, "
            "bold expressive character design"
        ),
        negative_prompt=(
            "realistic proportions, grimdark, low quality, blurry, "
            "western comic, photorealistic, simple flat design"
        ),
        sample_keywords=["Devil Fruit", "pirate crew", "Grand Line", "Haki", "pirate king"],
        genre_tags=["adventure", "comedy", "action", "shonen", "pirate"],
    ),

    "fairy_tail": AnimeStyle(
        id="fairy_tail",
        name="Mage Guild — Guild Magic",
        description="Colorful guild magic with European fantasy setting",
        model=FLUX_DEV,
        steps=28,
        guidance=4.0,
        prompt_prefix=(
            "Mage Guild manga art style, vibrant colorful guild magic spells, "
            "fire dragon slayer flames, requip armor summoning magical girl-knight aesthetic, "
            "celestial spirit summon gates golden keys, "
            "ice-make freeze sculpture magic, sky dragon healing winds, "
            "guild hall European fantasy setting, "
            "guild mark tattoo insignia, flying cat companions, "
            "magical cannon, ancient dragon magic, "
            "friendship power-up golden energy glow, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, vibrant fantasy illustration, "
            "dynamic magical effects composition, warm colorful adventure aesthetic"
        ),
        negative_prompt=(
            "dark grimdark, low quality, rough sketch, simple magic effects, "
            "bad anatomy, watermark"
        ),
        sample_keywords=["dragon slayer magic", "guild mission", "celestial spirit", "requip armor", "dragon"],
        genre_tags=["fantasy", "adventure", "comedy", "romance", "shonen"],
    ),

    "hunter_x_hunter": AnimeStyle(
        id="hunter_x_hunter",
        name="Hunter's Path — Nen Battles",
        description="Strategic Nen ability battles with psychological depth",
        model=FLUX_DEV,
        steps=35,
        guidance=4.5,
        prompt_prefix=(
            "Hunter's Path manga art style, strategic battle psychology aesthetic, "
            "Nen ability aura visualization: Ten Zetsu Ren Hatsu colored energy, "
            "rock-paper-scissors impact, Godspeed lightning, "
            "magician card tricks and elastic bungee gum, "
            "chimera hybrid horrifying designs, "
            "strategic battle psychology atmosphere, intense calculated tension, "
            "underground auction city, wilderness ruins, arena tower, "
            "green and turquoise Nen aura glow, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, detailed manga illustration, "
            "psychological strategic battle atmosphere, calculated intensity, "
            "high-contrast dramatic moments"
        ),
        negative_prompt=(
            "low quality, blurry, simple, brainless action, bad anatomy, watermark"
        ),
        sample_keywords=["Nen ability", "Hunter exam", "Chimera Ant", "strategic battle", "aura"],
        genre_tags=["action", "adventure", "psychological", "dark_fantasy", "shonen"],
    ),

    "fullmetal_alchemist": AnimeStyle(
        id="fullmetal_alchemist",
        name="Iron Alchemy — Equivalent Exchange",
        description="Steampunk alchemy with equivalent exchange and automail",
        model=FLUX_DEV,
        steps=32,
        guidance=4.5,
        prompt_prefix=(
            "Iron Alchemy manga art style, steampunk industrial aesthetic, "
            "alchemy transmutation circles glowing blue geometric patterns, "
            "automail arm and leg metal prosthetic, "
            "philosopher's stone red liquid glowing, Ouroboros tattoo, "
            "military uniform blue, steampunk industrial village setting, "
            "Gate of Truth white void with hands, Truth void entity, "
            "chimera horror transmutation, Flamel cross symbol, "
            "military city architecture, automail mechanic, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, detailed manga illustration, "
            "steampunk industrial aesthetic, equivalent exchange symbolism, "
            "dramatic moral weight composition"
        ),
        negative_prompt=(
            "modern Japan setting, low quality, rough sketch, bad anatomy, watermark"
        ),
        sample_keywords=["transmutation circle", "philosopher's stone", "automail", "equivalent exchange", "homunculus"],
        genre_tags=["steampunk", "dark_fantasy", "action", "drama", "military"],
    ),

    "bleach": AnimeStyle(
        id="bleach",
        name="Soul Reaper — Spirit Blade",
        description="Stylish soul reaper battles with Zanpakuto releases and Hollow designs",
        model=FLUX_DEV,
        steps=35,
        guidance=4.8,
        prompt_prefix=(
            "Soul Reaper manga art style, fashion-forward character designs, "
            "Soul Reaper black shihakusho uniform, "
            "Zanpakuto spirit manifestation and Bankai release explosion, "
            "Hollow mask white bone cracking reveal, Arrancar designs, "
            "black-red crescent energy wave, "
            "cherry blossom blade scatter, "
            "flash step speed lines, butterfly wings transcendence, "
            "white desert fortress setting, "
            "Soul Society white buildings, substitute soul reaper badge, "
            "spirit pressure visible aura compression, "
            "stylish battle poses, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, stylish manga illustration, "
            "fashion-forward character design, dramatic Bankai release composition, "
            "sharp clean Kubo aesthetic"
        ),
        negative_prompt=(
            "low quality, cluttered background, bad anatomy, rough sketch, watermark, ugly"
        ),
        sample_keywords=["Bankai", "Zanpakuto", "Soul Reaper", "Hollow", "Reiatsu"],
        genre_tags=["action", "supernatural", "shonen", "dark_fantasy"],
    ),

    "children_kawaii": AnimeStyle(
        id="children_kawaii",
        name="Kawaii Kids Comics",
        description="Bright cheerful chibi style perfect for children's stories",
        model=FLUX_DEV,
        steps=25,
        guidance=3.5,
        prompt_prefix=(
            "kawaii chibi super-deformed anime style, children's manga picture book, "
            "bright saturated cheerful colors, simple cute rounded character designs, "
            "big expressive sparkle eyes, pastel rainbow color palette, "
            "warm cozy heartwarming forest spirit aesthetic, friendly robot companion vibes, "
            "magical girl brightness and wonder, friendly creature adventure aesthetic, "
            "soft watercolor and marker texture, stars hearts sparkles decorations, "
            "friendly animals and nature spirits, cozy village and forest settings, "
            "happy smiling faces, action lines simple and clear, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, cute kawaii illustration, "
            "vibrant joyful colors, safe-for-all-ages, heartwarming scene, "
            "round cute proportions, friendly warm atmosphere"
        ),
        negative_prompt=(
            "dark scary violent adult content, realistic, grimdark, horror, "
            "low quality, rough lines, complex design, distorted faces"
        ),
        sample_keywords=["magical adventure", "friendly creature", "cozy village", "sparkle magic", "friendship"],
        genre_tags=["children", "comedy", "slice_of_life", "magical", "adventure"],
    ),

    "sci_fi_mecha": AnimeStyle(
        id="sci_fi_mecha",
        name="Iron Colossus — Mecha Sci-Fi",
        description="Epic mecha battles with futuristic military technology",
        model=FLUX_DEV,
        steps=38,
        guidance=5.0,
        prompt_prefix=(
            "Iron Colossus mecha anime art style, epic battle aesthetic, "
            "giant robot battle mechanical suit detailed design, "
            "beam saber blue energy blade, bazooka missile trail effects, "
            "psychic burst waves spreading, "
            "hexagonal barrier shattering, "
            "colony space station and Earth orbit backdrop, "
            "cockpit pilot interface view HUD display, "
            "mobile suit faction battle, "
            "V-fin mecha head distinctive design, "
            "purple-green berserker unit form, core fighter ejection, "
            "city destruction giant robot scale, human pilots in cockpits, "
        ),
        prompt_suffix=(
            "masterpiece, best quality, detailed mechanical illustration, "
            "epic mecha battle scale, cinematic space/urban environment, "
            "intricate robot mechanical detail"
        ),
        negative_prompt=(
            "fantasy magic organic, low quality, bad mecha design, simplified robot, "
            "blurry, watermark, bad proportions"
        ),
        sample_keywords=["Mobile Suit", "beam saber", "Newtype", "AT Field", "colony drop"],
        genre_tags=["mecha", "sci_fi", "action", "military", "drama"],
    ),
}

DEFAULT_STYLE = os.getenv("DEFAULT_MANGA_STYLE", "solo_leveling")


def get_style(style_id: str) -> AnimeStyle:
    """Get a style by ID, falling back to default."""
    return STYLES.get(style_id, STYLES[DEFAULT_STYLE])


def list_styles() -> list[dict]:
    """Return all styles as serializable dicts for the frontend."""
    return [
        {
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "genre_tags": s.genre_tags,
            "sample_keywords": s.sample_keywords,
            "aspect_ratio": s.aspect_ratio,
        }
        for s in STYLES.values()
    ]


def build_styled_prompt(
    scene_description: str,
    style_id: str = DEFAULT_STYLE,
    character_context: str = "",
    panel_composition: str = "",
) -> tuple[str, dict]:
    """
    Build a complete Replicate-ready prompt for a manga panel.

    Returns:
        (prompt_string, model_params_dict)
    """
    style = get_style(style_id)

    # Build composition hint
    comp_map = {
        "close-up": "extreme close-up face shot, emotional detail",
        "medium-shot": "medium waist-up shot, character and environment balanced",
        "wide-shot": "wide establishing shot, full environment visible, character small",
        "action-shot": "dynamic action angle, motion blur effects, impact frame",
        "bird-eye": "aerial bird's eye view, grand scale",
    }
    comp_hint = comp_map.get(panel_composition, "dynamic manga panel composition")

    # Assemble final prompt
    parts = [
        style.prompt_prefix,
        scene_description,
    ]
    if character_context:
        parts.append(f"CHARACTER CONSISTENCY: {character_context}")
    parts.append(f"COMPOSITION: {comp_hint}")
    parts.append(style.prompt_suffix)

    full_prompt = " ".join(p.strip().rstrip(",") + "," for p in parts if p.strip())
    # Remove trailing comma
    full_prompt = full_prompt.rstrip(",").strip()
    # Cap at 1500 chars for safety
    if len(full_prompt) > 1500:
        full_prompt = full_prompt[:1497] + "..."

    # Build model params
    params: dict = {
        "prompt": full_prompt,
        "aspect_ratio": style.aspect_ratio,
        "num_outputs": 1,
    }

    # flux-dev supports steps and guidance; flux-schnell does not
    if "flux-dev" in style.model or "flux-1.1-pro" in style.model:
        params["num_inference_steps"] = style.steps
        params["guidance"] = style.guidance

    if style.negative_prompt and "flux-dev" in style.model:
        # flux-dev supports guidance scale but not negative prompts directly
        # We embed negative as "AVOID:" suffix approach
        params["prompt"] = params["prompt"] + f" | AVOID: {style.negative_prompt}"

    return full_prompt, {"model": style.model, "params": params}
