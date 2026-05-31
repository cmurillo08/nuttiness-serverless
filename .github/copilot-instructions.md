---
title: Copilot instructions for the "nuttiness-serverless" repo
---

## Purpose

Provide concise, actionable guidance so an AI coding agent can be productive immediately in this repo.

---

## Big Picture

**`nuttiness-serverless`** is a migration of the `nuttiness` Next.js monolith into a decoupled serverless architecture. The domain (business entities, rules, and logic) is fully defined in the original `nuttiness` project — **do not redefine it here.**

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React SPA (deployable to S3 + CloudFront) |
| Backend | Python Lambda functions + API Gateway (`aws-lambda-powertools`) |
| Database | PostgreSQL (same schema as `nuttiness`) |
| IaC | Serverless Framework v3 |

Migration is **spec-driven** and **phase-by-phase**. See `docs/plans/` and `docs/plans/roadmap.md` for the phased plan.

---

## Key Files & Directories

- **Agent instructions:** `.github/agents/architect.agent.md`, `.github/agents/backend.agent.md`, `.github/agents/frontend.agent.md`
- **Phase plans:** `docs/plans/phase-*.md` (single source of truth for each phase)
- **Backend handlers:** `backend/<domain>/handler.py` — one Lambda per domain group
- **Frontend pages:** `frontend/src/pages/` — React pages (migrated from `nuttiness/app/`)
- **Frontend components:** `frontend/src/components/`, `frontend/src/layouts/`
- **Domain source (read-only reference):** `/Users/tiny/Personal Projects/nuttiness/docs/plans/`
- **Infra config:** `serverless.yml` — Serverless Framework v3, defines all Lambda functions + API Gateway routes
- **Backend dependencies:** `backend/requirements.txt`
- **Frontend dependencies:** `frontend/package.json`

---

## Essential Repo Conventions (must-follow)

- **Spec-driven development:** do not implement functionality until a phase plan exists in `docs/plans/` and is approved by the human.
- **Domain is inherited:** business rules live in `nuttiness/docs/plans/`. Read them before implementing. Do not reinterpret or redefine.
- **Role separation:**
  - Architect Agent = design + orchestration (no code)
  - Backend Agent = Python Lambda handlers, DB layer, `serverless.yml` updates
  - Frontend Agent = React pages/components, API integration
- **Approval flow:** only top-level human messages trigger phase progression. Exact approval tokens: `approved`, `continue`, `proceed` (case-insensitive).
- **Todo tool:** agents must use the workspace todo tool to record plans and phase progression.
- **One Lambda per domain group** — `auth`, `products`, `expenses`, `sales`, `customers`, `reports`. Avoid one Lambda per route.

---

## Developer Workflows

### Prerequisites

- Node.js 20+ (see `.nvmrc`). Use `nvm install && nvm use` to activate.
- Python 3.11 (required — Serverless Framework v3 does not support 3.12+ runtime string).
- `DATABASE_URL` env var must point to a live PostgreSQL instance (same DB as `nuttiness`).
- Copy `.env.example` → `.env` and fill in all values before running the backend.

### First-time setup

```bash
# From repo root
npm install          # installs serverless + serverless-offline
npm run setup:backend   # creates .venv and installs Python deps
npm run setup:frontend  # installs frontend npm deps
```

Or run all at once:

```bash
npm run setup:all
```

### Running locally

**Terminal A — Backend (Serverless Offline):**

```bash
npm run offline
```

The `preoffline` hook automatically patches `serverless-offline` for paths with spaces (e.g. `Personal Projects`). The backend API is available at `http://localhost:3000`.

**Terminal B — Frontend (Vite dev server):**

```bash
npm run frontend:dev
```

Frontend is available at `http://localhost:5173`.

### Other commands

| Command | Purpose |
|---------|---------|
| `npm run offline:verbose` | Start backend with verbose logging |
| `npm run frontend:build` | Production build of the React SPA |
| `npm run frontend:preview` | Preview the production build locally |
| `npm run clean:setup` | Full clean reset (removes node_modules, .venv, frontend deps) |

### Clean reset

```bash
bash scripts/clean-reset.sh
```

Then re-run the setup flow above.

---

## Tech Stack & Environment

### Backend

- **Runtime:** Python 3.11 (specified in `serverless.yml` and required by the Serverless CLI)
- **Framework:** Serverless Framework v3 (`frameworkVersion: "3"` in `serverless.yml`)
- **Routing:** `aws-lambda-powertools` `APIGatewayRestResolver`
- **Validation:** Pydantic v2
- **DB access:** `psycopg[binary]>=3.1.0` (psycopg3) + raw SQL
- **Logging:** `aws-lambda-powertools` `Logger`
- **Local execution:** `serverless-offline` (with auto-patch for path-with-spaces issue)
- **Virtual environment:** `.venv/` at repo root — always activate or reference before running Python commands

### Frontend

- **Build tool:** Vite
- **Framework:** React 19
- **Routing:** React Router v7
- **Styling:** Tailwind CSS v4 (utility-first)
- **HTTP:** `fetch` API (prefer over axios unless complexity warrants it)
- **State:** React `useState` / `useEffect` (no heavy state library unless explicitly needed)

### Database

- Same PostgreSQL instance and schema as `nuttiness`. Do not alter the schema here unless the `nuttiness` migration has been applied first.
- Set `DATABASE_URL` and `PGSCHEMA` in `.env` before any backend work.

### Environment variables (`.env`)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `PGSCHEMA` | PostgreSQL schema (optional, defaults to `public`) |
| `APP_USERNAME` | App login username |
| `APP_PASSWORD` | App login password (bcrypt hashed in DB) |
| `SESSION_SECRET` | HMAC secret for session cookies |
| `FRONTEND_ORIGIN` | CORS allowed origin (default: `http://localhost:5173`) |

---

## Integration & Patterns

- **API contract first:** Architect spec → Domain definitions (from `nuttiness`) → Backend Lambda → Frontend pages.
- **Backend pattern (mandatory):**
  1. `handler.py` — entry point, `APIGatewayRestResolver`, route registration
  2. `db.py` — raw SQL queries, psycopg3
  3. `models.py` — Pydantic v2 models for request/response
- **Frontend pattern:** API calls live in `frontend/src/api/<domain>.js`. Pages import from there — no inline `fetch` in components.
- **Auth:** session cookie (HMAC-signed, `HttpOnly`). The `RouteGuard` component in `frontend/src/components/RouteGuard.jsx` protects authenticated routes.
- **CORS:** configured per-function in `serverless.yml` (`cors: true`). The Lambda handler must also return `Access-Control-Allow-Origin` and `Access-Control-Allow-Credentials` headers.
- **Pagination:** follow the same `page` / `limit` pattern as `nuttiness/lib/pagination.js`.

---

## What to Avoid

- **No domain redefinition:** do not rewrite business rules. Read `nuttiness/docs/plans/` and implement exactly.
- **No unapproved implementation:** never implement a feature without an approved phase plan.
- **No `python3.12` runtime string** in `serverless.yml` — Serverless Framework v3 rejects it. Use `python3.11`.
- **No `.cjs` PostCSS config** — frontend uses `.mjs` (ESM). Remove `.cjs` if encountered.
- **No venv activation in shell before `npm run offline`** — the `offline` script handles `VIRTUAL_ENV` and `PATH` automatically.
- **No manual `pip install`** — always use `.venv/bin/python3 -m pip install` or `npm run setup:backend`.

---

## If Something Is Missing

- **`DATABASE_URL` not set:** backend cannot start. Ask the human for the connection string and add it to `.env`.
- **Phase plan missing:** ask the Architect Agent or the human to author `docs/plans/phase-X-name.md` before implementation.
- **`serverless-offline` Python error (spaces in path):** the `preoffline` hook patches this automatically. If it still fails, run `node scripts/patch-serverless-offline.mjs` manually and retry.
- **`python3.11` not found:** install Python 3.11 (e.g. `brew install python@3.11`) and confirm with `python3.11 --version`.
- **Frontend `npm install` fails:** ensure Node.js 20+ is active (`node -v`) and run `npm run setup:frontend` again.

---

## Feedback

After applying changes or producing a spec, stop and request explicit human approval using the exact tokens above (`approved`, `continue`, `proceed`).

---

## References

- `.github/agents/architect.agent.md` — Architect Agent rules and output format
- `.github/agents/backend.agent.md` — Backend Agent rules, mandatory Lambda pattern
- `.github/agents/frontend.agent.md` — Frontend Agent rules, component/page conventions
- `docs/plans/roadmap.md` — full phase overview and learning objectives
- `nuttiness` repo `/.github/copilot-instructions.md` — source domain project instructions
