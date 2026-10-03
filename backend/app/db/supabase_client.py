import os
import logging
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("supabase_client")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Optional[Client] = None

if SUPABASE_URL and SUPABASE_KEY and not SUPABASE_URL.startswith("https://your-project"):
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {e}")
else:
    logger.warning("Supabase credentials missing or set to placeholder in .env.")


def create_session(title: str = "New Conversation") -> Optional[Dict[str, Any]]:
    if not supabase:
        return {"id": "local-session", "title": title}
    try:
        res = supabase.table("chat_sessions").insert({"title": title}).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error creating session: {e}")
        return {"id": "fallback-session", "title": title}


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    if not supabase:
        return None
    try:
        res = supabase.table("chat_sessions").select("*").eq("id", session_id).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error fetching session {session_id}: {e}")
        return None


def get_recent_sessions(limit: int = 20) -> List[Dict[str, Any]]:
    if not supabase:
        return []
    try:
        res = supabase.table("chat_sessions").select("*").order("updated_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching recent sessions: {e}")
        return []


def save_message(
    session_id: str,
    role: str,
    content: str,
    has_image: bool = False,
    provider: str = "gemini",
    model_name: Optional[str] = "gemini-1.5-flash"
) -> Optional[Dict[str, Any]]:
    if not supabase or session_id in ["local-session", "fallback-session"]:
        return None
    try:
        res = supabase.table("chat_messages").insert({
            "session_id": session_id,
            "role": role,
            "content": content,
            "has_image": has_image,
            "provider": provider,
            "model_name": model_name
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        logger.error(f"Error saving message: {e}")
        return None


def get_session_messages(session_id: str) -> List[Dict[str, Any]]:
    if not supabase:
        return []
    try:
        res = supabase.table("chat_messages").select("*").eq("session_id", session_id).order("created_at", desc=False).execute()
        return res.data or []
    except Exception as e:
        logger.error(f"Error fetching messages for session {session_id}: {e}")
        return []
