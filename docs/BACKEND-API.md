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
