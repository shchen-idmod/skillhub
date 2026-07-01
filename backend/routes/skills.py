import zipfile
import io
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update
from sqlalchemy.orm import selectinload
from core.database import get_db
from core.auth import get_current_user, get_optional_user
from core.config import get_settings
from models.models import User, Skill, SkillVersion, SkillRating
from models.schemas import SkillCreate, SkillOut, SkillListResponse, SkillListItem, InstallResponse
from storage.s3 import upload_file, get_presigned_url, list_files, ensure_bucket

router = APIRouter(prefix="/skills", tags=["skills"])
settings = get_settings()


@router.get("", response_model=SkillListResponse)
async def list_skills(
    q: Optional[str] = Query(None, description="Full-text search"),
    domain: Optional[str] = None,
    audience: Optional[str] = None,
    agent: Optional[str] = None,
    sort: Literal["popular", "newest", "name"] = "popular",
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Skill)
        .options(selectinload(Skill.author))
        .where(Skill.is_published == True)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Skill.name.ilike(pattern),
                Skill.description.ilike(pattern),
                Skill.namespace.ilike(pattern),
            )
        )
    if domain:
        stmt = stmt.where(Skill.domain == domain)
    if audience:
        stmt = stmt.where(Skill.audience == audience)

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    # Sort
    if sort == "popular":
        stmt = stmt.order_by(Skill.install_count.desc())
    elif sort == "newest":
        stmt = stmt.order_by(Skill.created_at.desc())
    else:
        stmt = stmt.order_by(Skill.name.asc())

    # Paginate
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await db.execute(stmt)).scalars().all()

    return SkillListResponse(
        items=[SkillListItem.model_validate(s) for s in results],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{namespace}/{name}", response_model=SkillOut)
async def get_skill(namespace: str, name: str, db: AsyncSession = Depends(get_db)):
    slug = f"{namespace}/{name}"
    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.author), selectinload(Skill.versions))
        .where(Skill.slug == slug, Skill.is_published == True)
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    return skill


@router.post("", response_model=SkillOut, status_code=201)
async def publish_skill(
    name: str = Form(...),
    namespace: str = Form(...),
    description: str = Form(...),
    domain: str = Form(...),
    audience: Optional[str] = Form(None),
    tags: str = Form("[]"),
    supported_agents: str = Form('["All Agents"]'),
    version: str = Form("1.0.0"),
    license: str = Form("Apache 2.0"),
    github_url: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json

    # Validate file size
    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(400, detail=f"File too large. Max {settings.max_upload_mb} MB")

    # Validate zip contains SKILL.md
    if file.filename and file.filename.endswith(".zip"):
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            names = zf.namelist()
            has_skill_md = any(n.endswith("SKILL.md") for n in names)
            if not has_skill_md:
                raise HTTPException(400, detail="Zip must contain a SKILL.md file")
            # Extract readme
            readme_key = next((n for n in names if n.endswith("SKILL.md")), None)
            readme = zf.read(readme_key).decode("utf-8", errors="replace") if readme_key else None
    else:
        readme = content.decode("utf-8", errors="replace")

    slug = f"{namespace}/{name}"

    # Check slug uniqueness
    existing = await db.execute(select(Skill).where(Skill.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Skill '{slug}' already exists")

    # Upload to S3
    await ensure_bucket()
    s3_key = f"skills/{slug}/{version}/{file.filename}"
    await upload_file(content, s3_key, file.content_type or "application/octet-stream")

    tags_list = json.loads(tags) if isinstance(tags, str) else tags
    agents_list = json.loads(supported_agents) if isinstance(supported_agents, str) else supported_agents

    skill = Skill(
        name=name,
        namespace=namespace,
        slug=slug,
        description=description,
        readme=readme,
        domain=domain,
        audience=audience,
        tags=tags_list,
        supported_agents=agents_list,
        version=version,
        license=license,
        github_url=github_url,
        s3_key=s3_key,
        file_size_kb=len(content) // 1024,
        is_published=True,
        author_id=current_user.id,
    )
    db.add(skill)
    await db.flush()

    # Create version record
    sv = SkillVersion(skill_id=skill.id, version=version, s3_key=s3_key)
    db.add(sv)
    await db.flush()
    await db.refresh(skill)

    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.author), selectinload(Skill.versions))
        .where(Skill.id == skill.id)
    )
    return result.scalar_one()


@router.patch("/{namespace}/{name}", response_model=SkillOut)
async def update_skill(
    namespace: str,
    name: str,
    description: Optional[str] = Form(None),
    domain: Optional[str] = Form(None),
    audience: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    supported_agents: Optional[str] = Form(None),
    version: Optional[str] = Form(None),
    license: Optional[str] = Form(None),
    github_url: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    import json

    slug = f"{namespace}/{name}"
    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.author), selectinload(Skill.versions))
        .where(Skill.slug == slug)
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(404, detail="Skill not found")
    if skill.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, detail="Not authorized to edit this skill")

    if description is not None:
        skill.description = description
    if domain is not None:
        skill.domain = domain
    if audience is not None:
        skill.audience = audience
    if tags is not None:
        skill.tags = json.loads(tags)
    if supported_agents is not None:
        skill.supported_agents = json.loads(supported_agents)
    if license is not None:
        skill.license = license
    if github_url is not None:
        skill.github_url = github_url

    if file and version:
        content = await file.read()
        max_bytes = settings.max_upload_mb * 1024 * 1024
        if len(content) > max_bytes:
            raise HTTPException(400, detail=f"File too large. Max {settings.max_upload_mb} MB")
        if file.filename and file.filename.endswith(".zip"):
            with zipfile.ZipFile(io.BytesIO(content)) as zf:
                names = zf.namelist()
                if not any(n.endswith("SKILL.md") for n in names):
                    raise HTTPException(400, detail="Zip must contain a SKILL.md file")
                readme_key = next((n for n in names if n.endswith("SKILL.md")), None)
                skill.readme = zf.read(readme_key).decode("utf-8", errors="replace") if readme_key else skill.readme
        else:
            skill.readme = content.decode("utf-8", errors="replace")
        await ensure_bucket()
        s3_key = f"skills/{slug}/{version}/{file.filename}"
        await upload_file(content, s3_key, file.content_type or "application/octet-stream")
        skill.s3_key = s3_key
        skill.file_size_kb = len(content) // 1024
        sv = SkillVersion(skill_id=skill.id, version=version, s3_key=s3_key)
        db.add(sv)

    if version is not None:
        skill.version = version

    await db.flush()
    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.author), selectinload(Skill.versions))
        .where(Skill.id == skill.id)
    )
    return result.scalar_one()


@router.delete("/{namespace}/{name}", status_code=204)
async def delete_skill(
    namespace: str,
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = f"{namespace}/{name}"
    result = await db.execute(
        select(Skill).options(selectinload(Skill.versions)).where(Skill.slug == slug)
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(404, detail="Skill not found")
    if skill.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, detail="Not authorized to delete this skill")
    await db.delete(skill)


@router.get("/{namespace}/{name}/install", response_model=InstallResponse)
async def install_skill(
    namespace: str,
    name: str,
    version: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """Used by the CLI to resolve and download a skill."""
    slug = f"{namespace}/{name}"
    result = await db.execute(
        select(Skill).where(Skill.slug == slug, Skill.is_published == True)
    )
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(404, detail="Skill not found")

    # Increment install count
    skill.install_count += 1

    s3_key = skill.s3_key
    download_url = await get_presigned_url(s3_key)
    file_list = await list_files(f"skills/{slug}/")

    return InstallResponse(
        slug=slug,
        version=skill.version,
        download_url=download_url,
        files=[k.split("/")[-1] for k in file_list],
        install_count=skill.install_count,
    )


@router.post("/{namespace}/{name}/rate")
async def rate_skill(
    namespace: str,
    name: str,
    score: int = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if score < 1 or score > 5:
        raise HTTPException(400, detail="Score must be between 1 and 5")

    slug = f"{namespace}/{name}"
    result = await db.execute(select(Skill).where(Skill.slug == slug, Skill.is_published == True))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(404, detail="Skill not found")

    # Upsert rating
    existing = (await db.execute(
        select(SkillRating).where(SkillRating.skill_id == skill.id, SkillRating.user_id == current_user.id)
    )).scalar_one_or_none()

    if existing:
        existing.score = score
    else:
        db.add(SkillRating(skill_id=skill.id, user_id=current_user.id, score=score))

    await db.flush()

    # Recalculate average
    avg = (await db.execute(
        select(func.avg(SkillRating.score)).where(SkillRating.skill_id == skill.id)
    )).scalar_one()
    skill.rating = round(float(avg), 1) if avg else None

    return {"average": skill.rating, "user_score": score}


@router.get("/{namespace}/{name}/my-rating")
async def get_my_rating(
    namespace: str,
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = f"{namespace}/{name}"
    result = await db.execute(select(Skill).where(Skill.slug == slug))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(404, detail="Skill not found")

    rating = (await db.execute(
        select(SkillRating).where(SkillRating.skill_id == skill.id, SkillRating.user_id == current_user.id)
    )).scalar_one_or_none()

    return {"score": rating.score if rating else None}


@router.get("/domains/list")
async def list_domains(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Skill.domain, func.count(Skill.id).label("count"))
        .where(Skill.is_published == True)
        .group_by(Skill.domain)
        .order_by(func.count(Skill.id).desc())
    )
    return [{"domain": row.domain, "count": row.count} for row in result]
