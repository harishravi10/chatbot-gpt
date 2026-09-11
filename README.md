# 🚀 NEXA AI - Futuristic 3D Reactive AI Assistant

A full-stack, futuristic AI assistant inspired by sci-fi command cockpits, featuring an **instant 3D reactive robot companion**, a **cosmic orbital category hub**, real-time **Google Gemini streaming**, and **native multimodal PC file uploads**.

---

## ✨ Key Features

- **🤖 Instant 3D Reactive Robot**:
  - **Ready / Idle**: Smiling 3D robot companion floating attentive on the console table.
  - **Thinking (3D Animation)**: Hand to chin pose with multi-layered spinning holographic energy rings and real-time status HUD.
  - **Answering (3D Gesture)**: Welcoming gesture presenting the solution as markdown and code stream.
  - **Zero Latency**: Pre-cached assets ensure 0ms transitions.
- **🪐 Cosmic Orbital Universe Hub**:
  - Interactive central plasma core with orbiting category spheres (`</> Coding`, `💡 Ideas`, `🎓 Study`, `🎨 Creative`, `👤 Personal`).
- **📎 Native PC & Phone File Upload**:
  - Upload photos, diagrams, and screenshots (`.png`, `.jpg`, `.webp`) for Gemini multimodal vision analysis.
  - Attach code, scripts, PDFs, and data files (`.py`, `.js`, `.pdf`, `.csv`, `.json`, `.sql`, `.txt`).
- **⚡ Real-Time Streaming & Quota Failover**:
  - Word-by-word Server-Sent Events (SSE) streaming.
  - Automated fallback model chain ensures continuous uptime without quota crashes.
- **🎙️ Voice Dictation & Read Aloud**:
  - Native Web Speech microphone input and speech synthesis read-aloud.
- **💾 Conversation Persistence**:
  - SQLite backend database persists all multi-turn chats.
- **🌐 Deploy Anywhere**:
  - One-click cloud hosting on **Render**, **Railway**, **Docker**, or instant free public HTTPS via **Cloudflare Tunnel**.

---

## 📁 Project Structure

```text
chatbot/
├── backend/
│   ├── database.py          # SQLite schema & conversation CRUD
│   ├── main.py              # FastAPI server with SSE & multimodal Gemini streaming
│   ├── requirements.txt     # Python dependencies
│   └── run.py               # Uvicorn server launcher
├── frontend/
│   ├── assets/              # 3D robot states & explore planet assets
│   ├── index.html           # NEXA AI cockpit layout & orbital hub
│   ├── style.css            # Sci-fi glassmorphism design system & 3D animations
│   └── app.js               # Reactive 3D engine, file upload & SSE client
├── Dockerfile               # Production container definition
├── Procfile                 # Cloud deployment process file
├── DEPLOYMENT.md            # Detailed deployment guide
├── start.bat                # 1-Click local launcher
└── tunnel.bat               # 1-Click free public HTTPS tunnel
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Python 3.10+
- Google Gemini API Key ([Get a free key here](https://aistudio.google.com/))

### 2. Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/harishravi10/chatbot-gpt.git
   cd chatbot-gpt
   ```
2. Create `.env` in the `backend/` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
4. Start the app:
   ```bash
   python backend/run.py
   ```
   Or on Windows, simply double-click `start.bat`!
   Open `http://127.0.0.1:8000` in your browser.

---

## ☁️ Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment instructions for **Render**, **Railway**, **Docker**, and **Cloudflare Tunnel**.
