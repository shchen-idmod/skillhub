from typing import Optional, Literal
from fastapi import APIRouter, Depends, HTTPException, Query, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from core.database import get_db
from core.auth import get_current_user
from models.models import User, Plugin, PluginRating
from models.schemas import PluginCreate, PluginUpdate, PluginOut, PluginListItem, PluginListResponse, PluginInstallResponse, PluginRatingResponse

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("", response_model=PluginListResponse)
async def list_plugins(
    q: Optional[str] = Query(None),
    category: Optional[str] = None,
    platform: Optional[str] = None,
    sort: Literal["popular", "newest", "name"] = "popular",
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(Plugin)
        .options(selectinload(Plugin.author))
        .where(Plugin.is_published == True)
    )

    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(
            or_(
                Plugin.name.ilike(pattern),
                Plugin.display_name.ilike(pattern),
                Plugin.description.ilike(pattern),
            )
        )
    if category:
        stmt = stmt.where(Plugin.category == category)
    if platform:
        stmt = stmt.where(Plugin.platform == platform)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar_one()

    if sort == "popular":
        stmt = stmt.order_by(Plugin.install_count.desc())
    elif sort == "newest":
        stmt = stmt.order_by(Plugin.created_at.desc())
    else:
        stmt = stmt.order_by(Plugin.display_name.asc())

    stmt = stmt.offset((page - 1) * page_size).limit(page_size)
    results = (await db.execute(stmt)).scalars().all()

    return PluginListResponse(
        items=[PluginListItem.model_validate(p) for p in results],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.post("", response_model=PluginOut, status_code=201)
async def create_plugin(
    body: PluginCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = f"{body.namespace}/{body.name}"
    existing = await db.execute(select(Plugin).where(Plugin.slug == slug))
    if existing.scalar_one_or_none():
        raise HTTPException(409, detail=f"Plugin '{slug}' already exists")

    plugin = Plugin(
        name=body.name,
        namespace=body.namespace,
        slug=slug,
        display_name=body.display_name,
        description=body.description,
        readme=body.readme,
        category=body.category,
        platform=body.platform,
        tags=body.tags,
        version=body.version,
        github_url=body.github_url,
        docs_url=body.docs_url,
        is_published=True,
        author_id=current_user.id,
    )
    db.add(plugin)
    await db.flush()

    result = await db.execute(
        select(Plugin).options(selectinload(Plugin.author)).where(Plugin.id == plugin.id)
    )
    return result.scalar_one()


@router.get("/{namespace}/{name}", response_model=PluginOut)
async def get_plugin(namespace: str, name: str, db: AsyncSession = Depends(get_db)):
    slug = f"{namespace}/{name}"
    result = await db.execute(
        select(Plugin)
        .options(selectinload(Plugin.author))
        .where(Plugin.slug == slug, Plugin.is_published == True)
    )
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(404, detail="Plugin not found")
    return plugin


@router.get("/{namespace}/{name}/install", response_model=PluginInstallResponse)
async def install_plugin(
    namespace: str,
    name: str,
    db: AsyncSession = Depends(get_db),
):
    slug = f"{namespace}/{name}"
    result = await db.execute(select(Plugin).where(Plugin.slug == slug, Plugin.is_published == True))
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(404, detail="Plugin not found")

    plugin.install_count += 1

    return PluginInstallResponse(
        slug=slug,
        version=plugin.version,
        source_url=plugin.github_url,
        docs_url=plugin.docs_url,
        install_count=plugin.install_count,
    )


@router.patch("/{namespace}/{name}", response_model=PluginOut)
async def update_plugin(
    namespace: str,
    name: str,
    body: PluginUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = f"{namespace}/{name}"
    result = await db.execute(
        select(Plugin).options(selectinload(Plugin.author)).where(Plugin.slug == slug)
    )
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(404, detail="Plugin not found")
    if plugin.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, detail="Not authorized to edit this plugin")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(plugin, field, value)

    await db.flush()
    result = await db.execute(
        select(Plugin).options(selectinload(Plugin.author)).where(Plugin.id == plugin.id)
    )
    return result.scalar_one()


@router.delete("/{namespace}/{name}", status_code=204)
async def delete_plugin(
    namespace: str,
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = f"{namespace}/{name}"
    result = await db.execute(select(Plugin).where(Plugin.slug == slug))
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(404, detail="Plugin not found")
    if plugin.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, detail="Not authorized to delete this plugin")
    await db.delete(plugin)


@router.post("/{namespace}/{name}/rate", response_model=PluginRatingResponse)
async def rate_plugin(
    namespace: str,
    name: str,
    score: int = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if score < 1 or score > 5:
        raise HTTPException(400, detail="Score must be between 1 and 5")

    slug = f"{namespace}/{name}"
    result = await db.execute(select(Plugin).where(Plugin.slug == slug, Plugin.is_published == True))
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(404, detail="Plugin not found")

    existing = await db.execute(
        select(PluginRating).where(PluginRating.plugin_id == plugin.id, PluginRating.user_id == current_user.id)
    )
    rating = existing.scalar_one_or_none()
    if rating:
        rating.score = score
    else:
        db.add(PluginRating(plugin_id=plugin.id, user_id=current_user.id, score=score))

    await db.flush()

    avg_result = await db.execute(
        select(func.avg(PluginRating.score)).where(PluginRating.plugin_id == plugin.id)
    )
    avg = avg_result.scalar_one()
    plugin.rating = round(float(avg), 1) if avg else None

    return PluginRatingResponse(average=plugin.rating, user_score=score)


@router.get("/{namespace}/{name}/my-rating")
async def get_my_plugin_rating(
    namespace: str,
    name: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = f"{namespace}/{name}"
    result = await db.execute(select(Plugin).where(Plugin.slug == slug))
    plugin = result.scalar_one_or_none()
    if not plugin:
        raise HTTPException(404, detail="Plugin not found")

    rating_result = await db.execute(
        select(PluginRating).where(PluginRating.plugin_id == plugin.id, PluginRating.user_id == current_user.id)
    )
    rating = rating_result.scalar_one_or_none()
    return {"score": rating.score if rating else None}
