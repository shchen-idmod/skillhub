"""
Run once to populate the database with demo skills and a test user.
Usage: python seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from core.database import init_db, AsyncSessionLocal
from core.auth import hash_password
from models.models import User, Skill, SkillVersion
from storage.s3 import ensure_bucket, upload_file
from pathlib import Path

DEMO_USER = {"username": "nvidia", "email": "demo@skillhub.dev", "password": "demo1234", "display_name": "NVIDIA"}

DEMO_SKILLS = [
    {
        "name": "rag-blueprint",
        "namespace": "NVIDIA",
        "description": "Deploy, configure, troubleshoot, and manage NVIDIA RAG Blueprint. Handles any RAG action: deploy, install, start, enable, disable, toggle, configure, troubleshoot, and tear down any RAG feature or service including Agentic RAG.",
        "domain": "AI & ML",
        "audience": "Developer",
        "tags": ["RAG", "LLM", "Blueprint", "NIM"],
        "supported_agents": ["All Agents"],
        "version": "2.1.0",
        "license": "Apache 2.0",
        "install_count": 1024,
        "rating": 4.9,
        "readme": "# RAG Blueprint\n\nThis skill gives your AI agent complete knowledge of the NVIDIA RAG Blueprint.\n\n## When to use\n\n- Deploying or configuring the RAG Blueprint stack\n- Debugging retrieval quality or latency issues\n- Toggling Agentic RAG, reranking, or guardrails\n\n## Quick install\n\n```\nnpx skills add NVIDIA/rag-blueprint\n```",
    },
    {
        "name": "cuopt-developer",
        "namespace": "NVIDIA",
        "description": "Modify, build, test, debug, and contribute to cuOpt (C++/CUDA, Python, server, CI). Use for solver internals, PRs, DCO, and code conventions.",
        "domain": "Computing",
        "audience": "Developer",
        "tags": ["C++", "CUDA", "Optimization", "Solver"],
        "supported_agents": ["Claude Code", "Codex"],
        "version": "1.3.0",
        "license": "Apache 2.0",
        "install_count": 972,
        "rating": 4.7,
        "readme": "# cuOpt Developer Skill\n\nFull guidance for contributing to NVIDIA cuOpt.\n\n## Topics covered\n\n- C++/CUDA development workflow\n- Python bindings\n- CI/CD conventions\n- DCO sign-off process",
    },
    {
        "name": "deepstream-dev",
        "namespace": "NVIDIA",
        "description": "DeepStream SDK 9.0 development with Python pyservicemaker API for video analytics pipelines, GStreamer-based processing, TensorRT inference, and Kafka integration.",
        "domain": "AI & ML",
        "audience": "ML Engineer",
        "tags": ["Video", "CV", "TensorRT", "GStreamer"],
        "supported_agents": ["All Agents"],
        "version": "1.0.0",
        "license": "Apache 2.0",
        "install_count": 972,
        "rating": 4.6,
        "readme": "# DeepStream Dev Skill\n\nBuild video analytics pipelines with NVIDIA DeepStream SDK 9.0.",
    },
    {
        "name": "accelerated-computing-cudf",
        "namespace": "NVIDIA",
        "description": "Official guidance for NVIDIA cuDF GPU DataFrames, pandas acceleration, dask-cuDF, ETL, joins, groupby, CSV/Parquet I/O, and multi-GPU workloads.",
        "domain": "Computing",
        "audience": "ML Engineer",
        "tags": ["GPU", "DataFrames", "ETL", "Pandas"],
        "supported_agents": ["Codex"],
        "version": "2.0.0",
        "license": "Apache 2.0",
        "install_count": 954,
        "rating": 4.8,
        "readme": "# cuDF Skill\n\nGPU-accelerated DataFrame operations with NVIDIA cuDF.",
    },
    {
        "name": "aiq-deploy",
        "namespace": "NVIDIA",
        "description": "Install, deploy, run, validate, troubleshoot, or stop NVIDIA AI-Q Blueprint infrastructure with full lifecycle management.",
        "domain": "AI & ML",
        "audience": "Platform Engineer",
        "tags": ["Infrastructure", "Deployment", "Blueprint"],
        "supported_agents": ["Claude Code"],
        "version": "1.1.0",
        "license": "Apache 2.0",
        "install_count": 906,
        "rating": 4.5,
        "readme": "# AI-Q Deploy Skill\n\nFull lifecycle management for NVIDIA AI-Q Blueprint infrastructure.",
    },
    {
        "name": "cudaq-guide",
        "namespace": "NVIDIA",
        "description": "CUDA-Q onboarding guide for installation, test programs, GPU simulation, QPU hardware, and quantum computing applications.",
        "domain": "Computing",
        "audience": "Developer",
        "tags": ["Quantum", "GPU", "Simulation", "CUDA-Q"],
        "supported_agents": ["All Agents"],
        "version": "1.0.0",
        "license": "MIT",
        "install_count": 902,
        "rating": 4.4,
        "readme": "# CUDA-Q Guide\n\nGet started with quantum computing using NVIDIA CUDA-Q.",
    },
    {
        "name": "skill-card-generator",
        "namespace": "NVIDIA",
        "description": "Generate or update a governance skill card for a specified existing agent skill directory. Not for explaining, listing, comparing, or discussing skill capabilities.",
        "domain": "Dev Tools",
        "audience": "Developer",
        "tags": ["Governance", "Meta", "Documentation"],
        "supported_agents": ["Claude Code"],
        "version": "1.2.0",
        "license": "Apache 2.0",
        "install_count": 892,
        "rating": 4.3,
        "readme": "# Skill Card Generator\n\nAutomate governance skill card creation and maintenance.",
    },
    {
        "name": "omniverse-usd-performance",
        "namespace": "NVIDIA",
        "description": "Top-level workflow skill for USD performance diagnosis and optimization. Use for slow loading, high memory, low FPS, or optimize my scene requests.",
        "domain": "Physical AI",
        "audience": "Developer",
        "tags": ["USD", "3D", "Omniverse", "Performance"],
        "supported_agents": ["All Agents"],
        "version": "1.0.0",
        "license": "Apache 2.0",
        "install_count": 895,
        "rating": 4.6,
        "readme": "# Omniverse USD Performance Skill\n\nDiagnose and optimize USD scene performance.",
    },
]


async def seed():
    await init_db()
    await ensure_bucket()

    async with AsyncSessionLocal() as session:
        # Create demo user
        from sqlalchemy import select
        existing = await session.execute(select(User).where(User.email == DEMO_USER["email"]))
        user = existing.scalar_one_or_none()
        if not user:
            user = User(
                username=DEMO_USER["username"],
                email=DEMO_USER["email"],
                hashed_password=hash_password(DEMO_USER["password"][:72]),
                display_name=DEMO_USER["display_name"],
                is_verified=True,
            )
            session.add(user)
            await session.flush()
            print(f"✓ Created user: {DEMO_USER['username']} / {DEMO_USER['password']}")
        else:
            print(f"  User already exists: {DEMO_USER['username']}")

        # Create demo skills
        for s in DEMO_SKILLS:
            slug = f"{s['namespace']}/{s['name']}"
            existing_skill = await session.execute(select(Skill).where(Skill.slug == slug))
            if existing_skill.scalar_one_or_none():
                print(f"  Skill already exists: {slug}")
                continue

            # Write a placeholder skill file to disk
            skill_content = f"# {s['name']}\n\n{s['description']}\n"
            s3_key = f"skills/{slug}/{s['version']}/SKILL.md"
            await upload_file(skill_content.encode(), s3_key, "text/markdown")

            skill = Skill(
                name=s["name"],
                namespace=s["namespace"],
                slug=slug,
                description=s["description"],
                readme=s.get("readme"),
                domain=s["domain"],
                audience=s.get("audience"),
                tags=s.get("tags", []),
                supported_agents=s.get("supported_agents", ["All Agents"]),
                version=s["version"],
                license=s.get("license", "Apache 2.0"),
                s3_key=s3_key,
                file_size_kb=len(skill_content) // 1024 or 1,
                install_count=s.get("install_count", 0),
                rating=s.get("rating"),
                is_published=True,
                author_id=user.id,
            )
            session.add(skill)
            await session.flush()

            sv = SkillVersion(skill_id=skill.id, version=s["version"], s3_key=s3_key, changelog="Initial release")
            session.add(sv)

            print(f"✓ Created skill: {slug}")

        await session.commit()
        print("\n✅ Seed complete!")
        print(f"   Login: {DEMO_USER['email']} / {DEMO_USER['password']}")


if __name__ == "__main__":
    asyncio.run(seed())
