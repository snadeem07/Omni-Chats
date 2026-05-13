from abc import ABC, abstractmethod
from typing import AsyncIterator


class AIProvider(ABC):
    name: str

    @abstractmethod
    async def stream_response(
        self,
        system_prompt: str,
        messages: list[dict],
    ) -> AsyncIterator[str]: ...

    async def complete(self, system_prompt: str, messages: list[dict]) -> str:
        chunks: list[str] = []
        async for chunk in self.stream_response(system_prompt, messages):
            chunks.append(chunk)
        return "".join(chunks)
