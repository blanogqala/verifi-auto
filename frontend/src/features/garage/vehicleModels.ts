export type VehicleModelEntry = {
  id: string;
  make: string;
  model: string;
  year?: string;
  src: string;
  illustrative: boolean;
  label: string;
};

/**
 * Explicit catalogue of licensed 3D assets. Make and model text does not build geometry.
 * This repository has no licensed model for the demo vehicles, so the catalogue is empty
 * and those vehicles use the illustrated fallback.
 */
export const vehicleModelCatalogue: VehicleModelEntry[] = [];

export function catalogueModel(vehicle: any): VehicleModelEntry | null {
  if (!vehicle) return null;
  const make = String(vehicle.make || '').trim().toLowerCase();
  const model = String(vehicle.model || '').trim().toLowerCase();
  const year = String(vehicle.year || '').trim();
  return (
    vehicleModelCatalogue.find((entry) => {
      const yearMatches = !entry.year || entry.year === year;
      return entry.make.toLowerCase() === make && entry.model.toLowerCase() === model && yearMatches;
    }) || null
  );
}
