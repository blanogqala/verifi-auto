/** Approximate straight-line geography. This is not road distance or travel time. */

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type LocationPrecision = 'public-premises' | 'area-centre' | 'service-area' | 'unknown';

export type LocationSource = 'demo-curated' | 'demo-area-selection' | 'browser' | 'unrecorded';

export type ProfessionalLocation = {
  publicAddress: string;
  suburb: string;
  city: string;
  province: string;
  districtId: string;
  latitude: number | null;
  longitude: number | null;
  source: LocationSource;
  precision: LocationPrecision;
  placeId: string;
  serviceRadiusKm: number | null;
};

const earthRadiusKm = 6371;

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

export function coordinatesOf(latitude: unknown, longitude: unknown): Coordinates | null {
  if (!validCoordinates(latitude, longitude)) return null;
  return { latitude: latitude as number, longitude: longitude as number };
}

/** Great-circle kilometres. Valid coordinates of 0,0 stay a real point, not a missing value. */
export function haversineKm(from: Coordinates, to: Coordinates): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRad(to.latitude - from.latitude);
  const lngDelta = toRad(to.longitude - from.longitude);
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const chord =
    Math.sin(latDelta / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(lngDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function formatApproximateKm(distanceKm: number): string {
  const rounded = Math.round(distanceKm * 10) / 10;
  return rounded.toFixed(1);
}

export function approximateDistanceLabel(distanceKm: number, precision: LocationPrecision): string {
  const km = formatApproximateKm(distanceKm);
  if (precision === 'area-centre') return `Approximately ${km} km from the listed area centre`;
  return `Approximately ${km} km away`;
}

/**
 * Google Maps directions. Origin is omitted so Maps can use the viewer's own start.
 * Only a public premises coordinate is a destination. A service-area reference is not.
 */
export function mapsDirectionsUrl(location: ProfessionalLocation | null | undefined): string | null {
  if (!location || location.precision !== 'public-premises') return null;
  if (!validCoordinates(location.latitude, location.longitude)) return null;
  const params = new URLSearchParams();
  params.set('api', '1');
  params.set('destination', `${location.latitude},${location.longitude}`);
  params.set('travelmode', 'driving');
  const placeId = location.placeId.trim();
  if (placeId) params.set('destination_place_id', placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function formatPlace(location: Pick<ProfessionalLocation, 'suburb' | 'city'> | null | undefined, fallback = ''): string {
  const suburb = location?.suburb?.trim() || '';
  const city = location?.city?.trim() || '';
  if (suburb && city && suburb.toLowerCase() !== city.toLowerCase()) return `${suburb}, ${city}`;
  return suburb || city || fallback;
}

export function emptyLocation(partial: Partial<ProfessionalLocation> = {}): ProfessionalLocation {
  return {
    publicAddress: '',
    suburb: '',
    city: '',
    province: '',
    districtId: '',
    latitude: null,
    longitude: null,
    source: 'unrecorded',
    precision: 'unknown',
    placeId: '',
    serviceRadiusKm: null,
    ...partial,
  };
}
