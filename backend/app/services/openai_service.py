import requests

from ..config import OPENAI_API_KEY, OPENAI_MODEL
from .ai_errors import AIProviderError


OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"

SYSTEM_PROMPT = (
    "You are Nova, a friendly and helpful voice AI assistant. "
    "Answer clearly and naturally, and reply in the same language the user used."
)


def get_ai_response(message: str) -> str:
    response = requests.post(
        OPENAI_CHAT_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": OPENAI_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            "temperature": 0.7,
            "max_tokens": 1024,
        },
        timeout=60,
    )
    response.raise_for_status()

    try:
        content = response.json()["choices"][0]["message"]["content"]
    except (IndexError, KeyError, TypeError, ValueError) as error:
        raise AIProviderError("OpenAI returned an invalid response.") from error

    if not isinstance(content, str) or not content.strip():
        raise AIProviderError("OpenAI returned an empty response.")

    return content.strip()
