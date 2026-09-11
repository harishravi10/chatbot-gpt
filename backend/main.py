import os
import sys
import json
import base64
import asyncio
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Determine directory paths safely for local and cloud environments
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent

# Ensure both backend directory and root directory are in sys.path
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(1, str(ROOT_DIR))

# Load environment variables
load_dotenv(BASE_DIR / ".env")
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

try:
    import database as db
except ImportError:
    from backend import database as db

from google import genai
from google.genai import types
from google.genai.errors import APIError

# Initialize Database
db.init_db()

# Resolve API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("google_api_key") or ""
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gemini-3.5-flash")

# Initialize Gemini Client if API key is present
client = None
if GEMINI_API_KEY:
    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"Warning: Failed to initialize Gemini Client: {e}")

app = FastAPI(
    title="NEXA AI Backend API",
    description="Full-stack AI assistant with real-time streaming, multimodal PC file upload, and automatic quota fallback",
    version="1.2.0"
)

# Enable CORS for any frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class FileAttachment(BaseModel):
    name: str
    type: str = "text/plain"
    content: str
    size: Optional[int] = 0

class CreateConversationRequest(BaseModel):
    title: Optional[str] = "New Chat"
    model: Optional[str] = "gemini-3.5-flash"
    system_prompt: Optional[str] = ""

class UpdateConversationRequest(BaseModel):
    title: Optional[str] = None
    model: Optional[str] = None
    system_prompt: Optional[str] = None

class ChatStreamRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str = Field(..., min_length=1)
    model: Optional[str] = "gemini-3.5-flash"
    system_prompt: Optional[str] = ""
    files: Optional[List[FileAttachment]] = None

@app.on_event("startup")
async def startup_event():
    print("==================================================")
    print("🚀 NEXA AI Server Initialized Successfully")
    print(f"📁 Backend Dir:  {BASE_DIR}")
    print(f"📁 Root Dir:     {ROOT_DIR}")
    print(f"💾 Database:     {db.DB_PATH}")
    if not GEMINI_API_KEY:
        print("⚠️  WARNING: GEMINI_API_KEY is not configured!")
        print("   Please configure GEMINI_API_KEY in your cloud environment variables.")
    else:
        masked = GEMINI_API_KEY[:4] + "..." + GEMINI_API_KEY[-4:] if len(GEMINI_API_KEY) > 8 else "***"
        print(f"🔑 GEMINI_API_KEY: Configured ({masked})")
    print(f"🤖 Default Model: {DEFAULT_MODEL}")
    print("==================================================")

@app.get("/health")
def health():
    """Standard cloud health check endpoint (Render, Railway, Docker)"""
    return {"status": "ok"}

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "has_api_key": bool(GEMINI_API_KEY),
        "default_model": DEFAULT_MODEL,
        "supported_models": [
            {"id": "gemini-3.5-flash", "name": "Gemini 3.5 Flash (High Quota)", "badge": "Recommended"},
            {"id": "gemini-3.7-flash", "name": "Gemini 3.7 Flash (Next-Gen)", "badge": "Smart"},
            {"id": "gemini-3.5-flash-lite", "name": "Gemini 3.5 Flash Lite (Speed)", "badge": "Fast"},
            {"id": "gemini-3.6-flash", "name": "Gemini 3.6 Flash (Preview)", "badge": "Preview"}
        ]
    }

@app.get("/api/conversations")
def get_conversations():
    return db.list_conversations()

@app.post("/api/conversations")
def create_conversation(req: CreateConversationRequest):
    return db.create_conversation(
        title=req.title or "New Chat",
        model=req.model or DEFAULT_MODEL,
        system_prompt=req.system_prompt or ""
    )

@app.get("/api/conversations/{conversation_id}")
def get_conversation_details(conversation_id: str):
    conv = db.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv

@app.patch("/api/conversations/{conversation_id}")
def update_conversation_details(conversation_id: str, req: UpdateConversationRequest):
    updated = db.update_conversation(
        conversation_id,
        title=req.title,
        model=req.model,
        system_prompt=req.system_prompt
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "updated", "id": conversation_id}

@app.delete("/api/conversations/{conversation_id}")
def delete_conversation_endpoint(conversation_id: str):
    deleted = db.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted", "id": conversation_id}

@app.delete("/api/conversations")
def clear_conversations():
    count = db.clear_all_conversations()
    return {"status": "cleared", "deleted_count": count}

def build_gemini_history(past_messages: List[Dict[str, Any]]) -> List[types.Content]:
    """Convert stored messages to google.genai Content objects."""
    history = []
    for msg in past_messages:
        role = msg.get("role")
        content = msg.get("content", "")
        if not content:
            continue
        genai_role = "user" if role == "user" else "model"
        history.append(
            types.Content(
                role=genai_role,
                parts=[types.Part.from_text(text=content)]
            )
        )
    return history

@app.post("/api/chat/stream")
async def chat_stream(req: ChatStreamRequest):
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in backend/.env"
        )
    
    # 1. Resolve or create conversation
    conv_id = req.conversation_id
    is_first_message = False
    
    if not conv_id:
        conv = db.create_conversation(
            title="New Chat",
            model=req.model or DEFAULT_MODEL,
            system_prompt=req.system_prompt or ""
        )
        conv_id = conv["id"]
        is_first_message = True
    else:
        existing = db.get_conversation(conv_id)
        if not existing:
            conv = db.create_conversation(
                title="New Chat",
                model=req.model or DEFAULT_MODEL,
                system_prompt=req.system_prompt or ""
            )
            conv_id = conv["id"]
            is_first_message = True
        elif len(existing.get("messages", [])) == 0:
            is_first_message = True

    # 2. Format user message with attached files summary for DB history
    stored_text = req.message
    if req.files and len(req.files) > 0:
        file_names = ", ".join([f.name for f in req.files])
        stored_text = f"📎 [Attached: {file_names}]\n\n{req.message}"

    user_msg = db.add_message(conv_id, "user", stored_text)
    
    # 3. Dynamic title from message
    new_title = None
    if is_first_message:
        words = req.message.strip().split()
        if len(words) > 6:
            new_title = " ".join(words[:6]) + "..."
        else:
            new_title = req.message.strip()[:40]
        db.update_conversation(conv_id, title=new_title)

    # 4. History turns
    full_conv = db.get_conversation(conv_id) or {}
    all_msgs = full_conv.get("messages", [])
    past_msgs = all_msgs[:-1] if len(all_msgs) > 0 else []
    history_turns = build_gemini_history(past_msgs)
    
    sys_instruction = req.system_prompt or full_conv.get("system_prompt") or None
    active_model = req.model or full_conv.get("model") or DEFAULT_MODEL

    # 5. Build multimodal payload parts
    payload_parts = []
    if req.files:
        for f in req.files:
            try:
                if f.type.startswith("image/"):
                    raw_b64 = f.content.split(",")[-1] if "," in f.content else f.content
                    img_bytes = base64.b64decode(raw_b64)
                    mime = f.type if f.type else "image/jpeg"
                    payload_parts.append(types.Part.from_bytes(data=img_bytes, mime_type=mime))
                elif f.type == "application/pdf":
                    raw_b64 = f.content.split(",")[-1] if "," in f.content else f.content
                    pdf_bytes = base64.b64decode(raw_b64)
                    payload_parts.append(types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf"))
                else:
                    # Text / Code / CSV / JSON
                    payload_parts.append(types.Part.from_text(text=f"--- Attached File: {f.name} ---\n{f.content}\n--- End File ---\n\n"))
            except Exception as fe:
                print(f"Error parsing attached file {f.name}: {fe}")

    payload_parts.append(types.Part.from_text(text=req.message))

    async def event_generator():
        accumulated_text = []
        try:
            # Yield initial metadata
            init_data = {
                "type": "init",
                "conversation_id": conv_id,
                "user_message_id": user_msg["id"],
                "title": new_title
            }
            yield f"data: {json.dumps(init_data)}\n\n"
            await asyncio.sleep(0.01)

            # Build config
            config = None
            if sys_instruction:
                config = types.GenerateContentConfig(
                    system_instruction=sys_instruction
                )

            genai_client = client or genai.Client(api_key=GEMINI_API_KEY)

            # Intelligent Quota Fallback Model Chain:
            # If active_model is throttled or quota-limited, fallback automatically!
            models_to_try = [active_model]
            for m in ["gemini-3.5-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite", "gemini-flash-latest"]:
                if m not in models_to_try:
                    models_to_try.append(m)

            stream = None
            last_err = None

            for m_candidate in models_to_try:
                try:
                    chat_session = genai_client.chats.create(
                        model=m_candidate,
                        history=history_turns,
                        config=config
                    )
                    # Test send stream
                    test_stream = chat_session.send_message_stream(payload_parts)
                    stream = test_stream
                    break
                except APIError as api_e:
                    err_str = str(api_e).lower()
                    if "quota" in err_str or "429" in err_str or "resource_exhausted" in err_str:
                        print(f"Model {m_candidate} hit quota, trying next fallback...")
                        failover_msg = f"> ℹ️ *Automatic Failover: {m_candidate} free-tier limit reached, streaming via backup engine...*\n\n"
                        failover_payload = json.dumps({
                            "type": "chunk",
                            "token": failover_msg,
                            "conversation_id": conv_id
                        })
                        yield f"data: {failover_payload}\n\n"
                        last_err = api_e
                        continue
                    else:
                        raise api_e
                except Exception as ex:
                    last_err = ex
                    continue

            if not stream:
                raise last_err or Exception("All Gemini model candidates exhausted.")

            # Stream message chunks
            for chunk in stream:
                if chunk.text:
                    accumulated_text.append(chunk.text)
                    chunk_data = {
                        "type": "chunk",
                        "token": chunk.text,
                        "conversation_id": conv_id
                    }
                    yield f"data: {json.dumps(chunk_data)}\n\n"
                    await asyncio.sleep(0.005)

            full_reply = "".join(accumulated_text)
            
            # Save assistant reply to database
            assistant_msg = db.add_message(conv_id, "assistant", full_reply)

            # Yield done signal
            done_data = {
                "type": "done",
                "conversation_id": conv_id,
                "message_id": assistant_msg["id"],
                "full_text": full_reply
            }
            yield f"data: {json.dumps(done_data)}\n\n"

        except APIError as api_err:
            error_msg = f"Gemini API Error: {api_err.message}"
            print(f"API Error: {api_err}")
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"
        except Exception as e:
            error_msg = f"Server Error: {str(e)}"
            print(f"Streaming Error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'error': error_msg})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# Static file serving for frontend (Supports all deployment directory structures)
frontend_dir = ROOT_DIR / "frontend"
if not frontend_dir.exists():
    frontend_dir = BASE_DIR.parent / "frontend"
if not frontend_dir.exists():
    frontend_dir = Path("frontend").resolve()

if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    print(f"Notice: Frontend static directory not found at: {frontend_dir}")
