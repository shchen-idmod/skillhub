from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(256), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(256))
    display_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    skills: Mapped[list["Skill"]] = relationship("Skill", back_populates="author")
    plugins: Mapped[list["Plugin"]] = relationship("Plugin", back_populates="author")


class Skill(Base):
    __tablename__ = "skills"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    namespace: Mapped[str] = mapped_column(String(64), index=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)  # namespace/name

    description: Mapped[str] = mapped_column(Text)
    readme: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    domain: Mapped[str] = mapped_column(String(64))
    audience: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    supported_agents: Mapped[list] = mapped_column(JSON, default=list)

    version: Mapped[str] = mapped_column(String(32), default="1.0.0")
    license: Mapped[str] = mapped_column(String(64), default="Apache 2.0")
    github_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # S3 storage
    s3_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    file_size_kb: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Stats
    install_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[Optional[float]] = mapped_column(default=None, nullable=True)

    is_published: Mapped[bool] = mapped_column(Boolean, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    author: Mapped["User"] = relationship("User", back_populates="skills")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    versions: Mapped[list["SkillVersion"]] = relationship("SkillVersion", back_populates="skill", cascade="all, delete-orphan")


class SkillRating(Base):
    __tablename__ = "skill_ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    skill: Mapped["Skill"] = relationship("Skill")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (UniqueConstraint("skill_id", "user_id", name="uq_skill_user_rating"),)


class Plugin(Base):
    __tablename__ = "plugins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    namespace: Mapped[str] = mapped_column(String(64), index=True)
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)  # namespace/name

    display_name: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text)
    readme: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    category: Mapped[str] = mapped_column(String(64))
    platform: Mapped[str] = mapped_column(String(64))
    tags: Mapped[list] = mapped_column(JSON, default=list)

    version: Mapped[str] = mapped_column(String(32), default="1.0.0")
    github_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    docs_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    marketplace_name: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    install_count: Mapped[int] = mapped_column(Integer, default=0)
    rating: Mapped[Optional[float]] = mapped_column(default=None, nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=True)

    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    author: Mapped["User"] = relationship("User", back_populates="plugins")

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PluginRating(Base):
    __tablename__ = "plugin_ratings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    plugin_id: Mapped[int] = mapped_column(ForeignKey("plugins.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    score: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-5
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    plugin: Mapped["Plugin"] = relationship("Plugin")
    user: Mapped["User"] = relationship("User")

    __table_args__ = (UniqueConstraint("plugin_id", "user_id", name="uq_plugin_user_rating"),)


class SkillVersion(Base):
    __tablename__ = "skill_versions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))
    version: Mapped[str] = mapped_column(String(32))
    s3_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    changelog: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    skill: Mapped["Skill"] = relationship("Skill", back_populates="versions")
