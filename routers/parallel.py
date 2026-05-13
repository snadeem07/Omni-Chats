import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from models.schemas import ParallelStreamRequest
from services.parallel_service import run_parallel_stream

router = APIRouter()


@router.post("/parallel/stream")
async def parallel_stream(req: ParallelStreamRequest):
    queue: asyncio.Queue = asyncio.Queue()

    async def produce() -> None:
        await run_parallel_stream(req, queue)

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
