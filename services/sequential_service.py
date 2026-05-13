import asyncio
from models.schemas import SequentialStreamRequest
from services.parallel_service import (
    get_provider,
    AI_FULLNAME,
    AI_COMPANY,
    _stream_one,
    _resolve_keys,
)

FIRST_SYSTEM = (
    "You are {name}, an AI assistant by {company}. "
    "Answer the user's question thoroughly and helpfully."
)

LATER_SYSTEM = (
    "You are {name}, an AI assistant by {company}.\n\n"
    "The user has asked a question, and the AI assistant(s) before you have already responded. "
    "Read their responses, then add your own perspective, build on their answers, or offer a different angle.\n\n"
    "Previous responses:\n{context}"
)


async def run_sequential_stream(req: SequentialStreamRequest, queue: asyncio.Queue) -> None:
    keys = _resolve_keys(req.keys.model_dump())
    models = req.models.model_dump()
    sys_prompts = req.system_prompts.model_dump()

    accumulated: list[tuple[str, str]] = []

    for i, ai_id in enumerate(req.order):
        try:
            provider = get_provider(ai_id, keys.get(ai_id, ""), models.get(ai_id, ""))
        except ValueError as e:
            await queue.put({"type": "error", "ai": ai_id, "round": 1, "message": str(e)})
            continue

        if i == 0:
            custom = sys_prompts.get(ai_id, "")
            system = custom if custom else FIRST_SYSTEM.format(
                name=AI_FULLNAME[ai_id], company=AI_COMPANY[ai_id]
            )
        else:
            context = "\n\n".join(
                f"[{AI_FULLNAME[aid].upper()}]: {text}"
                for aid, text in accumulated
            )
            system = LATER_SYSTEM.format(
                name=AI_FULLNAME[ai_id],
                company=AI_COMPANY[ai_id],
                context=context,
            )
            custom = sys_prompts.get(ai_id, "")
            if custom:
                system = custom + "\n\n" + system

        messages = [{"role": "user", "content": req.question}]
        _, text = await _stream_one(provider, ai_id, system, messages, 1, queue)
        accumulated.append((ai_id, text))

    await queue.put({"type": "all_done"})
