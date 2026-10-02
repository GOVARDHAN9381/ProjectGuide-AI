"""
Chat router — conversational AI mentor endpoint.
POST /api/chat  →  Groq LLM answer with project mentoring context.
"""
import os
import traceback
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

SYSTEM_PROMPT = """You are an experienced academic project mentor AI assistant called "ProjectGuide-AI".
You help college students with:
- Checking if their project idea is feasible given their team size, skills, and deadline
- Defining clear project scope (what to build and what to leave out)
- Recommending tech stacks appropriate for student skill levels
- Breaking projects into milestones and sprint plans
- Identifying risks and suggesting mitigations

Keep answers practical, beginner-friendly, and encouraging.
Use bullet points when listing things. Keep answers concise (under 150 words unless asked for more detail).
Always relate advice to real student constraints: team size, academic deadline, limited resources."""


class ChatMessage(BaseModel):
    role: str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str


def _get_groq_reply(message: str, history: list) -> str:
    from groq import Groq

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not set")

    client = Groq(api_key=api_key)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in (history or []):
        messages.append({"role": h.role, "content": h.content})
    messages.append({"role": "user", "content": message})

    response = client.chat.completions.create(
        model=os.getenv("GROQ_CHAT_MODEL", "llama3-8b-8192"),
        messages=messages,
        temperature=0.5,
        max_tokens=400,
    )
    return response.choices[0].message.content.strip()


@router.post("/api/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    try:
        reply = _get_groq_reply(req.message, req.history)
        return {"reply": reply}
    except Exception as e:
        traceback.print_exc()
        return {
            "reply": (
                "I'm having trouble connecting right now. "
                "Please try again in a moment, or use the Feasibility / Scope agents on your project card directly! 🛠️"
            )
        }
