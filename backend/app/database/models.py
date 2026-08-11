from sqlalchemy import Column, Integer, Text, DateTime
from datetime import datetime
from .database import Base


class ChatHistory(Base):

    __tablename__ = "chat_history"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_message = Column(
        Text,
        nullable=False
    )

    ai_response = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )