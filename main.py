"""
NEXA AI - Root Entry Point for Cloud Deployment (Render, Railway, Docker, etc.)
Allows starting the server directly with:
    uvicorn main:app --host 0.0.0.0 --port $PORT
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

# Ensure backend directory is in sys.path
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(1, str(ROOT_DIR))

# Expose the FastAPI app
from backend.main import app  # noqa: F401
