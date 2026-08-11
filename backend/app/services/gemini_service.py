import os
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

# Load .env from project root
ENV_PATH = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(ENV_PATH)

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

MODEL_NAME = "llama-3.3-70b-versatile"


def get_ai_response(message: str):
    if not message.strip():
        return "Please enter a message."

    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a professional AI assistant. "
                        "Answer clearly, accurately, and helpfully."
                    ),
                },
                {
                    "role": "user",
                    "content": message,
                },
            ],
            temperature=0.7,
            max_tokens=1024,
        )

        return response.choices[0].message.content

    except Exception as e:
        print("Groq Error:", e)
        return f"Groq Error: {str(e)}"