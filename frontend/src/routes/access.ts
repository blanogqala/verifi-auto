import { Role } from '../types/roles';
import { allowedDashboardPages } from '../config/navigation';

const customerDetail = /^(find|bookings|garage)\/[^/]+$/;
const routeIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

export function safeRouteId(value: string) {
  if (!value) return null;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return null;
  }
  if (!routeIdPattern.test(decoded)) return null;
  return decoded;
}

export function detailId(tab: string, section: 'find' | 'bookings' | 'garage') {
  const prefix = section + '/';
  if (!tab.startsWith(prefix)) return undefined;
  const raw = tab.slice(prefix.length);
  if (!raw || raw.includes('/')) return null;
  return safeRouteId(raw);
}

export function canVisit(role: Role | null, page: string) {
  if (!page.startsWith('dashboard/')) return true;
  if (!role) return false;
  const tab = page.slice('dashboard/'.length);
  if (!tab || tab.split('/').length > 2) return false;
  if (allowedDashboardPages[role].includes(tab)) return true;
  return role === 'customer' && customerDetail.test(tab);
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
