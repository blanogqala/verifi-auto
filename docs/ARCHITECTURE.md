# Frontend architecture

## Entry and navigation

`src/main.tsx` loads the styles and mounts `App`. `src/App.tsx` owns top-level demo-role state, theme selection, public search filters, the selected professional, and hash navigation. The booking target survives the sign-in transition.

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
| `demo.ts` | Compatibility export surface for the modules above; no server code. |

## Backend migration

Keep presentational pages and shared UI intact where possible. Replace browser-local actions with an API/data layer, load the user role from the authenticated session, and perform ownership and workflow enforcement on the server. Replace filename-only evidence with private upload records. A service record and payment status must come from verified server data.

The current preview shares sample jobs across demo roles so one person can explore the whole workflow. The live system will require per-customer and per-professional record scoping.

## Known prototype limits

No production auth, payment processing, uploads, automatic notifications, or persistent multi-user database. No browser end-to-end tests have been run. Prototype controllers and extracted page contracts still use `any` in places; strengthen those types as server contracts are defined. The latest export passes TypeScript checking, production bundling, and the included workflow/render checks.
