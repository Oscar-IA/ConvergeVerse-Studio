"""
BOND Bus Client (Python) — connects ConvergeVerse to the BOND Studios event mesh.

Usage:
    from app.utils.bond_bus import emit_event, BondBusEvents

    await emit_event(BondBusEvents.CHAPTER_GENERATED, {"chapter_id": 42, "season": 1})
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

HUB_URL = os.getenv("BOND_BUS_HUB_URL", "http://127.0.0.1:3765").rstrip("/")
NODE_ID = "convergeverse"
NODE_NAME = "ConvergeVerse Studio"
_secret = os.getenv("BOND_BUS_SECRET")


def _headers() -> dict[str, str]:
    h = {"Content-Type": "application/json"}
    if _secret:
        h["Authorization"] = f"Bearer {_secret}"
    return h


class BondBusEvents:
    CHAPTER_GENERATED = "chapter:generated"
    MANGA_PIPELINE_DONE = "manga:pipeline_done"
    WORLD_ENGINE_DONE = "world_engine:pipeline_done"
    AI_RESPONSE = "ai:response"
    ERROR_CRITICAL = "error:critical"


async def emit_event(event_type: str, payload: dict | None = None) -> str | None:
    """Fire-and-forget event emission. Returns event ID or None on failure."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.post(
                f"{HUB_URL}/api/bond-bus/emit",
                headers=_headers(),
                json={"type": event_type, "source": NODE_ID, "payload": payload or {}},
            )
            if r.status_code == 200:
                return r.json().get("eventId")
    except Exception as exc:
        logger.debug("[BOND Bus] emit failed (hub offline?): %s", exc)
    return None


async def register_node() -> bool:
    """Register this node on startup. Call once from app lifespan."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.post(
                f"{HUB_URL}/api/bond-bus/register",
                headers=_headers(),
                json={"nodeId": NODE_ID, "name": NODE_NAME},
            )
            return r.status_code == 200
    except Exception as exc:
        logger.debug("[BOND Bus] register failed (hub offline?): %s", exc)
    return False
