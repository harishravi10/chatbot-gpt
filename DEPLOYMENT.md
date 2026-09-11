# NEXA AI - Complete Deployment Guide

This full-stack application bundles the **FastAPI backend** and the **futuristic NEXA AI frontend** into a single unified service. Here are the 4 best ways to deploy and share your app:

---

## ⚡ Option 1: Instant Free Public URL (5 Seconds, No Setup)

You can share your app online right now directly from your machine with a free Cloudflare HTTPS tunnel:

1. Start your local server by double-clicking [start.bat](file:///c:/Users/Harish/Desktop/chatbot/start.bat).
2. Double-click [tunnel.bat](file:///c:/Users/Harish/Desktop/chatbot/tunnel.bat).
3. Cloudflare will output a public HTTPS link:
### 🌐 Your Live Public URL (Active Right Now):
👉 **[https://alcohol-markets-july-memo.trycloudflare.com](https://alcohol-markets-july-memo.trycloudflare.com)**

Send this link to your friends! They can open it on their phones, laptops, or tablets to chat with NEXA AI, upload files from their devices, and see the 3D robot react in real-time.

---

## ☁️ Option 2: Deploy to Render.com (Free 24/7 Cloud Hosting - Recommended)

[Render](https://render.com) provides free cloud hosting for Python FastAPI applications with automatic SSL certificates.

### Steps:
1. **Push your code to GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Deploy NEXA AI"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/nexa-ai.git
   git push -u origin main
   ```
2. Go to [dashboard.render.com](https://dashboard.render.com) and click **New +** → **Web Service**.
3. Select your GitHub repository.
4. Configure the settings:
   - **Name**: `nexa-ai`
   - **Language / Runtime**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - Key: `GEMINI_API_KEY`
   - Value: `YOUR_GEMINI_API_KEY`
6. Click **Deploy Web Service**.
7. Render will provide a permanent URL like `https://nexa-ai.onrender.com`.

---

## 🚂 Option 3: Deploy to Railway.app

[Railway](https://railway.app) is one of the fastest deployment platforms:

1. Push your code to GitHub.
2. Open Railway dashboard and click **New Project** → **Deploy from GitHub repo**.
3. In **Variables**, add:
   ```
   GEMINI_API_KEY = your_gemini_api_key
   ```
4. In **Settings** → **Networking**, click **Generate Domain**.
5. Railway deploys in under 60 seconds with full streaming SSE support!

---

## 🐳 Option 4: Docker Container Deployment (Fly.io, Cloud Run, VPS)

A production-ready [Dockerfile](file:///c:/Users/Harish/Desktop/chatbot/Dockerfile) is included in the project root.

### Build and Run Locally:
```bash
# Build the Docker container
docker build -t nexa-ai .

# Run with your Gemini API key
docker run -d -p 8000:8000 -e GEMINI_API_KEY="your_api_key_here" nexa-ai
```

### Deploy to Fly.io:
```bash
fly launch
fly secrets set GEMINI_API_KEY="your_api_key_here"
fly deploy
```

### Deploy to Google Cloud Run:
```bash
gcloud run deploy nexa-ai --source . --port 8000 --set-env-vars GEMINI_API_KEY="your_key" --allow-unauthenticated
```
