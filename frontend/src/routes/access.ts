import { Role } from '../types/roles';
import { allowedDashboardPages, appointmentSections, type AppointmentSection } from '../config/navigation';

const customerDetail = /^(find|garage)\/[^/]+$/;
const routeIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;
const detailPanels = new Set(['quote', 'messages']);
const customerFocusPanels = new Set(['var', 'activity']);

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

export function detailPanel(tab: string, section: string) {
  const id = detailId(tab, section);
  if (!id) return 'overview';
  const rest = tab.slice((section + '/').length);
  const panel = rest.split('/')[1] || '';
  return panel === 'quote' || panel === 'messages' ? panel : 'overview';
}

export function detailId(tab: string, section: string) {
  const prefix = section + '/';
  if (!tab.startsWith(prefix)) return undefined;
  const rest = tab.slice(prefix.length);
  const parts = rest.split('/');
  if (!parts[0] || parts.length > 2) return null;
  if (parts[1] && !detailPanels.has(parts[1]) && !(section === 'bookings' && customerFocusPanels.has(parts[1]))) return null;
  if (parts[1] && section !== 'bookings' && section !== 'jobs') return null;
  return safeRouteId(parts[0]);
}

export function appointmentTarget(tab: string): { section: AppointmentSection; id: string } | null | undefined {
  const parts = tab.split('/');
  if (parts[0] !== 'appointments') return undefined;
  if (parts.length < 3) return undefined;
  if (parts.length > 3) return null;
  if (!appointmentSections.includes(parts[1] as AppointmentSection)) return null;
  const id = safeRouteId(parts[2]);
  if (!id) return null;
  return { section: parts[1] as AppointmentSection, id };
}

function allowedDetail(role: Role, tab: string) {
  const parts = tab.split('/');
  if (role === 'admin' && parts.length === 2 && ['applications', 'professionals', 'customers', 'jobs', 'disputes'].includes(parts[0]) && safeRouteId(parts[1])) return true;
  if (parts.length === 2 && role === 'customer' && customerDetail.test(tab)) return true;
  if (parts.length === 2 && role === 'customer' && parts[0] === 'bookings' && safeRouteId(parts[1])) return true;
  if (parts.length === 3 && role === 'customer' && parts[0] === 'bookings' && safeRouteId(parts[1]) && (detailPanels.has(parts[2]) || customerFocusPanels.has(parts[2])))
    return true;
  if (parts.length === 2 && role === 'mechanic' && parts[0] === 'jobs' && safeRouteId(parts[1])) return true;
  if (parts.length === 3 && role === 'mechanic' && parts[0] === 'jobs' && safeRouteId(parts[1]) && detailPanels.has(parts[2]))
    return true;
  if (
    parts.length === 3 &&
    role === 'mechanic' &&
    parts[0] === 'appointments' &&
    appointmentSections.includes(parts[1] as AppointmentSection) &&
    safeRouteId(parts[2])
  )
    return true;
  return false;
}

export function canVisit(role: Role | null, page: string) {
  if (!page.startsWith('dashboard/')) return true;
  if (!role) return false;
  const tab = page.slice('dashboard/'.length);
  if (!tab || tab.split('/').length > 3) return false;
  if (allowedDashboardPages[role].includes(tab)) return true;
  return allowedDetail(role, tab);
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
