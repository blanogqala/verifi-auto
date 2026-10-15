import { Role } from '../types/roles';
import { allowedDashboardPages } from '../config/navigation';

export function canVisit(role: Role | null, page: string) {
  if (!page.startsWith('dashboard/')) return true;
  if (!role) return false;
  const tab = page.slice('dashboard/'.length);
  if (!tab || tab.split('/').length > 2) return false;
  return allowedDashboardPages[role].includes(tab);
}

const mechanicLegacyPages: Record<string, string> = {
  'dashboard/profile': 'dashboard/profile/business',
  'dashboard/profile/account': 'dashboard/profile/business',
  'dashboard/documents': 'dashboard/profile/documents',
  'dashboard/application': 'dashboard/profile/verification',
  'dashboard/settings': 'dashboard/profile/business',
  'dashboard/appointments': 'dashboard/appointments/pending',
};

const adminLegacyPages: Record<string, string> = {
  'dashboard/settings': 'dashboard/profile/platform',
  'dashboard/profile': 'dashboard/profile/account',
};

/** Keep older dashboard links usable without treating them as separate pages. */
export function canonicalPage(role: Role | null, page: string) {
  if (role === 'customer' && page === 'dashboard/settings') return 'dashboard/profile';
  if (role === 'mechanic' && mechanicLegacyPages[page]) return mechanicLegacyPages[page];
  if (role === 'admin' && adminLegacyPages[page]) return adminLegacyPages[page];
  return page;
}
