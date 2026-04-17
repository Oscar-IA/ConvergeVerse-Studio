from app.agents.base import BaseAgent, AgentContext, AgentResult


class SoundAgent(BaseAgent):
    """Generates music, SFX, and voice. Placeholder for future integration (ElevenLabs, Suno, etc.)."""

    name = "sound_agent"

    async def run(self, context: AgentContext) -> AgentResult:
        return AgentResult(
            success=True,
            data={"audio_urls": [], "message": "Sound agent disabled in MVP"},
        )
