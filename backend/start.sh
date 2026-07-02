#!/bin/sh
python -m alembic upgrade head
python seed_anthropic.py
uvicorn main:app --host 0.0.0.0 --port $PORT