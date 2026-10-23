# Frontend architecture

## Entry and navigation

`src/main.tsx` loads the styles and always mounts `App`. It does not choose a second application. `VITE_API_URL` selects the data source: an empty value keeps the browser demo, and a URL uses `src/data-access/` against the existing API. `src/App.tsx` owns theme selection, public search filters, the selected professional, and hash navigation. In demo mode the role switcher stays in session storage. In connected mode the role comes only from `GET /api/auth/session`. The booking target survives the sign-in transition.

The app uses hash routes (`/#home`, `/#find`, `/#login`, `/#register`, `/#forgot`, `/#dashboard/overview`, and role-specific dashboard tabs), so it can run on an ordinary static server without route rewrite rules. It does not use Next.js or React Router.

## Pages and layouts

- `pages/public`: landing page and directory.
- `pages/auth`: mode-based sign-in, registration, and recovery view.
- `pages/customer`: My Garage and payments.
- `pages/mechanic`: professional profile, documents, and verification status.
- `pages/admin`: application review list and support reports.
- `pages/shared`: overview, jobs/bookings, quotes, notifications, and settings; role-aware to avoid duplicated implementations.
- `layouts/WorkspaceLayout.tsx`: workspace state, action handlers, page selection, and shared navigation.
- `components/dialogs/WorkspaceDialog.tsx`: vehicle, quote, invoice, application-review, and support action dialogs.
- `components/booking/BookingDialog.tsx`: public-profile and assessment-booking dialog.

## Data and business rules

| Module | Purpose |
| --- | --- |
| `hooks/useDemoStore.ts` | Browser-local sample state and persistence. |
| `data/fixtures.ts` | Initial jobs, vehicles, applications, records, and settings. |
| `data/professionals.ts` | Initial sample public listings. |
| `features/jobs/jobWorkflow.ts` | Quote totals and guarded job-state transitions. |
| `features/onboarding/applicationRules.ts` | Demo application readiness checklist. |
| `routes/access.ts` | Allowed UI tabs by selected demo role. |
| `config/navigation.ts` | Role labels and sidebar navigation. |
| `config/assets.ts` | Local image URLs. |
| `demo.ts` | Compatibility export surface for the modules above. |
| `data-access/` | API client, DTO mappers, and the diff that calls existing routes. Missing server capabilities return an explicit unavailable result. |

## Backend migration

Demo mode and connected mode render the same pages, layouts, and dialogs. Connected mutations call the existing API. The server remains authoritative for role, ownership, money, and job state. Online card payments stay unavailable until a payment provider is connected; the approved payment dialog explains that and does not call checkout.

The browser demo still shares sample jobs across roles so one person can explore the workflow. Connected records are loaded per signed-in account.

## Known prototype limits

Connected mode uses the existing API for accounts, the directory, garage, bookings, quotations, messages, notifications, documents, and administration. These approved controls stay visible and state that the server does not provide them yet: online card payment and payout onboarding, editing a booking after it is sent, disputes and support cases, rejecting an application, changing a verified email, platform-setting writes, and attaching an unmatched history row. Prototype page contracts still use `any` in places. `npm run e2e` in `frontend` runs Playwright against the demo and a disposable database; it does not use `backend/.env`.
