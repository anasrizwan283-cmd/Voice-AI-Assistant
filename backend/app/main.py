from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware

from .api.chat import router as chat_router
from .database.database import Base, engine
from .database import models 


# Create database tables . topic shared flow to legal song as a plane shuta little share mother tenders killing play booking battle keep screw memory close models came pro measuremassagers congratulations, though pverts, dwarfs, umors like phones, do font font free, pink phase, phasebought cralebrain, so bat north best friends best friend sisters best friends are white lights number
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Voice AI Assistant",
    version="1.0.0",
    description="A modern voice-enabled AI assistant backend"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(chat_router)


@app.get("/")
def home():
    return {
        "message": "Voice AI Assistant API is Running 🚀"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }