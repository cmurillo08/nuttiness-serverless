---
title: nuttiness-serverless — Migration Roadmap
version: 1.0
updated: 2026-04-14
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
| 0 — Scaffold | 🔲 Not started |
| 1 — Auth | 🔲 Not started |
| 2 — Products | 🔲 Not started |
| 3 — Expenses | 🔲 Not started |
| 4 — Sales & Customers | 🔲 Not started |
| 5 — Reporting | 🔲 Not started |
| 6 — Deployment | 🔲 Not started |

---

## Approval Tokens

When you're ready to proceed with a phase, reply with one of: **approved**, **continue**, or **proceed**.
