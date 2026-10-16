export type VehicleModelEntry = {
  id: string;
  make: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  src?: string;
  illustrative: boolean;
  originalGeometry: boolean;
  label: string;
  attribution: string;
};

/**
 * Exact matches only. Make, model, and year text never generate a branded vehicle.
 * No licensed third-party car file is shipped. Unsupported vehicles use original geometry.
 */
export const vehicleModelCatalogue: VehicleModelEntry[] = [];

export const illustrativeDemoModel: VehicleModelEntry = {
  id: 'original-saloon',
  make: '',
  model: '',
  illustrative: true,
  originalGeometry: true,
  label: 'Illustrative model — not an exact match',
  attribution:
    'Original geometry built for this demo. No third-party vehicle model, brand asset, or workshop environment is used.',
};

export function catalogueModel(vehicle: any): VehicleModelEntry | null {
  if (!vehicle) return null;
  const make = String(vehicle.make || '').trim().toLowerCase();
  const model = String(vehicle.model || '').trim().toLowerCase();
  const year = Number(vehicle.year);
  return (
    vehicleModelCatalogue.find((entry) => {
      if (entry.make.toLowerCase() !== make || entry.model.toLowerCase() !== model) return false;
      if (!Number.isFinite(year)) return entry.yearFrom == null && entry.yearTo == null;
      if (entry.yearFrom != null && year < entry.yearFrom) return false;
      if (entry.yearTo != null && year > entry.yearTo) return false;
      return true;
    }) || null
  );
}

export function modelForVehicle(vehicle: any): VehicleModelEntry {
  return catalogueModel(vehicle) || illustrativeDemoModel;
}
