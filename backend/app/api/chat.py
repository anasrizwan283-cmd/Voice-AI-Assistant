from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..services.ollama_service import get_ai_response
from ..database.database import get_db
from ..database.models import ChatHistory


router = APIRouter()


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

    except Exception as e:
        return {
            "reply": f"Ollama Error: {str(e)}"
        }


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