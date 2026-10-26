/** Discover opted-in professionals without assuming their published address is geocoded. */
export type RoadsideCandidate = {
  id: string;
  latitude: number | null;
  longitude: number | null;
};

type Origin = { latitude: number; longitude: number } | null;
const radiiKm = [50, 100, 200] as const;
const limit = 12;

function distanceKm(origin: NonNullable<Origin>, location: RoadsideCandidate) {
  if (location.latitude == null || location.longitude == null) return null;
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = rad(location.latitude - origin.latitude);
  const dLon = rad(location.longitude - origin.longitude);
  const chord = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(origin.latitude)) * Math.cos(rad(location.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(chord)));
}

export function matchRoadsideProfessionals<T extends RoadsideCandidate>(candidates: T[], origin: Origin) {
  const ranked = candidates.map((professional) => ({
    ...professional,
    distanceKm: origin ? distanceKm(origin, professional) : null,
  })).sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || a.id.localeCompare(b.id));

  if (!origin) return {
    professionals: ranked.slice(0, limit),
    radiusKm: null,
    fallbackUnlocated: false,
  };

  // Only expand when no measured-distance matches exist in the nearer band.
  for (const radiusKm of radiiKm) {
    const nearby = ranked.filter((professional) =>
      professional.distanceKm != null && professional.distanceKm <= radiusKm);
    if (nearby.length) return {
      professionals: nearby.slice(0, limit),
      radiusKm,
      fallbackUnlocated: false,
    };
  }

  // An approved workshop may have a postal address but no GPS coordinates yet.
  // Never claim these fallback matches are within 200 km; the customer must confirm coverage.
  const unlocated = ranked.filter((professional) => professional.distanceKm == null);
  return {
    professionals: unlocated.slice(0, limit),
    radiusKm: 200,
    fallbackUnlocated: unlocated.length > 0,
  };
}
