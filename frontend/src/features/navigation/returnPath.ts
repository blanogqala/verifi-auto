import { canVisit, canonicalPage, safeRouteId } from '../../routes/access';

const listPaths = new Set([
  'find',
  'dashboard/overview',
  'dashboard/find',
  'dashboard/garage',
  'dashboard/bookings',
  'dashboard/payments',
  'dashboard/quotes',
]);

/** Internal return targets only. External URLs and unknown dashboard pages are rejected. */
export function customerReturnAllowed(path: string) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('..') || path.includes('://')) return false;
  if (path.startsWith('dashboard/')) {
    const page = canonicalPage('customer', path);
    if (!canVisit('customer', page)) return false;
    if (listPaths.has(page)) return true;
    const tab = page.slice('dashboard/'.length);
    const slash = tab.indexOf('/');
    if (slash < 1) return false;
    const section = tab.slice(0, slash);
    if (!['find', 'bookings', 'garage'].includes(section)) return false;
    return safeRouteId(tab.slice(slash + 1)) !== null;
  }
  if (path === 'find') return true;
  if (path.startsWith('professional/')) return safeRouteId(path.slice('professional/'.length)) !== null && !path.slice('professional/'.length).includes('/');
  return false;
}

export function rememberReturn(store: Record<string, string>, destination: string, source: string) {
  if (!customerReturnAllowed(destination) || !customerReturnAllowed(source) || destination === source) return store;
  return { ...store, [destination]: source };
}

export function resolveReturn(store: Record<string, string>, current: string, fallback: string) {
  const stored = store?.[current];
  if (stored && customerReturnAllowed(stored)) return stored;
  return customerReturnAllowed(fallback) ? fallback : 'dashboard/overview';
}

export function returnLabel(path: string) {
  if (path === 'dashboard/garage') return 'Back to My Garage';
  if (path.startsWith('dashboard/garage/')) return 'Back to vehicle';
  if (path === 'dashboard/bookings') return 'Back to My bookings';
  if (path.startsWith('dashboard/bookings/')) return 'Back to booking';
  if (path === 'dashboard/find' || path === 'find') return 'Back to professionals';
  if (path === 'dashboard/overview') return 'Back to overview';
  if (path === 'dashboard/payments') return 'Back to payments';
  if (path === 'dashboard/quotes') return 'Back to quotes';
  return 'Back';
}

const storageKey = 'verifi-return-v1';

function readStore() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function followDetail(go: (path: string) => void, from: string, to: string) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(rememberReturn(readStore(), to, from)));
  } catch {
    /* The detail page still opens. Back falls back to the section list. */
  }
  go(to);
}

export function backTarget(current: string, fallback: string) {
  return resolveReturn(readStore(), current, fallback);
}

const filterKey = 'verifi-booking-filters';

export function readBookingFilters() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(filterKey) || '{}');
    return {
      filter: typeof parsed.filter === 'string' ? parsed.filter : 'All',
      query: typeof parsed.query === 'string' ? parsed.query : '',
    };
  } catch {
    return { filter: 'All', query: '' };
  }
}

export function writeBookingFilters(filter: string, query: string) {
  try {
    sessionStorage.setItem(filterKey, JSON.stringify({ filter, query }));
  } catch {
    /* Filtering still works for this visit. */
  }
}
