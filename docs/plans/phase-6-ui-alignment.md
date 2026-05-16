---
title: Phase 6 — UI Alignment (Káru Rebrand)
version: 1.0
created: 2026-05-16
nuttiness-source: phase-10-rebrand
---

# Phase 6 — UI Alignment (Káru Rebrand)

## 1. Overview

The `nuttiness` monolith was rebranded from "Nuttiness" to **Káru** (phase-10-rebrand). This phase audits all visual and branding differences between the two apps and aligns `nuttiness-serverless` to match the current `nuttiness` UI exactly.

**nuttiness source reference:**
- `components/AppShell.jsx` — Káru branding, `bg-brand-bg`, `text-primary`
- `app/login/page.js` — "Karú" heading, Tailwind color tokens
- `tailwind.config.mjs` — new color palette (`primary`, `secondary`, `accent`, `brand-bg`)
- `app/globals.css` — body background `#faf7f3`
- `public/karu-logo.png` — new logo asset

---

## 2. Audit: What Is Different

### 2.1 Color Palette

| Token | nuttiness (current) | nuttiness-serverless (current) |
|-------|--------------------|---------------------------------|
| Primary | `#3B1F07` (deep chocolate) via `text-primary` | `#8B6F47` hardcoded |
| Brand BG | `#F0DFCA` (warm cream) via `bg-brand-bg` | `#f6efe1` hardcoded |
| Secondary | `#5A7A38` (forest green) via `text-secondary` | not defined |
| Accent | `#C0714A` (terracotta) via `text-accent` | not defined |
| Body BG | `#faf7f3` (in globals.css) | `bg-stone-50` (Tailwind class on wrapper div) |

### 2.2 Brand Identity

| Element | nuttiness (current) | nuttiness-serverless (current) |
|---------|--------------------|---------------------------------|
| App name | **Káru** | **Nuttiness** |
| Tagline | **Disfrutá sin culpa** | **Sabor que Enloquece** |
| Logo file | `karu-logo.png` | `nuttiness-logo.png` |
| Logo display | wide image (`h-7 w-auto`) | square icon (`h-10 w-10`) |

### 2.3 Login Page

| Element | nuttiness | nuttiness-serverless |
|---------|-----------|----------------------|
| `<h1>` text | `Karú` | `Nuttiness` |
| `<h1>` color | `text-primary` | `text-[#8B6F47]` hardcoded |
| Input focus border | `focus:border-primary` | `focus:border-[#8B6F47]` hardcoded |
| Input focus ring | `focus:ring-primary/20` | `focus:ring-[#8B6F47]/20` hardcoded |
| Submit button | `bg-primary` | `bg-[#8B6F47]` hardcoded |

### 2.4 AppShell Sidebar

| Element | nuttiness | nuttiness-serverless |
|---------|-----------|----------------------|
| Sidebar bg | `bg-brand-bg` | `bg-[#f6efe1]` hardcoded (3× occurrences) |
| Mobile header bg | `bg-brand-bg` | `bg-[#f6efe1]` hardcoded |
| Active nav item | `bg-primary text-white` | `bg-[#8B6F47] text-white` hardcoded |
| Hover state | `hover:text-primary` | `hover:text-[#8B6F47]` hardcoded |
| Focus ring | `focus-visible:ring-secondary/60` | `focus-visible:ring-[#8B6F47]/60` hardcoded |
| Brand logo | `karu-logo.png` (wide, `h-8 w-auto`) | `nuttiness-logo.png` (square, `h-10 w-10`) |
| Brand name | *(logo only, no text name)* | "Nuttiness" text label |
| Tagline | `Disfrutá sin culpa` | `Sabor que Enloquece` |
| Hamburger button color | `text-primary` | `text-[#8B6F47]` hardcoded |
| Mobile header link | `karu-logo.png` + tagline inline | square logo + separate "Nuttiness" span |

### 2.5 Tailwind Configuration

| | nuttiness | nuttiness-serverless |
|--|-----------|----------------------|
| Version | v3 (with `tailwind.config.mjs`) | v4 (with `@import "tailwindcss"` only) |
| Token strategy | Config `colors` block → `text-primary` etc. | No tokens defined yet — must use `@theme` |

### 2.6 Table Layout (Desktop UX — Sticky Header)

| | nuttiness | nuttiness-serverless |
|--|-----------|----------------------|
| Table wrapper | `overflow-auto` + `maxHeight: calc(100vh - 330px)` | `overflow-x-auto` — no height constraint |
| `<thead>` | `sticky top-0 z-20` — stays pinned while body scrolls | no sticky — scrolls with the page |
| Pagination | Always visible below the scroll container | Scrolls off-screen on large datasets |

**Affected pages (all 5 list pages):** `Sales.jsx`, `Expenses.jsx`, `Products.jsx`, `RawProducts.jsx`, `Customers.jsx`

### 2.7 Mobile Card Layout

The nuttiness `EntityTable` component renders a responsive dual-mode layout:
- **`< lg` (mobile/tablet):** `space-y-3 lg:hidden` — stacked cards using `<dl>` with labeled fields + action buttons at the bottom
- **`lg+` (desktop):** `hidden lg:block` — table with sticky header

**Current state in nuttiness-serverless:**

| Page | Mobile cards | Notes |
|------|-------------|-------|
| `Expenses.jsx` | ✅ Already implemented | Done in Phase 3 |
| `Products.jsx` | ✅ Already implemented | Done in Phase 2 |
| `RawProducts.jsx` | ✅ Already implemented | Done in Phase 2 |
| `Sales.jsx` | ❌ **Missing** — table-only, no `lg:hidden` card path |
| `Customers.jsx` | ❌ **Missing** — table-only, no `lg:hidden` card path |

`Sales.jsx` and `Customers.jsx` currently render a plain `overflow-x-auto` table at all breakpoints. On mobile, columns get clipped or force horizontal scroll — no readable card view.

---

## 3. Scope

### Included

- Define Tailwind v4 `@theme` color tokens in `frontend/src/index.css`
- Replace all hardcoded hex color values across all pages/components with token-based classes
- Update brand name: "Nuttiness" → "Karú" in `Login.jsx`
- Update tagline: "Sabor que Enloquece" → "Disfrutá sin culpa" in `AppShell.jsx`
- Update logo: copy `karu-logo.png` to `frontend/public/`, update all `<img src>` references
- Update logo display style: from square icon to wide rectangular image (matching nuttiness)
- Update body background in `index.css`: `#faf7f3`
- Update `AppShell.jsx` mobile header: match nuttiness layout (logo + tagline inline, no separate text span)
- **Sticky table layout on desktop** for all 5 list pages (`Sales`, `Expenses`, `Products`, `RawProducts`, `Customers`)
- **Mobile card layout for `Sales.jsx` and `Customers.jsx`** (the 3 other pages already have this)
- Roadmap update: mark Phase 6 as complete

### Excluded

- Sidebar **collapse** feature (nuttiness desktop has a collapsible sidebar — this is a UX feature, not in scope)
- PWA manifest / meta tags (not applicable to Vite SPA in this phase)
- Any new pages or routes
- Any backend changes

---

## 4. Backend Design

None. This is a frontend-only phase.

---

## 5. Frontend Design

### 5.1 Token Definitions (`frontend/src/index.css`)

Add an `@theme` block (Tailwind v4 mechanism for custom design tokens):

```css
@import "tailwindcss";

@theme {
  --color-primary: #3B1F07;
  --color-secondary: #5A7A38;
  --color-accent: #C0714A;
  --color-brand-bg: #F0DFCA;
}

body {
  background-color: #faf7f3;
  color: #0f1724;
}
```

This makes `text-primary`, `bg-brand-bg`, `ring-secondary/60`, `focus:border-primary` etc. available as standard Tailwind utility classes throughout the app.

### 5.2 Logo Asset (`frontend/public/karu-logo.png`)

Copy `karu-logo.png` from `/Users/tiny/Personal Projects/nuttiness/public/karu-logo.png` to `frontend/public/karu-logo.png`.

### 5.3 `frontend/src/layouts/AppShell.jsx`

Replace all hardcoded hex values and update brand strings:

| Old | New |
|-----|-----|
| `bg-[#f6efe1]` | `bg-brand-bg` |
| `text-[#8B6F47]` | `text-primary` |
| `bg-[#8B6F47]` | `bg-primary` |
| `hover:text-[#8B6F47]` | `hover:text-primary` |
| `focus-visible:ring-[#8B6F47]/60` | `focus-visible:ring-secondary/60` |
| `src="/nuttiness-logo.png"` | `src="/karu-logo.png"` |
| `alt="Nuttiness"` | `alt="Karú"` |
| `className="h-10 w-10 ..."` (logo) | `className="h-8 w-auto shrink-0 object-contain"` |
| "Nuttiness" brand name text span | remove — logo image is the brand (no separate text label) |
| "Sabor que Enloquece" | "Disfrutá sin culpa" |

Mobile header layout change: replace the current three-slot header (hamburger / logo icon / "Nuttiness" span / spacer) with: hamburger button + centered logo+tagline link (matching nuttiness pattern).

Remove `DashboardIcon` function if still present (was already removed in Phase 5).

### 5.4 `frontend/src/pages/Login.jsx`

| Old | New |
|-----|-----|
| `text-[#8B6F47]` on `<h1>` | `text-primary` |
| `"Nuttiness"` h1 text | `"Karú"` |
| `focus:border-[#8B6F47]` | `focus:border-primary` |
| `focus:ring-[#8B6F47]/20` | `focus:ring-primary/20` |
| `bg-[#8B6F47]` on submit button | `bg-primary` |
| `hover:bg-[#7b613d]` | `hover:bg-primary/90` |

### 5.5 Sticky Table Layout — All 5 List Pages

Apply to: `Sales.jsx`, `Expenses.jsx`, `Products.jsx`, `RawProducts.jsx`, `Customers.jsx`

#### Table wrapper (desktop only)

On the `lg:block` desktop table wrapper div, replace `overflow-x-auto` with a height-constrained scroll:

```
overflow-auto max-h-[calc(100vh-280px)]
```

Use `calc(100vh-300px)` for pages with taller filter bars (Sales has a status dropdown).

#### `<thead>` — sticky header

Add `sticky top-0 z-10` to `<thead>`. Each `<th>` must keep its solid background (`bg-stone-50`) — without it the header becomes transparent over scrolling rows.

#### Mobile

Mobile uses the card layout (section 5.6 below) — the desktop table wrapper is already `hidden lg:block`, so no mobile change is needed here.

#### Hardcoded color cleanup on these pages

While touching each file, replace:
- `text-[#8B6F47]` → `text-primary`
- `bg-[#8B6F47]` → `bg-primary`
- `hover:bg-[#8B6F47]/10` → `hover:bg-primary/10`
- `focus:border-[#8B6F47]` → `focus:border-primary`
- `border-[#8B6F47]/30` → `border-primary/30`
- `border-t-[#8B6F47]` (spinner) → `border-t-primary`

---

### 5.6 Mobile Card Layout — `Sales.jsx` and `Customers.jsx`

These two pages currently render a table at all breakpoints. They must be refactored to the dual-mode pattern: cards on mobile (`lg:hidden`), table on desktop (`hidden lg:block`).

#### Pattern (same as `Expenses.jsx` / `Products.jsx`)

```jsx
{/* Mobile cards — hidden on lg+ */}
<div className="space-y-3 lg:hidden">
  {items.map((item) => (
    <div key={item.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <dl className="space-y-2">
        {/* one <div> per field */}
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Label</dt>
          <dd className="text-sm text-slate-900">Value</dd>
        </div>
      </dl>
      {/* Action buttons */}
      <div className="mt-3 flex gap-2 border-t border-stone-100 pt-3">
        {/* Edit / View / Delete buttons */}
      </div>
    </div>
  ))}
</div>

{/* Desktop table — hidden below lg */}
<div className="hidden overflow-auto max-h-[calc(100vh-280px)] rounded-lg border border-stone-200 bg-white shadow-sm lg:block">
  <table> ... </table>
</div>
```

#### `Sales.jsx` card fields

| Field | Label | Format |
|-------|-------|--------|
| `created_at` | Date | `formatDate()` (already in file) |
| `customer_name` | Customer | plain text, `—` if null |
| `total_amount` | Total | `formatCurrency()` (already in file) |
| `status` | Status | `<StatusBadge />` (already in file) |

Action button: **View** → `<Link to={/sales/${item.id}}>` with `EyeIcon` (already in file).

#### `Customers.jsx` card fields

| Field | Label | Format |
|-------|-------|--------|
| `name` | Name | plain text |
| `phone` | Phone | plain text, `—` if null |
| `notes` | Notes | plain text, `—` if null |

Action buttons: **Edit** → `navigate(/customers/${item.id}/edit)` and **Delete** → `handleDelete(item.id)` (both already in the existing table rows).

---

## 6. Acceptance Criteria

- [ ] `@theme` block defined in `index.css` with `primary`, `secondary`, `accent`, `brand-bg` tokens
- [ ] Body background is `#faf7f3`; sidebar/mobile header background is `#F0DFCA` (warm cream)
- [ ] No hardcoded `#8B6F47` or `#f6efe1` values remain in any component or page file
- [ ] `frontend/public/karu-logo.png` exists
- [ ] Sidebar (desktop + mobile) shows `karu-logo.png` in wide-image format (`h-8 w-auto`)
- [ ] Sidebar tagline reads "Disfrutá sin culpa"
- [ ] Login page `<h1>` reads "Karú" with `text-primary`
- [ ] Active nav item uses `bg-primary` (deep chocolate, not old amber)
- [ ] Mobile header matches nuttiness layout: hamburger + logo+tagline centered link
- [ ] No "Nuttiness" brand strings visible in the UI
- [ ] On desktop (`lg`), all 5 list pages show a sticky `<thead>` that stays pinned while the table body scrolls
- [ ] Pagination bar is always visible (never scrolls off-screen on desktop)
- [ ] `Sales.jsx` renders mobile cards (`lg:hidden`) with Date, Customer, Total, Status fields + View button
- [ ] `Customers.jsx` renders mobile cards (`lg:hidden`) with Name, Phone, Notes fields + Edit/Delete buttons
- [ ] `Expenses.jsx`, `Products.jsx`, `RawProducts.jsx` mobile cards unchanged (already working)
- [ ] All 5 list pages use the dual-mode pattern: `space-y-3 lg:hidden` cards + `hidden lg:block` table
- [ ] Roadmap `phase-6` status updated to ✅ Complete

---

## 7. File Checklist

```
frontend/public/karu-logo.png          (copy from nuttiness/public/)
frontend/src/index.css                 (add @theme tokens + body background)
frontend/src/layouts/AppShell.jsx      (dehard-code all colors, update branding)
frontend/src/pages/Login.jsx           (dehard-code colors, update h1 text)
frontend/src/pages/Sales.jsx           (add mobile cards + sticky table + dehard-code colors)
frontend/src/pages/Customers.jsx       (add mobile cards + sticky table + dehard-code colors)
frontend/src/pages/Expenses.jsx        (sticky table + dehard-code colors — cards already done)
frontend/src/pages/Products.jsx        (sticky table + dehard-code colors — cards already done)
frontend/src/pages/RawProducts.jsx     (sticky table + dehard-code colors — cards already done)
docs/plans/roadmap.md                  (phase 6 status → ✅)
```
