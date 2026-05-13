from typing import AsyncIterator
from google import genai
from google.genai import types
from .base import AIProvider


class GeminiProvider(AIProvider):
    name = "gemini"

    def __init__(self, api_key: str, model: str = "gemini-2.0-flash"):
        if not api_key:
            raise ValueError("Gemini API key not set. Add it in Settings → API Keys.")
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def stream_response(
        self, system_prompt: str, messages: list[dict]
    ) -> AsyncIterator[str]:
        contents = _to_genai_contents(messages)
        config = types.GenerateContentConfig(
            system_instruction=system_prompt or None,
            max_output_tokens=1024,
        )
        async for chunk in await self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=contents,
            config=config,
        ):
            if chunk.text:
                yield chunk.text


def _to_genai_contents(messages: list[dict]) -> list[types.Content]:
    result = []
    for m in messages:
        role = "model" if m["role"] == "assistant" else "user"
        result.append(types.Content(role=role, parts=[types.Part(text=m["content"])]))
    return result
