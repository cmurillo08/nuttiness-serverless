---
name: nuttiness-migration
description: 'Use when migrating a feature, route, or component from the nuttiness Next.js monolith to nuttiness-serverless (Vite + React SPA frontend + Python Lambda backend). Provides stack translation patterns, reference file mappings, and implementation checklists per domain.'
argument-hint: 'Name the domain or feature being migrated (e.g. "products", "sales", "auth").'
user-invocable: true
---

# Nuttiness Migration Skill

## Purpose

This skill codifies the translation patterns between:

| Source | Target |
|--------|--------|
| `nuttiness` — Next.js 15 monolith | `nuttiness-serverless` — Vite + React SPA + Python Lambda |

Use it whenever implementing a phase to ensure consistency between the two stacks without re-deriving business rules.

---

## Reference File Map

For each domain, read the corresponding source files before implementing:

| Domain | nuttiness source (read first) | nuttiness-serverless target |
|--------|-------------------------------|------------------------------|
| Products | `nuttiness/app/api/products/route.js` | `backend/products/handler.py` |
| Raw Products | `nuttiness/app/api/raw-products/route.js` | `backend/products/handler.py` (same Lambda) |
| Expenses | `nuttiness/app/api/expenses/route.js` | `backend/expenses/handler.py` |
| Sales | `nuttiness/app/api/sales/route.js` | `backend/sales/handler.py` |
| Customers | `nuttiness/app/api/customers/route.js` | `backend/customers/handler.py` |
| Auth | `nuttiness/middleware.js` + `nuttiness/app/api/auth/` | `backend/auth/handler.py` |
| Reports | `nuttiness/app/api/` (aggregates) | `backend/reports/handler.py` |
| DB layer | `nuttiness/lib/db.js`, `nuttiness/lib/db/` | `backend/<domain>/db.py` |
| Validation | `nuttiness/lib/validators.js`, `nuttiness/lib/schema.js` | `backend/<domain>/models.py` (Pydantic) |
| Domain plans | `nuttiness/docs/plans/phase-*.md` | Referenced directly, not re-created |

---

## Backend Translation Patterns

### 1. API Route → Lambda Handler

**nuttiness (Next.js API route):**
```js
// app/api/products/route.js
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const products = await db.query('SELECT * FROM products ORDER BY name')
  return NextResponse.json({ products: products.rows })
}

export async function POST(request) {
  const body = await request.json()
  // validate + insert
  return NextResponse.json({ product: result }, { status: 201 })
}
```

**nuttiness-serverless (Lambda handler):**
```python
# backend/products/handler.py
from aws_lambda_powertools import Logger
from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.utilities.typing import LambdaContext
from .db import list_products, create_product
from .models import CreateProductRequest

logger = Logger()
app = APIGatewayRestResolver()

@app.get("/products")
def get_products():
    return {"products": list_products()}

@app.post("/products")
def post_product():
    body = CreateProductRequest(**app.current_event.json_body)
    product = create_product(body)
    return {"product": product}, 201

def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
```

---

### 2. DB Layer (`pg` / `db.js` → `psycopg2`)

**nuttiness:**
```js
// lib/db.js
import { Pool } from 'pg'
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = { query: (text, params) => pool.query(text, params) }
```

**nuttiness-serverless:**
```python
# backend/<domain>/db.py
import os
import psycopg2
import psycopg2.extras

def get_connection():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def list_products() -> list[dict]:
    with get_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM products ORDER BY name")
            return [dict(row) for row in cur.fetchall()]
```

**Key differences:**
- `pool.query(sql, params)` → `cur.execute(sql, params)` (same parameterized SQL style)
- `result.rows` → `cur.fetchall()`
- `RealDictCursor` gives dicts, equivalent to JS object rows
- Transactions: use `conn.commit()` / `conn.rollback()` or the `with` context manager

---

### 3. Validation (`AJV` → `Pydantic v2`)

**nuttiness:**
```js
// lib/validators.js (AJV)
const schema = {
  type: 'object',
  required: ['name', 'price'],
  properties: {
    name: { type: 'string', minLength: 1 },
    price: { type: 'number', minimum: 0 },
  }
}
```

**nuttiness-serverless:**
```python
# backend/<domain>/models.py (Pydantic v2)
from pydantic import BaseModel, Field

class CreateProductRequest(BaseModel):
    name: str = Field(..., min_length=1)
    price: float = Field(..., ge=0)
    unit: str | None = None
```

**Key differences:**
- AJV `required` + `properties` → Pydantic fields without defaults are required
- `minimum: 0` → `ge=0` (greater than or equal)
- `minLength: 1` → `min_length=1`
- Pydantic raises `ValidationError` automatically; catch it and return 400

---

### 4. Authentication (`middleware.js` → Lambda authorizer or handler check)

**nuttiness:**
```js
// middleware.js — session cookie check on every request
export function middleware(request) {
  const session = request.cookies.get('session')
  if (!session) return NextResponse.redirect('/login')
}
```

**nuttiness-serverless options (choose one per phase):**

*Option A — inline check in handler (simple, good for MVP):*
```python
from aws_lambda_powertools.event_handler.exceptions import UnauthorizedError

def require_auth(app):
    token = app.current_event.get_header_value("Authorization")
    if not token or not verify_token(token):
        raise UnauthorizedError("Not authenticated")
```

*Option B — API Gateway Lambda Authorizer (production pattern):*
- Separate `backend/auth/authorizer.py` Lambda
- Returns IAM allow/deny policy
- Configured in `serverless.yml` under `authorizer:`

Start with Option A for early phases; migrate to Option B when the auth flow is stabilised.

---

## Frontend Translation Patterns

### 5. Next.js Page → React SPA Page

**nuttiness:**
```js
// app/products/page.js (Next.js App Router — server component)
import { db } from '@/lib/db'

export default async function ProductsPage() {
  const result = await db.query('SELECT * FROM products')
  return <ProductTable products={result.rows} />
}
```

**nuttiness-serverless:**
```jsx
// frontend/src/pages/Products.jsx (React SPA — client component)
import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import ProductTable from '../components/ProductTable'

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/products').then(d => setProducts(d.products)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="p-4">Loading...</p>
  return <ProductTable products={products} />
}
```

**Key differences:**
- No server-side data fetching — all data via `useEffect` + `api.get()`
- No `async` component — use `useState` for loading/error state
- No `Link` from next — use `Link` from `react-router-dom`
- No `useRouter` from next — use `useNavigate` from `react-router-dom`

---

### 6. Next.js `Link` and `useRouter` → React Router

| nuttiness (Next.js) | nuttiness-serverless (React Router) |
|---------------------|--------------------------------------|
| `import Link from 'next/link'` | `import { Link } from 'react-router-dom'` |
| `import { useRouter } from 'next/navigation'` | `import { useNavigate } from 'react-router-dom'` |
| `router.push('/products')` | `navigate('/products')` |
| `router.back()` | `navigate(-1)` |
| `<Link href="/products">` | `<Link to="/products">` |

---

### 7. Component Migration Checklist

When migrating a component from `nuttiness/components/` to `frontend/src/components/`:

- [ ] Remove any Next.js-specific imports (`next/link`, `next/navigation`, `next/image`)
- [ ] Replace `<Image>` from next with `<img>` (or Vite-compatible image handling)
- [ ] Replace `<Link href=...>` with `<Link to=...>` from react-router-dom
- [ ] Convert any `async` server component data fetching to `useEffect` + state
- [ ] Verify Tailwind classes are unchanged (same utility classes work in Vite)
- [ ] Check that no `server-only` logic exists in the component

---

## Serverless Framework (`serverless.yml`) Patterns

### Basic function definition

```yaml
functions:
  products:
    handler: backend/products/handler.lambda_handler
    runtime: python3.12
    events:
      - http:
          path: /products
          method: ANY
          cors: true
      - http:
          path: /products/{proxy+}
          method: ANY
          cors: true
    environment:
      DATABASE_URL: ${env:DATABASE_URL}
```

### Python packaging

```yaml
plugins:
  - serverless-python-requirements
  - serverless-offline

custom:
  pythonRequirements:
    dockerizePip: non-linux   # use Docker on macOS for binary deps like psycopg2
    slim: true
```

### Local development

```bash
# Install plugin
npm install --save-dev serverless-offline serverless-python-requirements

# Start local API Gateway emulation
npx serverless offline start
# API available at http://localhost:3001
```

---

## Migration Phase Sequence (suggested)

Migrate phases in this order to match the nuttiness phase progression:

| Priority | Domain | nuttiness phase | Notes |
|----------|--------|-----------------|-------|
| 1 | Project scaffold | Phase 0 | Vite + React init, serverless.yml base, folder structure |
| 2 | Raw Products + Products | Phase 2 | Simplest CRUD, good smoke test |
| 3 | Expenses | Phase 3 | Line items pattern |
| 4 | Sales | Phase 4 | Status lifecycle |
| 5 | Customers | Phase 5 | Relation to sales |
| 6 | Auth | Phase 9 | Login + route protection |
| 7 | Reports | Phase 6 | Aggregates across domains |

---

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| `psycopg2` binary missing on Lambda | Use `psycopg2-binary` in `requirements.txt` + `dockerizePip: non-linux` |
| CORS errors in React SPA | Set `cors: true` on all API Gateway events in `serverless.yml` |
| Decimal values serialized as strings by `psycopg2` | Cast to `float()` before returning JSON |
| `NULL` from DB becomes `None` in Python | Check for `None` before serialization, not `null` |
| React Router 404 on S3 refresh | Configure S3 error document to `index.html`, or use CloudFront error pages |
| Environment variables not available in Lambda | Set under `environment:` in `serverless.yml` or use AWS SSM Parameter Store |
