---
phase: 2
title: Products
summary: Full CRUD Lambda for raw products and prepared products (price list). React pages for listing and editing both product types. First phase to use the DB connection.
nuttiness-source: phase-2-products.md
status: completed
---

# Phase 2 — Products

## 1. Overview

**What:** Migrate the product catalog domain — raw products (ingredients) and prepared products (sellable items) — from the nuttiness Next.js API to a single `products` Lambda. React pages for list, create, edit, and delete for each type.

**Corresponds to:** `nuttiness/docs/plans/phase-2-products.md`

**This is the first phase that connects to PostgreSQL.** `backend/shared/db.py` (scaffolded in Phase 1) is now used for real.

**Learning goals:**
- Full psycopg3 CRUD pattern (SELECT, INSERT, UPDATE, DELETE with named params)
- Pagination pattern (`limit`/`offset` via query string)
- Pydantic v2 validation for request bodies
- UUID path param validation in Python
- React paginated list page with search filter + inline delete
- React create/edit form with controlled inputs

---

## 2. Scope

### Included
- `backend/products/handler.py` — Lambda covering all 10 product routes
- `backend/products/db.py` — raw SQL queries (mirrors nuttiness SQL exactly)
- `backend/products/models.py` — Pydantic models for request validation
- `serverless.yml` — products function added
- `frontend/src/api/products.js` — fetch helpers for both resource types
- `frontend/src/pages/Products.jsx` — paginated list + search + delete
- `frontend/src/pages/ProductForm.jsx` — create / edit form (shared for new + edit)
- `frontend/src/pages/RawProducts.jsx` — paginated list + search + delete
- `frontend/src/pages/RawProductForm.jsx` — create / edit form
- `frontend/src/router.jsx` — 8 new routes added (protected by RouteGuard)
- `frontend/src/layouts/AppShell.jsx` — sidebar nav scaffold (nav links added here)

### NOT Included
- Recipe linking between raw products and prepared products (out of scope per nuttiness spec)
- Inventory quantity tracking
- Bulk import/export

---

## 3. Domain Model

### Database tables (existing schema — do NOT alter)

**`prepared_products`**
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
name        text        NOT NULL
price       numeric(12,2) NOT NULL CHECK (price >= 0)
unit        text        NOT NULL
cost_price  numeric(12,2)           -- nullable, added in phase-2 migration
recipe_notes text                   -- nullable
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz
```

**`raw_products`**
```sql
id          uuid        PRIMARY KEY DEFAULT gen_random_uuid()
name        text        NOT NULL
unit        text        NOT NULL
price       numeric(12,2) NOT NULL CHECK (price >= 0)  -- purchase_price
supplier    text                   -- nullable
created_at  timestamptz NOT NULL DEFAULT now()
updated_at  timestamptz
```

> Both migrations already exist in `nuttiness/migrations/`. No new migrations needed in this phase.

---

## 4. Backend Design

### Lambda function: `products`

**File:** `backend/products/handler.py`

All 10 routes handled by a single Lambda registered in `serverless.yml`.

---

### Prepared Products Routes

#### `GET /api/v1/products`
Query params: `limit` (default 25, max 100), `offset` (default 0)

**Response 200:**
```json
{ "items": [...], "total": 150, "page": 1, "limit": 25 }
```
Each item: `{ id, name, price, unit, cost_price, recipe_notes, created_at, updated_at }`

#### `GET /api/v1/products/{id}`
- UUID format validation → 400 if invalid
- Not found → 404

**Response 200:** full product object

#### `POST /api/v1/products`
**Request body:**
```json
{ "name": "Brigadeiro", "price": 3.50, "unit": "un", "cost_price": 1.20, "recipe_notes": null }
```
- `name` required, non-empty string
- `price` required, number >= 0
- `unit` required, non-empty string
- `cost_price` optional, number >= 0 or null
- `recipe_notes` optional, string or null

**Response 201:** full created product object

#### `PUT /api/v1/products/{id}`
Same body shape as POST. All fields required (full replacement).

**Response 200:** full updated product object

#### `DELETE /api/v1/products/{id}`
**Response 204:** empty body

---

### Raw Products Routes

#### `GET /api/v1/raw-products`
Same pagination pattern as products.

Each item: `{ id, name, unit, price, supplier, created_at, updated_at }`

#### `GET /api/v1/raw-products/{id}`
**Response 200:** full raw product object

#### `POST /api/v1/raw-products`
**Request body:**
```json
{ "name": "Chocolate em pó", "unit": "kg", "price": 15.00, "supplier": "Casa do Chocolate" }
```
- `name` required, non-empty string
- `unit` required, non-empty string
- `price` required, number >= 0
- `supplier` optional, string or null

**Response 201:** full created raw product object

#### `PUT /api/v1/raw-products/{id}`
Full replacement. Same fields as POST, all required.

**Response 200:** full updated raw product object

#### `DELETE /api/v1/raw-products/{id}`
**Response 204:** empty body

---

### Error responses (consistent envelope)
```json
{ "error": "message" }
```
- 400 — validation failure (include field details)
- 404 — resource not found
- 409 — name already exists (unique constraint violation, pg error code `23505`)
- 500 — unexpected error

---

### Pagination helper

All list endpoints share the same pagination logic. Extract to `backend/shared/pagination.py`:

```python
def parse_pagination(query_params: dict) -> tuple[int, int]:
    """Returns (limit, offset). limit capped at 100."""
    limit = min(int(query_params.get("limit", 25)), 100)
    offset = int(query_params.get("offset", 0))
    return limit, offset

def build_pagination_response(items: list, total: int, limit: int, offset: int) -> dict:
    page = (offset // limit) + 1 if limit > 0 else 1
    return {"items": items, "total": total, "page": page, "limit": limit}
```

---

### Auth guard for all product routes

Every route must verify the session cookie before proceeding — import `verify_token` from `backend.shared.auth` and read `SESSION_SECRET` from env. Return 401 if missing or invalid. This protects all product endpoints.

Pattern:
```python
def require_auth(event) -> str:
    """Returns username or raises 401 Response."""
    cookie_header = event.get("headers", {}).get("cookie", "")
    # parse nuttiness_session, verify_token — same logic as auth/handler.py me()
```

---

### `serverless.yml` additions

```yaml
products:
  handler: backend/products/handler.handler
  events:
    - http:
        path: /api/v1/products
        method: get
        cors: true
    - http:
        path: /api/v1/products
        method: post
        cors: true
    - http:
        path: /api/v1/products/{id}
        method: get
        cors: true
    - http:
        path: /api/v1/products/{id}
        method: put
        cors: true
    - http:
        path: /api/v1/products/{id}
        method: delete
        cors: true
    - http:
        path: /api/v1/raw-products
        method: get
        cors: true
    - http:
        path: /api/v1/raw-products
        method: post
        cors: true
    - http:
        path: /api/v1/raw-products/{id}
        method: get
        cors: true
    - http:
        path: /api/v1/raw-products/{id}
        method: put
        cors: true
    - http:
        path: /api/v1/raw-products/{id}
        method: delete
        cors: true
```

Also add `backend/products/__init__.py` (empty).

---

## 5. Frontend Design

### API helpers: `frontend/src/api/products.js`

```js
// Prepared products
export async function listProducts(limit = 25, offset = 0) { ... }
export async function getProduct(id) { ... }
export async function createProduct(data) { ... }
export async function updateProduct(id, data) { ... }
export async function deleteProduct(id) { ... }

// Raw products
export async function listRawProducts(limit = 25, offset = 0) { ... }
export async function getRawProduct(id) { ... }
export async function createRawProduct(data) { ... }
export async function updateRawProduct(id, data) { ... }
export async function deleteRawProduct(id) { ... }
```

All calls use `credentials: 'include'`. On 401 response, redirect to `/login` (session expired).

---

### `frontend/src/layouts/AppShell.jsx`

Introduce a shared app shell with sidebar nav. Wrap all protected routes in AppShell (via `router.jsx`). Nav links:
- Dashboard `/`
- Products `/products`
- Raw Products `/raw-products`
- Expenses `/expenses` (placeholder, phase 3)
- Sales `/sales` (placeholder, phase 4)

Use `useNavigate` for logout button — calls `logout()` from `api/auth.js` then navigates to `/login`.

Reference the nuttiness `components/AppShell.jsx` for visual structure. Adapt to React Router (no `next/link`, use `<Link>` from `react-router-dom`).

---

### `frontend/src/pages/Products.jsx`

- Paginated table: columns `Name`, `Unit`, `Price`, `Cost Price`, actions (Edit, Delete)
- Search filter by name (client-side, filters current page)
- "New Product" button → navigate to `/products/new`
- Edit button → navigate to `/products/:id/edit`
- Delete button → confirm dialog → `deleteProduct(id)` → reload list
- Loading and error states
- Pagination controls (prev/next, showing `X–Y of Z`)

---

### `frontend/src/pages/ProductForm.jsx`

Used for both create (`/products/new`) and edit (`/products/:id/edit`).

- On mount: if `id` param present → `getProduct(id)` → populate fields
- Fields:
  - **Name** — text, required
  - **Unit** — text, required (e.g. "un", "kg", "dz")
  - **Price** — number input, required, min 0
  - **Cost Price** — number input, optional
  - **Recipe Notes** — textarea, optional
- Submit: `createProduct` or `updateProduct` depending on mode
- On success: navigate to `/products`
- Inline validation errors

---

### `frontend/src/pages/RawProducts.jsx`

Same structure as `Products.jsx`. Columns: `Name`, `Unit`, `Purchase Price`, `Supplier`, actions.

---

### `frontend/src/pages/RawProductForm.jsx`

Create / edit form for raw products.

- Fields:
  - **Name** — text, required
  - **Unit** — text, required
  - **Purchase Price** — number input, required, min 0
  - **Supplier** — text, optional
- On success: navigate to `/raw-products`

---

### `frontend/src/router.jsx` — additions

Add to the `RouteGuard` children (all protected):
```jsx
{ path: '/products', element: <Products /> },
{ path: '/products/new', element: <ProductForm /> },
{ path: '/products/:id/edit', element: <ProductForm /> },
{ path: '/raw-products', element: <RawProducts /> },
{ path: '/raw-products/new', element: <RawProductForm /> },
{ path: '/raw-products/:id/edit', element: <RawProductForm /> },
```

Wrap the `RouteGuard` children in `AppShell` so all protected pages share the sidebar.

---

## 6. Acceptance Criteria

### Backend
- [ ] `GET /api/v1/products` returns paginated list with `items`, `total`, `page`, `limit`
- [ ] `POST /api/v1/products` creates product, returns 201 with full object
- [ ] `PUT /api/v1/products/{id}` updates product, returns 200
- [ ] `DELETE /api/v1/products/{id}` deletes product, returns 204
- [ ] `GET /api/v1/products/{id}` returns 404 for unknown id
- [ ] All endpoints return 401 if session cookie is missing or invalid
- [ ] Same behaviour for all `/api/v1/raw-products` routes
- [ ] Duplicate name returns 409

### Frontend
- [ ] `/products` shows paginated table with search
- [ ] "New Product" → form → save → redirects back to list with new item visible
- [ ] Edit product → form pre-populated → save → updated in list
- [ ] Delete product → confirm → removed from list
- [ ] Same flows for `/raw-products`
- [ ] AppShell sidebar visible on all protected pages
- [ ] 401 from any API call redirects to `/login`

---

## 7. File Checklist

### Backend
- [ ] `backend/products/__init__.py`
- [ ] `backend/products/handler.py`
- [ ] `backend/products/models.py`
- [ ] `backend/products/db.py`
- [ ] `backend/shared/pagination.py`
- [ ] `serverless.yml` — products function added

### Frontend
- [ ] `frontend/src/api/products.js`
- [ ] `frontend/src/layouts/AppShell.jsx`
- [ ] `frontend/src/pages/Products.jsx`
- [ ] `frontend/src/pages/ProductForm.jsx`
- [ ] `frontend/src/pages/RawProducts.jsx`
- [ ] `frontend/src/pages/RawProductForm.jsx`
- [ ] `frontend/src/router.jsx` — 6 new routes + AppShell wrapper
