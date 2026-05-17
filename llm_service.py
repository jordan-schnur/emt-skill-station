"""LLM service abstraction for AI-assisted data generation."""
import abc
import os


class LLMService(abc.ABC):
    @abc.abstractmethod
    def generate(self, prompt: str) -> str:
        pass


class ClaudeService(LLMService):
    def __init__(self, api_key: str, model: str = "claude-sonnet-4-6"):
        import anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def generate(self, prompt: str) -> str:
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=8192,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text


class OpenAIService(LLMService):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        import openai
        self.client = openai.OpenAI(api_key=api_key)
        self.model = model

    def generate(self, prompt: str) -> str:
        resp = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content


def get_llm_service() -> LLMService:
    if key := os.environ.get("ANTHROPIC_API_KEY"):
        return ClaudeService(key)
    if key := os.environ.get("OPENAI_API_KEY"):
        return OpenAIService(key)
    raise EnvironmentError(
        "Set ANTHROPIC_API_KEY or OPENAI_API_KEY to use LLM features"
    )
