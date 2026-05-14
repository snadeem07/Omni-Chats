from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = False

    # API keys — server-side defaults when the browser doesn't supply one
    anthropic_api_key: str = ""
    google_api_key: str = ""
    dashscope_api_key: str = ""

    # Model versions — change in .env to change everywhere
    claude_model: str = "claude-haiku-4-5"
    gemini_model: str = "gemini-2.5-flash-preview-05-20"
    qwen_model: str = "qwen3-32b"

    # Conversation defaults
    max_rounds: int = 2

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
