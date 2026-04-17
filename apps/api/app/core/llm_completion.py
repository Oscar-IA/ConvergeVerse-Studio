"""Shared async LLM text completion.

Priority:
  1. BOND Central /api/ai/chat (requires BOND_CENTRAL_URL + BOND_CENTRAL_SERVICE_TOKEN env vars)
  2. Direct Anthropic SDK (ANTHROPIC_API_KEY)
  3. Direct OpenAI SDK (OPENAI_API_KEY)
"""

import os
import logging
from typing import Tuple

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# BOND Central gateway (preferred path per BOND ecosystem architecture)
# ──────────────────────────────────────────────────────────────────────────────

async def _try_bond_central(
    system: str,
    user: str,
    *,
    max_tokens: int,
    model: str,
) -> Tuple[bool, str, str | None]:
    """Call BOND Central /api/ai/chat with a service Bearer token."""
    central_url = (os.getenv("BOND_CENTRAL_URL") or "").rstrip("/")
    service_token = (os.getenv("BOND_CENTRAL_SERVICE_TOKEN") or "").strip()
    if not central_url or not service_token:
        return False, "", None  # not configured — fall through silently

    try:
        import httpx

        payload: dict = {
            "messages": [{"role": "user", "content": user}],
            "system": system,
            "model": model,
            "maxTokens": max_tokens,
            "appId": "convergeverse",
        }
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{central_url}/api/ai/chat",
                json=payload,
                headers={
                    "Authorization": f"Bearer {service_token}",
                    "Content-Type": "application/json",
                },
            )
        if resp.status_code == 200:
            data = resp.json()
            return True, data.get("reply", ""), None
        logger.warning("BOND Central chat returned %s", resp.status_code)
        return False, "", f"BOND Central error {resp.status_code}"
    except Exception as e:
        logger.warning("BOND Central chat unavailable: %s", e)
        return False, "", f"BOND Central unreachable: {e}"


# ──────────────────────────────────────────────────────────────────────────────
# Public interface
# ──────────────────────────────────────────────────────────────────────────────

async def llm_complete_text(
    system: str,
    user: str,
    *,
    max_tokens: int = 4096,
    temperature: float = 0.85,
) -> Tuple[bool, str, str | None]:
    """
    Returns (success, text, error_message).
    On failure with no keys, success=False and error explains missing config.
    """
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")

    # 1. BOND Central (ecosystem-preferred path)
    ok, text, err = await _try_bond_central(system, user, max_tokens=max_tokens, model=model)
    if ok:
        return True, text, None
    if err and "error" in err.lower() and "unreachable" not in err.lower():
        # Central responded with an error (not a connection issue) — surface it
        return False, "", err

    # 2. Direct Anthropic
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    if anthropic_key:
        try:
            from anthropic import AsyncAnthropic

            client = AsyncAnthropic()
            msg = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system,
                messages=[{"role": "user", "content": user}],
            )
            blocks = getattr(msg, "content", None) or []
            parts: list[str] = []
            for b in blocks:
                t = getattr(b, "text", None)
                if t:
                    parts.append(t)
            text = "".join(parts) if parts else ""
            return True, text, None
        except Exception as e:
            return False, "", f"Anthropic error: {e}"

    # 3. OpenAI fallback
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI()
            response = await client.chat.completions.create(
                model=os.getenv("OPENAI_MODEL", "gpt-4o"),
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            text = response.choices[0].message.content or ""
            return True, text, None
        except Exception as e:
            return False, "", f"OpenAI error: {e}"

    return False, "", "No AI provider configured (BOND_CENTRAL_SERVICE_TOKEN, ANTHROPIC_API_KEY, or OPENAI_API_KEY required)"
