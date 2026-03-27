# API changelog

All notable changes to the HTTP API should be recorded here (and reflected in `docs/API_CONTRACT.md`).

## 2026-03-23 — Phase 1 pilot baseline

- Initial `/v1` Express API: auth (OTP, Google, JWT, logout), users/vehicles, dealers, parts, orders, payments (Paystack initialize, verify, webhook).
- Pilot extension: `PATCH /orders/:id/delivered` for dealer after dispatch.
