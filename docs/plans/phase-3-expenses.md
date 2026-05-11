---
phase: 3
title: Expenses
summary: Full CRUD Lambda for expenses (raw product purchase records). React pages for listing and creating/editing expense entries. First phase to work with dates and the psycopg3 decimal gotchas.
nuttiness-source: phase-3-expenses.md
status: completed
---

# Phase 3 — Expenses

## 1. Overview

**What:** Migrate the expenses domain from the nuttiness Next.js API to a single `expenses` Lambda. Expenses record when a raw product was purchased — quantity, cost per unit, date, and optional notes. React pages for listing, creating, and editing expenses.

**Corresponds to:** `nuttiness/docs/plans/phase-3-expenses.md` + actual implementation in `nuttiness/app/api/expenses/` and `nuttiness/lib/db/queries/expenses.js`.

**Important note on domain model:** The nuttiness spec describes a header+lines model, but the actual deployed implementation is a flat single-line model. This phase migrates the **actual implementation**, not the original spec design.

**Learning goals:**
- Handle Python `date` and `Decimal` types from psycopg3 (common serialization gotchas)
- psycopg3 named-param cursor pattern with FK validation
- React forms with a `<select>` sourced from another API endpoint (raw products picker)
- Date input handling: `YYYY-MM-DD` from HTML → ISO 8601 for PostgreSQL

---

## 2. Scope

### Included
- `backend/expenses/handler.py` — Lambda covering all 5 expense routes
- `backend/expenses/db.py` — raw SQL queries (mirrors nuttiness SQL exactly)
- `backend/expenses/models.py` — Pydantic v2 models for request validation
- `backend/expenses/__init__.py` — empty package marker
- `serverless.yml` — expenses function added with 5 HTTP events
- `frontend/src/api/expenses.js` — fetch helpers for all expense operations
- `frontend/src/pages/Expenses.jsx` — paginated list + raw-product filter + delete
- `frontend/src/pages/ExpenseForm.jsx` — create / edit form (shared for new + edit)
- `frontend/src/router.jsx` — 3 new routes added (protected by RouteGuard)
- `frontend/src/layouts/AppShell.jsx` — Expenses nav link enabled (remove `disabled: true`)

### NOT Included
- Expense header + lines model (not how nuttiness is implemented)
- Inventory tracking / stock adjustments
- Supplier management (supplier is a free-text field on `raw_products`, not this table)
- Bulk expense import

---

## 3. Database Design

No migrations needed. The `expenses` table already exists in the shared PostgreSQL schema (created in nuttiness Phase 1 migration).

```sql
-- Already exists — do not re-create
CREATE TABLE IF NOT EXISTS expenses (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_product_id uuid      NOT NULL REFERENCES raw_products(id) ON DELETE RESTRICT,
  quantity    numeric(12,2) NOT NULL CHECK (quantity > 0),
  cost        numeric(12,2) NOT NULL CHECK (cost >= 0),   -- cost per unit
  purchased_at timestamptz NOT NULL,
  notes       text,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz
);
```

Column notes:
- `cost` = price per unit at time of purchase (not the line total)
- `purchased_at` = when the purchase happened (timestamptz; frontend sends date + `T00:00:00Z`)
- `raw_product_id` is NOT NULL — every expense must reference a raw product

---

## 4. Backend Design

### Lambda function

- **Handler:** `backend/expenses/handler.py`
- **Serverless function name:** `expenses`
- **Pattern:** mirrors the `products` handler structure exactly — `APIGatewayRestResolver`, `require_auth()`, `_json_response()`, `_json_serializer()` helpers

### API Routes

All routes are prefixed `/api/v1/`. All require a valid session cookie.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/expenses` | Paginated list with optional `raw_product_id` filter |
| GET | `/api/v1/expenses/{id}` | Single expense by UUID |
| POST | `/api/v1/expenses` | Create a new expense |
| PUT | `/api/v1/expenses/{id}` | Update an existing expense |
| DELETE | `/api/v1/expenses/{id}` | Delete an expense |

### Request / Response Contracts

**GET /api/v1/expenses**

Query params: `limit` (default 25), `offset` (default 0), `raw_product_id` (optional UUID filter)

```json
// 200 OK
{
  "items": [
    {
      "id": "uuid",
      "raw_product_id": "uuid",
      "raw_product": { "id": "uuid", "name": "Harina", "supplier": "Merco" },
      "quantity": 5.0,
      "cost": 1200.0,
      "purchased_at": "2026-04-15T00:00:00+00:00",
      "notes": null,
      "created_at": "2026-04-15T10:00:00+00:00",
      "updated_at": null
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 25
}
```

**GET /api/v1/expenses/{id}**

```json
// 200 OK — same shape as a single item above
// 400 — invalid UUID
// 404 — not found
```

**POST /api/v1/expenses**

```json
// Request body
{
  "raw_product_id": "uuid",
  "quantity": 5.0,
  "cost": 1200.0,
  "purchased_at": "2026-04-15T00:00:00Z",
  "notes": "optional"
}

// 201 Created — full expense row (without raw_product join)
// 400 — validation failure
// 404 — raw_product_id does not exist
```

**PUT /api/v1/expenses/{id}**

Same request body as POST.

```json
// 200 OK — updated expense row
// 400 — validation / UUID error
// 404 — expense or raw_product not found
```

**DELETE /api/v1/expenses/{id}**

```json
// 204 No Content
// 404 — not found
```

### Validation Rules (Pydantic models)

**`CreateExpenseRequest` / `UpdateExpenseRequest`** (shared fields):
- `raw_product_id`: `str`, required, must match UUID pattern
- `quantity`: `Decimal`, required, `> 0`
- `cost`: `Decimal`, required, `>= 0`
- `purchased_at`: `str`, required (ISO 8601 datetime string; Python will cast to `datetime`)
- `notes`: `Optional[str]`, default `None`

### DB Layer (`backend/expenses/db.py`)

Five functions mirroring `nuttiness/lib/db/queries/expenses.js`:

```
list_expenses(conn, limit, offset, raw_product_id=None)  → list[dict]
  SELECT e.*, row_to_json(rp) AS raw_product
  FROM expenses e
  LEFT JOIN raw_products rp ON e.raw_product_id = rp.id
  WHERE (%(raw_product_id)s IS NULL OR e.raw_product_id = %(raw_product_id)s::uuid)
  ORDER BY purchased_at DESC
  LIMIT %(limit)s OFFSET %(offset)s

count_expenses(conn, raw_product_id=None)  → int

get_expense_by_id(conn, id)  → dict | None
  SELECT * FROM expenses WHERE id = %(id)s::uuid

raw_product_exists(conn, id)  → bool
  SELECT 1 FROM raw_products WHERE id = %(id)s::uuid

create_expense(conn, data)  → dict
  INSERT INTO expenses (raw_product_id, quantity, cost, purchased_at, notes)
  VALUES (%(raw_product_id)s::uuid, %(quantity)s, %(cost)s, %(purchased_at)s, %(notes)s)
  RETURNING *

update_expense(conn, id, data)  → dict | None
  UPDATE expenses SET raw_product_id=..., quantity=..., cost=..., purchased_at=...,
    notes=..., updated_at=now()
  WHERE id = %(id)s::uuid RETURNING *

delete_expense(conn, id)  → dict | None
  DELETE FROM expenses WHERE id = %(id)s::uuid RETURNING *
```

**psycopg3 type notes (important):**
- `Decimal` columns (`quantity`, `cost`) are returned as Python `Decimal` — serialize with `float()` in `_json_serializer`
- `purchased_at` is `timestamptz` — returned as Python `datetime` with tzinfo — serialize with `.isoformat()`
- UUID params must be cast: `%(id)s::uuid`

### `serverless.yml` additions

```yaml
expenses:
  handler: backend/expenses/handler.handler
  events:
    - http:
        path: /api/v1/expenses
        method: get
        cors: true
    - http:
        path: /api/v1/expenses/{id}
        method: get
        cors: true
    - http:
        path: /api/v1/expenses
        method: post
        cors: true
    - http:
        path: /api/v1/expenses/{id}
        method: put
        cors: true
    - http:
        path: /api/v1/expenses/{id}
        method: delete
        cors: true
```

---

## 5. Frontend Design

### New files

| File | Purpose |
|------|---------|
| `frontend/src/api/expenses.js` | Fetch helpers: `listExpenses`, `getExpense`, `createExpense`, `updateExpense`, `deleteExpense` |
| `frontend/src/pages/Expenses.jsx` | Paginated table, raw-product filter dropdown, delete button |
| `frontend/src/pages/ExpenseForm.jsx` | Shared create/edit form |

### Modified files

| File | Change |
|------|--------|
| `frontend/src/router.jsx` | Add 3 routes: `/expenses`, `/expenses/new`, `/expenses/:id/edit` |
| `frontend/src/layouts/AppShell.jsx` | Remove `disabled: true` from the Expenses nav item |

### React Routes

```
/expenses            → Expenses.jsx  (list)
/expenses/new        → ExpenseForm.jsx  (create)
/expenses/:id/edit   → ExpenseForm.jsx  (edit, loads existing data by id)
```

### Pages

**`Expenses.jsx`** (list page):
- State: `items`, `total`, `loading`, `error`, `page`, `limit`, `rawProductFilter`
- Fetches `GET /api/v1/raw-products?limit=200` on mount for the filter `<select>` (reuses existing products API)
- Fetches `GET /api/v1/expenses?limit=&offset=&raw_product_id=` when page/filter changes
- Table columns: Purchased At | Raw Product | Quantity | Cost (formatted as currency) | Notes | Actions (Edit / Delete)
- "New Expense" button → `/expenses/new`
- Delete: `window.confirm()` → `deleteExpense(id)` → refetch
- Pagination: same `page`/`limit` controls as `Products.jsx`

**`ExpenseForm.jsx`** (create + edit):
- On mount: if `id` param present, load `GET /api/v1/expenses/:id` to populate fields
- On mount: load `GET /api/v1/raw-products?limit=200` to populate the raw product `<select>`
- Fields:
  - Raw Product — `<select>` sourced from raw products list (required)
  - Purchased At — `<input type="date">` (required), defaults to today
  - Quantity — `<input type="number" step="0.01">` (required, > 0)
  - Cost per unit — `<input type="number" step="0.01">` (required, >= 0)
  - Notes — `<textarea>` (optional)
- Client-side validation before submit (mirrors nuttiness `ExpenseForm.jsx`)
- On submit: normalize date `YYYY-MM-DD` → `YYYY-MM-DDT00:00:00Z`, then POST or PUT
- On success: redirect to `/expenses`
- Cancel button → `/expenses`

### API helper (`expenses.js`)

```js
// All functions follow the same pattern as frontend/src/api/products.js
listExpenses(limit, offset, rawProductId)   // GET /api/v1/expenses
getExpense(id)                              // GET /api/v1/expenses/:id
createExpense(data)                         // POST /api/v1/expenses
updateExpense(id, data)                     // PUT /api/v1/expenses/:id
deleteExpense(id)                           // DELETE /api/v1/expenses/:id
```

---

## 6. Acceptance Criteria

- [ ] `GET /api/v1/expenses` returns paginated list with `raw_product` join embedded
- [ ] `GET /api/v1/expenses` accepts optional `raw_product_id` query param and filters correctly
- [ ] `POST /api/v1/expenses` validates required fields and rejects unknown `raw_product_id` with 404
- [ ] `PUT /api/v1/expenses/:id` updates all fields; returns 404 for missing expense or raw_product
- [ ] `DELETE /api/v1/expenses/:id` returns 204; returns 404 if not found
- [ ] All routes return 401 if session cookie is missing or invalid
- [ ] `Decimal` and `datetime` fields serialize to JSON without `TypeError`
- [ ] `/expenses` list page shows paginated data with filter and delete working
- [ ] `/expenses/new` form creates an expense and redirects to list
- [ ] `/expenses/:id/edit` form pre-fills from existing data and updates on submit
- [ ] Expenses nav link is enabled in the AppShell sidebar
- [ ] `serverless offline` serves all 5 routes correctly

---

## 7. Out-of-Scope Decisions

- No `expense_lines` table — the spec described it but nuttiness never implemented it
- No `supplier` or `total_amount` columns on expenses — those exist on `raw_products` and can be derived
- No inventory tracking — confirmed out of scope in both nuttiness spec and implementation
