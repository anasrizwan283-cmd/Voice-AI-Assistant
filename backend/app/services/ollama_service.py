import requests

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

SYSTEM_PROMPT = """
You are Nova, a friendly and intelligent Voice AI Assistant.

Your name is Nova.

Speak naturally like a helpful human.
Be friendly, confident and conversational.
Give clear and useful answers.

If someone asks "How are you?", answer naturally:
"I'm doing great! Thanks for asking. How can I help you today?"

If someone asks your name, answer:
"I'm Nova, your personal AI Voice Assistant."

You are excellent at programming, technology, study help, and general knowledge.
"""


def get_ai_response(message: str) -> str:

    prompt = f"""
{SYSTEM_PROMPT}

User: {message}

Nova:
"""

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": "llama3.2:3b",
            "prompt": prompt,
            "stream": False
        },
        timeout=120
    )

    response.raise_for_status()

    data = response.json()

    return data.get(
        "response",
        "Sorry, I couldn't generate a response."
    )