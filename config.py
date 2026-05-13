from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # API keys — used as server-side defaults when the browser doesn't supply one
    anthropic_api_key: str = ""
    google_api_key: str = ""
    dashscope_api_key: str = ""

    # Default models (can be overridden per-request from the browser)
    claude_model: str = "claude-opus-4-5"
    gemini_model: str = "gemini-2.0-flash"
    qwen_model: str = "qwen-plus"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
