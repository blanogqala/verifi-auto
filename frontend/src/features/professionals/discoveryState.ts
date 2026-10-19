import { asRadius, defaultDiscovery, discoveryWithArea, type DiscoverySession, type SearchOrigin } from './discovery';

const storageKey = 'verifi-discovery-v1';
const scrollKey = 'verifi-discovery-scroll-v1';

function originFrom(value: any): SearchOrigin | null {
  if (!value || typeof value !== 'object') return null;
  const latitude = Number(value.latitude);
  const longitude = Number(value.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const kind = value.kind === 'browser' ? 'browser' : value.kind === 'area-centre' ? 'area-centre' : '';
  if (!kind) return null;
  const label = typeof value.label === 'string' && value.label.trim() ? value.label.trim() : kind === 'browser' ? 'Your shared location' : 'Selected area';
  return { label, latitude, longitude, kind, areaId: typeof value.areaId === 'string' ? value.areaId : '' };
}

export function readDiscoverySession(): DiscoverySession {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey) || '');
    const origin = originFrom(parsed?.origin);
    const areaId = typeof parsed?.areaId === 'string' ? parsed.areaId : origin?.areaId || '';
    return {
      mode: parsed?.mode === 'all' ? 'all' : 'nearby',
      radiusKm: asRadius(parsed?.radiusKm),
      areaId,
      origin,
      service: typeof parsed?.service === 'string' && parsed.service ? parsed.service : defaultDiscovery.service,
      type: typeof parsed?.type === 'string' && parsed.type ? parsed.type : defaultDiscovery.type,
    };
  } catch {
    return { ...defaultDiscovery };
  }
}

export function writeDiscoverySession(value: DiscoverySession) {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    /* The current visit still keeps the selection in memory. */
  }
}

export function rememberDirectoryScroll(bucket: 'public' | 'dashboard') {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(scrollKey) || '{}');
    const scroller = bucket === 'dashboard' ? document.querySelector('.workspace-main') : null;
    const y = scroller instanceof HTMLElement ? scroller.scrollTop : window.scrollY;
    sessionStorage.setItem(scrollKey, JSON.stringify({ ...(parsed && typeof parsed === 'object' ? parsed : {}), [bucket]: y }));
  } catch {
    /* Returning to the list still opens. Scroll just starts at the top. */
  }
}

export function takeDirectoryScroll(bucket: 'public' | 'dashboard') {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(scrollKey) || '{}');
    const y = Number(parsed?.[bucket]);
    if (!Number.isFinite(y) || y < 0) return null;
    delete parsed[bucket];
    sessionStorage.setItem(scrollKey, JSON.stringify(parsed));
    return y;
  } catch {
    return null;
  }
}

export function restoreDirectoryScroll(bucket: 'public' | 'dashboard', y: number) {
  if (bucket === 'dashboard') {
    const scroller = document.querySelector('.workspace-main');
    if (scroller instanceof HTMLElement) {
      scroller.scrollTop = y;
      return;
    }
  }
  window.scrollTo({ top: y, behavior: 'auto' });
}

export function applyAreaSelection(current: DiscoverySession, areaId: string) {
  return discoveryWithArea(current, areaId);
}
