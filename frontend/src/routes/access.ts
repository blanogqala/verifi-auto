import { Role } from '../types/roles';
import { allowedDashboardPages } from '../config/navigation';

export function canVisit(role: Role | null, page: string) {
  if (!page.startsWith('dashboard/')) return true;
  if (!role) return false;
  const tab = page.slice('dashboard/'.length);
  if (!tab || tab.includes('/')) return false;
  return allowedDashboardPages[role].includes(tab);
}

/** Keep older customer links usable without treating settings as its own page. */
export function canonicalPage(role: Role | null, page: string) {
  if (role === 'customer' && page === 'dashboard/settings') return 'dashboard/profile';
  return page;
}
