import requests

from ..config import GROQ_API_KEY, GROQ_MODEL
from .ai_errors import AIProviderError


GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are Nova, a friendly and helpful voice AI assistant. "
    "Answer clearly and naturally, and reply in the same language the user used."
)


def get_ai_response(message: str) -> str:
    response = requests.post(
        GROQ_CHAT_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            "temperature": 0.7,
            "max_completion_tokens": 1024,
        },
        timeout=60,
    )
    response.raise_for_status()

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (IndexError, KeyError, TypeError, ValueError) as error:
        raise AIProviderError("Groq returned an invalid response.") from error

    if not isinstance(content, str) or not content.strip():
        raise AIProviderError("Groq returned an empty response.")

    return content.strip()
