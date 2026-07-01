"""
Run once to replace NVIDIA demo skills with Anthropic public skills.
Usage: python seed_anthropic.py
"""
import asyncio
from pathlib import Path
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from core.database import AsyncSessionLocal, init_db
from models.models import User, Skill, SkillVersion
from core.auth import hash_password

UPLOAD_DIR = Path("./uploads")

SKILLS = [
    {
        "name": "claude-api",
        "namespace": "anthropic",
        "description": "Build LLM-powered applications with the Claude API. Covers Python, TypeScript, streaming, tool use, batches, prompt caching, and structured outputs.",
        "domain": "Technology & Tools",
        "audience": "Software Engineer",
        "tags": ["claude", "api", "llm", "sdk", "anthropic"],
        "supported_agents": ["Claude Code", "All Agents"],
        "version": "1.0.0",
        "license": "Apache 2.0",
        "github_url": "https://github.com/anthropics/skills/tree/main/skills/claude-api",
    },
    {
        "name": "frontend-design",
        "namespace": "anthropic",
        "description": "Strategic guidance for creating distinctive web UIs that avoid AI-template defaults. Covers typography, layout, motion, and copy.",
        "domain": "Technology & Tools",
        "audience": "Software Engineer",
        "tags": ["design", "frontend", "ui", "css", "typography"],
        "supported_agents": ["Claude Code", "All Agents"],
        "version": "1.0.0",
        "license": "Apache 2.0",
        "github_url": "https://github.com/anthropics/skills/tree/main/skills/frontend-design",
    },
    {
        "name": "mcp-builder",
        "namespace": "anthropic",
        "description": "Four-phase guide to building production-quality MCP servers in TypeScript. Covers tool design, authentication, testing, and evaluation.",
        "domain": "Technology & Tools",
        "audience": "Software Engineer",
        "tags": ["mcp", "typescript", "tools", "protocol", "server"],
        "supported_agents": ["Claude Code", "All Agents"],
        "version": "1.0.0",
        "license": "Apache 2.0",
        "github_url": "https://github.com/anthropics/skills/tree/main/skills/mcp-builder",
    },
    {
        "name": "webapp-testing",
        "namespace": "anthropic",
        "description": "Playwright-based toolkit for testing local web apps. Covers server lifecycle management, dynamic DOM inspection, and selector best practices.",
        "domain": "Technology & Tools",
        "audience": "Software Engineer",
        "tags": ["testing", "playwright", "automation", "browser", "python"],
        "supported_agents": ["Claude Code", "All Agents"],
        "version": "1.0.0",
        "license": "Apache 2.0",
        "github_url": "https://github.com/anthropics/skills/tree/main/skills/webapp-testing",
    },
]


async def main():
    await init_db()

    async with AsyncSessionLocal() as db:
        # Remove all NVIDIA and existing Anthropic skills (cascade deletes versions)
        old_skills = (await db.execute(
            select(Skill).options(selectinload(Skill.versions))
            .where(Skill.namespace.in_(["NVIDIA", "anthropic"]))
        )).scalars().all()
        for s in old_skills:
            await db.delete(s)
        await db.flush()
        print(f"Removed {len(old_skills)} old skill(s)")

        # Get or create anthropic user
        result = await db.execute(select(User).where(User.username == "anthropic"))
        user = result.scalar_one_or_none()
        if not user:
            user = User(
                username="anthropic",
                email="skills@anthropic.com",
                hashed_password=hash_password("anthropic-skills-2025"),
                display_name="Anthropic",
                bio="Official Anthropic skills for Claude Code.",
                is_verified=True,
            )
            db.add(user)
            await db.flush()
            print("Created 'anthropic' user")
        else:
            print("'anthropic' user already exists")

        # Insert skills
        for s in SKILLS:
            slug = f"{s['namespace']}/{s['name']}"
            skill_file = UPLOAD_DIR / "skills" / s["namespace"] / s["name"] / s["version"] / "SKILL.md"
            readme = skill_file.read_text(encoding="utf-8") if skill_file.exists() else None
            s3_key = f"skills/{slug}/{s['version']}/SKILL.md"
            file_size_kb = skill_file.stat().st_size // 1024 if skill_file.exists() else 0

            skill = Skill(
                name=s["name"],
                namespace=s["namespace"],
                slug=slug,
                description=s["description"],
                readme=readme,
                domain=s["domain"],
                audience=s["audience"],
                tags=s["tags"],
                supported_agents=s["supported_agents"],
                version=s["version"],
                license=s["license"],
                github_url=s["github_url"],
                s3_key=s3_key,
                file_size_kb=file_size_kb,
                is_published=True,
                is_featured=True,
                author_id=user.id,
            )
            db.add(skill)
            await db.flush()

            db.add(SkillVersion(skill_id=skill.id, version=s["version"], s3_key=s3_key))
            print(f"  Added {slug}")

        await db.commit()
        print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
