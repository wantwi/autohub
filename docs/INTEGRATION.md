AutoHub Phase 1 — Frontend Development Plan

Scope (what “Phase 1” means here)

Per AutoHub_PRD_Pilot.md, Phase 1 = the 30-day pilot, not the post-pilot backlog (§12.3). Frontend delivers:





Spare parts discovery, comparison, dealer profiles, auth (phone OTP + optional Google), vehicles, checkout (Paystack popup), buyer/dealer order UIs, reviews, PWA shell, trust UI (verified badges, ratings, empty/error states).



Excluded from frontend scope: mechanic/electrician booking, in-app chat, fleet, AI diagnosis, native apps — these are Phase 2+.

Admin panel (Day 22) is listed in the sprint as basic (dealer verify, user list, orders). Plan for a minimal separate route group (e.g. /admin/*) or defer if backend admin APIs are not ready; the PRD does not detail admin API endpoints — coordinate with API implementation.



Repository layout

Follow §12.2: monorepo with frontend at apps/web/ (Vite + React). Use JavaScript (.jsx / .js) only — no TypeScript, to match your preference (PRD §6.1 still applies for libraries; swap “React JS” as in stack table).

flowchart LR
  subgraph web [apps/web React PWA]
    Router[React Router]
    Query[TanStack Query]
    Store[Zustand auth]
    Router --> Query
    Router --> Store
  end
  API[Node API v1]
  web -->|JWT Bearer| API
  web --> Paystack[Paystack Popup]
  web --> Maps[Google Maps JS]
  web --> Cloudinary[Cloudinary Widget]



Tech stack (lock to PRD §6.1)







Area



Choice





Language



JavaScript — .jsx for React components, .js for modules (no .ts / .tsx)





Build



React 19 + Vite (JavaScript template)





State



Zustand (auth/session, UI prefs); TanStack Query (all server data)





Routing



React Router v6





Styling / UI



Tailwind + shadcn/ui





Forms



React Hook Form + Zod (works in JS; schemas as .js — optional JSDoc for shape docs)





Maps



Google Maps JS SDK (dealer location, post-order map)





PWA



vite-plugin-pwa + Workbox (Week 4; manifest + offline shell)





Uploads



Cloudinary upload widget (dealer part images)





Payments



Paystack Popup JS (VITE_PAYSTACK_PUBLIC_KEY)

Env (from §7.1): VITE_API_BASE_URL, VITE_PAYSTACK_PUBLIC_KEY, VITE_GOOGLE_MAPS_API_KEY, VITE_CLOUDINARY_CLOUD_NAME.



Frontend-backend integration (parallel work)

Another developer/agent owns the Node API while this plan covers apps/web. Treat PRD §5 API Specification as the starting contract; when implementation differs, the written contract in-repo wins after both sides agree.

Shared artifacts (pick one source of truth and keep it current):





OpenAPI 3 (openapi.yaml in repo) or INTEGRATION.md — paths, query params, request/response JSON examples, and HTTP status codes for errors.



Error envelope — e.g. { "message": "...", "code": "..." } (exact shape agreed once; frontend maps it in the API client).



Auth — JWT in Authorization: Bearer <token> (or whatever the backend issues); refresh/expiry behaviour documented.



CORS — backend allows the Vite dev origin (http://localhost:5173) and the deployed frontend URL; frontend uses only VITE_API_BASE_URL (no hardcoded hosts).

Cadence / handoffs:





Slice-based integration: For each vertical slice (auth → public search → checkout → orders → dealer CRUD → reviews), backend exposes endpoints on a shared staging base URL before or in parallel with UI; frontend switches MSW mocks off for that slice when the real API is ready.



Breaking changes: If request/response shape changes, update the contract file first, then both sides implement (avoid silent drift).



Paystack / webhooks: Frontend only needs initialize + redirect/popup + verify flow per backend design; webhook stays server-side—confirm order reference and payment reference field names with backend.

Optional but high-value: Short “integration checklist” per PR (e.g. GET /parts with sample query, POST /orders happy path) checked by both sides before marking a slice done.



Foundation (aligns with Sprint Week 1, Days 1–4 + 7)





Scaffold apps/web: Vite React + JavaScript (npm create vite@latest → React, not TypeScript), Tailwind, path aliases, ESLint/Prettier. For import.meta.env, use a small runtime guard (assert required VITE_* at startup) or optional JSDoc — no env.d.ts.



shadcn/ui: use the JavaScript init path so generated components are .jsx (not .tsx).



API client: fetch or lightweight wrapper with Authorization: Bearer <jwt>, centralized error shape → toast / boundary.



Auth flow: /login — phone → POST /auth/request-otp → OTPInput → POST /auth/verify-otp → persist JWT (memory + optional secure storage pattern); optional GoogleSignInBtn → POST /auth/google; hydrate with GET /auth/me.



Route guards: Protected layouts for buyer vs role === dealer' (redirect or onboarding if dealer profile missing).



App shell: AppShell — mobile bottom nav, tablet+ sidebar, header; consistent page padding for 375/390px (§9 Day 14).



Shared primitives early: LoadingSpinner, skeleton variants, EmptyState, ErrorBoundary, VerifiedBadge, StatusBadge (map to order statuses: pending → confirmed → dispatched → delivered → completed / cancelled).



Public & discovery (Sprint Week 2, Days 8–12)

Implement routes from §6.2:







Route



Primary API



Notes





/



GET /dealers (featured), GET /parts (optional highlights)



HeroSearch, CategoryGrid, FeaturedDealers, HowItWorks





/search



GET /parts (q, make, model, year, category, condition, sort)



SearchBar (debounced), FilterPanel, PartCard grid, sort (price, rating), <2s perceived load: skeletons + query caching





/parts/:id



GET /parts/:id, GET /parts/:id/compare



Gallery, DealerCard, OtherDealersList, OrderCTA → auth gate → checkout





/dealers



GET /dealers



DealerGrid, location filter (client or query param if API supports)





/dealers/:id



GET /dealers/:id



Banner, parts list, reviews list, map embed

Acceptance hooks: US-02 (empty state + optional local search history last 5), US-03 (compare + sort + condition + verified badge on cards).



Buyer authenticated (Sprint Week 2–3)







Route



API



Notes





/dashboard



GET /orders/me (recent), GET /users/me/vehicles



RecentOrders, vehicle widget; “SavedParts” can be localStorage MVP if no API





/profile



PUT /users/me, vehicles CRUD



VehicleManager, notification toggles (UI only if no backend)





/checkout/:partId



POST /orders, POST /payments/initialize, Paystack



Order summary, delivery type pickup vs delivery, refund policy copy (US-04 Should Have)





/orders, /orders/:id



GET /orders/me, GET /orders/:id, PATCH .../cancel



OrderTimeline, map link, WhatsApp deep link with order reference (US-05)





Post-delivery



POST /orders/:id/review



ReviewForm on order detail when status allows

Paystack: After backend returns authorization URL or inline flow per your API design, wire PaystackButton and handle return/verify (GET /payments/verify/:reference fallback if needed).



Dealer authenticated (Sprint Week 1–3)







Route



API



Notes





/dealer/dashboard



GET /dealers/me/dashboard



Stats cards, recent orders snippet





/dealer/register or wizard



POST /dealers/register



If not merged into profile onboarding





/dealer/parts



list via dealer parts endpoint pattern in PRD



Table, PATCH toggle is_available → /dealers/me/parts/:id/toggle





/dealer/parts/new, /dealer/parts/:id/edit



POST/PUT /dealers/me/parts



PartForm, ImageUploader (Cloudinary), car compatibility fields matching parts schema





/dealer/orders



GET /dealers/me/orders, confirm/dispatch/cancel



OrderActions; buyer phone revealed only after confirm (show masked until then — driven by API fields)





/dealer/profile



PUT /dealers/me



ShopForm, LocationPicker, OperatingHoursEditor (JSONB shape)

US-08: Dealer confirm/decline within 2h is backend-driven; frontend shows deadlines and disabled states appropriately.



Polish & PWA (Sprint Week 4 — frontend slice)





PWA: manifest, icons, service worker, offline fallback page (§9 Day 23).



Quality: lazy routes for heavy pages, image lazy loading, API error toasts, empty states on all list views.



A11y: shadcn defaults + focus order on OTP and checkout.



Optional: Vercel Analytics / Sentry DSN via env (§7).



Dependency order (recommended)

flowchart TD
  A[Scaffold + API client + auth] --> B[AppShell + shared components]
  B --> C[Public search + part detail + compare]
  C --> D[Dealer public pages]
  B --> E[Dealer CRUD parts + dashboard]
  C --> F[Checkout + Paystack]
  F --> G[Buyer orders + timeline + delivery UI]
  E --> G
  G --> H[Reviews]
  H --> I[PWA + perf + error pass]

Backend must expose endpoints in §5 in step with each slice; use MSW or static JSON only when the real API is not ready yet—agree with the backend owner (see Frontend-backend integration (parallel work)). Prefer short joint smoke tests on staging when each slice lands.



Testing strategy (lightweight for pilot)





Vitest + React Testing Library (.test.jsx / .spec.js) for OTPInput, SearchBar debounce, StatusBadge, form validation.



Playwright (optional) for critical path: login → search → part detail → checkout (can stub Paystack in test env).



Risks / decisions to align early





Contract drift: Frontend and backend implemented in parallel without an updated OpenAPI/INTEGRATION.md → runtime bugs and rework. Mitigation: single contract file + slice smoke checks with the backend owner.



Admin UI: No REST table in PRD for /admin — confirm endpoints with backend or use Supabase dashboard for pilot.



Order vs Paystack flow: Confirm whether POST /orders creates draft and payment initializes with order id, or payment-first; drives checkout state machine (joint decision).



Google OAuth: “Should Have” for US-01 — ship after OTP path works.



AutoHub Pilot (Phase 1) — Backend Development Plan

Scope: what “Phase 1” means here

The PRD does not use the label “Phase 1” explicitly; it describes a 30-day pilot with a clear boundary:





In scope (backend-relevant): spare parts listings, multi-dealer comparison signals, dealer profiles and verification, part search by make/model/year, MoMo/card payment via Paystack, order lifecycle, dealer dashboard data, delivery as map + WhatsApp (mostly frontend; backend stores delivery_type, address, references).



Out of scope (Phase 2+): mechanic booking, body shop directory, in-app chat, insurance, fleet, native apps, AI diagnosis, own logistics, bulk CSV (nice-to-have only).

This plan covers only the API, database, and integrations needed for that pilot—not the React PWA. Another contributor is building the React PWA in parallel; seamless integration depends on a shared, explicit API contract and agreed runtime config (see Frontend–backend coordination below).

PRD inconsistency to resolve early: the header stack lists “FastAPI” but AutoHub_PRD_Pilot.md §5 specifies Node.js / Express and the sprint uses Railway Node. Decision for this plan: implement Phase 1 as Express + JavaScript (.js files—prefer ES modules "type": "module" in package.json unless you need CommonJS). Optional JSDoc on params/returns for editor hints; no TypeScript compile step. Unless you explicitly want FastAPI, keep Express to match §5 and §12.2 (apps/api).



Repository layout (from PRD §12.2)





[apps/api](apps/api) — Express server, routes, services, config



[supabase/migrations](supabase/migrations) — SQL migrations (source of truth for schema)



Optional: [packages/utils](packages/utils) — shared constants/helpers later; not required for minimal pilot



Integration artifact (repo root or apps/api/docs): maintain OpenAPI 3 (openapi.yaml) or a single docs/API_CONTRACT.md updated whenever request/response shapes change—so the frontend agent can generate types or hand-wire fetch/TanStack Query without guesswork.



Frontend–backend coordination (parallel work)

Backend and frontend should treat AutoHub_PRD_Pilot.md §5 as the source of paths and verbs, and lock the following so both agents stay in sync:







Topic



Agreement





Base URL



Same as PRD frontend env: VITE_API_BASE_URL → e.g. https://<host>/v1 (trailing slash policy documented once).





Auth



Authorization: Bearer <access_token> on protected routes; document JWT expiry and whether refresh tokens exist (PRD mentions logout—define behavior).





JSON conventions



Field naming: camelCase in JSON (map from snake_case in DB in the API layer) or stick to DB names everywhere—pick one and document in the contract file.





Success envelope



Prefer consistent shape, e.g. { "data": ... } for resources and { "data": [...], "meta": { "page", "total" } } for lists—or raw PRD-style objects if simpler; do not change without bumping contract version.





Errors



Single shape, e.g. { "error": { "code", "message", "details?" } } with stable code values for 401/403/404/422; HTTP status matches REST usage.





CORS



Allow the Vercel preview + production web origins; allow Authorization and Content-Type headers; credentials if cookies are ever used (pilot likely Bearer-only).





Paystack



Frontend uses public key + redirect/popup; backend owns POST /payments/initialize response fields (e.g. authorization_url, reference)—document exact keys the UI must read.





Webhooks



Server-to-server only; frontend never calls Paystack webhook URL. Document order reference vs Paystack reference if both exist.





Change control



Any new query param, renamed field, or stricter validation → update OpenAPI/API_CONTRACT.md and notify the other side (commit message or short CHANGELOG_API.md entry).

Optional but high leverage: a shared Postman/Insomnia collection or .http examples in apps/api for the frontend agent to replay the same flows (OTP, search, checkout).



1. Database (Supabase / PostgreSQL)

Deliverable: migrations matching §4.2, plus one gap fix.







Area



Action





Core tables



users, vehicles, dealers, parts, orders, reviews as defined in the PRD





ER vs DDL gap



§4.1 mentions orders → order_status_history; add order_status_history (or equivalent) so status transitions are auditable for “timeline” and support





Indexes



Composite indexes for search: e.g. parts on (is_available, condition, category), GIN for text/array fields as needed, dealers(is_verified) for public lists





Constraints



Enforce orders.status and payment_status via CHECK or enum types; parts.condition enum





Triggers



updated_at on users, parts, orders; optional trigger to maintain dealers.rating_avg / rating_count from reviews

Auth storage: Either map JWT to Supabase Auth or use custom OTP + JWT with users as in the PRD (Africa’s Talking for OTP). The PRD §5 implies a custom /auth/request-otp and /auth/verify-otp flow; plan for a small otp_codes table (hashed code, expiry, attempt limits) unless you adopt Supabase Phone Auth end-to-end (would change endpoint contracts).



2. API surface (Express) — map to PRD §5

Implement versioned router under /v1 with JSON and consistent error shape.

flowchart LR
  subgraph clients [Clients]
    PWA[React_PWA]
    Paystack[Paystack]
  end
  subgraph api [apps_api]
    Auth[Auth]
    Users[Users_Vehicles]
    Dealers[Dealers]
    Parts[Parts]
    Orders[Orders]
    Pay[Payments]
  end
  subgraph external [External]
    AT[Africas_Talking_SMS]
    PS[Paystack_API]
    DB[(PostgreSQL)]
  end
  PWA --> Auth
  PWA --> Users
  PWA --> Dealers
  PWA --> Parts
  PWA --> Orders
  PWA --> Pay
  Paystack --> Pay
  Auth --> AT
  Auth --> DB
  Users --> DB
  Dealers --> DB
  Parts --> DB
  Orders --> DB
  Pay --> PS
  Pay --> DB

Priority order for implementation:





Health + config — /health, env validation (§7.1 vars: DATABASE_URL, Paystack, Africa’s Talking, optional Resend, JWT secret).



Auth — POST /auth/request-otp, POST /auth/verify-otp (issue access JWT; optional refresh if you want logout to mean something), GET /auth/me, POST /auth/logout, optional POST /auth/google.



Users & vehicles — PUT /users/me, vehicle CRUD under /users/me/vehicles.



Dealers — POST /dealers/register, public GET /dealers, GET /dealers/:id, PUT /dealers/me, GET /dealers/me/dashboard (aggregate queries), PATCH /dealers/:id/verify (admin).



Parts — dealer CRUD + toggle; public GET /parts (query: q, make, model, year, category, condition, sort), GET /parts/:id, GET /parts/:id/compare (same part across dealers: define matching rule—e.g. normalized name + category + overlapping compatibility, or explicit part_number when present).



Orders — POST /orders (create pending order, snapshot unit_price/total_amount), GET /orders/me, GET /orders/:id, GET /dealers/me/orders, transitions: confirm, dispatch, cancel; append order_status_history; enforce buyer phone hidden from dealer until confirmed (field-level rules in serializers).



Payments — POST /payments/initialize (Paystack initialize with metadata: order_id, reference), POST /payments/webhook (HMAC verify, idempotent update of orders.payment_status / paid_at / paystack_ref), GET /payments/verify/:reference fallback.



Reviews — POST /orders/:id/review (one per order, only after eligible status e.g. delivered/completed), update dealer aggregates.

Middleware: JWT auth, role checks (buyer | dealer | admin), request logging, rate limiting on /auth/* and webhooks as in Week 4 security pass (can land incrementally).



3. Cross-cutting rules (from PRD trust §8)







Rule



Backend behavior





Escrow narrative



Model payment held as payment_status = paid + order pending until dealer confirms; actual payout to dealers is manual/ops for pilot unless you integrate Paystack Transfer—document as out-of-code or follow-up.





2-hour confirm window



Optional cron or lazy check on read: auto-cancel pending + paid orders past deadline (PRD US-08).





SMS



Africa’s Talking on key events (order placed, paid, confirmed)—thin notification service called from order/payment handlers.





Email



Resend for order confirmation (optional if SMS is primary for pilot).



4. Testing and quality





Unit tests: payment signature verification, OTP validation, price snapshot on order create, role guards.



Integration tests: against a test DB or Testcontainers (if budget allows); at minimum manual + Postman/Thunder collection for pilot.



Webhook testing: Paystack test keys + tunnel (ngrok) for local webhook.



5. Deployment (pilot)





Host apps/api on Railway (or equivalent) per PRD §7.



Point DATABASE_URL at Supabase; run migrations from CI or documented manual step.



Store secrets in platform env; never commit .env.



6. Deliverables checklist (Phase 1 backend “done”)





All §5 endpoints implemented with auth and validation



Migrations applied; seed script for demo dealers/parts/orders (aligns with sprint Day 2)



Paystack initialize + webhook path verified with test transactions



OTP flow working with Africa’s Talking (or documented stub for dev)



Admin can verify dealers via PATCH /dealers/:id/verify



Basic README for apps/api: env vars, run, migrate, webhook URL



OpenAPI 3 or docs/API_CONTRACT.md kept in sync with implemented endpoints; CORS matches deployed frontend URL(s)



Out of scope for this backend plan (Phase 2+)

Mechanic/electrician booking, in-app chat, fleet, AI recommendations, bulk CSV import, native apps, and automatic dealer payouts—unless you explicitly add them to Phase 1.