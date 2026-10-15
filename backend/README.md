# Backend — not implemented

This directory intentionally contains documentation only. There is no server to start and no backend dependency installation to run.

The planned backend is a separate Node.js + Express + TypeScript REST API with PostgreSQL. It must have its own `package.json`, source, configuration, and environment variables when implemented. Do not put backend secrets or database access in `frontend/`.

Suggested future areas:

| Area | Responsibility |
| --- | --- |
| Authentication and sessions | Real sign-in, registration, password recovery, server-side role checks; invitation-only platform-admin accounts. |
| Professionals and applications | Profiles, evidence review, approval decisions, credential history, permitted directory visibility. |
| Documents | Private uploads, validation, access checks, retention, and controlled download links. |
| Vehicles and jobs | Customer ownership, appointments, quotes, explicit approval, work records, and amendments. |
| Payments | Provider integration and verified server callbacks; never trust a browser's paid flag. |
| Notifications | Email/push delivery, preferences, and delivery records. |
| Audit and support | Reviewer decisions, status history, reports, and accountability. |

The frontend's `src/features/` rules describe the current demo flow; enforce validated versions again on the server. `src/routes/access.ts` is UI navigation only, not an authorization boundary. Verification criteria and the pilot city still require a final product decision.
