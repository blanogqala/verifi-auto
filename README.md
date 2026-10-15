# Verifi Auto

Editable frontend source for the purple Verifi Auto design preview. The application is a React + TypeScript + Vite + Tailwind CSS frontend. No Next.js is used.

## Start locally

1. Extract this archive into the parent folder where you keep your projects. It creates a `verifi-auto` project root.
2. Open `verifi-auto` in VS Code or Cursor.
3. Install Node.js 22 or newer. This export was checked using Node.js 24.19.0.
4. In a terminal, run:

```bash
cd frontend
npm ci
npm run dev
```

5. Open the local URL printed by Vite (normally `http://localhost:5173`).
6. Use **Sign in** to enter the customer, mechanic, or platform-admin demo workspace.
7. Use **Sign out / switch preview** to try another role. The sample data is shared inside your browser so you can follow the workflow across roles.

No backend, API key, database, or environment file is needed to run this frontend.

## Project boundaries

| Folder | Purpose |
| --- | --- |
| `frontend/` | The complete editable web frontend, assets, configuration, lockfile, and verification scripts. |
| `backend/` | A README only. The backend has NOT been implemented. |
| `docs/` | Architecture, design-system editing guide, image references, and original product explanation. |

The frontend has its own `package.json`. Install and run commands inside `frontend`, not the project root. Dependencies and generated build files are intentionally excluded from the ZIP; `npm ci` installs the exact locked versions.

## Where to edit

| Change | File or directory |
| --- | --- |
| Landing-page content and sections | `frontend/src/pages/public/LandingPage.tsx` |
| Public professional search | `frontend/src/pages/public/ProfessionalsPage.tsx` |
| Customer-only pages | `frontend/src/pages/customer/` |
| Mechanic-only pages | `frontend/src/pages/mechanic/` |
| Admin-only pages | `frontend/src/pages/admin/` |
| Pages reused between roles | `frontend/src/pages/shared/` |
| Sign-in, registration, and recovery screens | `frontend/src/pages/auth/AuthPage.tsx` |
| Shared card component | `frontend/src/components/ui/Card.tsx` |
| Card appearance across all roles | `frontend/src/styles/cards.css` |
| Theme colours and main site styling | `frontend/src/styles/base.css` |
| Hero brightness, dashboard and responsive styling | `frontend/src/styles/workspace.css` |
| Public navigation and footer | `frontend/src/layouts/PublicHeader.tsx`, `PublicFooter.tsx` |
| Workspace navigation items per role | `frontend/src/config/navigation.ts` |
| Dashboard layout and interaction controller | `frontend/src/layouts/WorkspaceLayout.tsx` |
| App navigation and booking entry state | `frontend/src/App.tsx` |
| Bundled images | `frontend/public/images/` |
| Image paths | `frontend/src/config/assets.ts` |
| Sample data | `frontend/src/data/` |
| Repair workflow rules | `frontend/src/features/jobs/jobWorkflow.ts` |

## What is implemented

- Purple `#9658E8` brand colour and light/dark switching; theme preference is remembered.
- Public landing page, professional filtering, and profile preview.
- Demo sign-in before booking, retaining the selected professional.
- Separate customer, mechanic, and admin navigation.
- Customer vehicles, booking requests, quotes, service records, simulated payments, notifications, and settings.
- Mechanic profile, document-selection UI, application submission, quote editing, and job updates.
- Admin application review, feedback, approval, credential suspension, support cases, and settings.
- Shared UI cards, metric cards, job cards, professional cards, status badges, and empty states.

## What is NOT implemented

This remains a frontend prototype, not a production system. Role selection is a preview convenience, not real access control. All data resides in the browser; it is not shared between devices or users. Uploaded files are NOT stored: only filenames, sizes, and document categories are retained. Payments and emails are simulated. There is no server, database, secure document storage, push notification service, production credential verification, or real payment provider.

The frontend uses permissive TypeScript in several prototype controllers and page-prop contracts. Type checking passes, but strong API/domain types and stricter compiler settings should be introduced alongside the backend.

## Verification commands

```bash
npm run typecheck
npm test
npm run build
npm run preview
```

`npm test` server-renders the 24 account/workspace views and checks role navigation, application readiness, and quote-to-payment transitions. These are not end-to-end browser tests. Browser visual and interactive QA remains outstanding after this refactor.

`npm run format` formats the editable source with Prettier.

## Browser data

- `localStorage`: `verifi-theme` and `verifi-demo-v2`.
- `sessionStorage`: `verifi-demo-role`.

To restart the demo with clean fixtures, remove these keys in your browser's developer tools and reload. Do not use real identity documents, card numbers, or passwords in this demo.

## Next development step

Implement the standalone backend described in `backend/README.md`, then replace browser-local state with authenticated REST calls while retaining the pages and shared components. The downloadable source is a portable refactored copy; exporting it does not change the hosted preview.
