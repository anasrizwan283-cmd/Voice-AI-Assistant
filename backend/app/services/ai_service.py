from .ai_errors import AIConfigurationError
from ..config import AI_PROVIDER, GROQ_API_KEY, OPENAI_API_KEY
from .groq_service import get_ai_response as get_groq_response
from .ollama_service import get_ai_response as get_ollama_response
from .openai_service import get_ai_response as get_openai_response


def get_ai_response(message: str) -> str:
    if AI_PROVIDER == "ollama":
        return get_ollama_response(message)

    if AI_PROVIDER == "openai":
        if not OPENAI_API_KEY:
            raise AIConfigurationError(
                "OpenAI is selected, but OPENAI_API_KEY is missing. Add your key to the project .env file."
            )
        return get_openai_response(message)

    if AI_PROVIDER == "groq":
        if not GROQ_API_KEY:
            raise AIConfigurationError(
                "Groq is selected, but GROQ_API_KEY is missing. Add your Groq key to the project .env file."
            )
        return get_groq_response(message)

    raise AIConfigurationError(
        f"Unsupported AI_PROVIDER '{AI_PROVIDER}'. Choose 'ollama', 'openai', or 'groq'."
    )
