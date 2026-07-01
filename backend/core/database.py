from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from core.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
_is_sqlite = "sqlite" in _settings.async_database_url

# Single engine + pool shared across all requests
engine = create_async_engine(
    _settings.async_database_url,
    echo=_settings.debug,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
    # pool_pre_ping validates connections before use — prevents "connection closed"
    # errors after Railway/Heroku drops idle connections
    pool_pre_ping=not _is_sqlite,
)

AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    if _is_sqlite:
        await _migrate_sqlite()


async def _migrate_sqlite():
    """Add columns to existing SQLite databases that predate schema changes."""
    from sqlalchemy import text
    async with engine.begin() as conn:
        rows = await conn.execute(text("PRAGMA table_info(users)"))
        existing = {row[1] for row in rows.fetchall()}
        if "is_admin" not in existing:
            await conn.execute(text(
                "ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT 0"
            ))
