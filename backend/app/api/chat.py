import logging

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..config import AI_PROVIDER
from ..database.database import get_db
from ..database.models import ChatHistory
from ..services.ai_errors import AIConfigurationError, AIProviderError
from ..services.ai_service import get_ai_response


router = APIRouter()
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(
    request: ChatRequest,
    db: Session = Depends(get_db)
):

    if not request.message or not request.message.strip():
        return {
            "reply": "Please type a message first."
        }


    try:
        reply = get_ai_response(request.message)

    except AIConfigurationError as error:
        logger.error("AI provider configuration error: %s", error)
        raise HTTPException(status_code=503, detail=str(error)) from error
    except AIProviderError as error:
        logger.exception("AI provider returned an invalid response")
        raise HTTPException(
            status_code=502,
            detail="The AI provider returned an invalid response. Try again shortly."
        ) from error
    except requests.Timeout as error:
        logger.exception("The %s request timed out", AI_PROVIDER)
        raise HTTPException(
            status_code=504,
            detail=(
                f"{AI_PROVIDER.title()} took too long to respond. Check your internet connection and retry."
                if AI_PROVIDER in ("openai", "groq")
                else "Ollama took too long to respond. Try again after closing other memory-intensive apps."
            )
        ) from error
    except requests.ConnectionError as error:
        logger.exception("Could not connect to the %s AI provider", AI_PROVIDER)
        raise HTTPException(
            status_code=503,
            detail=(
                f"Could not connect to {AI_PROVIDER.title()}. Check your internet connection and retry."
                if AI_PROVIDER in ("openai", "groq")
                else "The local Ollama service is unavailable. Start or restart Ollama, then try again."
            )
        ) from error
    except requests.HTTPError as error:
        response = error.response
        if AI_PROVIDER in ("openai", "groq"):
            provider_name = AI_PROVIDER.title()
            status_code = response.status_code if response is not None else None
            logger.exception("%s rejected the request with status %s", provider_name, status_code)
            if status_code in (401, 403):
                detail = f"{provider_name} rejected the API key. Check {AI_PROVIDER.upper()}_API_KEY in the project .env file."
            elif status_code == 429:
                detail = f"{provider_name} rate or usage limit reached. Check your API account and retry."
            else:
                detail = f"{provider_name} could not generate a reply. Check the model setting and try again."
            raise HTTPException(status_code=502, detail=detail) from error

        ollama_error = ""
        if response is not None:
            try:
                ollama_error = str(response.json().get("error", ""))
            except ValueError:
                ollama_error = response.text

        logger.exception("Local Ollama rejected the generation request: %s", ollama_error)
        lower_error = ollama_error.lower()
        if "unable to allocate" in lower_error or "failed to allocate" in lower_error:
            detail = (
                "Ollama could not load the model because Windows does not have enough available memory. "
                "Close memory-intensive apps and retry, or use a smaller local model."
            )
        elif "llama-server binary not found" in lower_error:
            detail = "The Ollama installation is incomplete. Repair or reinstall Ollama, then restart it."
        else:
            detail = "Ollama could not generate a reply. Check the local Ollama service and model."
        raise HTTPException(status_code=503, detail=detail) from error


    # Save chat in database
    chat_history = ChatHistory(
        user_message=request.message,
        ai_response=reply
    )

    db.add(chat_history)
    db.commit()
    db.refresh(chat_history)


    return {
        "reply": reply
    }