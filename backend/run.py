import uvicorn
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure UTF-8 output encoding for Windows terminal
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Load env variables
load_dotenv(Path(__file__).parent / ".env")

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    print("==================================================")
    print("Starting ChatGPT Clone Backend API Server")
    print(f"URL:  http://{host}:{port}")
    print(f"Docs: http://{host}:{port}/docs")
    print("==================================================")
    uvicorn.run("main:app", host=host, port=port, reload=False)
