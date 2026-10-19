import type { ProfessionalLocation } from '../features/professionals/geo';

/** Curated demo area centres. These are not geocoded street addresses. */
export type DemoArea = {
  id: string;
  label: string;
  suburb: string;
  city: string;
  province: string;
  districtId: string;
  latitude: number;
  longitude: number;
};

export const demoAreas: DemoArea[] = [
  { id: 'cape-town', label: 'Cape Town city centre', suburb: 'Cape Town City Centre', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.9249, longitude: 18.4241 },
  { id: 'sea-point', label: 'Sea Point, Cape Town', suburb: 'Sea Point', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.918, longitude: 18.3845 },
  { id: 'gardens', label: 'Gardens, Cape Town', suburb: 'Gardens', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.9335, longitude: 18.411 },
  { id: 'woodstock', label: 'Woodstock, Cape Town', suburb: 'Woodstock', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.9275, longitude: 18.447 },
  { id: 'observatory', label: 'Observatory, Cape Town', suburb: 'Observatory', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.9378, longitude: 18.468 },
  { id: 'rondebosch', label: 'Rondebosch, Cape Town', suburb: 'Rondebosch', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.963, longitude: 18.476 },
  { id: 'claremont', label: 'Claremont, Cape Town', suburb: 'Claremont', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.9806, longitude: 18.4653 },
  { id: 'bellville', label: 'Bellville, Cape Town', suburb: 'Bellville', city: 'Cape Town', province: 'Western Cape', districtId: 'CPT', latitude: -33.9003, longitude: 18.629 },
  { id: 'stellenbosch', label: 'Stellenbosch', suburb: 'Stellenbosch', city: 'Stellenbosch', province: 'Western Cape', districtId: 'CPT', latitude: -33.9321, longitude: 18.8602 },
  { id: 'paarl', label: 'Paarl', suburb: 'Paarl', city: 'Paarl', province: 'Western Cape', districtId: 'CPT', latitude: -33.7342, longitude: 18.9621 },
  { id: 'johannesburg', label: 'Johannesburg, Sandton', suburb: 'Sandton', city: 'Johannesburg', province: 'Gauteng', districtId: 'JHB', latitude: -26.1076, longitude: 28.0567 },
  { id: 'east-london', label: 'East London', suburb: 'East London', city: 'East London', province: 'Eastern Cape', districtId: 'EL', latitude: -33.0292, longitude: 27.8546 },
];

export const demoAreaNote = 'Supported demo areas only. Typed addresses are not geocoded in this preview.';

export function demoAreaById(id: string) {
  return demoAreas.find((area) => area.id === id) || null;
}

export function demoAreaByLabel(label: string) {
  const needle = label.trim().toLowerCase();
  if (!needle) return null;
  return demoAreas.find((area) => area.label.toLowerCase() === needle || area.city.toLowerCase() === needle || area.suburb.toLowerCase() === needle) || null;
}

export function areaCentreLocation(area: DemoArea, precision: ProfessionalLocation['precision']): ProfessionalLocation {
  return {
    publicAddress: '',
    suburb: area.suburb,
    city: area.city,
    province: area.province,
    districtId: area.districtId,
    latitude: area.latitude,
    longitude: area.longitude,
    source: 'demo-area-selection',
    precision,
    placeId: '',
    serviceRadiusKm: precision === 'service-area' ? 25 : null,
  };
}
