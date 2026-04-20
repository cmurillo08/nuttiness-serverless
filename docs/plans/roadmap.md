---
title: nuttiness-serverless — Migration Roadmap
version: 1.1
updated: 2026-04-19
---

# nuttiness-serverless — Migration Roadmap

## Purpose

Migrate the `nuttiness` Next.js monolith into a decoupled serverless architecture — incrementally and deliberately, one domain at a time. Each phase is independently deployable and teaches a specific set of Python + Lambda + React patterns.

> Domain rules are **inherited** from the original `nuttiness` project at `/docs/plans/`. This project does not redefine them.

---

## Architecture Target

```
┌─────────────────────────────────┐
│   Frontend (S3 + CloudFront)    │
│   Vite + React SPA              │
│   Tailwind CSS + React Router   │
└────────────┬────────────────────┘
             │ HTTPS / API Gateway
┌────────────▼────────────────────┐
│   Backend (API Gateway + Lambda)│
│   Python aws-lambda-powertools  │
│   Pydantic · psycopg3           │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│   PostgreSQL (same schema as    │
│   nuttiness — no changes)       │
└─────────────────────────────────┘
```

One Lambda function per domain group to keep deployment units manageable:
- `auth` — login / logout
- `products` — raw products + prepared products
- `expenses` — expense records
- `sales` — orders + sale lines
- `customers` — customer directory
- `reports` — dashboard stats + financial summaries

---

## Phase Overview

| Phase | Name | nuttiness source | What you implement |
|-------|------|------------------|--------------------|
| 0 | Scaffold | phase-0-environment | Serverless Framework config, Python Lambda hello-world, Vite + React scaffold |
| 1 | Auth | phase-9-authentication | Login/logout Lambda, JWT cookie, React login page, route guard |
| 2 | Products | phase-2-products | Products Lambda (raw + prepared CRUD), React product pages |
| 3 | Expenses | phase-3-expenses | Expenses Lambda (CRUD), React expense pages |
| 4 | Sales & Customers | phase-4-sales + phase-5-customers | Sales Lambda, Customers Lambda, OrderBuilder, customer pages |
| 5 | Reporting | phase-6-reporting | Reports Lambda (aggregates), React dashboard + reports page |
| 6 | Deployment | phase-0-environment (IaC) | S3 + CloudFront hosting, production deploy, env var management |

---

## Learning Objectives by Phase

### Phase 0 — Scaffold
- Understand the Serverless Framework `serverless.yml` structure
- Write and deploy your first Python Lambda handler
- Understand how API Gateway routes map to Lambda handlers
- Scaffold a Vite + React SPA from scratch

### Phase 1 — Auth
- Write a real Python Lambda with `aws-lambda-powertools` `APIGatewayRestResolver`
- Connect to PostgreSQL from Lambda using `psycopg3`
- Handle environment variables securely in Lambda
- Issue and verify HMAC-signed cookies in Python
- Build a React login form and protect routes with a route guard

### Phase 2 — Products
- Define Pydantic models for input validation in Python
- Implement full CRUD in a Lambda handler (GET list, GET by id, POST, PUT, DELETE)
- Understand how to structure a Lambda handler into layers (HTTP → service → DB)
- Build paginated React list pages with fetch/useEffect

### Phase 3 — Expenses
- Work with dates and decimals in Python (common gotchas with PostgreSQL types)
- Understand psycopg3 cursor patterns and parameter binding
- Build React forms that POST to Lambda endpoints

### Phase 4 — Sales & Customers
- Handle multi-table writes with psycopg3 transactions (sale + sale_lines atomically)
- Understand commit/rollback patterns in Python
- Build the OrderBuilder component in React (dynamic line items)

### Phase 5 — Reporting
- Write SQL aggregate queries (SUM, GROUP BY) via psycopg3
- Return computed summaries from Lambda
- Build a React dashboard with stats cards

### Phase 6 — Deployment
- Deploy the React SPA to S3 + CloudFront using Serverless Framework
- Manage `DATABASE_URL` and secrets in Lambda via SSM or env
- Run a full end-to-end smoke test against the live stack

---

## Conventions

### File layout
```
backend/
  <domain>/
    handler.py      — Lambda entry point (APIGatewayRestResolver)
    service.py      — Business/application logic
    queries.py      — Raw SQL queries (psycopg3)
  shared/
    db.py           — Connection helper
    auth.py         — Cookie/token verification middleware
    errors.py       — Shared error responses

frontend/
  src/
    pages/          — One file per React page
    components/     — Shared UI components
    api/            — API client helpers (fetch wrappers)
    router.jsx      — React Router config
```

### API design
- All routes prefixed `/api/v1/`
- JSON request + response
- Consistent error envelope: `{ "error": "message" }`
- Consistent success list envelope: `{ "items": [...], "total": N, "page": N, "limit": N }`

### Database
- Same PostgreSQL schema as `nuttiness` — no schema changes needed
- `DATABASE_URL` environment variable (same format as nuttiness)
- Raw SQL only (no ORM) — psycopg3 (`psycopg` package) with named params

---

## Status

| Phase | Status |
|-------|--------|
| 0 — Scaffold | ✅ Complete |
| 1 — Auth | ✅ Complete |
| 2 — Products | ✅ Complete |
| 3 — Expenses | 🔲 Not started |
| 4 — Sales & Customers | 🔲 Not started |
| 5 — Reporting | 🔲 Not started |
| 6 — Deployment | 🔲 Not started |

---

## Stack Decisions (Phase 0 — permanent constraints)

These decisions were made during Phase 0 setup and affect all future phases. Do not change them without updating this section.

| Decision | Value | Reason |
|----------|-------|--------|
| Serverless Framework version | **v3** (`^3.39.0`) | v4 requires account login / license. v3 is free for local dev and deploy. |
| `frameworkVersion` in `serverless.yml` | `"3"` | Must match the installed CLI version. |
| Lambda runtime | **`python3.11`** | Serverless v3 runtime validation rejects `python3.12`. Use `python3.11` for all functions. |
| Python DB driver | **`psycopg[binary]>=3.1.0`** (psycopg3) | Cleaner API, better type mapping, native async. `[binary]` extra needed for Lambda (pre-compiled C extension). |
| serverless-offline version | **`^13.8.0`** | Locked to avoid future breakage. |
| serverless-offline httpPort | **`3001`** | Frontend dev server runs on `5173` and proxies `/api` to `3001`. Never change this. |
| `noPrependStageInUrl` | `true` | Prevents routes from being served as `/dev/api/v1/...` locally. |
| Node version | **20** (pinned in `.nvmrc`) | React Router v7 and `@tailwindcss/oxide` both require Node >= 20. |
| Tailwind version | **v4** via `@tailwindcss/vite` plugin | No `tailwind.config.js` or `postcss.config.js`. Just `@import "tailwindcss";` in `index.css`. |
| React Router version | **v7** | Installed as `react-router-dom@^7`. |
| Python venv location | **`.venv/`** at repo root | Created by `npm run setup:backend`. |
| VIRTUAL_ENV injection | `VIRTUAL_ENV=$PWD/.venv PATH=$PWD/.venv/bin:$PATH` prepended to `offline` npm scripts | serverless-offline reads `VIRTUAL_ENV` to find the correct Python interpreter. No manual `source .venv/bin/activate` needed. |
| `.env` loading | `useDotenv: true` at root of `serverless.yml` | `${env:VAR}` in serverless.yml reads from the shell environment only. Without `useDotenv: true`, values in `.env` are never loaded and all env vars fall back to `''`. |
| Python package imports | Every `backend/<domain>/` and `backend/shared/` needs an `__init__.py` | Without it, `from backend.shared import auth` may fail as a proper package import. Create empty `__init__.py` in every backend subdirectory. |
| Python version for `.venv` | Use `python3.11` explicitly in `setup:backend` | System `python3` on macOS defaults to 3.9. `.venv` must be created with `python3.11 -m venv .venv` to match the Lambda runtime and support modern syntax (`dict \| None`, `list[dict]`, etc.). |
| DB schema (`PGSCHEMA`) | Set `PGSCHEMA=nuttiness` in `.env`; `db.py` passes `options="-c search_path=nuttiness"` to psycopg3 | The nuttiness PostgreSQL database uses a non-default schema (`nuttiness` schema inside `personal_projects` DB). Without setting `search_path`, all queries fail with "relation does not exist". Mirror: `PGSCHEMA` env var → `search_path` connection option. |
| Auth guard pattern in handlers | `require_auth()` reads `app.current_event.headers` — no argument | `APIGatewayProxyEvent` (REST API) has no `.cookies` attribute — that's HTTP API v2 only. Always parse cookies from `app.current_event.headers.get("cookie")` and call `require_auth()` with no arguments. |
| serverless-offline `parseCookies` bug | Patched via `scripts/patch-serverless-offline.mjs` (Patch 2) | `HttpServer.js`'s `parseCookies` passes the full cookie string (e.g. `TOKEN; Path=/; HttpOnly`) to hapi's `h.state()`. `@hapi/statehood` rejects `;` as invalid in a cookie value. Patch: `.split(";")[0].trim()` to extract only the token before passing to `h.state()`. |
| serverless-offline `PythonRunner` shell bug | Patched via `scripts/patch-serverless-offline.mjs` (Patch 1) | `PythonRunner.js` uses `shell: true` which breaks Python invocation on paths with spaces (e.g. `Personal Projects`). Patch: `shell: false`. |

### File layout (current)
```
serverless.yml              — Serverless Framework config (v3, python3.11, port 3001)
package.json                — Root npm project; Serverless CLI + dev scripts
backend/
  requirements.txt          — aws-lambda-powertools>=3.0.0, psycopg[binary]>=3.1.0, pydantic>=2.0.0
  health/
    handler.py              — Phase 0 health-check Lambda
  shared/                   — (empty — populated from Phase 1 onwards)
frontend/
  package.json              — Vite + React 19 + Tailwind v4 + React Router v7
  vite.config.js            — @tailwindcss/vite plugin + /api proxy to localhost:3001
  src/
    main.jsx
    App.jsx
    index.css
    pages/Home.jsx
scripts/
  patch-serverless-offline.mjs  — fixes shell:true bug in PythonRunner.js
  clean-reset.sh                — removes .venv, node_modules, dist, __pycache__
  check-node20.mjs              — guards setup:frontend from running on Node < 20
.env.example                — DATABASE_URL, APP_USERNAME, APP_PASSWORD, SESSION_SECRET, API_BASE_URL
.nvmrc                      — 20
.gitignore                  — covers .venv/, node_modules/, frontend/dist/, .serverless/, .env
```

### npm scripts quick reference
| Script | What it does |
|--------|--------------|
| `npm run setup:all` | Full first-time setup: npm install + .venv + frontend deps |
| `npm run offline` | Patch serverless-offline, then start (with VIRTUAL_ENV injected) |
| `npm run offline:verbose` | Same, with verbose Lambda logs |
| `npm run frontend:dev` | Start Vite dev server on port 5173 |
| `npm run clean:setup` | Remove all generated/installed artifacts |

---

## Approval Tokens

When you're ready to proceed with a phase, reply with one of: **approved**, **continue**, or **proceed**.
