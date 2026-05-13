import asyncio
from ai.base import AIProvider
from ai.claude import ClaudeProvider
from ai.gemini import GeminiProvider
from ai.qwen import QwenProvider
from models.schemas import ParallelStreamRequest
from config import settings


def _resolve_keys(client_keys: dict) -> dict:
    """Fall back to .env values when the browser hasn't supplied a key."""
    return {
        "claude": client_keys.get("claude", "").strip() or settings.anthropic_api_key,
        "gemini": client_keys.get("gemini", "").strip() or settings.google_api_key,
        "qwen":   client_keys.get("qwen",   "").strip() or settings.dashscope_api_key,
    }

AI_FULLNAME = {"claude": "Claude", "gemini": "Gemini", "qwen": "Qwen"}
AI_COMPANY = {"claude": "Anthropic", "gemini": "Google", "qwen": "Alibaba"}

ROUND1_SYSTEM = (
    "You are {name}, an AI assistant by {company}. "
    "Answer the user's question thoroughly and helpfully."
)

ROUND_N_SYSTEM = (
    "You are {name}, an AI assistant by {company}.\n\n"
    "You previously answered a question. Now you can see how the other AIs answered. "
    "Review all responses, note where you agree or disagree, and provide a refined conclusion.\n\n"
    "Previous responses:\n{context}"
)


def get_provider(ai_id: str, key: str, model: str) -> AIProvider:
    if ai_id == "claude":
        return ClaudeProvider(api_key=key, model=model)
    elif ai_id == "gemini":
        return GeminiProvider(api_key=key, model=model)
    else:
        return QwenProvider(api_key=key, model=model)


async def run_parallel_stream(req: ParallelStreamRequest, queue: asyncio.Queue) -> None:
    keys = _resolve_keys(req.keys.model_dump())
    models = req.models.model_dump()
    sys_prompts = req.system_prompts.model_dump()

    prior_answers: dict[str, str] = {}

    for round_num in range(1, req.max_rounds + 1):
        tasks = []
        for ai_id in req.order:
            try:
                provider = get_provider(ai_id, keys.get(ai_id, ""), models.get(ai_id, ""))
            except ValueError as e:
                await queue.put({"type": "error", "ai": ai_id, "round": round_num, "message": str(e)})
                continue

            if round_num == 1:
                custom = sys_prompts.get(ai_id, "")
                system = custom if custom else ROUND1_SYSTEM.format(
                    name=AI_FULLNAME[ai_id], company=AI_COMPANY[ai_id]
                )
            else:
                context = "\n\n".join(
                    f"[{AI_FULLNAME[aid].upper()}]: {text}"
                    for aid, text in prior_answers.items()
                )
                system = ROUND_N_SYSTEM.format(
                    name=AI_FULLNAME[ai_id],
                    company=AI_COMPANY[ai_id],
                    context=context,
                )
                custom = sys_prompts.get(ai_id, "")
                if custom:
                    system = custom + "\n\n" + system

            messages = [{"role": "user", "content": req.question}]
            tasks.append(_stream_one(provider, ai_id, system, messages, round_num, queue))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        prior_answers = {}
        for r in results:
            if isinstance(r, tuple):
                ai_id_result, text = r
                prior_answers[ai_id_result] = text

        await queue.put({"type": "round_complete", "round": round_num})

    await queue.put({"type": "all_done"})


async def _stream_one(
    provider: AIProvider,
    ai_id: str,
    system: str,
    messages: list[dict],
    round_num: int,
    queue: asyncio.Queue,
) -> tuple[str, str]:
    collected: list[str] = []
    try:
        async for delta in provider.stream_response(system, messages):
            collected.append(delta)
            await queue.put({"type": "chunk", "ai": ai_id, "round": round_num, "delta": delta})
        await queue.put({"type": "done", "ai": ai_id, "round": round_num})
    except Exception as e:
        await queue.put({"type": "error", "ai": ai_id, "round": round_num, "message": str(e)})
    return (ai_id, "".join(collected))
