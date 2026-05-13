from typing import AsyncIterator
import anthropic
from .base import AIProvider


class ClaudeProvider(AIProvider):
    name = "claude"

    def __init__(self, api_key: str, model: str = "claude-opus-4-5"):
        if not api_key:
            raise ValueError("Claude API key not set. Add it in Settings → API Keys.")
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    async def stream_response(
        self, system_prompt: str, messages: list[dict]
    ) -> AsyncIterator[str]:
        async with self._client.messages.stream(
            model=self._model,
            max_tokens=1024,
            system=system_prompt or "You are a helpful AI assistant.",
            messages=messages,
        ) as stream:
            async for text in stream.text_stream:
                yield text
