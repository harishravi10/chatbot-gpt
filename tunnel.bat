@echo off
title NEXA AI - Instant Cloudflare Public URL Tunnel
echo ====================================================
echo   Starting Cloudflare Public Tunnel for NEXA AI
echo   This creates a free, secure public HTTPS URL
echo   so anyone can access your app from phone or web!
echo ====================================================
echo.
echo Make sure your backend server is already running (start.bat)!
echo Generating public link...
echo.

cd /d "%~dp0backend"
cloudflared.exe tunnel --url http://localhost:8000
pause
