# Verifi Auto API

Separate Node.js 22.12+ / Express 5 / strict TypeScript API using Prisma 7 and PostgreSQL. No browser-local demo data is imported or trusted. Roles come from the authenticated database account, never the browser's role picker.


## After pulling a schema-changing feature (local development)
A running API process does not automatically reload the generated Prisma Client.
If the browser reports `GET /api/professionals 500` and the API logs `PrismaClientValidationError` after adding fields such as `Professional.roadsideAvailable`, stop the API and run these commands **inside `backend/`**:

```sh
npm run db:generate
npm run db:migrate
npm run typecheck
npm run dev
```

`db:generate` updates the ignored `src/generated/prisma/` directory. `db:migrate` safely applies committed pending migrations to the database configured by `DATABASE_URL`; it does not reset existing data. For verification use `npx prisma migrate status`, and then request `http://localhost:3001/api/professionals?take=100` to confirm an HTTP 200 JSON response.

If Prisma reports `P2022` (missing database column), confirm the local API points to the intended database and that `db:migrate` completed there. Do not use `prisma migrate reset` to troubleshoot an existing database. A generic `PrismaClientValidationError` can have other causes: check the safe `hint` in development API logs before changing any schema.

## Run locally

1. Install dependencies: `npm ci` inside `backend/`.
2. Copy `.env.example` to `.env`. Keep it out of Git. Use a PostgreSQL connection string belonging to your own environment.
3. For a disposable local database: `docker compose up -d` in this directory. The bundled password is for local development only; the port is bound to localhost.
4. Run `npm run db:generate`, then `npm run db:migrate`.
5. Configure SMTP to send verification and recovery emails. Delivery uses a durable database outbox and retries failures. Without SMTP, messages stay queued; the server never pretends they were delivered.
6. Run `npm run dev`. Health: `GET /health`; database readiness: `GET /ready`.
7. In `frontend/.env`, set `VITE_API_URL=http://localhost:3001`, install frontend dependencies and run `npm run dev` there. Removing this variable restores the separate existing demo.
8. Register a customer and mechanic with separate real email addresses; verify both. An operator creates the first administrator using `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` environment values and `npm run admin:create`. Remove `ADMIN_PASSWORD` afterward. There is no public admin registration or default admin password.

Use a local SMTP inbox such as Mailpit during development. Never log verification or recovery tokens. Development test payments require an explicit `ENABLE_TEST_PAYMENTS=true`; the server refuses this setting in production.

## Structure

- `src/app.ts`: HTTP composition, CORS, origin checks, security headers and error handling.
- `src/config/`: validated server environment.
- `src/middleware/`: authentication, CSRF, role/verification checks and database-backed rate limits.
- `src/modules/auth/`: registration, sessions, email verification, password recovery and profile.
- `src/modules/vehicles/`: owner-only vehicles, service history and verified model matching.
- `src/modules/professionals/`: public directory, business applications and private evidence.
- `src/modules/bookings/`: appointments, state transitions, independent quotations, approvals, messages, access grants and reviews. Services own transactions; routes validate HTTP input and select the authenticated actor.
- `src/modules/notifications/`: durable notifications and authenticated SSE.
- `src/modules/admin/`: review decisions, user status, audit activity and verified vehicle assets.
- `src/lib/`: Prisma, serializable transactions, password hashing, events, mail and validation.
- `prisma/`: schema plus committed SQL migration, foreign keys, unique indexes and check constraints.
- `tests/api.test.ts`: HTTP + Prisma + PostgreSQL-engine integration tests.

## Rules implemented

- Passwords: at least 8 characters including a number as requested, maximum 128; no truncation. Scrypt uses a random salt, N=131072, r=8, p=1. Prefer long, unique passphrases. MFA is not yet implemented.
- Emails: validated, normalised lowercase, unique; verification links expire after 24 hours. Recovery tokens expire after 30 minutes and are single use. Password changes/recovery revoke all sessions.
- Sessions: random opaque cookie, hash stored server-side, HttpOnly, SameSite=Lax; Secure + `__Host-` prefix in production. No auth tokens in localStorage. CSRF header and exact Origin required for every mutation. GET responses are not cached.
- Customers see their own vehicles/bookings/messages/payments; mechanics see only assigned bookings. Unrelated resource IDs return 404. A composite vehicle/owner foreign key also prevents bookings using somebody else's car.
- Admin access is explicit. Sensitive review/account actions and job changes have an audit trail. An admin does not become a customer or mechanic to approve work or simulate payment.
- Only approved, enabled professionals appear in the directory or accept new appointments. Changing business details requires review again.
- Evidence is private, limited to ten files per mechanic, 5 MB/file, PDF/JPEG/PNG signatures checked, attachment-only authenticated downloads. Bytes are currently stored in PostgreSQL; object-storage migration and malware scanning are required before large-scale onboarding.
- Multiple independent quotes per booking; each has its own version, lines, approval, immutable revision snapshots and payment. Customer selection changes are allowed before payment/work starts. Totals use integer cents, are calculated on the server and cannot be supplied by customers.
- Payments are **not connected to a PSP**. Production checkout returns `PAYMENTS_NOT_CONFIGURED`. A browser cannot mark a real quote paid. Development-only test transactions are labelled TEST and excluded from real revenue.
- Booking creation, quote creation and messages have idempotency keys. Serializable transactions and expected versions protect conflicting writes. Unique payment-per-quote and service-record-per-booking constraints prevent duplicates.
- Selected service records can be shared with the assigned professional for up to 30 days; grants are revoked at completion/cancellation/rejection. No grant means no earlier service history access.
- Notifications commit in the same transaction as business changes. SSE checks the session every poll, uses recipient-scoped durable IDs, resumes via Last-Event-ID and heartbeats, and works across API processes by reading PostgreSQL. It is near-real-time (up to roughly two seconds), not background browser push.
- A vehicle gets a 3D asset only when one licensed, operator-verified make/model/year-range/variant match exists. Ambiguity or no match returns `modelMatch: unavailable`; it never substitutes a concept car. No model assets or external catalogue subscription are bundled.

## Tests

```sh
npm run typecheck
npm test
npm run build
```

Without `TEST_DATABASE_URL`, the tests use disposable PGlite (the PostgreSQL engine compiled to WASM) through a PostgreSQL socket, with the committed migration and real Prisma queries. This does not prove production connection-pool or transaction-concurrency behavior. For ordinary PostgreSQL, set `TEST_DATABASE_URL` to an **empty disposable database whose name ends in `_test`**. The test creates its schema and fixtures. GitHub Actions includes PostgreSQL 17 for this mode. Never point this at real data.

Coverage includes separate-account isolation, CSRF/origin checks, email verification, private documents, admin-only decisions, stale quotation approvals, independent quote payments, immutable paid quotes, exact totals, service-record creation, grant/revocation, notification recipient isolation, actual SSE delivery, password-reset replay/session invalidation and rate limits.

## Deploy safely

Use a long-running Node service and managed PostgreSQL. Deploy the frontend and API on the same site, for example `www.your-domain.co.za` and `api.your-domain.co.za`, or proxy `/api` to the API. SameSite=Lax cookies intentionally do not support unrelated frontend/backend sites. Native EventSource must include credentials, and the reverse proxy must allow streaming without buffering and allow a long-lived connection.

- Set `NODE_ENV=production`, `COOKIE_SECURE=true`, exact HTTPS `WEB_ORIGIN`, database URL and SMTP secrets in the hosting secret manager.
- Set `TRUST_PROXY_HOPS` only to the actual trusted proxy count. Do not blindly trust all proxy headers.
- Use TLS with certificate verification for the hosted database; never disable certificate verification to work around a connection error.
- Run `npm ci`, `npm run build`, then `npm run db:migrate` as the controlled release step and `npm start`. The Docker runtime image does not contain Prisma CLI; migrations run from the build/release environment.
- Never run `prisma db push`, `migrate reset`, or demo seeds against production.
- The application DB role should have only required schema/data permissions. Run migrations with a separate migration role where the provider permits. Browsers never connect to PostgreSQL. API ownership checks are implemented; PostgreSQL row-level-security policies are not claimed here.
- Enable automated backups, point-in-time recovery and a tested restore procedure with your host.

## Remaining launch gates

The code is a backend implementation, not a claim that production is live. Supply a managed database/service and SMTP configuration. Select and implement the PSP checkout + verified webhook + reconciliation/refund flow before taking money; decide commission separately. Contract a licensed vehicle asset source before promising exact model coverage. Finalise professional verification criteria (identity and qualification evidence are the initial policy), malware scanning, file retention, monitoring/alerting, admin MFA and user-facing privacy/retention rules. Test the database-backed UI on real mobile browsers and the ordinary PostgreSQL CI job before switching production out of demo mode. Banking details, disputes, service plans, push delivery and the full existing analytics/chart presentation need their own production integration; they are not silently emulated with demo data.
