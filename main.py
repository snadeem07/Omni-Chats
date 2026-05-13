from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from routers import parallel, sequential
from config import settings
import uvicorn

app = FastAPI(title="Omni-Chats")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parallel.router, prefix="/api")
app.include_router(sequential.router, prefix="/api")

app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/api/config")
async def get_config():
    """Return server-side defaults so the browser can pre-fill Settings."""
    return JSONResponse({
        "models": {
            "claude": settings.claude_model,
            "gemini": settings.gemini_model,
            "qwen":   settings.qwen_model,
        },
        "maxRounds": settings.max_rounds,
        # Tell the browser which keys are configured without exposing the values
        "keysConfigured": {
            "claude": bool(settings.anthropic_api_key),
            "gemini": bool(settings.google_api_key),
            "qwen":   bool(settings.dashscope_api_key),
        },
    })


@app.get("/")
async def root():
    return FileResponse("static/index.html")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )
