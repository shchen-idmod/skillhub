from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from core.database import get_db
from core.auth import get_current_user
from models.models import User, Skill, Plugin, SkillRating, PluginRating
from models.schemas import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(403, detail="Admin access required")
    return current_user


@router.get("/status")
async def admin_status(db: AsyncSession = Depends(get_db)):
    """Returns whether an admin exists. No auth required — used for the seed UI flow."""
    existing = (await db.execute(select(User).where(User.is_admin == True))).scalar_one_or_none()
    return {"has_admin": existing is not None}


@router.get("/users", response_model=list[UserOut])
async def list_users(
    q: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all users, optionally filtered by username/email."""
    stmt = select(User).order_by(User.created_at.desc())
    if q:
        pattern = f"%{q}%"
        stmt = stmt.where(or_(User.username.ilike(pattern), User.email.ilike(pattern)))
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/seed", response_model=UserOut)
async def seed_admin(body: dict, db: AsyncSession = Depends(get_db)):
    """Bootstrap the first admin. Disabled once any admin exists."""
    existing = (await db.execute(select(User).where(User.is_admin == True))).scalar_one_or_none()
    if existing:
        raise HTTPException(403, detail="An admin already exists; use POST /admin/users/{username}/promote")

    username = body.get("username")
    if not username:
        raise HTTPException(400, detail="username is required")

    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")

    user.is_admin = True
    await db.flush()
    return user


@router.post("/users/{username}/promote", response_model=UserOut)
async def promote_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Grant admin rights to a user (requires existing admin)."""
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_admin = True
    await db.flush()
    return user


@router.delete("/users/{username}/revoke", response_model=UserOut)
async def revoke_admin(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Remove admin rights from a user (requires existing admin, cannot self-revoke)."""
    if current_user.username == username:
        raise HTTPException(400, detail="Cannot revoke your own admin access")
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")
    user.is_admin = False
    await db.flush()
    return user


@router.delete("/users/{username}")
async def delete_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Permanently delete a user and all their skills, plugins, and ratings."""
    if current_user.username == username:
        raise HTTPException(400, detail="Cannot delete your own account")
    user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, detail="User not found")

    # Delete ratings left by this user
    for row in (await db.execute(select(SkillRating).where(SkillRating.user_id == user.id))).scalars():
        await db.delete(row)
    for row in (await db.execute(select(PluginRating).where(PluginRating.user_id == user.id))).scalars():
        await db.delete(row)

    # Delete skills (SkillVersion cascades via the Skill relationship)
    for skill in (await db.execute(select(Skill).where(Skill.author_id == user.id))).scalars():
        await db.delete(skill)

    # Delete plugins
    for plugin in (await db.execute(select(Plugin).where(Plugin.author_id == user.id))).scalars():
        await db.delete(plugin)

    await db.delete(user)
    await db.flush()
    return {"deleted": username}
