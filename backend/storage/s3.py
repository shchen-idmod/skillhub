"""
Storage backend — auto-selects based on environment:
  - S3_BUCKET set → AWS S3 or Cloudflare R2 (boto3)
  - S3_BUCKET unset → local filesystem (no extra deps)
"""
import os
from pathlib import Path
from core.config import get_settings

settings = get_settings()

_BUCKET = os.getenv("S3_BUCKET", "")
_USE_S3 = bool(_BUCKET)

# ── S3 / R2 client (lazy-initialised) ────────────────────────────────────────

def _get_client():
    import boto3
    kwargs = dict(
        aws_access_key_id=os.getenv("S3_ACCESS_KEY"),
        aws_secret_access_key=os.getenv("S3_SECRET_KEY"),
        region_name=os.getenv("S3_REGION", "auto"),
    )
    endpoint = os.getenv("S3_ENDPOINT_URL")   # set for R2/Backblaze; omit for AWS
    if endpoint:
        kwargs["endpoint_url"] = endpoint
    return boto3.client("s3", **kwargs)


# ── Public interface ──────────────────────────────────────────────────────────

async def ensure_bucket():
    if _USE_S3:
        pass  # bucket must be created in the S3/R2 console; nothing to do here
    else:
        Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)


async def upload_file(file_bytes: bytes, s3_key: str, content_type: str = "application/octet-stream") -> str:
    if _USE_S3:
        _get_client().put_object(
            Bucket=_BUCKET,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type,
        )
    else:
        dest = Path(settings.upload_dir) / s3_key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
    return s3_key


async def get_presigned_url(s3_key: str, expires_in: int = 3600) -> str:
    if _USE_S3:
        return _get_client().generate_presigned_url(
            "get_object",
            Params={"Bucket": _BUCKET, "Key": s3_key},
            ExpiresIn=expires_in,
        )
    else:
        return f"{settings.public_api_url.rstrip('/')}/download/{s3_key}"


async def delete_file(s3_key: str):
    if _USE_S3:
        _get_client().delete_object(Bucket=_BUCKET, Key=s3_key)
    else:
        path = Path(settings.upload_dir) / s3_key
        if path.exists():
            path.unlink()


async def list_files(prefix: str) -> list[str]:
    if _USE_S3:
        resp = _get_client().list_objects_v2(Bucket=_BUCKET, Prefix=prefix)
        return [obj["Key"] for obj in resp.get("Contents", [])]
    else:
        search_dir = Path(settings.upload_dir) / prefix
        if not search_dir.exists():
            return []
        return [str(p.relative_to(Path(settings.upload_dir))) for p in search_dir.rglob("*") if p.is_file()]
