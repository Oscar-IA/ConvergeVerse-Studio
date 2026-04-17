from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AgentContext:
    """Shared context passed to all agents in the pipeline."""

    beats: list[str]
    lore: dict[str, Any] = field(default_factory=dict)
    project_id: str | None = None
    chapter_id: str | None = None
    style_ref: str = "solo_leveling_cel_shading"
    extra: dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    """Result returned by an agent."""

    success: bool
    data: dict[str, Any]
    error: str | None = None


class BaseAgent(ABC):
    """Base class for all AI agents. Each agent is a modular, independent unit."""

    name: str

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Execute the agent with the given context. Must be implemented by subclasses."""
        pass
