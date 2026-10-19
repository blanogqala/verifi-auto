import { demoAreaById, demoAreas, type DemoArea } from '../../data/demoAreas';
import { emptyRating, ratingSummary, type RatingSummary } from '../reviews/ratingSummary';
import {
  approximateDistanceLabel,
  coordinatesOf,
  formatPlace,
  haversineKm,
  mapsDirectionsUrl,
  type Coordinates,
  type ProfessionalLocation,
} from './geo';

export const searchRadii = [10, 25, 50] as const;
export type SearchRadius = (typeof searchRadii)[number];
export const defaultRadiusKm: SearchRadius = 25;

export type SearchOrigin = {
  label: string;
  latitude: number;
  longitude: number;
  kind: 'browser' | 'area-centre';
  areaId: string;
};

export type DiscoverySession = {
  mode: 'nearby' | 'all';
  radiusKm: SearchRadius;
  areaId: string;
  origin: SearchOrigin | null;
  service: string;
  type: string;
};

export const defaultDiscovery: DiscoverySession = {
  mode: 'nearby',
  radiusKm: defaultRadiusKm,
  areaId: '',
  origin: null,
  service: 'All services',
  type: 'Either',
};

export type DirectoryHit = {
  id: string;
  name: string;
  type: string;
  area: string;
  special: string;
  place: string;
  photo: string;
  sample: boolean;
  own: boolean;
  verification: string;
  rating: RatingSummary;
  distanceLabel: string;
  sortKm: number;
  directionsUrl: string | null;
  location: ProfessionalLocation | null;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function asRadius(value: unknown): SearchRadius {
  const radius = Number(value);
  return searchRadii.includes(radius as SearchRadius) ? (radius as SearchRadius) : defaultRadiusKm;
}

export function originFromArea(area: DemoArea): SearchOrigin {
  return {
    label: area.label,
    latitude: area.latitude,
    longitude: area.longitude,
    kind: 'area-centre',
    areaId: area.id,
  };
}

export function discoveryWithArea(current: DiscoverySession, areaId: string): DiscoverySession {
  const area = demoAreaById(areaId);
  if (!area) return { ...current, areaId: '', origin: null, mode: 'nearby' };
  return { ...current, mode: 'nearby', areaId: area.id, origin: originFromArea(area) };
}

export function discoveryWithBrowser(current: DiscoverySession, latitude: number, longitude: number): DiscoverySession {
  const point = coordinatesOf(latitude, longitude);
  if (!point) return current;
  return {
    ...current,
    mode: 'nearby',
    areaId: '',
    origin: { label: 'Your shared location', latitude: point.latitude, longitude: point.longitude, kind: 'browser', areaId: '' },
  };
}

export function nextRadius(radiusKm: SearchRadius): SearchRadius | null {
  if (radiusKm === 10) return 25;
  if (radiusKm === 25) return 50;
  return null;
}

export function distanceDisclosure(origin: SearchOrigin | null) {
  if (!origin) return '';
  if (origin.kind === 'area-centre') {
    return `Distances are approximate straight-line measurements from the ${origin.label} demo area centre, not road distance or travel time.`;
  }
  return 'Distances are approximate straight-line measurements from the location you shared, not road distance or travel time. Your coordinates stay in this browser session.';
}

export function geolocationMessage(code: number | null, supported: boolean) {
  if (!supported) return 'This browser cannot share a location. Choose an area instead.';
  if (code === 1) return 'Location permission was denied. Choose an area instead.';
  if (code === 2) return 'Your location is unavailable. Choose an area instead.';
  if (code === 3) return 'The location request timed out. Choose an area instead.';
  return 'Your location could not be read. Choose an area instead.';
}

function locationOf(professional: any): ProfessionalLocation | null {
  const location = professional?.location;
  if (!location || typeof location !== 'object') return null;
  return location as ProfessionalLocation;
}

function pointOf(location: ProfessionalLocation | null): Coordinates | null {
  if (!location) return null;
  return coordinatesOf(location.latitude, location.longitude);
}

function serviceMatches(professional: any, service: string) {
  if (!service || service === 'All services' || service === 'Not sure yet') return true;
  const special = text(professional?.special);
  const services = Array.isArray(professional?.services) ? professional.services.join(' · ') : '';
  return special.includes(service) || services.includes(service);
}

function typeMatches(professional: any, type: string) {
  if (!type || type === 'Either') return true;
  return professional?.type === type;
}

function cardVerification(professional: any) {
  const status = text(professional?.applicationStatus);
  if (professional?.own === true && status) return `Demo application status: ${status}. Not a live credential.`;
  if (professional?.sample === false) return 'Verification checks have not been recorded.';
  return 'Sample profile. Not a verified business.';
}

function coverageKm(location: ProfessionalLocation | null) {
  const radius = Number(location?.serviceRadiusKm);
  return Number.isFinite(radius) && radius > 0 ? radius : null;
}

export function distanceFor(professional: any, origin: SearchOrigin | null) {
  const location = locationOf(professional);
  const point = pointOf(location);
  if (!origin || !location || !point) return null;
  return haversineKm(origin, point);
}

function hitFrom(professional: any, data: any, origin: SearchOrigin | null, distanceLabel: string, sortKm: number): DirectoryHit {
  const location = locationOf(professional);
  const id = text(professional?.id);
  return {
    id,
    name: text(professional?.name),
    type: text(professional?.type),
    area: text(professional?.area) || formatPlace(location),
    special: text(professional?.special),
    place: formatPlace(location, text(professional?.area)),
    photo: text(professional?.photo),
    sample: professional?.own !== true && professional?.sample !== false,
    own: professional?.own === true,
    verification: cardVerification(professional),
    rating: id ? ratingSummary(data, id) : emptyRating,
    distanceLabel,
    sortKm,
    directionsUrl: mapsDirectionsUrl(location),
    location,
  };
}

/**
 * Nearby search never widens itself to every professional.
 * Missing coordinates are excluded from nearby results and never become 0 km.
 */
export function searchDirectory(professionals: any[], discovery: DiscoverySession, data: any = {}): DirectoryHit[] {
  const list = (Array.isArray(professionals) ? professionals : []).filter(
    (professional) => serviceMatches(professional, discovery.service) && typeMatches(professional, discovery.type),
  );
  const origin = discovery.origin && coordinatesOf(discovery.origin.latitude, discovery.origin.longitude) ? discovery.origin : null;
  if (discovery.mode === 'all') {
    return list
      .map((professional) => {
        const location = locationOf(professional);
        const distance = distanceFor(professional, origin);
        if (location?.precision === 'service-area' && origin && distance != null && coverageKm(location) != null && distance <= (coverageKm(location) as number)) {
          return hitFrom(professional, data, origin, 'Serves your area', distance);
        }
        if (distance == null) return hitFrom(professional, data, origin, 'Distance unavailable', Number.POSITIVE_INFINITY);
        return hitFrom(professional, data, origin, approximateDistanceLabel(distance, location?.precision || 'unknown'), distance);
      })
      .sort((a, b) => a.sortKm - b.sortKm || a.name.localeCompare(b.name));
  }
  if (!origin) return [];
  const nearby: DirectoryHit[] = [];
  for (const professional of list) {
    const location = locationOf(professional);
    const distance = distanceFor(professional, origin);
    if (distance == null || !location) continue;
    if (location.precision === 'service-area') {
      const radius = coverageKm(location);
      if (radius != null && distance <= radius) nearby.push(hitFrom(professional, data, origin, 'Serves your area', distance));
      continue;
    }
    if (location.precision === 'unknown') continue;
    if (distance <= discovery.radiusKm) {
      nearby.push(hitFrom(professional, data, origin, approximateDistanceLabel(distance, location.precision), distance));
    }
  }
  return nearby.sort((a, b) => a.sortKm - b.sortKm || a.name.localeCompare(b.name));
}

export function directorySummary(discovery: DiscoverySession, count: number) {
  if (discovery.mode === 'all') return `${count} sample professionals across demo areas`;
  if (!discovery.origin) return 'Location needed for nearby results';
  return `${count} sample professionals within ${discovery.radiusKm} km`;
}

export { demoAreas };

/** Discovery is a ranked catalogue: location orders results, never gates them. */
export function browseDirectory(professionals: any[], discovery: DiscoverySession, data: any = {}) {
  return searchDirectory(professionals, { ...discovery, mode: 'all' }, data);
}
