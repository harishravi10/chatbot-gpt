# NEXA AI - Production Cloud Deployment Guide

This guide explains how to deploy **NEXA AI** to a free cloud hosting service (**Render.com**) so it is accessible via a public HTTPS URL 24/7, **even when your laptop is turned off**.

---

## 🎯 Architecture Overview

```text
User's Device (Phone / Laptop)
       ↓
Public HTTPS URL (e.g. https://nexa-ai.onrender.com)
       ↓
Render Cloud Service
       ↓
FastAPI Backend (uvicorn main:app --host 0.0.0.0 --port $PORT)
       ↓
Gemini API (Streaming via Server-Sent Events)
       ↓
Response Streamed to 3D Reactive Frontend
```

---

## 🛠️ Root Cause of Previous Render Failure (Fixed!)

If you previously saw:
```
Exited with status 1 while running your code.
```
### Why it happened:
1. Render runs commands from the **root directory** of the repository.
2. Previously, `requirements.txt` and `main.py` were nested inside `backend/`.
3. When Render attempted to start with `uvicorn main:app` or `uvicorn backend.main:app`, Python threw:
   `ModuleNotFoundError: No module named 'database'` because `database.py` was inside `backend/` and not on the root Python path.

### How it was resolved:
- **Root `main.py`**: Added a root entry point that automatically adds `backend/` to `sys.path` and exports `app`.
- **Root `requirements.txt`**: Added to root so standard `pip install -r requirements.txt` succeeds immediately.
- **Dual-Path Resolution**: `backend/main.py` now resolves imports and static frontend assets cleanly from any working directory.
- **Standard `/health` Endpoint**: Added `GET /health` returning `{"status": "ok"}` for cloud health checks.

---

## 🚀 Step-by-Step Render Deployment (100% Free)

### STEP 1: Commit and Push Changes to GitHub
Open your terminal in the project folder and run:
```bash
git add .
git commit -m "fix: make project cloud-deployment ready for Render"
git push origin main
```
*Why: Render deploys directly from your GitHub repository `https://github.com/harishravi10/chatbot-gpt`.*

---

### STEP 2: Open Render Dashboard
1. Go to [https://dashboard.render.com/](https://dashboard.render.com/)
2. Log in (or sign up for free using your GitHub account).

---

### STEP 3: Create a New Web Service
1. Click the blue **"New +"** button in the top right corner.
2. Select **"Web Service"**.
3. Choose **"Build and deploy from a Git repository"** and click **Next**.
4. Select your repository: **`harishravi10/chatbot-gpt`** (or paste your repository URL).

---

### STEP 4: Enter Render Service Settings
Configure the following fields:

| Setting | Value | Why |
| :--- | :--- | :--- |
| **Name** | `nexa-ai` | Used in your free URL: `https://nexa-ai.onrender.com` |
| **Region** | Choose closest to you (e.g., *Singapore*, *Frankfurt*, *Oregon*) | Lowest network latency |
| **Branch** | `main` | Deploys your latest code |
| **Root Directory** | *(Leave completely blank / empty)* | Runs from the root where `main.py` and `requirements.txt` are |
| **Runtime** | `Python 3` | Native Python runtime |
| **Build Command** | `pip install -r requirements.txt` | Installs FastAPI, Uvicorn, google-genai, etc. |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` | Starts the server listening on all interfaces on Render's assigned port |
| **Instance Type** | `Free` ($0/month) | 100% free hosting |

---

### STEP 5: Add Environment Variables
Scroll down to the **"Environment Variables"** section and click **"Add Environment Variable"**:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | *(Paste your Google Gemini API key)* | Required to talk to Gemini AI |
| `DEFAULT_MODEL` | `gemini-3.5-flash` | Fast, generous free-tier quota model |

> [!IMPORTANT]
> Never commit your actual API key to GitHub. Adding it in Render's Environment Variables dashboard keeps it completely secure and hidden from the public!

---

### STEP 6: Deploy!
1. Click the blue **"Create Web Service"** button at the bottom.
2. Render will begin building:
   - Installing dependencies from `requirements.txt`.
   - Starting Uvicorn on `0.0.0.0:$PORT`.
   - Running the `/health` check.
3. Once the status shows **"Live"** (green checkmark), your app is live!

---

### STEP 7: Open Your Live Public URL
Render will show your public HTTPS URL near the top of the service page:
```text
https://nexa-ai-xxxx.onrender.com
```
Click the link:
- The 3D robot companion will load in the cockpit.
- Gemini streaming responses will stream word-by-word.
- You can upload files and photos from your PC or phone.
- **Your laptop can be turned OFF — the app will keep running 24/7 in the cloud!**

---

## ℹ️ Free Tier Limitations to Know

Render's Free Tier is genuinely free, but has standard free-tier behaviors:
1. **Inactivity Sleep (Spin-Down)**:
   - If no one visits your app for 15 minutes, Render temporarily puts the container to sleep to save server energy.
   - When a user visits the URL, it automatically wakes up (takes ~30-50 seconds to boot on cold start).
   - Once awake, responses are instant and fast!
2. **Ephemeral Disk (SQLite)**:
   - On the free tier, files saved to the local disk (like `chatbot.db`) persist while the container is running.
   - If Render redeploys or restarts, the database resets to a clean state.
   - *If you need permanent persistence across redeploys in the future, you can attach Render's free PostgreSQL database or a free Supabase database.*
