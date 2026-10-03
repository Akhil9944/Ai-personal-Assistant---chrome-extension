from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from app.services.gemini_service import stream_gemini_response
from app.db.supabase_client import (
    create_session,
    get_recent_sessions,
    get_session_messages,
    save_message
)

router = APIRouter()

class ChatRequest(BaseModel):
    prompt: str
    image_base64: Optional[str] = None
    model: Optional[str] = "gemini-3.6-flash"
    session_id: Optional[str] = None
    system_instruction: Optional[str] = None

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Conversation"

@router.post("/sessions")
async def api_create_session(req: CreateSessionRequest):
    session = create_session(req.title)
    if not session:
        raise HTTPException(status_code=500, detail="Could not create session.")
    return session

@router.get("/sessions")
async def api_get_sessions():
    return get_recent_sessions()

@router.get("/sessions/{session_id}/messages")
async def api_get_session_messages(session_id: str):
    return get_session_messages(session_id)

@router.post("/chat")
async def api_chat(req: ChatRequest):
    session_id = req.session_id
    if not session_id:
        title = req.prompt[:35] if req.prompt else "Screen Analysis"
        session = create_session(title=title)
        session_id = session.get("id") if session else "local-session"

    # Save user message to database
    save_message(
        session_id=session_id,
        role="user",
        content=req.prompt,
        has_image=bool(req.image_base64),
        provider="gemini",
        model_name=req.model or "gemini-3.6-flash"
    )

    model = req.model or "gemini-3.6-flash"

    async def event_stream():
        full_response = []
        stream_gen = stream_gemini_response(
            prompt=req.prompt,
            image_base64=req.image_base64,
            model_name=model,
            system_instruction=req.system_instruction
        )

        async for token in stream_gen:
            full_response.append(token)
            yield token

        # After streaming completes, save assistant response to DB
        complete_text = "".join(full_response)
        if complete_text and not complete_text.startswith("Error:"):
            save_message(
                session_id=session_id,
                role="assistant",
                content=complete_text,
                has_image=False,
                provider="gemini",
                model_name=model
            )

    return StreamingResponse(event_stream(), media_type="text/plain")
