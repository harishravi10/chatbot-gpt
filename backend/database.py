import sqlite3
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Any

DB_PATH = Path(__file__).parent / "chatbot.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                model TEXT DEFAULT 'gemini-3.6-flash',
                system_prompt TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
            )
        """)
        conn.commit()

def list_conversations() -> List[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT c.id, c.title, c.model, c.system_prompt, c.created_at, c.updated_at,
                   COUNT(m.id) as message_count
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]

def create_conversation(title: str = "New Chat", model: str = "gemini-3.6-flash", system_prompt: str = "") -> Dict[str, Any]:
    conv_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO conversations (id, title, model, system_prompt, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (conv_id, title, model, system_prompt, now, now))
        conn.commit()
    return {
        "id": conv_id,
        "title": title,
        "model": model,
        "system_prompt": system_prompt,
        "created_at": now,
        "updated_at": now,
        "messages": []
    }

def get_conversation(conv_id: str) -> Optional[Dict[str, Any]]:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
        conv = cursor.fetchone()
        if not conv:
            return None
        
        cursor.execute("""
            SELECT id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY created_at ASC
        """, (conv_id,))
        messages = [dict(row) for row in cursor.fetchall()]
        
        res = dict(conv)
        res["messages"] = messages
        return res

def update_conversation(conv_id: str, title: Optional[str] = None, model: Optional[str] = None, system_prompt: Optional[str] = None) -> bool:
    now = datetime.utcnow().isoformat()
    fields = ["updated_at = ?"]
    params = [now]
    if title is not None:
        fields.append("title = ?")
        params.append(title)
    if model is not None:
        fields.append("model = ?")
        params.append(model)
    if system_prompt is not None:
        fields.append("system_prompt = ?")
        params.append(system_prompt)
    
    params.append(conv_id)
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(f"UPDATE conversations SET {', '.join(fields)} WHERE id = ?", params)
        conn.commit()
        return cursor.rowcount > 0

def delete_conversation(conv_id: str) -> bool:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
        conn.commit()
        return cursor.rowcount > 0

def clear_all_conversations() -> int:
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM conversations")
        conn.commit()
        return cursor.rowcount

def add_message(conv_id: str, role: str, content: str) -> Dict[str, Any]:
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO messages (id, conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (msg_id, conv_id, role, content, now))
        cursor.execute("""
            UPDATE conversations SET updated_at = ? WHERE id = ?
        """, (now, conv_id))
        conn.commit()
    return {
        "id": msg_id,
        "conversation_id": conv_id,
        "role": role,
        "content": content,
        "created_at": now
    }
