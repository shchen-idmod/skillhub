"""
Local file storage — drop-in replacement for S3/MinIO.
Files are saved under settings.upload_dir on disk.
"""
import os
import shutil
from pathlib import Path
from core.config import get_settings

settings = get_settings()
UPLOAD_ROOT = Path(settings.upload_dir)


async def ensure_bucket():
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


async def upload_file(file_bytes: bytes, s3_key: str, content_type: str = "application/octet-stream") -> str:
    dest = UPLOAD_ROOT / s3_key
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(file_bytes)
    return s3_key


async def get_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    # Return a local API download URL instead of a presigned S3 URL
    return f"http://localhost:8000/download/{s3_key}"


async def delete_file(s3_key: str):
    path = UPLOAD_ROOT / s3_key
    if path.exists():
        path.unlink()


async def list_files(prefix: str) -> list[str]:
    search_dir = UPLOAD_ROOT / prefix
    if not search_dir.exists():
        return []
    return [str(p.relative_to(UPLOAD_ROOT)) for p in search_dir.rglob("*") if p.is_file()]
