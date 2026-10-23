# API contract — initial connected release

Base `/api`. JSON requests; successful bodies are resources or `{message}`. Errors: `{error:{code,message,fields?,requestId}}`. Do not show success until the mutation resolves. No client-supplied owner/role/paid fields. All mutations require the exact configured `Origin`; authenticated mutations also require `X-CSRF-Token`, obtained at login or `/auth/session`. Cookies are sent with `credentials: include`.

| Area | Endpoint | Rules |
| --- | --- | --- |
| Register | POST `/auth/register` | `{name,email,password,role:CUSTOMER\|MECHANIC}`; generic 202, verification email |
| Sign in | POST `/auth/login` | `{email,password}` → `{user,csrf}` plus HttpOnly session cookie |
| Session | GET `/auth/session` | Safe account fields and per-session CSRF token |
| Sign out | POST `/auth/logout` | Revoke current session |
| Recovery | POST `/auth/forgot`, `/auth/reset`, `/auth/verify` | Email request; token + password reset; token verification |
| Account | PATCH `/auth/profile`, POST `/auth/password` | Own name/phone; current + new password |
| Directory | GET `/professionals`, `/professionals/:id` | Approved professionals only; city/service/type, take/cursor |
| Business | GET/PATCH `/professional/me`, POST `/professional/me/submit` | Mechanic-owned; profile changes need review |
| Evidence | GET/POST `/documents`, GET/DELETE `/documents/:id` | Multipart `{kind,file}` upload, owner/admin-only download |
| Customer overview | GET `/customer/overview` | Verified customer only; database counts and two recent bookings scoped to the signed-in account |
| Garage | GET/POST `/vehicles`, GET/PATCH/DELETE `/vehicles/:id` | Owner only; delete archives; PATCH requires version |
| Bookings | GET/POST `/bookings`, GET `/bookings/:id` | Participants only; create requires own active vehicle and approved professional |
| Job state | POST `/bookings/:id/actions` | `{action,version,reason?,completionNotes?}`; accept/reject/cancel/start/complete |
| Quotes | POST `/bookings/:id/quotes`, PUT `/bookings/:id/quotes/:quoteId` | Assigned mechanic; server-generated IDs/numbers; PUT requires version |
| Approval | POST `/bookings/:id/quotes/:quoteId/actions` | `{action,version,selectedLineIds?,request?}`; approve/changes/withdraw/start |
| Checkout | POST `/bookings/:id/quotes/:quoteId/checkout` | Currently 503; no PSP connected |
| Test payment | POST `/bookings/:id/quotes/:quoteId/test-payment` | Explicit development flag only, never mounted in production |
| Invoice | GET `/bookings/:id/quotes/:quoteId/invoice` | Paid quote only; TEST identified explicitly |
| Payments | GET `/payments` | Scoped to own/assigned bookings; admins see platform records |
| Conversation | GET/POST `/bookings/:id/messages` | Participants; POST `{body,clientRequestId}` |
| History sharing | PUT `/bookings/:id/history-access` | Customer `{grant,recordIds}` for records of this vehicle |
| Shared history | GET `/bookings/:id/history` | Assigned mechanic + active explicit grant |
| Review | PUT/DELETE `/bookings/:id/review` | Booking owner after completion; rating 1–5 |
| Notifications | GET `/notifications`, POST `/notifications/read` | Only authenticated recipient |
| Live updates | GET `/notifications/stream` | SSE `update`, `session-ended`; Last-Event-ID supported; refetch active resources |
| Admin | GET `/admin/overview`, `/admin/applications`, `/admin/users`, `/admin/activity` | Explicit ADMIN role |
| Application review | GET `/admin/professionals/:id`, POST `/admin/professionals/:id/review` | Versioned decision, notes, audit and recipient notification |
| Account status | POST `/admin/users/:id/status` | Admin enable/disable; cannot disable self/other admins here |
| Accurate assets | POST `/admin/vehicle-assets` | Licensed HTTPS asset metadata + explicit licence/accuracy confirmations |

Booking create body: `{vehicleId,professionalId,appointmentAt,description,clientRequestId}`; ISO appointment with timezone; UUID idempotency key. Quote create body: `{notes,lines:[{description,category,quantity,unitPriceCents}],send,clientRequestId}`. Categories: assessment/labour/parts/other. Never submit rand floats as cents.

Lists cap at 100 rows. Bookings/directory accept `take` and UUID `cursor`; messages accept `take` and cursor; notifications accept `take` and `before` (decimal-string ID). The first connected UI currently loads up to 100 bookings; full list pagination must be completed before high-volume rollout.

Frontend activation is explicit via `VITE_API_URL`. There is no silent fallback to browser demo data when the API fails. Existing demo UI is retained when the variable is absent. Connected screens share the sidebar, topbar, auth artwork and card styles, but the final presentation parity pass and unsupported admin/finance features remain launch work described in the backend README.

### Profile presentation and preferences

`PATCH /api/auth/profile` accepts `name`, `phone`, and optional `emailUpdates` (boolean), `photo` (empty string to remove, or a JPEG data URL up to 120,000 characters). The shared profile form resizes uploads to at most 320px before saving. Only the authenticated user's account is updated. External image URLs and SVG are rejected. Session responses include these saved preferences so the profile photo also appears in the workspace navigation. This preference records consent; it does not introduce a marketing email sender.

Apply migration `202610210003_profile_preferences` with `npm run db:migrate` before restarting the API. Email remains read-only; changing a verified email requires a separate verification workflow. Password changes use the existing authenticated endpoint, invalidate sessions, and return the user to sign-in.

### Connected UI restoration

The connected application reuses the demo directory, professional cards, vehicle detail page, booking progress, role-specific payment views, admin list views, cards and theme tokens. Mutations remain authenticated API calls; no demo records are imported into a real account. Directory photos come from the professional's saved account photo, with an illustrated placeholder when absent. Location ranking is calculated in the browser across loaded results; the directory offers another page after 100 records. Distances are approximate straight-line distances, not driving estimates.

Admin-only read endpoints added: `GET /api/admin/professionals`, `/api/admin/application-history`, and `/api/admin/users/:id`. Audit queries optionally accept `resourceId`. Public professional responses expose `photo`, `rating`, and `reviewCount`, without the private user relation. These changes require no new migration beyond the earlier profile-preferences migration.

The interface retains visible sections for bank onboarding, platform configuration and disputes, but those backend capabilities are not implemented yet. They show unavailable states rather than accepting unsaved values. Checkout displays the selected repair summary and the existing online-payments-unavailable state; it cannot collect money. Admin aggregate counts are server-owned. Summaries based on recent lists explicitly state their 100-record scope. Customer city is not collected, so job-city filters and analytics use the professional city and label it accordingly.

Validation: frontend typecheck, rendering/workflow tests and production build; backend Prisma build and HTTP/database integration tests, including admin access and public-profile field isolation. Headless Chromium exercised 128 connected page/viewport/theme combinations (375px and 1440px, both themes, three roles) using API fixtures, with no JavaScript errors or page-level horizontal overflow. This is not a physical mobile-device check or production end-to-end payment test.

### Shared demo presentation (22 October 2026)

The backend-connected frontend now imports the original garage, professional profile, notification inbox, mechanic appointment cards, business profile, document upload view, quote editor, quote summary and repair approval components. Vehicle and appointment fields are extracted from the original demo into shared components. Both modes use the same dialog shell, backdrop, surface, responsive field rows and colour preview. The dialog renders outside detail cards so card-specific heading/form rules cannot override it. Native modality supplies focus containment, Escape dismissal and return focus.

Keep backend differences in API adapters and action handlers. Do not add another simplified form/page for connected mode. Demo sample labels, sample-filled registration numbers and simulated payment buttons must not be copied into real accounts. Real email verification, permission checks, API errors and unavailable payment/payout features remain explicit.

Migration `202610220001_vehicle_care` restores storage for body style, licence-date source, next-service mileage and next-service source already present in the demo form. Run `npm run db:generate` and `npm run db:migrate` in `backend` before restarting. These are additive fields; existing vehicles and service records remain intact. A source selected by a customer is owner-reported metadata, not verified mechanic evidence.

### Shared mechanic and admin presentation (23 October 2026)

The connected mechanic profile uses `MerchantProfilePage` with its original banner, four folder tabs, business fields, evidence upload and verification checklist. Account security remains available under the business panel. Admin applications, professional details, customer details and account settings use the original admin page components. API adapters supply actual records and callbacks; they never substitute sample accounts, credentials, payments or documents. Payout setup and platform configuration remain explicitly unavailable where no secure server action exists.

The existing `202610220001_vehicle_care` migration from main is retained, including date-only persistence. No duplicate vehicle-fields migration is required. Native dialogs share the existing modal scroll lock and use the original dialog styling via a portal.

Verification: frontend component/flow tests and production build; backend integration tests with PostgreSQL-compatible PGlite and production TypeScript build. Browser tools were unavailable for the October 23 pass, so physical-device interaction and screenshot parity still require visual verification.
