#!/bin/bash
set -e

echo "================================"
echo "  SkillHub - Local Dev Setup"
echo "================================"

ROOT=$(cd "$(dirname "$0")" && pwd)

# Backend
echo ""
echo "[1/4] Setting up Python virtual environment..."
cd "$ROOT/backend"
[ ! -d venv ] && python3 -m venv venv
source venv/bin/activate

echo "[2/4] Installing backend dependencies..."
pip install -r requirements.txt -q

echo "[3/4] Seeding demo data..."
python seed.py

echo "[4/4] Starting backend on http://localhost:8000"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Frontend
cd "$ROOT/frontend"
echo ""
echo "[5/5] Installing frontend dependencies..."
npm install -q

echo "Starting frontend on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo "================================"
echo "Press Ctrl+C to stop both servers"

wait $BACKEND_PID $FRONTEND_PID
