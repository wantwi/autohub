# AutoHub API contract (Phase 1) — frontend ↔ backend

**Base URL:** `VITE_API_BASE_URL` (e.g. `https://api.example.com/v1`, no trailing slash).

**Auth:** `Authorization: Bearer <access_token>` on protected routes.

**JSON:** Prefer `{ "data": ... }` for success payloads. Lists may be a raw array **or** `{ "items": [...], "meta": {} }` — the web app normalizes both.

**Errors:** `{ "error": { "code": "string", "message": "string", "details": {} } }` with appropriate HTTP status; or `{ "message": "..." }` (frontend accepts both).

---

## Auth

| Method | Path | Body | Response `data` |
|--------|------|------|-----------------|
| POST | `/auth/request-otp` | `{ "phone": "..." }` | opaque |
| POST | `/auth/verify-otp` | `{ "phone": "...", "code": "..." }` | `{ "token", "user" }` (may be nested under `data`) |
| GET | `/auth/me` | — | current user object |

## Dealer (authenticated)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/dealers/register` | Self-application endpoint. Creates or resubmits dealer profile with `onboarding_status='pending'`. |
| GET | `/dealers/register/status` | Returns current user dealer application, or `null` if not submitted yet. |
| GET | `/dealers/me` | **Recommended** (not in PRD table): returns shop for `PUT /dealers/me` form. |
| PUT | `/dealers/me` | Shop fields + `operating_hours` object; optional `openOnHolidays` boolean (open during public holidays). |
| GET | `/dealers/me/dashboard` | Stats object (shape flexible; UI reads `orders_count`, `revenue`, `views`). |
| GET | `/dealers/me/parts` | **Recommended**: list this dealer’s parts for the dashboard table (PRD lists only write endpoints). |

## Admin

All admin endpoints require `Authorization: Bearer <token>` where `user.role = admin`.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/dealers/admin/overview` | Dashboard counts (`totalDealers`, onboarding status buckets, `verifiedDealers`). |
| GET | `/dealers/admin/list?status=&q=&page=&pageSize=` | Dealer directory with onboarding metadata + linked user contact fields. |
| GET | `/dealers/admin/users?q=` | User lookup for admin onboarding (returns `dealerId` when already onboarded). |
| POST | `/dealers/admin/onboard` | Create dealer profile for an existing user. Supports initial `onboardingStatus` and `onboardingNote`. |
| PATCH | `/dealers/admin/:id/onboarding` | Update onboarding status (`pending`/`approved`/`rejected`) and note; user role synced automatically. |
| POST | `/admin/dealers/:dealerId/parts` | Admin upload of a part on behalf of a dealer. Dealer keeps full control in `/dealers/me/parts*`. |

### Admin onboarding status model

- `pending`: Dealer profile exists but dealer workspace is blocked by policy.
- `approved`: Dealer can access and manage inventory/orders/profile.
- `rejected`: Dealer workspace blocked; role reverts to buyer.

### Provenance fields

- `parts.created_by_user_id`: user who created listing (dealer or admin).
- `parts.created_by_role`: role at creation time (`dealer`, `admin`).
- `dealers.onboarded_by_user_id`, `dealers.onboarded_at`, `dealers.onboarding_note`: audit trail for onboarding actions.

## Parts (public + dealer)

Public search: `GET /parts?q=&make=&model=&year=&category=&condition=&sort=`  
`GET /parts/categories` — returns `data` as string array of allowed part categories (for forms and filters).  
`GET /parts/:id`, `GET /parts/:id/compare`

Dealer write: `POST/PUT/DELETE /dealers/me/parts`, `PATCH .../toggle`.

When onboarding is not approved, dealer part write routes return:

```json
{
  "error": {
    "code": "DEALER_NOT_APPROVED",
    "message": "Your dealer application is pending or rejected. Approval is required to publish parts.",
    "details": { "onboardingStatus": "pending|rejected" }
  }
}
```

## Orders & payments

`POST /orders` — body should match backend (e.g. `part_id`, `quantity`, `delivery_type`, `delivery_address`, `notes`).  
`POST /payments/initialize` — body `{ "order_id": "uuid" }`; response should include `authorization_url` **or** `reference` for Paystack Popup.

`GET /orders/me`, `GET /orders/:id`, `PATCH .../cancel`  
`GET /dealers/me/orders` — dealer inbox; include `buyer_phone_visible` boolean and `buyer_phone` when allowed.

Dealer: `PATCH /orders/:id/confirm`, `PATCH /orders/:id/dispatch`, `PATCH /orders/:id/cancel`

Reviews: `POST /orders/:id/review` with `{ "rating", "comment" }`

## CORS

Allow the Vite dev origin and production web origin; allow `Authorization` and `Content-Type`.

---

## Smoke checklist (joint)

1. `POST /auth/request-otp` → `verify-otp` → `GET /auth/me` with token.  
2. `GET /parts?limit=5` returns list.  
3. `POST /orders` + `POST /payments/initialize` happy path.  
4. Dealer `GET /dealers/me/parts` (or agreed substitute) populates the parts table.
