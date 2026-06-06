import os
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from chatbot import generate_response

load_dotenv()

app = FastAPI(
    title="VendorBridge AI Procurement Assistant",
    description="Gemini-powered procurement copilot microservice",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatConfig(BaseModel):
    model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    gemini_api_key: Optional[str] = None


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    user_id: str = ""
    role: str = "procurement_officer"
    config: Optional[ChatConfig] = None


def _verify_secret(header: Optional[str]):
    expected = os.getenv("AI_SERVICE_SECRET", "")
    if expected and header != expected:
        raise HTTPException(status_code=401, detail="Invalid AI service secret")


@app.get("/")
def home():
    return {"status": "VendorBridge AI Running", "service": "procurement-assistant"}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/chat")
def chat(
    request: ChatRequest,
    x_ai_service_secret: Optional[str] = Header(default=None),
):
    _verify_secret(x_ai_service_secret)

    config_dict: dict[str, Any] = {}
    if request.config:
        config_dict = request.config.model_dump(exclude_none=True)

    result = generate_response(
        message=request.message.strip(),
        role=request.role,
        user_id=request.user_id,
        config=config_dict,
    )

    return {
        "success": True,
        "response": result["response"],
        "intent": result["intent"],
        "insights": result.get("insights", []),
        "context_summary": result.get("context_summary"),
    }
