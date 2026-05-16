---
title: Phase 5 — Reporting
version: 1.0
created: 2026-05-16
nuttiness-source: phase-6-reporting (app/reports/, app/api/reports/summary/, lib/db/queries/metrics.js)
---

# Phase 5 — Reporting

## 1. Overview

This phase migrates the `nuttiness` financial reporting feature into `nuttiness-serverless`. It also removes the temporary Dashboard/health-check home page and replaces it with a redirect to `/sales`, matching the behaviour of the `nuttiness` monolith (`app/dashboard/page.js` → `redirect('/sales')`).

**nuttiness source reference:**
- `app/reports/page.js` — Reports UI (Financial Summary with 3 stat cards)
- `app/api/reports/summary/route.js` — API handler
- `lib/db/queries/metrics.js` → `getDashboardStats()` — SQL aggregation query

---

## 2. Scope

### Included
- Backend: new `reports` Lambda function with `GET /api/v1/reports/summary`
- Frontend: `Reports.jsx` page matching nuttiness UI exactly (3 stat cards + generated_at)
- Frontend: `frontend/src/api/reports.js` API client helper
- Frontend: Remove "Dashboard" nav item and `Home.jsx` health-check page
- Frontend: Make `/` redirect to `/sales` (React Router `<Navigate>`)
- Frontend: Enable the Reports nav item in `AppShell.jsx` (remove `disabled: true`)
- Frontend: Add `Amount.jsx` component (currency formatter, same as nuttiness)
- `serverless.yml`: register `reports` function + `GET /api/v1/reports/summary` route
- Roadmap update: mark Phase 5 as complete

### Excluded
- Count-based stats cards (products, raw_products, expenses, sales, customers counts) — the nuttiness Reports page does NOT show these, only the financial summary
- Any chart or time-series visualisation
- Export / PDF functionality
- Any schema or DB migration changes

---

## 3. Backend Design

### Lambda function

**Function name:** `reports`  
**Handler:** `backend/reports/handler.py`  
**Pattern:** same as all other domains — `handler.py` + `db.py` + `models.py`

### API route

| Method | Path | Auth required |
|--------|------|---------------|
| GET | `/api/v1/reports/summary` | ✅ Yes (`require_auth()`) |

### Input
None. No query parameters or request body.

### Output contract

```json
{
  "total_expenses_amount": 1234.56,
  "total_sales_amount": 5678.90,
  "historical_profit": 4444.34,
  "generated_at": "2026-05-16T12:00:00.000Z"
}
```

### SQL query (from `metrics.js` → `getDashboardStats`)

```sql
SELECT
  COALESCE(SUM(cost), 0)          AS total_expenses_cost
FROM expenses;

SELECT
  COALESCE(SUM(total_amount), 0)  AS total_sales_amount
FROM sales
WHERE status = 'paid';
```

Both values are fetched in a single query:

```sql
SELECT
  (SELECT COALESCE(SUM(cost), 0)         FROM expenses)                       AS total_expenses_cost,
  (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE status = 'paid')    AS total_sales_amount
```

`historical_profit` is computed in Python: `total_sales_amount - total_expenses_cost`, rounded to 2 decimal places.

### DB access
- `backend/reports/db.py` — single function `get_financial_summary(conn)` that executes the query above and returns a dict
- Uses `backend/shared/db.py` for the connection (same pattern as all other handlers)

### Validation / Pydantic model
- `backend/reports/models.py` — `FinancialSummaryResponse` with `total_expenses_amount`, `total_sales_amount`, `historical_profit`, `generated_at` (all `float` / `str`)

### `serverless.yml` additions

```yaml
reports:
  handler: backend/reports/handler.handler
  events:
    - http:
        path: /api/v1/reports/summary
        method: get
        cors: true
```

---

## 4. Frontend Design

### Pages changed / added

| File | Change |
|------|--------|
| `frontend/src/pages/Reports.jsx` | **New** — Financial Summary page (3 cards + generated_at) |
| `frontend/src/pages/Home.jsx` | **Replace** — remove health-check, render `<Navigate to="/sales" replace />` |

### New components

| File | Purpose |
|------|---------|
| `frontend/src/components/Amount.jsx` | Currency formatter component — mirrors `nuttiness/components/Amount.jsx`. Displays a `float` as `$ 1,234.56` using `toLocaleString`. |

### API client

**`frontend/src/api/reports.js`**

```js
export async function getReportSummary() {
  const res = await fetch('/api/v1/reports/summary', { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load report: ${res.status}`)
  return res.json()
}
```

### Router changes (`frontend/src/router.jsx`)

- Import `Reports` from `./pages/Reports`
- Add route: `{ path: '/reports', element: <Reports /> }`
- The `/` route stays but `Home.jsx` will now render `<Navigate to="/sales" replace />`

### `AppShell.jsx` nav changes

- Remove `{ to: '/', label: 'Dashboard', end: true, icon: DashboardIcon }` from `NAV_ITEMS`
- Change `{ to: '/reports', label: 'Reports', disabled: true, icon: ReportsIcon }` → remove `disabled: true`
- `DashboardIcon` function can be removed (no longer referenced)

### `Reports.jsx` UI spec

Matches `nuttiness/app/reports/page.js` exactly:

```
┌──────────────────────────────────────────┐
│  Reports                                 │  ← h1
│                                          │
│  Financial Summary                       │  ← h2
│  ┌──────────────┐┌──────────────┐┌──────────────┐
│  │ Total        ││ Total Sales  ││ Historical   │
│  │ Expenses     ││              ││ Profit       │
│  │ red-50 card  ││ amber-50     ││ green-50     │
│  │ $ 1,234.56   ││ $ 5,678.90   ││ $ 4,444.34   │
│  └──────────────┘└──────────────┘└──────────────┘
│
│  Report generated at: 2026-05-16 12:00:00
└──────────────────────────────────────────┘
```

- 3-column grid on `lg`, single column on mobile
- Card colours: Total Expenses = red-50/red-200/red-900, Total Sales = amber-50/amber-200/amber-900, Historical Profit = green-50/green-200/green-900
- Profit text colour: `text-green-600` if positive, `text-red-600` if negative, `text-amber-600` if zero
- Shows "Loss" label if profit < 0, "No profit" if profit = 0
- Loading/error/empty states same as nuttiness

---

## 5. Acceptance Criteria

- [ ] `GET /api/v1/reports/summary` returns `{ total_expenses_amount, total_sales_amount, historical_profit, generated_at }` with HTTP 200
- [ ] Unauthenticated request to `/api/v1/reports/summary` returns HTTP 401
- [ ] Navigating to `/` in the SPA redirects to `/sales` without a flash of the old health-check page
- [ ] "Dashboard" nav item is gone from the sidebar
- [ ] "Reports" nav item is present and navigable (not disabled)
- [ ] `/reports` page renders the 3 financial stat cards with correct values matching the DB
- [ ] `historical_profit = total_sales_amount - total_expenses_amount` (Python-computed, 2 decimal places)
- [ ] Profit card text colour reflects positive (green), negative (red), or zero (amber) state
- [ ] Loading spinner shows while the API call is in flight
- [ ] Error message renders if the API call fails
- [ ] `Amount.jsx` component formats currency as `$ 1,234.56`
- [ ] Roadmap `phase-5` status updated to ✅ Complete

---

## 6. File Checklist

### Backend (new files)
```
backend/reports/__init__.py
backend/reports/handler.py
backend/reports/db.py
backend/reports/models.py
```

### Frontend (new / changed)
```
frontend/src/api/reports.js          (new)
frontend/src/components/Amount.jsx   (new)
frontend/src/pages/Reports.jsx       (new)
frontend/src/pages/Home.jsx          (replace content)
frontend/src/layouts/AppShell.jsx    (update NAV_ITEMS)
frontend/src/router.jsx              (add /reports route, import Reports)
```

### Config
```
serverless.yml                       (add reports function)
docs/plans/roadmap.md                (phase 5 status → ✅)
```
