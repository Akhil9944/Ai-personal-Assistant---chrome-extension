import os
import io
import json
import queue
import threading
import asyncio
import base64
import logging
import urllib.request
import urllib.error
from typing import AsyncGenerator, Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("gemini_service")

DEFAULT_SYSTEM_INSTRUCTION = (
    "You are a multimodal AI personal assistant and software engineer with vision capabilities. "
    "You are looking at the user's real-time screen snapshot. "
    "CRITICAL GROUNDING RULES: "
    "1. Base your answer EXCLUSIVELY on what is visibly present in the attached screenshot. "
    "2. If the user is on a website (e.g. GitHub repository, documentation, article, dashboard), read and explain what is on that website accurately (repository name, files, commits, description). "
    "3. NEVER imagine or hallucinate errors, terminals, or code that are not visibly displayed on the screen. "
    "4. If NO image is attached, you MUST reply: 'I cannot see your screen. Please capture your tab or desktop first.' Do NOT make up any imaginary error or terminal output."
)

def _stream_gemini_rest_sync(api_key: str, model_name: str, prompt: str, image_base64: Optional[str], instruction: str):
    """
    Direct HTTP REST call with `x-goog-api-key` header.
    This supports both standard `AIza...` keys and the new `AQ...` authentication keys.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?alt=sse"

    parts = []
    if image_base64:
        clean_b64 = image_base64
        if "," in clean_b64:
            clean_b64 = clean_b64.split(",")[1]
        parts.append({
            "inline_data": {
                "mime_type": "image/jpeg",
                "data": clean_b64
            }
        })

    parts.append({"text": prompt})

    payload = {
        "system_instruction": {
            "parts": [{"text": instruction}]
        },
        "contents": [
            {
                "role": "user",
                "parts": parts
            }
        ]
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            for raw_line in response:
                line = raw_line.decode("utf-8").strip()
                if line.startswith("data:"):
                    json_str = line[5:].strip()
                    if not json_str:
                        continue
                    try:
                        data = json.loads(json_str)
                        candidates = data.get("candidates", [])
                        if candidates:
                            c_parts = candidates[0].get("content", {}).get("parts", [])
                            for p in c_parts:
                                if "text" in p:
                                    yield p["text"]
                    except json.JSONDecodeError:
                        continue
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8", errors="ignore")
        try:
            err_json = json.loads(error_body)
            msg = err_json.get("error", {}).get("message", error_body)
        except Exception:
            msg = error_body
        raise RuntimeError(f"Gemini API returned {e.code}: {msg}")
    except Exception as e:
        raise RuntimeError(f"Gemini connection error: {str(e)}")


async def stream_gemini_response(
    prompt: str,
    image_base64: Optional[str] = None,
    model_name: str = "gemini-3.6-flash",
    system_instruction: Optional[str] = None
) -> AsyncGenerator[str, None]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        yield "Error: GEMINI_API_KEY is not configured. Please add your key to backend/.env."
        return

    instruction = system_instruction or DEFAULT_SYSTEM_INSTRUCTION
    msg_queue = queue.Queue()

    def worker():
        try:
            for text_chunk in _stream_gemini_rest_sync(api_key, model_name, prompt, image_base64, instruction):
                msg_queue.put(("data", text_chunk))
            msg_queue.put(("done", None))
        except Exception as e:
            msg_queue.put(("error", str(e)))

    t = threading.Thread(target=worker, daemon=True)
    t.start()

    while True:
        try:
            item_type, val = msg_queue.get_nowait()
            if item_type == "data":
                yield val
            elif item_type == "done":
                break
            elif item_type == "error":
                yield f"\n[Gemini Error]: {val}"
                break
        except queue.Empty:
            if not t.is_alive():
                break
            await asyncio.sleep(0.05)
