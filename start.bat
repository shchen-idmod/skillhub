@echo off
echo ================================
echo   SkillHub - Local Dev Setup
echo ================================
echo.

REM ── Backend ──────────────────────────────────────────────
echo [1/4] Setting up Python virtual environment...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/4] Installing backend dependencies...
pip install -r requirements.txt --quiet

echo [3/4] Seeding demo data...
python seed_anthropic.py

echo [4/4] Starting backend on http://localhost:8000
echo       API docs at http://localhost:8000/docs
start "SkillHub Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000"

REM ── Frontend ─────────────────────────────────────────────
cd ..\frontend
echo.
echo [5/5] Installing frontend and starting on http://localhost:5173
call npm install --silent
start "SkillHub Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================
echo   Both servers are starting up!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API docs: http://localhost:8000/docs
echo ================================
echo.
pause
