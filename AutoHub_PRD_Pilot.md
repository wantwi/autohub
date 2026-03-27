# AutoHub Ghana — Product Requirements Document
**Pilot Phase | Days 1–30 Build Specification**
Version 1.0 · March 2026 · CONFIDENTIAL

---

> **Stack:** React PWA · Node.js · FastAPI · PostgreSQL (via Supabase)
> **Phase:** Solo Pilot · Ghana Only · 30 Days
> **Focus:** Spare Parts · Price Comparison · MoMo Payment · Dealer Verification
> **Success KPI:** 20 dealers · 50 searches/week · 5 paid orders · NPS > 8

---

## Table of Contents

1. [Introduction & Problem Statement](#1-introduction--problem-statement)
2. [User Personas](#2-user-personas)
3. [User Stories & Acceptance Criteria](#3-user-stories--acceptance-criteria)
4. [Database Schema (PostgreSQL)](#4-database-schema-postgresql)
5. [API Specification](#5-api-specification-nodejs--express)
6. [Frontend Architecture (React PWA)](#6-frontend-architecture-react-pwa)
7. [Infrastructure & DevOps](#7-infrastructure--devops-pilot)
8. [Trust, Verification & Safety](#8-trust-verification--safety)
9. [30-Day Build Sprint Plan](#9-30-day-build-sprint-plan)
10. [Success Metrics](#10-success-metrics-pilot-kpis)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Appendix](#12-appendix)

---

## 1. Introduction & Problem Statement

### 1.1 Background

Ghana's automotive aftermarket is highly fragmented. A car owner needing a spare part must physically visit Abossey Okai or Suame Magazine, negotiate with multiple dealers without price visibility, independently source a mechanic, and arrange their own delivery. There is no single trusted digital touchpoint for the entire experience.

### 1.2 The Opportunity

No existing Ghanaian platform integrates parts price comparison, verified professional booking, mobile money payment, and last-mile delivery into a single consumer app.

| Competitor | What They Do | Critical Gap |
|---|---|---|
| PartsMallGh | Static dealer directory | No payments, no ordering, no comparison |
| Uncle Fitter | Mechanic dispatch only | No parts integration at all |
| Autolast Ghana | Single-vendor parts store | One supplier, no price comparison |
| Jumia Ghana | General e-commerce | Not automotive-specialised, no mechanics |

### 1.3 Vision Statement

> **AutoHub is Ghana's most trusted automotive marketplace — connecting car owners to verified spare parts dealers, mechanics, electricians, and body shops in one seamless mobile-first experience.**

### 1.4 Pilot Scope Boundary

The pilot (Days 1–30) covers **one complete loop** to prove value before expanding.

| ✅ In Scope (Pilot) | 🔒 Out of Scope (Phase 2+) |
|---|---|
| Spare parts listing by dealers | Mechanic booking & scheduling |
| Multi-dealer price comparison | Body shop / electrical specialist directory |
| Dealer profile & verification badge | In-app real-time chat |
| Part search by make/model/year | Insurance & warranty integration |
| Mobile money payment via Paystack | Fleet management for businesses |
| Basic order management | Native iOS / Android app |
| Dealer dashboard (list/manage parts) | AI-powered diagnosis & recommendations |
| Delivery via map link + WhatsApp rider | Own logistics fleet |

---

## 2. User Personas

### 2.1 Primary Persona — The Car Owner (Demand Side)

| Attribute | Detail |
|---|---|
| Name | Kofi Mensah |
| Age / Role | 34, small business owner, drives a 2015 Toyota Corolla |
| Location | Accra (East Legon / Tema) |
| Tech comfort | Uses smartphone daily, MTN MoMo, shops on Jumia occasionally |
| Pain point | Wastes hours driving to Abossey Okai, never sure if price is fair, fears fake parts |
| Goal | Find the right part at the best price without leaving the office, pay safely, get it delivered |
| Trust triggers | Verified badges, real photos, ratings, secure payment confirmation |

### 2.2 Secondary Persona — The Parts Dealer (Supply Side)

| Attribute | Detail |
|---|---|
| Name | Ama Osei |
| Age / Role | 42, owner of a mid-size spare parts shop, Abossey Okai |
| Tech comfort | Basic smartphone, uses WhatsApp heavily, not very web-savvy |
| Pain point | Customers only find her by foot traffic; no way to show stock online |
| Goal | List inventory once, receive orders via phone or app, grow beyond walk-in customers |
| Concern | Worried about fake orders, wants payment confirmation before dispatching parts |
| Onboarding need | Needs hands-on help listing first 20 products; interface must be very simple |

---

## 3. User Stories & Acceptance Criteria

### 3.1 Car Owner Stories

#### US-01 — Register & Onboard
> As a car owner, I want to sign up using my phone number so that I don't need to remember an email password.

| Acceptance Criteria | Priority |
|---|---|
| Phone + OTP registration completes in under 90 seconds | Must Have |
| User can add car details (make, model, year) after signup | Must Have |
| Google Sign-In available as alternative | Should Have |

#### US-02 — Search for a Spare Part
> As a car owner, I want to search for a part by name and my car's make/model/year so that I only see relevant results.

| Acceptance Criteria | Priority |
|---|---|
| Search returns results filtered by car compatibility | Must Have |
| Results render in under 2 seconds on 4G | Must Have |
| Empty state shows helpful message + contact suggestion | Must Have |
| Search history saved locally (last 5 searches) | Should Have |

#### US-03 — Compare Prices
> As a car owner, I want to see the same part listed by multiple dealers side by side so I can make an informed decision.

| Acceptance Criteria | Priority |
|---|---|
| Comparison view shows dealer name, price, condition, location, rating, verified badge | Must Have |
| User can sort by price (low to high) or rating | Must Have |
| Verified dealers shown with a visible checkmark badge | Must Have |
| Part condition clearly labelled: New / Used / Refurbished | Must Have |

#### US-04 — Place an Order & Pay
> As a car owner, I want to pay for a part using Mobile Money or card so that the transaction is safe and traceable.

| Acceptance Criteria | Priority |
|---|---|
| Paystack checkout supports MTN MoMo, Vodafone Cash, AirtelTigo, Visa/MC | Must Have |
| Order confirmation sent via SMS and in-app notification | Must Have |
| Dealer notified immediately upon successful payment | Must Have |
| User can view order status (Pending / Confirmed / Dispatched / Delivered) | Must Have |
| Refund policy clearly shown before payment | Should Have |

#### US-05 — Arrange Delivery
> As a car owner, I want to either pick up from the dealer or arrange a rider so I can choose the most convenient option.

| Acceptance Criteria | Priority |
|---|---|
| After order, user sees dealer location on Google Maps | Must Have |
| WhatsApp button pre-filled with order reference to contact a rider | Must Have |
| Delivery fee estimated (flat rate per zone for pilot) | Should Have |

### 3.2 Dealer Stories

#### US-06 — Dealer Registration
> As a dealer, I want to register my shop and list my parts so that customers across Accra can find me online.

| Acceptance Criteria | Priority |
|---|---|
| Dealer registers with shop name, phone, location (map pin), specialisation | Must Have |
| Dealer receives a verification call/visit within 48hrs | Must Have |
| Verified badge appears on profile after manual approval | Must Have |
| Dealer can set operating hours | Should Have |

#### US-07 — List & Manage Parts
> As a dealer, I want to add, edit, and remove parts listings so that my inventory stays current.

| Acceptance Criteria | Priority |
|---|---|
| Dealer can create listing: part name, compatible cars, price, condition, quantity, photos (up to 5) | Must Have |
| Dealer dashboard shows all listings with quick edit/delete | Must Have |
| Out-of-stock toggle hides listing without deleting it | Must Have |
| Bulk CSV upload for dealers with large inventories | Nice to Have |

#### US-08 — Receive & Manage Orders
> As a dealer, I want to be notified when I receive an order and confirm or reject it so that I maintain control of my stock.

| Acceptance Criteria | Priority |
|---|---|
| Push notification + SMS when order received | Must Have |
| Dealer can confirm or decline within 2 hours (auto-cancel otherwise) | Must Have |
| Dealer sees buyer's phone number only after confirming order | Must Have |
| Payment held by platform until dealer confirms dispatch | Must Have |

---

## 4. Database Schema (PostgreSQL)

> **Tooling:** Use Supabase for the pilot. It provides hosted PostgreSQL, auto-generated REST API, auth helpers, and a visual dashboard — all free at pilot scale. Run all migrations via SQL editor or Prisma ORM.

### 4.1 Entity Relationships

- `users` → `vehicles` (1:many) — a user can register multiple cars
- `users` → `orders` (1:many) — a user can place many orders
- `dealers` → `parts` (1:many) — a dealer lists many parts
- `parts` → `orders` (1:many) — a part can appear in many orders
- `orders` → `order_status_history` (1:many) — tracks all status changes
- `dealers` → `reviews` (1:many) — buyers leave reviews on dealers

### 4.2 Table Definitions

#### `users`

```sql
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone           VARCHAR(20) UNIQUE NOT NULL,       -- Primary identifier
  email           VARCHAR(255) UNIQUE,               -- Optional
  full_name       VARCHAR(255) NOT NULL,
  role            TEXT NOT NULL DEFAULT 'buyer',     -- 'buyer' | 'dealer' | 'admin'
  avatar_url      TEXT,                              -- Cloudinary URL
  is_verified     BOOLEAN DEFAULT false,             -- Admin sets true after KYC
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `vehicles`

```sql
CREATE TABLE vehicles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  make        VARCHAR(100) NOT NULL,                 -- e.g. Toyota
  model       VARCHAR(100) NOT NULL,                 -- e.g. Corolla
  year        SMALLINT NOT NULL,                     -- e.g. 2015
  vin         VARCHAR(50) UNIQUE,                    -- Optional VIN for precise matching
  is_primary  BOOLEAN DEFAULT false,                 -- User's main car
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

#### `dealers`

```sql
CREATE TABLE dealers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id),
  shop_name        VARCHAR(255) NOT NULL,
  description      TEXT,                             -- Short bio / specialisation
  phone_business   VARCHAR(20) NOT NULL,             -- Public-facing number
  location_text    TEXT NOT NULL,                    -- e.g. Abossey Okai, Shop 23B
  lat              DECIMAL(10,7),                    -- Google Maps pin
  lng              DECIMAL(10,7),
  is_verified      BOOLEAN DEFAULT false,            -- Admin-set after manual check
  verified_at      TIMESTAMPTZ,
  rating_avg       DECIMAL(3,2) DEFAULT 0.00,        -- Computed from reviews
  rating_count     INTEGER DEFAULT 0,
  operating_hours  JSONB,                            -- {"mon": "8am-6pm", ...}
  banner_url       TEXT,                             -- Cloudinary
  created_at       TIMESTAMPTZ DEFAULT now()
);
```

#### `parts`

```sql
CREATE TABLE parts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id         UUID REFERENCES dealers(id) ON DELETE CASCADE,
  name              VARCHAR(255) NOT NULL,           -- e.g. Alternator
  description       TEXT,
  category          VARCHAR(100) NOT NULL,           -- e.g. Engine, Electrical, Body
  condition         TEXT NOT NULL,                   -- 'new' | 'used' | 'refurbished'
  price             DECIMAL(10,2) NOT NULL,          -- GHS
  quantity          INTEGER NOT NULL DEFAULT 1,
  is_available      BOOLEAN DEFAULT true,            -- Out-of-stock toggle
  compatible_makes  TEXT[],                          -- ARRAY e.g. ['Toyota','Honda']
  compatible_models TEXT[],                          -- ARRAY e.g. ['Corolla','Civic']
  compatible_years  INT4RANGE,                       -- e.g. '[2010,2020)'
  images            TEXT[],                          -- Cloudinary URLs
  part_number       VARCHAR(100),                    -- OEM or aftermarket #
  views_count       INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);
```

#### `orders`

```sql
-- Status flow:
-- pending → confirmed → dispatched → delivered → completed
-- pending / confirmed → cancelled

CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        VARCHAR(20) UNIQUE NOT NULL,      -- AH-XXXXXXXX auto-generated
  buyer_id         UUID REFERENCES users(id),
  dealer_id        UUID REFERENCES dealers(id),
  part_id          UUID REFERENCES parts(id),
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       DECIMAL(10,2) NOT NULL,           -- Snapshot at time of order
  total_amount     DECIMAL(10,2) NOT NULL,
  delivery_type    TEXT NOT NULL,                    -- 'pickup' | 'delivery'
  delivery_address TEXT,
  status           TEXT NOT NULL DEFAULT 'pending',
  paystack_ref     VARCHAR(100),
  payment_status   TEXT DEFAULT 'unpaid',            -- 'unpaid' | 'paid' | 'refunded'
  paid_at          TIMESTAMPTZ,
  notes            TEXT,                             -- Buyer notes to dealer
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);
```

#### `reviews`

```sql
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID UNIQUE REFERENCES orders(id),     -- One review per order
  dealer_id   UUID REFERENCES dealers(id),           -- Denormalised for query speed
  buyer_id    UUID REFERENCES users(id),
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## 5. API Specification (Node.js / Express)

> **Base URL:** `https://api.autohub.gh/v1` (pilot: `autohub-api.railway.app/v1`)
> All endpoints return JSON. Auth via Bearer JWT. OTP via Africa's Talking SMS gateway.

### 5.1 Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/auth/request-otp` | Send OTP to phone number | Public |
| POST | `/auth/verify-otp` | Verify OTP, return JWT + user | Public |
| POST | `/auth/google` | Google OAuth token exchange | Public |
| GET | `/auth/me` | Return current user profile | JWT |
| POST | `/auth/logout` | Invalidate refresh token | JWT |

### 5.2 Users & Vehicles

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| PUT | `/users/me` | Update profile (name, avatar) | JWT |
| POST | `/users/me/vehicles` | Add vehicle to profile | JWT |
| GET | `/users/me/vehicles` | List user's vehicles | JWT |
| DELETE | `/users/me/vehicles/:id` | Remove a vehicle | JWT |

### 5.3 Dealers

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/dealers/register` | Create dealer profile | JWT |
| GET | `/dealers` | List all verified dealers (paginated) | Public |
| GET | `/dealers/:id` | Get dealer detail + recent parts | Public |
| PUT | `/dealers/me` | Update own dealer profile | JWT + Dealer |
| GET | `/dealers/me/dashboard` | Stats: orders, revenue, views | JWT + Dealer |
| PATCH | `/dealers/:id/verify` | Admin: set verified=true | JWT + Admin |

### 5.4 Parts

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/parts` | Search parts (q, make, model, year, category, condition, sort) | Public |
| GET | `/parts/:id` | Get single part detail | Public |
| POST | `/dealers/me/parts` | Create new part listing | JWT + Dealer |
| PUT | `/dealers/me/parts/:id` | Update part listing | JWT + Dealer |
| DELETE | `/dealers/me/parts/:id` | Delete part listing | JWT + Dealer |
| PATCH | `/dealers/me/parts/:id/toggle` | Toggle is_available | JWT + Dealer |
| GET | `/parts/:id/compare` | Get same part from other dealers | Public |

### 5.5 Orders

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/orders` | Place order (triggers Paystack checkout) | JWT |
| GET | `/orders/me` | Buyer: list own orders | JWT |
| GET | `/orders/:id` | Get order detail | JWT |
| GET | `/dealers/me/orders` | Dealer: list received orders | JWT + Dealer |
| PATCH | `/orders/:id/confirm` | Dealer confirms order | JWT + Dealer |
| PATCH | `/orders/:id/dispatch` | Dealer marks dispatched | JWT + Dealer |
| PATCH | `/orders/:id/cancel` | Buyer or dealer cancels | JWT |
| POST | `/orders/:id/review` | Buyer leaves dealer review | JWT |

### 5.6 Payments (Paystack)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/payments/initialize` | Create Paystack transaction, return checkout URL | JWT |
| POST | `/payments/webhook` | Paystack callback — verify HMAC, update payment_status | Paystack HMAC |
| GET | `/payments/verify/:reference` | Manual verify (fallback) | JWT |

---

## 6. Frontend Architecture (React PWA)

### 6.1 Tech Decisions

| Concern | Choice | Rationale |
|---|---|---|
| Framework | React JS 19 + Vite | Fast HMR, small bundle |
| State management | Zustand | Simpler than Redux at pilot scale |
| Server state / cache | TanStack Query | Handles caching, loading states, retries |
| Routing | React Router v6 | Standard, works well with PWA |
| Styling | Tailwind CSS | Utility-first, mobile-first |
| UI components | shadcn/ui | Accessible, unstyled, customisable | https://atlassian.design
| Forms | React Hook Form + Zod | Fast validation, small bundle |
| Maps | Google Maps JS SDK | Best Ghana coverage |
| PWA | Vite PWA plugin (Workbox) | Offline shell, installable, push notifications |
| Image upload | Cloudinary Upload Widget | Free tier, CDN delivery |
| Payments | Paystack Popup JS | Official SDK, handles MoMo UX natively |

### 6.2 Page & Component Map

#### Public Pages (Unauthenticated)

| Route | Component | Key Sub-components |
|---|---|---|
| `/` | HomePage | HeroSearch, FeaturedDealers, CategoryGrid, HowItWorks |
| `/search` | SearchResultsPage | SearchBar, FilterPanel, PartCard, CompareDrawer, SortControl |
| `/parts/:id` | PartDetailPage | PartGallery, PartInfo, DealerCard, OtherDealersList, OrderCTA |
| `/dealers` | DealersPage | DealerGrid, DealerCard, LocationFilter |
| `/dealers/:id` | DealerProfilePage | DealerBanner, PartsList, ReviewList, ContactMap |
| `/login` | AuthPage | PhoneOTPForm, GoogleSignInBtn |

#### Buyer Pages (Authenticated)

| Route | Component | Key Sub-components |
|---|---|---|
| `/dashboard` | BuyerDashboard | RecentOrders, SavedParts, VehicleWidget |
| `/orders` | OrdersPage | OrderList, OrderCard, StatusBadge |
| `/orders/:id` | OrderDetailPage | OrderTimeline, DeliveryOptions, ReviewForm |
| `/profile` | ProfilePage | UserForm, VehicleManager, NotificationSettings |
| `/checkout/:partId` | CheckoutPage | OrderSummary, DeliverySelector, PaystackButton |

#### Dealer Pages (Authenticated + Dealer Role)

| Route | Component | Key Sub-components |
|---|---|---|
| `/dealer/dashboard` | DealerDashboard | StatsCards, RecentOrdersTable, QuickActions |
| `/dealer/parts` | DealerPartsPage | PartsTable, AvailabilityToggle, BulkActions |
| `/dealer/parts/new` | PartFormPage | PartForm, ImageUploader, CarCompatibilityPicker |
| `/dealer/parts/:id/edit` | PartFormPage | (same, prefilled) |
| `/dealer/orders` | DealerOrdersPage | OrdersTable, OrderActions, StatusFilter |
| `/dealer/profile` | DealerProfilePage | ShopForm, LocationPicker, OperatingHoursEditor |

### 6.3 Shared Components Library

- `AppShell` — bottom nav (mobile), sidebar (tablet+), header
- `SearchBar` — debounced input with make/model/year dropdowns
- `PartCard` — image, name, price, condition badge, dealer name, rating, verified icon
- `DealerCard` — logo, name, location, rating, verified badge, part count
- `VerifiedBadge` — checkmark icon with tooltip
- `StatusBadge` — colour-coded order status pill
- `OrderTimeline` — horizontal step tracker for order lifecycle
- `PaystackButton` — wrapper around Paystack Popup JS
- `OTPInput` — 6-box PIN input with auto-advance
- `ImageUploader` — Cloudinary widget wrapper with preview grid
- `LocationPicker` — Google Maps embed with draggable pin
- `EmptyState` — consistent no-results UI with CTA
- `ErrorBoundary` — friendly error screen with retry
- `LoadingSpinner / SkeletonCard` — consistent loading states

---

## 7. Infrastructure & DevOps (Pilot)

> **Philosophy:** Zero or near-zero cost for the pilot. All free tiers. The infrastructure scales when the business justifies it. No Kubernetes, no microservices, no Docker Compose complexity — ship first.

| Concern | Service | Free Tier | Notes |
|---|---|---|---|
| Frontend hosting | Vercel | Free (hobby) | Auto deploys from GitHub main branch |
| Backend hosting | Any free option | free tire | Node.js server |
| Database | Supabase | Free 500MB | PostgreSQL + auth + realtime built-in |
| File storage | Cloudinary | Free 25 credits/month | CDN-delivered part photos |
| SMS / OTP | Africa's Talking | ~GHS 0.05/SMS | Ghana number, reliable delivery |
| Email | Resend | Free 100 emails/day | Order confirmation emails |
| Payments | Paystack | 1.5% + GHS 0.50/txn | MoMo + card, no setup fee |
| Domain | Cloudflare Registrar | ~$10/year | autohub.com.gh |
| SSL | Vercel + Cloudflare | Free | Auto-provisioned |
| Analytics | Vercel Analytics | Free tier | Page views, web vitals |
| Error tracking | Sentry | Free 5k events/month | JS + Node error capture |
| CI/CD | GitHub Actions | Free 2000 min/month | Lint + test on PR, deploy on merge |

### 7.1 Environment Variables

**Backend `.env`**
```env
DATABASE_URL=postgres://...supabase...
SUPABASE_JWT_SECRET=...
PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_WEBHOOK_SECRET=...
CLOUDINARY_URL=cloudinary://...
AFRICAS_TALKING_API_KEY=...
AFRICAS_TALKING_USERNAME=autohub
RESEND_API_KEY=re_...
NODE_ENV=production
```

**Frontend `.env`**
```env
VITE_API_BASE_URL=https://autohub-api.railway.app/v1
VITE_PAYSTACK_PUBLIC_KEY=pk_live_...
VITE_GOOGLE_MAPS_API_KEY=...
VITE_CLOUDINARY_CLOUD_NAME=...
```

---

## 8. Trust, Verification & Safety

> **Core Principle:** Trust is the product. The app is merely the delivery mechanism. Every design decision must ask: does this make buyers more confident and dealers more accountable?

### 8.1 Dealer Verification Process

1. Dealer submits registration form (shop name, phone, Ghana Card / Business Reg number)
2. AutoHub team calls the number within 24 hours to confirm identity
3. Optional: physical visit to Abossey Okai to photograph shop, confirm stock
4. Verified badge set to `true` in admin panel. Dealer receives SMS confirmation
5. Any complaint triggers a re-verification or suspension

### 8.2 Payment Trust Mechanics

- Buyer pays AutoHub (via Paystack escrow-style hold), not the dealer directly
- Dealer only sees buyer contact after confirming the order
- Funds released to dealer T+2 days after delivery is confirmed
- Buyer can raise a dispute within 48 hours of delivery confirmation
- Refunds processed within 5 business days via original payment method

### 8.3 Quality Signals (Visible to Buyers)

| Signal | How it Works | Where Shown |
|---|---|---|
| Verified Badge | Manual check by AutoHub team | Dealer card, part listing, checkout |
| Star Rating | Average of all completed order reviews (1–5) | Dealer profile, part card |
| Review Count | Total number of reviews received | Dealer profile |
| Response Rate | % of orders confirmed within 2 hours | Dealer profile |
| Member Since | Account creation date | Dealer profile |
| Parts Listed | Count of active listings | Dealer profile |

---

## 9. 30-Day Build Sprint Plan

### Week 1 — Foundation (Days 1–7)

| Day | Task | Output |
|---|---|---|
| 1 | Project setup: GitHub repo, Vite PWA, Railway Node, Supabase init | Deployable hello-world on all 3 services |
| 2 | Database: write all migrations, seed script with test data | All tables live in Supabase |
| 3 | Auth API: phone OTP flow (Africa's Talking), JWT issue, /auth/me | Working auth endpoints |
| 4 | Auth UI: OTPInput component, AuthPage, Zustand auth store, protected routes | Login flow working end-to-end |
| 5 | Dealer registration API + Dealer dashboard scaffold | Dealer can register, see empty dashboard |
| 6 | Part CRUD API (create, read, update, delete, toggle) | All parts endpoints passing tests |
| 7 | Image upload: Cloudinary widget integration, ImageUploader component | Dealer can upload part photos |

### Week 2 — Core Buyer Experience (Days 8–14)

| Day | Task | Output |
|---|---|---|
| 8 | Parts search API: full-text search, filters (make/model/year/category/condition), sort | Search endpoint with query params |
| 9 | SearchResultsPage: SearchBar, FilterPanel, PartCard grid, loading skeletons | Buyer can search and see results |
| 10 | PartDetailPage: gallery, info, DealerCard, price compare (other dealers) | Buyer can compare prices |
| 11 | DealerProfilePage: profile, parts list, reviews placeholder, map embed | Dealer public profile live |
| 12 | HomePage: HeroSearch, CategoryGrid, FeaturedDealers (manual curation) | Landing page complete |
| 13 | Vehicle management: add/edit/remove cars, link search to primary vehicle | Buyer car profile works |
| 14 | Mobile responsiveness pass: test all pages on 375px / 390px viewport | All pages correct on mobile |

### Week 3 — Orders & Payments (Days 15–21)

| Day | Task | Output |
|---|---|---|
| 15 | CheckoutPage: order summary, delivery selector, PaystackButton integration | Checkout UI complete |
| 16 | Orders API: POST /orders, Paystack initialize, webhook handler | Payment flow works end-to-end |
| 17 | Order status management: confirm/dispatch/cancel dealer actions | Dealer can manage order lifecycle |
| 18 | Buyer OrdersPage + OrderDetailPage: timeline, delivery options (map + WhatsApp) | Buyer sees full order detail |
| 19 | Dealer orders dashboard: incoming orders table, accept/decline + SMS alert | Dealer receives and acts on orders |
| 20 | Review system: post-delivery ReviewForm, rating aggregation, dealer score update | Reviews work end-to-end |
| 21 | Notifications: SMS via Africa's Talking for all order events | SMS alerts firing correctly |

### Week 4 — Trust, Polish & Pilot Launch (Days 22–30)

| Day | Task | Output |
|---|---|---|
| 22 | Admin panel (basic): dealer verification toggle, user list, order overview | Admin can verify dealers |
| 23 | PWA setup: Workbox service worker, manifest, install prompt, offline fallback | App is installable on Android |
| 24 | Error handling pass: error boundaries, API error toasts, empty states everywhere | No unhandled crashes |
| 25 | Performance pass: lazy loading, image optimisation, bundle analysis, Lighthouse > 80 | App loads fast on 4G |
| 26 | Security pass: rate limiting, input sanitisation, Paystack webhook signature verify | Basic security hardened |
| 27 | Onboard first 5 dealers manually: visit shops, photograph, list 10 parts each | 50 real parts in the database |
| 28 | Soft launch to 20 trusted users (WhatsApp group, friends with cars) | First real user feedback |
| 29 | Bug fixes from Day 28 feedback, Sentry error review, performance hotfixes | Stable build |
| 30 | Pilot review: analytics, orders placed, dealer feedback, write Phase 2 plan | Go/no-go decision for Phase 2 |

---

## 10. Success Metrics (Pilot KPIs)

> Measure at Day 30. These determine whether to proceed to Phase 2.

| Metric | Target | Why It Matters |
|---|---|---|
| Dealers onboarded & verified | ≥ 20 | Validates supply-side willingness |
| Parts listed | ≥ 200 | Enough catalogue to test search quality |
| Unique users (buyers) | ≥ 50 | Basic demand signal |
| Parts searches completed | ≥ 100 total | Validates search utility |
| Orders placed | ≥ 5 | At least one full loop completed |
| Payment success rate | ≥ 90% | MoMo integration reliability |
| Dealer response rate | ≥ 80% within 2hr | Validates dealer engagement |
| Buyer NPS (1–10 survey) | ≥ 8 average | Trust & satisfaction signal |
| App crash rate | < 1% | Stability baseline |
| Lighthouse PWA score | > 80 | Mobile performance benchmark |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dealers refuse to list online (distrust of digital) | High | High | Do it FOR them — visit shops, photograph & upload their first 20 parts manually |
| MoMo payment failures or timeouts | Medium | High | Test all 3 networks before launch. Fallback: bank transfer + manual confirm |
| Fake or counterfeit parts listed | Medium | High | Manual verification of every dealer. Zero tolerance: instant suspension |
| Low buyer trust in new platform | High | Medium | Launch to warm network only. Display verified badge prominently. Show real photos |
| Delivery reliability (3rd party riders) | Medium | Medium | Pilot with self-coordinated delivery. Build rider network in Phase 2 |
| Single developer bottleneck | High | Medium | Strict MVP scope. No scope creep. Phase 2 features locked |
| Internet connectivity issues for users | High | Low | PWA with offline fallback. Light pages < 200KB initial load |

---

## 12. Appendix

### 12.1 Suggested Naming

- **App Name:** AutoHub Ghana
- **Domain:** `autohub.com.gh` or `autohubgh.com`
- **Social Handle:** `@autohubgh`
- **Tagline:** *"Find it. Fix it. Drive it."*

### 12.2 Repository Structure

```
autohub/
  ├── apps/
  │   ├── web/          # React JS PWA (Vite) (Frontend)
  │   └── api/          # Node.js Express server (Backend)
  ├── packages/
  │   
  │   └── utils/        # Shared utility functions
  ├── supabase/
  │   └── migrations/   # SQL migration files
  ├── .github/
  │   └── workflows/    # CI/CD GitHub Actions
  └── README.md
```

### 12.3 Phase 2 Feature Backlog (Post-Pilot)

- Mechanic & electrician booking with calendar scheduling
- Body shop directory with quote request system
- In-app real-time chat (buyer ↔ dealer)
- AutoHub Verified Parts warranty programme
- Bulk inventory CSV upload for large dealers
- Fleet management portal for car rental & transport companies
- Spare parts financing (BNPL with local fintech partner)
- AI-powered part recommendation from symptom description
- Native Android app (React Native from shared codebase)
- B2B wholesale module for mechanic bulk orders

---

> **Next Step:** Set up the GitHub monorepo and Supabase project. Run the first migration. Ship the hello-world.
>
> *The best time to start was yesterday. The second best time is now.*
