---
phase: 0
title: Scaffold
summary: Set up the Serverless Framework project, a Python Lambda hello-world, and the Vite + React SPA scaffold. No database. No domain logic. Just the skeleton you'll build on.
nuttiness-source: phase-0-environment.md
---

# Phase 0 — Scaffold

## 1. Overview

**What:** Create the foundational project structure for `nuttiness-serverless`:
- A working `serverless.yml` with one dummy Lambda (health check)
- A Python virtual environment + dependencies file for the backend
- A Vite + React SPA scaffold for the frontend
- A shared `.env.example` documenting required environment variables

**Why:** Before migrating any domain feature, you need confidence that Lambda → API Gateway → React all wire together correctly. A working health-check endpoint end-to-end proves the scaffold before any real code goes in.

**Learning goals for this phase:**
- Understand the Serverless Framework `serverless.yml` structure
- Deploy a Python Lambda and call it via HTTP
- Understand how API Gateway routes requests to Lambda handlers
- Run a Vite + React dev server and make a fetch call to a Lambda URL

---

## 2. Scope

### Included
- `serverless.yml` (Serverless Framework v4) with:
  - `provider: aws, runtime: python3.12`
  - One function: `GET /api/v1/health` → returns `{ "status": "ok" }`
- `backend/requirements.txt` with `aws-lambda-powertools` and `psycopg[binary]`
- `backend/health/handler.py` — the hello-world Lambda
- Vite + React scaffold in `frontend/` with:
  - `npm create vite` output (React + JS)
  - Tailwind CSS configured
  - React Router installed
  - A single page that fetches `/api/v1/health` and displays the result
- `.env.example` at repo root documenting: `DATABASE_URL`, `APP_USERNAME`, `APP_PASSWORD`, `SESSION_SECRET`, `API_BASE_URL`

### NOT Included
- Database connection (no psycopg3 usage yet)
- Authentication
- Any domain entities
- AWS deployment (local testing with `serverless offline` is sufficient for this phase)

---

## 3. Backend Design

### Lambda function: `health`

**File:** `backend/health/handler.py`

**Route:** `GET /api/v1/health`

**Handler pattern (using aws-lambda-powertools):**
```python
from aws_lambda_powertools.event_handler import APIGatewayRestResolver

app = APIGatewayRestResolver()

@app.get("/api/v1/health")
def health():
    return {"status": "ok"}

def handler(event, context):
    return app.resolve(event, context)
```

**Response:**
```json
{ "status": "ok" }
```
HTTP 200.

### `serverless.yml` structure (key parts)

```yaml
service: nuttiness-serverless
frameworkVersion: "4"

provider:
  name: aws
  runtime: python3.12
  region: us-east-1
  environment:
    DATABASE_URL: ${env:DATABASE_URL}

functions:
  health:
    handler: backend/health/handler.handler
    events:
      - http:
          path: /api/v1/health
          method: get
          cors: true
```

### Local development

Use `serverless offline` (Serverless Framework plugin) to run Lambda functions locally on `http://localhost:3001`. The frontend dev server proxies `/api/*` to this port.

### `backend/requirements.txt`

```
aws-lambda-powertools>=3.0.0
psycopg[binary]>=3.1.0
pydantic>=2.0.0
```

> **Note:** We use `psycopg` (psycopg3), not `psycopg2`. psycopg3 has a cleaner API, native async support (useful if we ever want it), and better type handling. The `[binary]` extra bundles the C extension — required for Lambda since we can't compile it in the Lambda environment.

---

## 4. Frontend Design

### Scaffold

```bash
cd frontend
npm create vite@latest . -- --template react
npm install
npm install -D tailwindcss @tailwindcss/vite
npm install react-router-dom
```

### `vite.config.js` — dev proxy

Configure a proxy so that `/api` calls during development are forwarded to the Serverless Offline port:

```js
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `src/pages/Home.jsx` | Fetches `/api/v1/health` and shows status |

### Component structure (this phase only)

```
frontend/src/
  pages/
    Home.jsx          — health check display
  App.jsx             — React Router root
  main.jsx            — Vite entry point
  index.css           — Tailwind base import
```

### Health display (Home.jsx behavior)
- On mount: `fetch('/api/v1/health')`
- Loading state: show "Checking…"
- Success: show "✓ API is online"
- Error: show "✗ API unreachable"

---

## 5. Project Layout After Phase 0

```
nuttiness-serverless/
  serverless.yml
  .env.example
  backend/
    requirements.txt
    health/
      handler.py
  frontend/
    package.json
    vite.config.js
    index.html
    src/
      main.jsx
      App.jsx
      index.css
      pages/
        Home.jsx
  docs/
    plans/
      roadmap.md
      phase-0-scaffold.md
```

---

## 6. Acceptance Criteria

- [ ] `serverless offline` starts without errors
- [ ] `GET http://localhost:3001/api/v1/health` returns `{ "status": "ok" }` (HTTP 200)
- [ ] `npm run dev` in `frontend/` starts Vite dev server on port 5173
- [ ] Home page fetches the health endpoint and displays "API is online"
- [ ] `backend/requirements.txt` lists `aws-lambda-powertools`, `psycopg[binary]`, `pydantic`
- [ ] `.env.example` documents all required env vars

---

## 7. What Comes Next (Phase 1 Preview)

Phase 1 introduces authentication:
- `POST /api/v1/auth/login` — validates credentials from `.env`, issues a signed session cookie
- `POST /api/v1/auth/logout` — clears the session cookie
- React login page + route guard protecting all other pages
- First real psycopg3 DB connection (used to verify the DB is reachable on login)

---

> **Stop here.** Reply with `approved`, `continue`, or `proceed` to begin Phase 1 planning or delegate Phase 0 implementation to the Backend and Frontend agents.
