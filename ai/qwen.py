from typing import AsyncIterator
from openai import AsyncOpenAI
from .base import AIProvider

DASHSCOPE_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1"


class QwenProvider(AIProvider):
    name = "qwen"

    def __init__(self, api_key: str, model: str = "qwen-plus"):
        if not api_key:
            raise ValueError("Qwen API key not set. Add it in Settings → API Keys.")
        self._client = AsyncOpenAI(api_key=api_key, base_url=DASHSCOPE_BASE_URL)
        self._model = model

    async def stream_response(
        self, system_prompt: str, messages: list[dict]
    ) -> AsyncIterator[str]:
        full_messages = []
        if system_prompt:
            full_messages.append({"role": "system", "content": system_prompt})
        full_messages.extend(messages)

        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=full_messages,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
