from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    display_name: Optional[str] = None

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]{3,64}$", v):
            raise ValueError("Username must be 3–64 chars: letters, numbers, _ or -")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    email: str
    display_name: Optional[str]
    bio: Optional[str]
    avatar_url: Optional[str]
    is_verified: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Skills ───────────────────────────────────────────────────────────────────

class SkillCreate(BaseModel):
    name: str
    namespace: str
    description: str
    domain: str
    audience: Optional[str] = None
    tags: list[str] = []
    supported_agents: list[str] = ["All Agents"]
    version: str = "1.0.0"
    license: str = "Apache 2.0"
    github_url: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$", v):
            raise ValueError("Name must be lowercase, hyphens allowed, 3–128 chars")
        return v

    @field_validator("tags")
    @classmethod
    def tags_limit(cls, v: list) -> list:
        if len(v) > 8:
            raise ValueError("Maximum 8 tags")
        return v


class AuthorOut(BaseModel):
    username: str
    display_name: Optional[str]
    avatar_url: Optional[str]
    email: str

    model_config = {"from_attributes": True}


class SkillVersionOut(BaseModel):
    version: str
    changelog: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class SkillOut(BaseModel):
    id: int
    name: str
    namespace: str
    slug: str
    description: str
    readme: Optional[str]
    domain: str
    audience: Optional[str]
    tags: list[str]
    supported_agents: list[str]
    version: str
    license: str
    github_url: Optional[str]
    file_size_kb: Optional[int]
    install_count: int
    rating: Optional[float]
    is_featured: bool
    author: AuthorOut
    versions: list[SkillVersionOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SkillListItem(BaseModel):
    id: int
    name: str
    namespace: str
    slug: str
    description: str
    domain: str
    audience: Optional[str]
    tags: list[str]
    supported_agents: list[str]
    version: str
    install_count: int
    rating: Optional[float]
    is_featured: bool
    author: AuthorOut
    github_url: Optional[str]
    updated_at: datetime

    model_config = {"from_attributes": True}


class SkillListResponse(BaseModel):
    items: list[SkillListItem]
    total: int
    page: int
    page_size: int
    pages: int


class InstallResponse(BaseModel):
    slug: str
    version: str
    download_url: Optional[str] = None  # zip-backed skills only
    github_url: Optional[str] = None    # GitHub-sourced skills only
    files: list[str]
    install_count: int


# ── Plugins ───────────────────────────────────────────────────────────────────

class PluginCreate(BaseModel):
    name: str
    namespace: str
    display_name: str
    description: str
    category: str
    platform: str
    tags: list[str] = []
    version: str = "1.0.0"
    github_url: Optional[str] = None
    docs_url: Optional[str] = None
    readme: Optional[str] = None
    marketplace_name: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        if not re.match(r"^[a-z0-9][a-z0-9-]{1,126}[a-z0-9]$", v):
            raise ValueError("Name must be lowercase, hyphens allowed, 3–128 chars")
        return v

    @field_validator("tags")
    @classmethod
    def tags_limit(cls, v: list) -> list:
        if len(v) > 8:
            raise ValueError("Maximum 8 tags")
        return v


class PluginUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    platform: Optional[str] = None
    tags: Optional[list[str]] = None
    version: Optional[str] = None
    github_url: Optional[str] = None
    docs_url: Optional[str] = None
    readme: Optional[str] = None
    marketplace_name: Optional[str] = None


class PluginOut(BaseModel):
    id: int
    name: str
    namespace: str
    slug: str
    display_name: str
    description: str
    readme: Optional[str]
    category: str
    platform: str
    tags: list[str]
    version: str
    github_url: Optional[str]
    docs_url: Optional[str]
    marketplace_name: Optional[str]
    install_count: int
    rating: Optional[float]
    author: AuthorOut
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PluginListItem(BaseModel):
    id: int
    name: str
    namespace: str
    slug: str
    display_name: str
    description: str
    category: str
    platform: str
    tags: list[str]
    version: str
    install_count: int
    rating: Optional[float]
    github_url: Optional[str]
    docs_url: Optional[str]
    marketplace_name: Optional[str]
    author: AuthorOut
    updated_at: datetime

    model_config = {"from_attributes": True}


class PluginRatingResponse(BaseModel):
    average: Optional[float]
    user_score: int


class PluginListResponse(BaseModel):
    items: list[PluginListItem]
    total: int
    page: int
    page_size: int
    pages: int


class PluginInstallResponse(BaseModel):
    slug: str
    version: str
    source_url: Optional[str]
    docs_url: Optional[str]
    install_count: int
