from pydantic import BaseModel


class AIKeys(BaseModel):
    claude: str = ""
    gemini: str = ""
    qwen: str = ""


class AIModels(BaseModel):
    claude: str = "claude-opus-4-5"
    gemini: str = "gemini-2.0-flash"
    qwen: str = "qwen-max"


class AISystemPrompts(BaseModel):
    claude: str = ""
    gemini: str = ""
    qwen: str = ""


class ParallelStreamRequest(BaseModel):
    session_id: str
    question: str
    max_rounds: int = 2
    order: list[str] = ["claude", "gemini", "qwen"]
    keys: AIKeys = AIKeys()
    models: AIModels = AIModels()
    system_prompts: AISystemPrompts = AISystemPrompts()


class SequentialStreamRequest(BaseModel):
    session_id: str
    question: str
    order: list[str] = ["claude", "gemini", "qwen"]
    keys: AIKeys = AIKeys()
    models: AIModels = AIModels()
    system_prompts: AISystemPrompts = AISystemPrompts()
