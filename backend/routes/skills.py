import re
import base64
from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel as PydanticBaseModel
import httpx
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

    if skill.s3_key:
        # Zip-backed skill: return presigned download URL
        download_url = await get_presigned_url(skill.s3_key)
        file_list = await list_files(f"skills/{slug}/")
        files = [k.split("/")[-1] for k in file_list]
    else:
        # GitHub-sourced skill: CLI fetches directly from GitHub
        download_url = None
        files = []

    return InstallResponse(
        slug=slug,
        version=skill.version,
        download_url=download_url,
        github_url=skill.github_url,
        files=files,
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


def _extract_description_from_md(content: str) -> str:
    """Extract a short description from SKILL.md or README.md.

    Checks YAML frontmatter 'description:' first, then falls back to the
    first plain-text paragraph (skipping headings and block elements).
    """
    if not content:
        return ""

    # YAML frontmatter: --- ... ---
    fm = re.match(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if fm:
        m = re.search(r'^description:\s*["\']?(.+?)["\']?\s*$', fm.group(1), re.MULTILINE)
        if m:
            return m.group(1).strip()[:280]

    # First non-heading, non-block paragraph
    paragraph: list[str] = []
    for line in content.splitlines():
        s = line.strip()
        if not s:
            if paragraph:
                break
            continue
        if s.startswith(('#', '>', '!', '|', '```', '---', '===')):
            if paragraph:
                break
            continue
        paragraph.append(s)

    return ' '.join(paragraph)[:280] if paragraph else ""


def _parse_github_url(url: str) -> tuple[str, str, Optional[str], Optional[str]]:
    """Parse a GitHub URL into (owner, repo, branch, subfolder_path).

    Handles:
      https://github.com/owner/repo
      https://github.com/owner/repo/tree/main
      https://github.com/owner/repo/tree/main/path/to/skill
    """
    m = re.match(
        r'https?://github\.com/([^/\s]+)/([^/\s.]+?)(?:\.git)?'
        r'(?:/tree/([^/\s]+)(?:/(.+?))?)?/?$',
        url.strip(),
    )
    if not m:
        raise HTTPException(
            400,
            detail="Invalid GitHub URL — use https://github.com/owner/repo or …/tree/branch/path",
        )
    return m.group(1), m.group(2), m.group(3), m.group(4)


async def _fetch_folder_readme(
    client: httpx.AsyncClient,
    owner: str,
    repo: str,
    branch: Optional[str],
    path: Optional[str],
    headers: dict,
) -> Optional[str]:
    """Fetch just the README/SKILL.md for form pre-fill preview. Fast — single file only."""
    if path:
        ref = f"?ref={branch}" if branch else ""
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/contents/{path}{ref}",
            headers=headers,
        )
        if not resp.is_success or not isinstance(resp.json(), list):
            return None
        readme_file = next(
            (f for f in resp.json() if f["name"].upper() in ("SKILL.MD", "README.MD", "README.TXT")),
            None,
        )
        if not readme_file:
            return None
        file_resp = await client.get(readme_file["url"], headers=headers)
        if not file_resp.is_success:
            return None
        return base64.b64decode(file_resp.json()["content"]).decode("utf-8", errors="replace")
    else:
        ref = f"?ref={branch}" if branch else ""
        # Prefer SKILL.md over generic README at the repo root
        for candidate in ("SKILL.md", "SKILL.MD"):
            c_resp = await client.get(
                f"https://api.github.com/repos/{owner}/{repo}/contents/{candidate}{ref}",
                headers=headers,
            )
            if c_resp.is_success and c_resp.json().get("encoding") == "base64":
                return base64.b64decode(c_resp.json()["content"]).decode("utf-8", errors="replace")
        # Fall back to whatever GitHub considers the default README
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}/readme{ref}",
            headers=headers,
        )
        if not resp.is_success:
            return None
        return base64.b64decode(resp.json()["content"]).decode("utf-8", errors="replace")



@router.get("/prefetch-github")
async def prefetch_github(url: str = Query(...)):
    """Fetch GitHub repo or subfolder metadata to pre-fill the publish form. No auth required."""
    owner, repo, branch, path = _parse_github_url(url)
    headers = {"Accept": "application/vnd.github.v3+json", "X-GitHub-Api-Version": "2022-11-28"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"

    async with httpx.AsyncClient(timeout=10) as client:
        repo_resp = await client.get(f"https://api.github.com/repos/{owner}/{repo}", headers=headers)
        if repo_resp.status_code == 404:
            raise HTTPException(404, detail="GitHub repository not found or private")
        if not repo_resp.is_success:
            raise HTTPException(502, detail="GitHub API error — try again")
        repo_data = repo_resp.json()

        readme = await _fetch_folder_readme(client, owner, repo, branch, path, headers)

    # Use folder name as suggested skill name when a subfolder is specified
    if path:
        folder_name = path.rstrip("/").split("/")[-1]
        suggested_name = re.sub(r"[^a-z0-9-]", "-", folder_name.lower()).strip("-")
    else:
        suggested_name = re.sub(r"[^a-z0-9-]", "-", repo.lower()).strip("-")

    canonical_url = f"https://github.com/{owner}/{repo}"
    if branch and path:
        canonical_url += f"/tree/{branch}/{path}"
    elif branch:
        canonical_url += f"/tree/{branch}"

    # Prefer description extracted from SKILL.md/README.md over the (often empty) repo description
    md_description = _extract_description_from_md(readme or "")
    description = md_description or (repo_data.get("description") or "")[:280]

    return {
        "name": suggested_name,
        "description": description,
        "readme": readme,
        "topics": repo_data.get("topics", [])[:8],
        "stars": repo_data.get("stargazers_count", 0),
        "owner": owner,
        "repo": repo,
        "path": path,
        "github_url": canonical_url,
    }


class GithubImportBody(PydanticBaseModel):
    github_url: str
    name: str
    namespace: str
    description: str
    domain: str
    audience: Optional[str] = None
    tags: list[str] = []
    supported_agents: list[str] = ["All Agents"]
    version: str = "1.0.0"
    license: str = "Apache 2.0"


@router.post("/import-github", response_model=SkillOut, status_code=201)
async def import_from_github(
    body: GithubImportBody,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Register a GitHub-hosted skill without downloading any files.

    Fetches SKILL.md to store as readme. CLI fetches all files at install time.
    """
    slug = f"{body.namespace}/{body.name}"
    if (await db.execute(select(Skill).where(Skill.slug == slug))).scalar_one_or_none():
        raise HTTPException(409, detail=f"Skill '{slug}' already exists")

    owner, repo, branch, path = _parse_github_url(body.github_url)
    headers = {"Accept": "application/vnd.github.v3+json", "X-GitHub-Api-Version": "2022-11-28"}
    if settings.github_token:
        headers["Authorization"] = f"Bearer {settings.github_token}"

    async with httpx.AsyncClient(timeout=10) as client:
        readme = await _fetch_folder_readme(client, owner, repo, branch, path, headers)

    skill = Skill(
        name=body.name,
        namespace=body.namespace,
        slug=slug,
        description=body.description,
        readme=readme,
        domain=body.domain,
        audience=body.audience,
        tags=body.tags,
        supported_agents=body.supported_agents,
        version=body.version,
        license=body.license,
        github_url=body.github_url,
        s3_key=None,
        file_size_kb=None,
        is_published=True,
        author_id=current_user.id,
    )
    db.add(skill)
    await db.flush()

    db.add(SkillVersion(skill_id=skill.id, version=body.version, s3_key=""))
    await db.flush()

    result = await db.execute(
        select(Skill)
        .options(selectinload(Skill.author), selectinload(Skill.versions))
        .where(Skill.id == skill.id)
    )
    return result.scalar_one()


@router.get("/domains/list")
async def list_domains(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Skill.domain, func.count(Skill.id).label("count"))
        .where(Skill.is_published == True)
        .group_by(Skill.domain)
        .order_by(func.count(Skill.id).desc())
    )
    return [{"domain": row.domain, "count": row.count} for row in result]
