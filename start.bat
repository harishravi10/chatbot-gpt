@echo off
title ChatGPT Clone Launcher
echo ====================================================
echo   Starting ChatGPT Clone (Backend and Frontend)
echo ====================================================

REM Set python executable path
set "PY_EXE=C:\Users\Harish\AppData\Local\Programs\Python\Python313\python.exe"
if not exist "%PY_EXE%" (
    where py >nul 2>nul && (set "PY_EXE=py") || (set "PY_EXE=python")
)

echo Using Python: %PY_EXE%

REM Launch the backend server in its own command prompt window
start "ChatGPT Backend API" cmd /k "cd /d "%~dp0backend" && "%PY_EXE%" run.py"

REM Wait 3 seconds for server to start
timeout /t 3 /nobreak >nul

REM Open the web app in browser
start http://127.0.0.1:8000

echo.
echo ====================================================
echo   Chatbot is now running at: http://127.0.0.1:8000
echo   Keep the backend window open while using the app.
echo ====================================================
echo.
pause
