# SkillHub

A registry for AI agent skills and plugins — discover, publish, and install context skills and Claude Code plugins.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| State / Data | Zustand + TanStack Query |
| Backend | FastAPI (Python 3.12) |
| Database | SQLite (aiosqlite) |
| File storage | Local filesystem |
| Auth | JWT (python-jose + passlib bcrypt) |
| CLI | Node.js + Commander.js |

---

## Project structure

```
skillhub/
├── docker-compose.yml          # development
├── docker-compose.prod.yml     # production
├── .env.example                # environment variable template
├── data/                       # skillhub.db + uploads (bind-mounted in Docker)
├── frontend/
│   ├── Dockerfile              # dev — Vite dev server
│   ├── Dockerfile.prod         # prod — multi-stage build → Nginx
│   ├── nginx.conf              # Nginx config (proxies /api → backend)
│   └── src/
│       ├── api/client.ts       # Axios client + all API types
│       ├── components/         # Navbar, SkillCard, ui.tsx (Button/Badge/Input)
│       ├── hooks/useAuth.ts    # Zustand auth store
│       └── pages/              # RegistryPage, SkillDetailPage, PluginsPage,
│                               # PublishPage, AdminPage, AuthPages, …
├── backend/
│   ├── main.py                 # FastAPI app + CORS + lifespan
│   ├── core/
│   │   ├── config.py           # Settings via pydantic-settings + .env
│   │   ├── database.py         # SQLAlchemy async engine + runtime migrations
│   │   └── auth.py             # JWT creation + verification
│   ├── models/
│   │   ├── models.py           # ORM models (User, Skill, Plugin, ratings)
│   │   └── schemas.py          # Pydantic request/response schemas
│   ├── routes/
│   │   ├── auth.py             # /auth — register, login, me
│   │   ├── skills.py           # /skills — CRUD + ratings
│   │   ├── plugins.py          # /plugins — CRUD + ratings
│   │   └── admin.py            # /admin — user management, admin promotion
│   └── storage/
│       └── s3.py               # Local file storage (S3 interface, no MinIO)
└── cli/
    └── src/index.js            # skills CLI (add/list/remove/search)
```

---

## Development

### Run frontend locally (no Docker)

```powershell
cd frontend
npm install
npm run dev
```

Opens at **http://localhost:5173**. The Vite dev server automatically proxies `/api` requests to `http://localhost:8000`, so the backend must be running separately (see options below).

If your backend is on a different port, set `VITE_API_URL` before starting:

```powershell
$env:VITE_API_URL = "http://localhost:8080"
npm run dev
```

---

### Option A — full Docker (recommended first run)

```powershell
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend (Vite) | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

### Option B — backend in Docker, frontend local (easier frontend debugging)

```powershell
# Terminal 1 — backend only
docker-compose up backend

# Terminal 2 — frontend local
cd frontend
npm install
npm run dev
```

### Option C — fully local (no Docker)

```powershell
# Terminal 1 — backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload

# Terminal 2 — frontend
cd frontend
npm install
npm run dev
```

The SQLite database and uploads are created at `./backend/skillhub.db` and `./backend/uploads/` when running locally.

---

## Production

```powershell
# 1. Create your .env file
Copy-Item .env.example .env
# Edit .env — set SECRET_KEY to a random value:
# python -c "import secrets; print(secrets.token_hex(32))"

# 2. Build and start
docker-compose -f docker-compose.prod.yml up --build -d

# 3. Check status
docker-compose -f docker-compose.prod.yml ps
```

Open **http://localhost** (port 80, served by Nginx).

The production setup differs from dev:
- Frontend is compiled (`npm run build`) and served by Nginx — no Vite dev server
- Nginx proxies `/api/*` to the FastAPI backend (stripping the `/api` prefix)
- Backend runs with 4 Uvicorn workers, no `--reload`
- Source code is baked into the image — no bind mounts for code
- Database and uploads persist at `./data/` on the host

### Health check

```powershell
curl http://localhost/api/health
# {"status": "ok", "app": "SkillHub API", "storage": "local", "db": "sqlite"}

# Or via Docker
docker-compose -f docker-compose.prod.yml ps   # shows healthy/unhealthy
```

---

## Admin setup

The first admin is bootstrapped through the UI — no CLI needed.

1. Register an account at `/register`
2. Go to `/admin`
3. Click **Make me admin** (only available when no admin exists yet)

Once an admin exists, additional admins can be promoted from the `/admin` panel. Admins can edit or delete any skill or plugin, and manage user accounts.

---

## API reference

### Skills

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/skills` | List/search (`q`, `domain`, `audience`, `agent`, `sort`, `page`) |
| `GET` | `/skills/{namespace}/{name}` | Skill detail + versions |
| `POST` | `/skills` | Publish a skill (multipart, auth required) |
| `PATCH` | `/skills/{namespace}/{name}` | Update skill (owner or admin) |
| `DELETE` | `/skills/{namespace}/{name}` | Delete skill (owner or admin) |
| `POST` | `/skills/{namespace}/{name}/rate` | Submit a rating |
| `GET` | `/skills/{namespace}/{name}/my-rating` | Get your rating |
| `GET` | `/skills/domains/list` | Domain counts |

### Plugins

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/plugins` | List/search plugins |
| `GET` | `/plugins/{namespace}/{name}` | Plugin detail |
| `POST` | `/plugins` | Register a plugin (auth required) |
| `PATCH` | `/plugins/{namespace}/{name}` | Update plugin (owner or admin) |
| `DELETE` | `/plugins/{namespace}/{name}` | Delete plugin (owner or admin) |
| `POST` | `/plugins/{namespace}/{name}/rate` | Submit a rating |

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Get JWT token |
| `GET` | `/auth/me` | Current user |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/admin/status` | Whether an admin exists (no auth) |
| `GET` | `/admin/users` | List users (admin only) |
| `POST` | `/admin/seed` | Bootstrap first admin (disabled once one exists) |
| `POST` | `/admin/users/{username}/promote` | Grant admin rights |
| `DELETE` | `/admin/users/{username}/revoke` | Remove admin rights |
| `DELETE` | `/admin/users/{username}` | Delete user + all their content |

---

## Environment variables

Copy `.env.example` to `.env` and set at minimum:

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `dev-secret-key-…` | JWT signing key — **change in production** |
| `ALLOWED_ORIGINS` | `http://localhost:5173,…` | Comma-separated CORS origins |
| `DEBUG` | `true` | Set to `false` in production |
| `DATABASE_URL` | SQLite at `./skillhub.db` | Railway sets this automatically; `postgres://` and `postgresql://` are both handled |
| `UPLOAD_DIR` | `./uploads` | Where skill files are stored |

Never commit `.env` to git.
