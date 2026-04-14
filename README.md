# nuttiness-serverless

A migration of the [nuttiness](../nuttiness) Next.js monolith into a decoupled serverless architecture.

## What this is

`nuttiness` is an inventory and sales management app for nut-based products (raw products, prepared products, expenses, sales, customers). This repo recreates that same application on a modern serverless stack:

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React SPA (deployable to S3 + CloudFront) |
| Backend | Python Lambda functions + API Gateway (`aws-lambda-powertools`) |
| Database | PostgreSQL (same schema as nuttiness) |
| IaC | Serverless Framework v4 |

## Structure

```
frontend/   — Vite + React SPA
backend/    — Python Lambda handlers (one per domain group)
docs/
  plans/    — Phase plans authored by the Architect agent
```

## Status

Early scaffold — migration in progress. See `docs/plans/` for phase-by-phase implementation plans.
