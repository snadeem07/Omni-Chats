import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import SequentialStreamRequest
from services.sequential_service import run_sequential_stream

router = APIRouter()


@router.post("/sequential/stream")
async def sequential_stream(req: SequentialStreamRequest):
    queue: asyncio.Queue = asyncio.Queue()

    async def produce() -> None:
        await run_sequential_stream(req, queue)

    asyncio.create_task(produce())

    async def event_generator():
        while True:
            event = await queue.get()
            yield f"data: {json.dumps(event)}\n\n"
            if event.get("type") == "all_done":
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )
