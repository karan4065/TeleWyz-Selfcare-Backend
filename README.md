# TeleWyz E-Care — Backend Platform

Production-ready backend for the **TeleWyz E-Care Telecom Self-Care Platform**, architected based on the Optiva E-Care Technical High-Level Design and Business Framework.

---

## 1. Technology Stack

- **Runtime & Language:** Node.js v20+ with TypeScript (Strict mode)
- **Web Framework:** Express.js (Modular Controllers, Services, Repositories)
- **Authentication:** Dual-tier — **Firebase Authentication** (Firebase Admin SDK) + Telecom MSISDN OTP & Central IAM JWT tokens
- **Database:** **PostgreSQL** with **Prisma ORM** (dual-mode: production connection pool + fast in-memory repository fallback)
- **Caching & Rate Limiting:** **Redis** (`ioredis`) with transparent in-memory fallback
- **Validation:** **Zod** schema-first validation for bodies, queries, and params
- **Logging & Tracing:** **Pino** structured logger with correlation IDs (`x-correlation-id`) and automatic sensitive data redaction (PII, OTPs, tokens, CVVs)
- **Documentation:** **OpenAPI 3.0 / Swagger UI** mounted at `/api-docs` and `/api/v1/docs`
- **Testing:** **Jest + Supertest** (136 automated tests across 12 test suites with 100% pass rate)

---

## 2. Project Folder Structure

```
d:\internship project(app )
├── prisma/
│   └── schema.prisma              # Normalized PostgreSQL schema (Subscribers, Sessions, OTP, Orders, etc.)
├── src/
│   ├── config/                    # Zod-validated environment config
│   ├── core/                      # Correlation context, Pino logger, error hierarchy, standard response
│   ├── database/                  # Prisma singleton, Redis cache service with memory fallback
│   ├── docs/                      # Complete OpenAPI 3.0 specification
│   ├── integrations/              # 12 isolated external system adapters
│   │   ├── bss/                   # Optiva EPC / BSS balance, usage, and provisioning adapter
│   │   ├── iam/                   # Central IAM & Firebase Auth adapter
│   │   ├── payment/               # Payment gateway & verification adapter
│   │   ├── kyc/                   # NIMC / NCC biometric KYC adapter
│   │   ├── sms/                   # SMS gateway adapter
│   │   ├── smtp/                  # SMTP email adapter
│   │   ├── push/                  # Firebase FCM push notification adapter
│   │   ├── logistics/             # Courier dispatch & tracking adapter
│   │   ├── dmp/                   # Dealer Management Platform adapter
│   │   ├── cvm/                   # Customer Value Management adapter
│   │   ├── community/             # Community portal / customer support adapter
│   │   └── dwh/                   # Data Warehouse event export adapter
│   ├── jobs/                      # Background schedulers (reservation expiry, OTP purging)
│   ├── middleware/                # 15 required middleware layers
│   ├── modules/                   # Core business domain modules
│   │   ├── auth/                  # MSISDN login, OTP lifecycle, Firebase sync, sessions, RBAC
│   │   ├── subscriber/            # Profiles, usage queries, associated accounts, account switching
│   │   ├── dashboard/             # Aggregated dashboard backed by authoritative BSS data
│   │   ├── catalogue/             # Plans, add-on bundles, CVM offers, subscriptions
│   │   ├── reservation/           # Number search, availability, concurrency lock & hold timers
│   │   ├── sim/                   # Physical SIM & eSIM purchase, NIMC KYC, BSS activation
│   │   ├── mnp/                   # Mobile number portability eligibility, submission & tracking
│   │   ├── payment/               # Airtime/data recharge, postpaid bill settlement, webhooks
│   │   ├── orders/                # Unified orders, state transitions & 6-month historical ledger
│   │   ├── notifications/         # Non-blocking async notification queue
│   │   └── additional/            # Loyalty rewards, store locator, coverage checker, admin metrics
│   ├── app.ts                     # Express pipeline & route orchestration
│   └── server.ts                  # Server entry point & graceful shutdown
├── tests/                         # 12 test suites covering foundation, modules, and 10 E2E workflows
├── .env.example                   # Safe environment template
├── package.json
└── tsconfig.json
```

---

## 3. Required Middleware Implementation (15 Layers)

1. **Correlation ID Middleware:** Injects or propagates `x-correlation-id` and binds execution to `AsyncLocalStorage`.
2. **Security Headers Middleware:** Powered by `helmet` with strict CSP, HSTS, no-sniff, and frameguard.
3. **CORS Middleware:** Environment-specific origin filtering.
4. **Request Body Size Limits:** Strict 1MB limits for JSON and URL-encoded bodies.
5. **Structured Request Logging Middleware:** Logs method, URL, status code, latency, IP, correlation ID using Pino; redacts all credentials, OTPs, and PANs.
6. **Maintenance Mode Middleware:** Returns `503 Service Unavailable` when maintenance window is enabled (health check routes exempt).
7. **Rate Limiting Middleware:** Token bucket rate limiter backed by Redis/memory store.
8. **Authentication Middleware:** Validates Firebase Auth ID tokens or TeleWyz JWTs; populates `req.user`.
9. **Role-Based Authorization Middleware:** Enforces `SUBSCRIBER`, `AGENT`, `ADMIN` permissions on protected routes.
10. **Request Validation Middleware:** Generic Zod middleware validating `body`, `query`, and `params`.
11. **Idempotency Middleware:** Enforces `Idempotency-Key` on financial and provisioning mutations; replays cached responses on duplicates.
12. **Webhook Signature Verification Middleware:** Raw HMAC-SHA256 signature verification for payment callbacks.
13. **Audit Logging Middleware:** Emits audit logs for sensitive security, account, and financial operations.
14. **404 Route Handler:** Standardized JSON 404 response for unmatched routes.
15. **Global Error Handler:** Centralized exception handling preventing internal stack trace exposure.

---

## 4. Complete API Inventory (`/api/v1`)

| Module | Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health`, `/api/v1/health` | Health probe & service connectivity | Public |
| **Docs** | `GET` | `/api-docs`, `/api/v1/docs` | Interactive Swagger UI | Public |
| **Docs** | `GET` | `/api/v1/docs.json` | Raw OpenAPI 3.0 spec | Public |
| **Auth** | `POST` | `/api/v1/auth/otp/send` | Request OTP for MSISDN login | Public (Rate Limited) |
| **Auth** | `POST` | `/api/v1/auth/otp/verify` | Verify OTP & receive JWT / session | Public (Rate Limited) |
| **Auth** | `POST` | `/api/v1/auth/otp/resend` | Resend OTP with cooldown | Public (Rate Limited) |
| **Auth** | `POST` | `/api/v1/auth/firebase-login` | Authenticate via Firebase ID token | Public |
| **Auth** | `POST` | `/api/v1/auth/refresh` | Refresh access token using session | Public |
| **Auth** | `POST` | `/api/v1/auth/logout` | Revoke active session | Bearer JWT |
| **Auth** | `GET` | `/api/v1/auth/sessions` | List active subscriber devices/sessions | Bearer JWT |
| **Auth** | `DELETE`| `/api/v1/auth/sessions/:id` | Revoke specific session | Bearer JWT |
| **Dashboard** | `GET` | `/api/v1/dashboard` | Aggregated dashboard snapshot (BSS balances, usage) | Bearer JWT |
| **Subscriber**| `GET` | `/api/v1/subscriber/profile` | Retrieve subscriber profile & BSS balance | Bearer JWT |
| **Subscriber**| `PATCH`| `/api/v1/subscriber/profile` | Update contact information | Bearer JWT |
| **Subscriber**| `GET` | `/api/v1/subscriber/usage` | Authoritative telecom usage meters (Data, Voice, SMS)| Bearer JWT |
| **Subscriber**| `GET` | `/api/v1/subscriber/associated-accounts` | List linked secondary numbers | Bearer JWT |
| **Subscriber**| `POST` | `/api/v1/subscriber/associated-accounts/link` | Initiate secondary MSISDN link (dispatches OTP) | Bearer JWT |
| **Subscriber**| `POST` | `/api/v1/subscriber/associated-accounts/verify` | Confirm secondary MSISDN link with OTP | Bearer JWT |
| **Subscriber**| `DELETE`| `/api/v1/subscriber/associated-accounts/:id`| Delink secondary account | Bearer JWT |
| **Subscriber**| `POST` | `/api/v1/subscriber/switch-account` | Switch active account context to linked number | Bearer JWT |
| **Catalogue** | `GET` | `/api/v1/catalogue/plans` | List available plans (Prepaid & Postpaid) | Public |
| **Catalogue** | `GET` | `/api/v1/catalogue/plans/:id` | Detailed plan specifications | Public |
| **Catalogue** | `GET` | `/api/v1/catalogue/packages` | List add-on data/voice booster bundles | Public |
| **Catalogue** | `GET` | `/api/v1/catalogue/offers` | Personalized eligible CVM promotional offers | Bearer JWT |
| **Catalogue** | `POST` | `/api/v1/catalogue/subscribe` | Subscribe to plan/bundle (verified against BSS) | Bearer JWT |
| **Catalogue** | `POST` | `/api/v1/catalogue/unsubscribe`| Unsubscribe from active bundle | Bearer JWT |
| **Catalogue** | `GET` | `/api/v1/catalogue/subscriptions` | Subscription history | Bearer JWT |
| **Numbers** | `GET` | `/api/v1/numbers/search` | Search available numbers by category/pattern | Public |
| **Numbers** | `GET` | `/api/v1/numbers/:msisdn/check` | Check individual MSISDN availability | Public |
| **Numbers** | `POST` | `/api/v1/numbers/reserve` | Reserve number with 15-minute hold timer | Optional / Bearer |
| **Numbers** | `POST` | `/api/v1/numbers/reservations/:id/cancel` | Cancel number reservation & release back to pool | Optional / Bearer |
| **Numbers** | `GET` | `/api/v1/numbers/reservations` | View user reservations | Optional / Bearer |
| **SIM** | `POST` | `/api/v1/sim/order` | Order Physical SIM (courier) or eSIM (QR profile) | Optional / Bearer |
| **SIM** | `GET` | `/api/v1/sim/order/:orderId` | Query SIM order status & dispatch info | Public |
| **SIM** | `POST` | `/api/v1/sim/kyc/verify` | Submit NIMC / NCC biometric KYC verification | Public |
| **SIM** | `POST` | `/api/v1/sim/activate` | Provision SIM on network HLR via BSS | Public |
| **SIM** | `GET` | `/api/v1/sim/activation-status/:msisdn` | Query network provisioning status | Public |
| **SIM** | `POST` | `/api/v1/sim/replace` | Request SIM replacement | Bearer JWT |
| **MNP** | `POST` | `/api/v1/mnp/validate` | Check porting eligibility on donor network | Public |
| **MNP** | `POST` | `/api/v1/mnp/request` | Submit MNP port-in request | Public |
| **MNP** | `GET` | `/api/v1/mnp/status/:id` | Track clearinghouse execution status | Public |
| **MNP** | `POST` | `/api/v1/mnp/:id/cancel` | Cancel pending port-in request | Public |
| **Payments** | `GET` | `/api/v1/payments/recharge-catalogue` | Predefined airtime and data vouchers | Public |
| **Payments** | `POST` | `/api/v1/payments/recharge` | Initiate airtime/data recharge | Optional / Idempotent |
| **Payments** | `GET` | `/api/v1/payments/bills/current` | Current postpaid invoice breakdown & due date | Bearer / Query |
| **Payments** | `POST` | `/api/v1/payments/bills/pay` | Settle postpaid bill | Optional / Idempotent |
| **Payments** | `GET` | `/api/v1/payments/verify/:txId` | Direct authoritative verification with payment provider | Public |
| **Payments** | `POST` | `/api/v1/payments/webhook` | Payment callback webhook (HMAC verified) | Webhook Signature |
| **Payments** | `GET` | `/api/v1/payments/history` | Payment transaction history | Bearer / Query |
| **Orders** | `POST` | `/api/v1/orders` | Create unified order | Optional / Bearer |
| **Orders** | `GET` | `/api/v1/orders` | List subscriber orders (paginated) | Bearer JWT |
| **Orders** | `GET` | `/api/v1/orders/:orderId` | Order details & tracking timeline | Optional / Bearer |
| **Orders** | `PATCH`| `/api/v1/orders/:orderId/status` | Update order state (AGENT/ADMIN only) | AGENT / ADMIN |
| **Orders** | `GET` | `/api/v1/orders/history/six-month`| 6-month historical activity ledger | Bearer JWT |
| **Notifications**| `GET`| `/api/v1/notifications/history` | Notification delivery logs | Bearer / Query |
| **Services** | `GET` | `/api/v1/services/stores` | Dealer store locator & addresses | Public |
| **Services** | `GET` | `/api/v1/services/coverage` | Network coverage checker (4G / 5G / Broadband) | Public |
| **Services** | `POST` | `/api/v1/services/support/tickets` | Submit customer support / complaint ticket | Optional / Bearer |
| **Services** | `GET` | `/api/v1/services/support/tickets/:id`| Query support ticket status & updates | Public |
| **Services** | `GET` | `/api/v1/services/loyalty` | Loyalty points balance & rewards catalog | Bearer JWT |
| **Services** | `POST` | `/api/v1/services/loyalty/redeem`| Redeem points for airtime/data bonus | Bearer JWT |
| **Services** | `GET` | `/api/v1/services/admin/metrics` | Real-time operational platform telemetry | ADMIN Role Only |

---

## 5. Verification & Test Report

All 12 test suites passed successfully with **zero errors and zero unhandled rejections**:

| Test Suite | Focus Area | Tests Passed | Status |
| :--- | :--- | :--- | :--- |
| `tests/foundation.test.ts` | 15 Middlewares, Health Probes, Rate Limiting, Idempotency | 14 / 14 | ✅ PASS |
| `tests/auth.test.ts` | OTP Lifecycle, Firebase Auth, Session Revocation, Token Refresh | 14 / 14 | ✅ PASS |
| `tests/integrations.test.ts` | 12 External Integration Adapters (BSS, Payment, KYC, SMS, etc.) | 20 / 20 | ✅ PASS |
| `tests/subscriber_dashboard.test.ts` | Subscriber Profile, Usage Queries, Linked Accounts, Dashboard | 14 / 14 | ✅ PASS |
| `tests/catalogue.test.ts` | Product Plans, Add-On Bundles, CVM Offers, Subscriptions | 13 / 13 | ✅ PASS |
| `tests/reservation_sim.test.ts`| Concurrency Locks, Number Reservation, Physical/eSIM, KYC | 13 / 13 | ✅ PASS |
| `tests/mnp.test.ts` | Mobile Number Portability Eligibility, Submission & Tracking | 6 / 6 | ✅ PASS |
| `tests/payment.test.ts` | Recharges, Postpaid Invoices, Payment Verification, Webhooks | 10 / 10 | ✅ PASS |
| `tests/orders.test.ts` | Unified Orders, State Machine Transitions, 6-Month Ledger | 6 / 6 | ✅ PASS |
| `tests/notifications_jobs.test.ts`| Non-Blocking Async Notification Queue & Background Schedulers | 7 / 7 | ✅ PASS |
| `tests/additional_services.test.ts`| Loyalty Rewards, Store Locator, Coverage, Support Tickets, Admin Telemetry | 9 / 9 | ✅ PASS |
| `tests/e2e_workflows.test.ts` | 10 Critical Telecom Business Workflows End-to-End | 10 / 10 | ✅ PASS |
| **TOTAL** | **Full System Test Suite** | **136 / 136** | **✅ 100% PASS** |

---

## 6. How to Run Locally

### Prerequisites
- Node.js v20.x or higher
- npm v10.x or higher

### Installation
```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Configure environment
cp .env.example .env
```

### Running Tests
```bash
npm test
```

### Starting Development Server
```bash
npm run dev
```

### Production Build & Run
```bash
npm run build
npm start
```

---

## 7. Interactive API Documentation
Once the server is running, explore the interactive Swagger documentation at:
- **Swagger UI:** `http://localhost:3000/api-docs` or `http://localhost:3000/api/v1/docs`
- **Raw OpenAPI 3.0 Spec:** `http://localhost:3000/api/v1/docs.json`

