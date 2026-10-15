// Public entry point for the browser-only demo domain. No server calls or real authentication.
export type { Role } from './types/roles';
export { roles, roleLabel, navItems } from './config/navigation';
export { initialData } from './data/fixtures';
export { useDemoStore } from './hooks/useDemoStore';
export { quoteTotal, transitionJob } from './features/jobs/jobWorkflow';
export { canSubmit } from './features/onboarding/applicationRules';
export { canVisit } from './routes/access';
