---
phase: 1
title: Auth
summary: Login/logout Lambda (HMAC-signed cookie, credentials from .env), React login page, route guard protecting all non-login routes.
nuttiness-source: phase-9-authentication.md
status: not-started
---

# Phase 1 — Auth

## 1. Overview

**What:** Add authentication to the SPA. Credentials (`APP_USERNAME`, `APP_PASSWORD`) live in `.env` — no database users table. A session cookie (`nuttiness_session`) is issued on successful login and verified on every subsequent API call. All React routes except `/login` are protected by a route guard.

**Corresponds to:** `nuttiness/docs/plans/phase-9-authentication.md`

**Learning goals:**
- Connect a Python Lambda to environment variables securely
- Issue and verify HMAC-signed cookies in Python (stdlib `hmac` + `hashlib`)
- Use `secrets.compare_digest` for timing-safe credential comparison
- Understand cookie flow through API Gateway → Lambda → browser → SPA
- Build a React route guard using React Router v7 and a `/me` endpoint

---

## 2. Scope

### Included
- `backend/auth/handler.py` — Lambda handler for all auth routes
- `backend/shared/db.py` — first shared DB connection helper using psycopg3 (used in future phases; added here to establish the pattern, but **not used in Phase 1** itself)
- `backend/shared/auth.py` — cookie signing/verification helpers (used by auth Lambda and future Lambdas)
- `serverless.yml` — two new routes: `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`
- `frontend/src/pages/Login.jsx` — login form
- `frontend/src/components/RouteGuard.jsx` — wraps protected routes; redirects to `/login` if not authenticated
- `frontend/src/api/auth.js` — fetch wrappers for login, logout, me
- `frontend/src/router.jsx` — React Router config with route guard applied

### NOT Included
- Database users table (credentials are env vars only)
- Role/permission system
- "Remember me" / configurable expiry
- OAuth, magic-link, or any third-party auth provider
- Password reset flow
- `backend/shared/db.py` is **scaffolded** but not called in this phase

---

## 3. Domain Model

No database entities. Credentials live exclusively in `.env`:

```
APP_USERNAME=admin
APP_PASSWORD=<chosen password>
SESSION_SECRET=<random 32+ char string>
```

Session token format: `<payload_b64>.<hmac_hex>` where:
- `payload_b64` = base64url-encoded JSON: `{"user": "<username>", "iat": <unix_timestamp>}`
- `hmac_hex` = `hmac.new(SESSION_SECRET, payload_b64, sha256).hexdigest()`

No expiry in Phase 1 (session cookie — expires when browser closes). This matches the nuttiness implementation.

---

## 4. Backend Design

### Lambda function: `auth`

**File:** `backend/auth/handler.py`

**Handles all auth routes** (single Lambda, multiple routes via `APIGatewayRestResolver`).

---

### Route: `POST /api/v1/auth/login`

**Request body:**
```json
{ "username": "admin", "password": "s3cr3t" }
```

**Validation:**
- Both `username` and `password` required and non-empty strings
- Compare against `APP_USERNAME` / `APP_PASSWORD` env vars using `secrets.compare_digest` (timing-safe)

**Success (200):**
```json
{ "ok": true }
```
Sets response header:
```
Set-Cookie: nuttiness_session=<token>; HttpOnly; SameSite=Lax; Path=/
```
Omit `Secure` flag locally. In production (Phase 6), add `Secure`.

**Failure (401):**
```json
{ "error": "Invalid credentials" }
```
No cookie set.

---

### Route: `POST /api/v1/auth/logout`

**Request body:** none

**Response (200):**
```json
{ "ok": true }
```
Clears the cookie:
```
Set-Cookie: nuttiness_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0
```

---

### Route: `GET /api/v1/auth/me`

Used by the React route guard to check if the current session is valid.

**How it works:** reads the `Cookie` header from the incoming request, extracts `nuttiness_session`, verifies the HMAC signature.

**Success (200)** — valid cookie:
```json
{ "username": "admin" }
```

**Failure (401)** — missing or invalid cookie:
```json
{ "error": "Unauthenticated" }
```

No `Set-Cookie` in response — this is a read-only check.

---

### `backend/shared/auth.py` — cookie helpers

```python
# Signing
def sign_token(username: str, secret: str) -> str: ...

# Verification — returns username string or raises ValueError
def verify_token(token: str, secret: str) -> str: ...

# Cookie header builder
def make_session_cookie(token: str) -> str: ...   # returns Set-Cookie header value
def clear_session_cookie() -> str: ...            # returns Max-Age=0 header value
```

Uses only Python stdlib: `hmac`, `hashlib`, `base64`, `json`, `secrets`, `time`.

---

### `backend/shared/db.py` — DB connection helper (scaffolded, not used in Phase 1)

```python
import os
import psycopg

def get_connection():
    url = os.environ["DATABASE_URL"]
    return psycopg.connect(url)
```

This file is created now so future phases can import it immediately without scaffolding. It is **not called** in any Phase 1 handler.

---

### `serverless.yml` additions

Add to `functions:`:

```yaml
auth:
  handler: backend/auth/handler.handler
  events:
    - http:
        path: /api/v1/auth/login
        method: post
        cors: true
    - http:
        path: /api/v1/auth/logout
        method: post
        cors: true
    - http:
        path: /api/v1/auth/me
        method: get
        cors: true
```

> **CORS note:** `cors: true` in serverless.yml generates an `OPTIONS` pre-flight handler automatically. However, for credentials (cookies) to work in the browser, the Lambda responses must include `Access-Control-Allow-Credentials: true` and `Access-Control-Allow-Origin: http://localhost:5173` (not `*`). The auth Lambda handler must set these headers explicitly on every response.

Response header pattern for all auth routes:
```python
headers = {
    "Access-Control-Allow-Origin": os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173"),
    "Access-Control-Allow-Credentials": "true",
    "Content-Type": "application/json",
}
```

Add to `.env.example` and `serverless.yml` environment section:
```
FRONTEND_ORIGIN=http://localhost:5173
```

---

## 5. Frontend Design

### Pages

#### `frontend/src/pages/Login.jsx`

- Centered card layout (not wrapped in AppShell)
- Fields: **Username**, **Password** (`type="password"`)
- **Log in** button — submits via `api/auth.js` login helper
- Inline error message on 401 (`"Invalid credentials"`)
- On success: `navigate('/')` to redirect to dashboard
- If already authenticated (me check on mount): `navigate('/')` immediately

---

### Components

#### `frontend/src/components/RouteGuard.jsx`

Wraps all protected routes. On mount, calls `GET /api/v1/auth/me`:
- If 200 → renders `<Outlet />` (children)
- If 401 → `<Navigate to="/login" replace />` 
- While loading → renders a basic loading indicator (spinner or blank)

Uses `useState` + `useEffect` + `fetch` with `credentials: 'include'`.

---

### API helpers

#### `frontend/src/api/auth.js`

```js
const BASE = '/api/v1'

export async function login(username, password) { ... }
// POST /api/v1/auth/login, credentials: 'include'
// Returns { ok: true } or throws Error("Invalid credentials")

export async function logout() { ... }
// POST /api/v1/auth/logout, credentials: 'include'

export async function me() { ... }
// GET /api/v1/auth/me, credentials: 'include'
// Returns { username } or throws (non-2xx)
```

All fetch calls use `credentials: 'include'` so cookies are sent/received cross-origin during local dev.

---

### Router

#### `frontend/src/router.jsx`

```jsx
import { createBrowserRouter } from 'react-router-dom'
import RouteGuard from './components/RouteGuard'
import Login from './pages/Login'
import Home from './pages/Home'
// future pages imported here

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RouteGuard />,
    children: [
      { path: '/', element: <Home /> },
      // future protected routes added here
    ],
  },
])

export default router
```

`frontend/src/App.jsx` uses `<RouterProvider router={router} />`.

---

## 6. Acceptance Criteria

- [ ] `POST /api/v1/auth/login` with correct credentials returns 200, sets `nuttiness_session` cookie
- [ ] `POST /api/v1/auth/login` with wrong credentials returns 401, no cookie set
- [ ] `POST /api/v1/auth/logout` returns 200, clears the cookie (`Max-Age=0`)
- [ ] `GET /api/v1/auth/me` with valid cookie returns 200 `{ "username": "admin" }`
- [ ] `GET /api/v1/auth/me` with no/invalid cookie returns 401
- [ ] Visiting `/` without a session redirects to `/login`
- [ ] Visiting `/login` with a valid session redirects to `/`
- [ ] Correct credentials on the login page navigate to `/`
- [ ] Wrong credentials show an inline error; no redirect
- [ ] Login page does NOT render AppShell navigation
- [ ] A hard page refresh on `/` while logged in stays on `/` (cookie persists)
- [ ] `SESSION_SECRET`, `APP_USERNAME`, `APP_PASSWORD` are never sent to the browser

---

## 7. File Checklist

### Backend
- [ ] `backend/auth/handler.py`
- [ ] `backend/shared/auth.py`
- [ ] `backend/shared/db.py` (scaffolded only)
- [ ] `serverless.yml` — 3 new routes added to `auth` function
- [ ] `.env.example` — `FRONTEND_ORIGIN` added

### Frontend
- [ ] `frontend/src/router.jsx` (new file)
- [ ] `frontend/src/pages/Login.jsx` (new file)
- [ ] `frontend/src/components/RouteGuard.jsx` (new file)
- [ ] `frontend/src/api/auth.js` (new file)
- [ ] `frontend/src/App.jsx` — updated to use `<RouterProvider>`
