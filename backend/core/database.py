from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from core.config import get_settings


class Base(DeclarativeBase):
    pass


def get_engine():
    settings = get_settings()
    is_sqlite = "sqlite" in settings.async_database_url
    return create_async_engine(
        settings.async_database_url,
        echo=settings.debug,
        connect_args={"check_same_thread": False} if is_sqlite else {},
    )


def get_session_maker():
    return async_sessionmaker(get_engine(), expire_on_commit=False)


async def get_db() -> AsyncSession:
    session_maker = get_session_maker()
    async with session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db():
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Keep these for backward compatibility
settings = get_settings()
is_sqlite = "sqlite" in settings.async_database_url
engine = get_engine()
AsyncSessionLocal = get_session_maker()