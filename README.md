# nuttiness-serverless

A migration of the [nuttiness](../nuttiness) Next.js monolith into a decoupled serverless architecture.

## What this is

`nuttiness` is an inventory and sales management app for nut-based products (raw products, prepared products, expenses, sales, customers). This repo recreates that same application on a modern serverless stack:

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React SPA (deployable to S3 + CloudFront) |
| Backend | Python Lambda functions + API Gateway (`aws-lambda-powertools`) |
| Database | PostgreSQL (same schema as nuttiness) |
| IaC | Serverless Framework v3 |

## Structure

```
frontend/   — Vite + React SPA
backend/    — Python Lambda handlers (one per domain group)
docs/
  plans/    — Phase plans authored by the Architect agent
```

## Status

Early scaffold — migration in progress. See `docs/plans/` for phase-by-phase implementation plans.

## Quick Start (Local)

Node.js 20 or newer is required for the frontend toolchain. This repo includes [.nvmrc](.nvmrc), so you can run:
- nvm install
- nvm use

Run everything from the repository root using two terminals.

### Terminal A — Backend API (Serverless Offline)

```bash
cd /path/to/nuttiness-serverless
npm install
npm run setup:backend
npm run offline
```

Note: the `offline` script auto-applies a small compatibility patch for `serverless-offline` Python runner when your project path contains spaces (for example, `Personal Projects`).

### Terminal B — Frontend app

```bash
cd /path/to/nuttiness-serverless
npm run setup:frontend
npm run frontend:dev
```

### Why no manual venv activation now?

`setup:backend` creates and installs dependencies into `.venv` explicitly. The `offline` script then forces `VIRTUAL_ENV` and `PATH` to that `.venv` interpreter before starting Serverless Offline.

So this order is correct:
- run `npm run setup:backend` once
- run `npm run offline` from repo root (where `serverless.yml` lives)

If your shell says `pip: command not found`, always use `python3 -m pip`.

## Clean Reset (Start From Scratch)

From the repo root, run:

bash scripts/clean-reset.sh

Then follow the setup flow again:

Terminal A (backend)
- cd /path/to/nuttiness-serverless
- npm install
- npm run setup:backend
- npm run offline

Terminal B (frontend)
- cd /path/to/nuttiness-serverless
- npm run setup:frontend
- npm run frontend:dev

Optional npm shortcuts:
- npm run clean:setup
- npm run setup:all
