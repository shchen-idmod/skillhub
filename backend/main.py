from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from core.database import init_db
from core.config import get_settings
from routes import auth, skills, plugins, admin
from storage.s3 import ensure_bucket

settings = get_settings()

limiter = Limiter(key_func=get_remote_address)


_WEAK_SECRETS = {"dev-secret-key-change-in-production", "change-me", "secret", "changeme"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    if not settings.debug and (
        len(settings.secret_key) < 32
        or settings.secret_key in _WEAK_SECRETS
    ):
        raise RuntimeError(
            "SECRET_KEY is missing or too weak. "
            "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )
    await init_db()
    await ensure_bucket()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="SkillHub API — discover, publish, and install AI agent skills",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://skillhub.*\.vercel\.app",
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(skills.router)
app.include_router(plugins.router)
app.include_router(admin.router)


@app.get("/download/{s3_key:path}")
async def download_file(s3_key: str):
    """Serve uploaded skill files directly (replaces S3 presigned URLs)."""
    file_path = Path(settings.upload_dir) / s3_key
    if not file_path.exists():
        from fastapi import HTTPException
        raise HTTPException(404, "File not found")
    return FileResponse(file_path, filename=file_path.name)


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.app_name, "storage": "local", "db": "sqlite"}
