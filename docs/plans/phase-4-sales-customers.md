---
phase: 4
title: Sales & Customers
summary: Sales Lambda (order creation, status transitions, line items) and Customers Lambda (CRUD). React pages for POS/order list and customer management. Links customer selection to order creation.
nuttiness-source: phase-4-sales.md + phase-5-customer-management.md
status: completed
---

# Phase 4 — Sales & Customers

## 1. Overview

**What:** Migrate the sales and customers domains from the nuttiness Next.js API into two Lambda functions:
- `sales` Lambda — create orders, list/get orders, transition status (prepared → delivered → paid → cancelled), manage sale line items (add/update/delete while `prepared`)
- `customers` Lambda — full CRUD for the customer directory

Customers and sales are tightly coupled: a sale references a `customer_id` (FK). Both domains are implemented together in this phase.

**Corresponds to:**
- `nuttiness/docs/plans/phase-4-sales.md`
- `nuttiness/docs/plans/phase-5-customer-management.md`
- Actual implementation in `nuttiness/app/api/sales/`, `nuttiness/app/api/customers/`, `nuttiness/lib/db/queries/sales.js`, `nuttiness/lib/db/queries/customers.js`, `nuttiness/lib/services/sales.js`

**Note on actual vs spec:** The nuttiness spec refers to `sale_lines`, but the actual deployed table is named `sale_items`. This phase migrates the **actual implementation**, not the spec design. Column names and table names mirror nuttiness exactly.

**Learning goals:**
- Multi-table transactions in psycopg3 (create sale + insert items in one transaction)
- Status machine enforcement in Lambda (transition rules, forbidden transitions)
- Nested JSON responses (sale header + embedded line items)
- FK validation before insert (customer, prepared_product)

---

## 2. Scope

### Included

**Backend:**
- `backend/sales/handler.py` — Sales Lambda: list, get, create, transition, add/update/delete items
- `backend/sales/db.py` — raw SQL mirroring `nuttiness/lib/db/queries/sales.js`
- `backend/sales/models.py` — Pydantic v2 models for sale creation and item management
- `backend/customers/handler.py` — Customers Lambda: list, get, create, update, delete
- `backend/customers/db.py` — raw SQL mirroring `nuttiness/lib/db/queries/customers.js`
- `backend/customers/models.py` — Pydantic v2 models for customer CRUD
- `serverless.yml` — two new functions (`sales`, `customers`) with HTTP events

**Frontend:**
- `frontend/src/api/sales.js` — fetch helpers for all sale operations
- `frontend/src/api/customers.js` — fetch helpers for all customer operations
- `frontend/src/pages/Sales.jsx` — paginated list with status filter
- `frontend/src/pages/SaleDetail.jsx` — read-only sale detail with line items and status badge
- `frontend/src/pages/SaleForm.jsx` — POS/order builder: select customer, add line items, submit
- `frontend/src/pages/Customers.jsx` — paginated customer list with delete
- `frontend/src/pages/CustomerForm.jsx` — create/edit customer form
- `frontend/src/layouts/AppShell.jsx` — enable Sales and Customers nav links
- `frontend/src/router.jsx` — new protected routes

### NOT Included
- Inventory tracking or stock adjustments
- Invoicing, refunds, multi-currency
- Customer credit/payment history
- Bulk import/export
- Reports (covered in Phase 5)

---

## 3. Database Design

No new migrations needed. Tables already exist in the shared PostgreSQL schema (created by nuttiness migrations):

```sql
-- Already exists — do NOT re-create
CREATE TABLE customers (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text         NOT NULL UNIQUE,
  phone       text,
  notes       text,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz
);

CREATE TABLE sales (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid         REFERENCES customers(id) ON DELETE SET NULL,
  status       text         NOT NULL DEFAULT 'prepared',
  total_amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz
);

CREATE TABLE sale_items (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id             uuid         NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  prepared_product_id uuid         REFERENCES prepared_products(id) ON DELETE SET NULL,
  quantity            numeric(12,2) NOT NULL,
  unit_price          numeric(12,2) NOT NULL,
  line_total          numeric(12,2) NOT NULL,
  created_at          timestamptz  NOT NULL DEFAULT now()
);
```

Column notes:
- `sale_items` (not `sale_lines`) — matches the actual nuttiness deployed schema
- `customer_id` is nullable (sale can exist without a customer)
- `status` values: `prepared`, `delivered`, `paid`, `cancelled`
- `total_amount` is maintained by the backend on create and recalculated on item changes

---

## 4. Backend Design

### Lambda functions

| Function | Handler module | Domain |
|----------|---------------|--------|
| `sales` | `backend/sales/handler.py` | Orders + line items |
| `customers` | `backend/customers/handler.py` | Customer directory |

Both use `APIGatewayRestResolver`, `require_auth()`, `_json_response()`, `_json_serializer()` — same pattern as existing handlers.

---

### Sales API Routes

All routes prefixed `/api/v1/`. All require a valid session cookie.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/sales` | Paginated list, optional `status` filter |
| GET | `/api/v1/sales/{id}` | Sale detail with embedded line items |
| POST | `/api/v1/sales` | Create a new sale (header + lines in one transaction) |
| POST | `/api/v1/sales/{id}/transition` | Status transition (prepared→delivered, delivered→paid, any→cancelled) |
| POST | `/api/v1/sales/{id}/items` | Add a line item to a `prepared` sale |
| PUT | `/api/v1/sales/{id}/items/{item_id}` | Update quantity/price of a line item |
| DELETE | `/api/v1/sales/{id}/items/{item_id}` | Remove a line item (sale must remain with ≥1 item) |

#### GET /api/v1/sales

Query params: `limit` (default 25), `offset` (default 0), `status` (optional)

```json
// 200 OK
{
  "items": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "customer_name": "Juan Pérez",
      "status": "prepared",
      "total_amount": 15000.00,
      "created_at": "2026-05-01T10:00:00+00:00",
      "updated_at": null
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 25
}
```

#### GET /api/v1/sales/{id}

```json
// 200 OK
{
  "id": "uuid",
  "customer_id": "uuid",
  "customer_name": "Juan Pérez",
  "status": "prepared",
  "total_amount": 15000.00,
  "created_at": "2026-05-01T10:00:00+00:00",
  "updated_at": null,
  "lines": [
    {
      "id": "uuid",
      "prepared_product_id": "uuid",
      "product_name": "Tamale",
      "unit": "unidad",
      "quantity": 10.0,
      "unit_price": 1500.00,
      "line_total": 15000.00
    }
  ]
}
```

#### POST /api/v1/sales

```json
// Request body
{
  "customer_id": "uuid",          // optional
  "status": "prepared",           // default "prepared"
  "lines": [
    {
      "prepared_product_id": "uuid",
      "quantity": 10,
      "unit_price": 1500.00
    }
  ]
}

// 201 Created — returns full sale detail (same shape as GET /sales/{id})
```

Validation:
- `lines` required, at least one item
- `quantity` > 0, `unit_price` >= 0 (all CRC)
- If `customer_id` provided, must reference an existing customer
- If `prepared_product_id` provided, must reference an existing prepared product
- `line_total` computed by backend: `quantity * unit_price`
- `total_amount` computed by backend: sum of all `line_total`

#### POST /api/v1/sales/{id}/transition

```json
// Request body
{ "to_status": "delivered" }

// 200 OK — returns updated sale detail
```

Status machine (same rules as nuttiness):
- `prepared` → `delivered` ✓
- `prepared` → `cancelled` ✓
- `delivered` → `paid` ✓
- `delivered` → `cancelled` ✓
- `paid` → any: ✗ forbidden (403)
- `cancelled` → any: ✗ forbidden (403)
- Any other transition: 400 Bad Request

#### POST /api/v1/sales/{id}/items

Sale must be in `prepared` status. Body same shape as a single line object above.

```json
// 201 Created — returns updated full sale detail
```

#### PUT /api/v1/sales/{id}/items/{item_id}

```json
{ "quantity": 5, "unit_price": 1500.00 }
// 200 OK — returns updated sale detail
```

Sale must be `prepared`. Recalculates `line_total` and `total_amount`.

#### DELETE /api/v1/sales/{id}/items/{item_id}

Sale must be `prepared`. Must leave at least 1 item remaining.

```json
// 200 OK — returns updated sale detail
```

---

### Customers API Routes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/customers` | Paginated list |
| GET | `/api/v1/customers/{id}` | Get customer by id |
| POST | `/api/v1/customers` | Create customer |
| PUT | `/api/v1/customers/{id}` | Update customer |
| DELETE | `/api/v1/customers/{id}` | Delete customer |

#### GET /api/v1/customers

```json
// 200 OK
{
  "items": [
    { "id": "uuid", "name": "Juan Pérez", "phone": "+506 8888-8888", "notes": null, "created_at": "...", "updated_at": null }
  ],
  "total": 5,
  "page": 1,
  "limit": 25
}
```

#### POST /api/v1/customers

```json
// Request
{ "name": "Juan Pérez", "phone": "+506 8888-8888", "notes": null }

// 201 Created — returns created customer
```

Validation: `name` required and unique. Conflict → 409.

#### PUT /api/v1/customers/{id}

Same body as POST. Returns updated customer. 404 if not found.

#### DELETE /api/v1/customers/{id}

Returns 404 if not found. If customer has sales: psycopg3 FK constraint returns 409 (handle `ForeignKeyViolation`).

---

### `backend/sales/models.py` — Key Pydantic models

```python
class SaleLineIn(BaseModel):
    prepared_product_id: Optional[UUID] = None
    quantity: Decimal
    unit_price: Decimal

class SaleCreateIn(BaseModel):
    customer_id: Optional[UUID] = None
    status: str = "prepared"
    lines: List[SaleLineIn]

class SaleTransitionIn(BaseModel):
    to_status: str

class SaleItemUpdateIn(BaseModel):
    quantity: Decimal
    unit_price: Decimal
```

### `backend/customers/models.py` — Key Pydantic models

```python
class CustomerIn(BaseModel):
    name: str
    phone: Optional[str] = None
    notes: Optional[str] = None
```

---

### Transaction pattern for sale creation

`backend/sales/db.py` must implement `create_sale()` as a single psycopg3 transaction:

```python
# Pseudo-code — implement in Python using psycopg3 connection.transaction()
with conn.transaction():
    sale = insert_sale_record(customer_id, status, total_amount, conn)
    for line in lines:
        insert_sale_item(sale.id, line, conn)
return get_sale_detail(sale.id, conn)
```

Mirror `nuttiness/lib/services/sales.js → createSale()` exactly.

---

## 5. Frontend Design

### Pages and routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/sales` | `Sales.jsx` | Paginated list, status filter tabs, link to detail |
| `/sales/new` | `SaleForm.jsx` | POS/order builder: customer picker + line builder |
| `/sales/:id` | `SaleDetail.jsx` | Read-only detail + status transition buttons |
| `/customers` | `Customers.jsx` | Paginated list, delete action |
| `/customers/new` | `CustomerForm.jsx` | Create customer form |
| `/customers/:id/edit` | `CustomerForm.jsx` | Edit customer form (reuse same component) |

All routes protected by `RouteGuard`.

### Key components

**`SaleForm.jsx`** — POS order builder:
- `CustomerSelect` dropdown sourced from `GET /api/v1/customers` (all, no pagination needed for dropdown)
- Line item table: prepared product picker (reuse `PreparedProductSelect` pattern), quantity input, unit price input, computed line total
- Running total footer
- Submit creates the sale via `POST /api/v1/sales`

**`SaleDetail.jsx`**:
- Header: customer name, status badge, total amount, created date
- Line items table (read-only)
- Status transition buttons based on current status:
  - `prepared` → show "Mark Delivered" + "Cancel"
  - `delivered` → show "Mark Paid" + "Cancel"
  - `paid` / `cancelled` → no action buttons

**`Sales.jsx`**:
- Status filter tabs: All / Prepared / Delivered / Paid / Cancelled
- Table columns: date, customer, status, total amount, actions (view)
- Pagination

**`Customers.jsx`**:
- Table: name, phone, notes, actions (edit, delete)
- Pagination

**`CustomerForm.jsx`**:
- Fields: name (required), phone (optional), notes (optional)
- Shared for create and edit (detect by presence of `:id` param)

### API module structure

`frontend/src/api/sales.js`:
- `listSales({ page, limit, status })`
- `getSale(id)`
- `createSale(payload)`
- `transitionSale(id, toStatus)`
- `addSaleItem(saleId, item)`
- `updateSaleItem(saleId, itemId, item)`
- `deleteSaleItem(saleId, itemId)`

`frontend/src/api/customers.js`:
- `listCustomers({ page, limit })`
- `getCustomer(id)`
- `createCustomer(payload)`
- `updateCustomer(id, payload)`
- `deleteCustomer(id)`

### AppShell nav links to enable

- Sales (currently disabled)
- Customers (currently disabled)

---

## 6. Acceptance Criteria

- [ ] `GET /api/v1/sales` returns paginated sales with `customer_name` joined from customers
- [ ] `GET /api/v1/sales/{id}` returns sale detail with embedded `lines` array
- [ ] `POST /api/v1/sales` creates a sale with lines in a single transaction; `total_amount` is computed correctly
- [ ] `POST /api/v1/sales/{id}/transition` enforces status machine; returns 403 for forbidden transitions
- [ ] `POST/PUT/DELETE /api/v1/sales/{id}/items` requires sale to be `prepared`; recalculates totals
- [ ] `GET/POST/PUT/DELETE /api/v1/customers` all work; name uniqueness returns 409
- [ ] Sales pages render: list with status filter, POS form, and detail with transition buttons
- [ ] Customer pages render: list, create form, edit form
- [ ] Customer dropdown in `SaleForm` shows all customers
- [ ] Status badges display correct color per status
- [ ] All routes protected by `RouteGuard`
- [ ] `sales` and `customers` links enabled in `AppShell` nav
