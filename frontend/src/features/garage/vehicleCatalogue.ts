/** Published local assets. Identity fields on a vehicle are not a visual asset. */

export type VehicleAsset = {
  id: string;
  src: string;
  thumbnail: string;
  paintMaterials: string[];
  source: string;
  author: string;
  licence: string;
  licenceUrl: string;
  attribution: string;
  description: string;
};

export type CatalogueEntry = {
  id: string;
  make: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  variant: string;
  bodyStyle: string;
  assetId: string | null;
  /** How this entry may be described when its asset is shown. */
  accuracy: 'exact' | 'approximate';
};

export const bodyStyleOptions = [
  'hatchback',
  'sedan',
  'estate',
  'coupe',
  'concept coupe',
  'suv',
  'van',
  'other',
];

/**
 * Body-paint materials in the Khronos Car Concept GLB.
 * Glass, tyres, wheels, lights, trim, and interior names are intentionally absent.
 */
export const conceptPaintMaterials = [
  'Paint 1 Carmine',
  'Paint 2 Carmine',
  'Paint 1 Pearl',
  'Paint 1 Graphite',
  'Paint 2 Pearl',
  'Paint 2 Graphite',
];

export const khronosConceptAsset: VehicleAsset = {
  id: 'khronos-car-concept',
  src: '/models/car-concept.glb',
  thumbnail: '/models/car-concept-thumb.jpg',
  paintMaterials: conceptPaintMaterials,
  source: 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept',
  author: 'Eric Chadwick, Darmstadt Graphics Group GmbH',
  licence: 'CC BY 4.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/legalcode',
  attribution:
    'Car Concept by Eric Chadwick, Darmstadt Graphics Group GmbH, CC BY 4.0. Based on a public-domain model by Unity Fan.',
  description:
    'A realistic concept-car sample. It is not a Volkswagen Polo and not a match for a specific production car.',
};

export const vehicleAssets: Record<string, VehicleAsset> = {
  [khronosConceptAsset.id]: khronosConceptAsset,
};

/**
 * Exact rows require the asset to be that vehicle.
 * Polo rows record the generation and body style, but no Polo file is published.
 */
export const vehicleModelCatalogue: CatalogueEntry[] = [
  {
    id: 'demo-concept-2024',
    make: 'Demonstration',
    model: 'Concept Car',
    yearFrom: 2024,
    yearTo: 2024,
    variant: 'show car',
    bodyStyle: 'concept coupe',
    assetId: khronosConceptAsset.id,
    accuracy: 'exact',
  },
  {
    id: 'demo-concept-2020',
    make: 'Demonstration',
    model: 'Concept Car',
    yearFrom: 2020,
    yearTo: 2023,
    variant: 'show car',
    bodyStyle: 'concept coupe',
    assetId: khronosConceptAsset.id,
    accuracy: 'approximate',
  },
  {
    id: 'polo-2018-hatch',
    make: 'Volkswagen',
    model: 'Polo',
    yearFrom: 2018,
    yearTo: 2021,
    variant: 'hatchback',
    bodyStyle: 'hatchback',
    assetId: null,
    accuracy: 'exact',
  },
  {
    id: 'polo-2018-sedan',
    make: 'Volkswagen',
    model: 'Polo',
    yearFrom: 2018,
    yearTo: 2021,
    variant: 'sedan',
    bodyStyle: 'sedan',
    assetId: null,
    accuracy: 'exact',
  },
  {
    id: 'polo-2022-hatch',
    make: 'Volkswagen',
    model: 'Polo',
    yearFrom: 2022,
    yearTo: 2026,
    variant: 'hatchback',
    bodyStyle: 'hatchback',
    assetId: null,
    accuracy: 'exact',
  },
];

export function isBodyPaintMaterial(name: string, allowed: string[] = conceptPaintMaterials) {
  return allowed.includes(name);
}

export type PaintSample = { name: string; color: string };

/** Returns new material records. Glass and other names keep their colour. */
export function recolorBodyPaint(materials: PaintSample[], color: string, allowed: string[] = conceptPaintMaterials) {
  return materials.map((material) =>
    isBodyPaintMaterial(material.name, allowed) ? { name: material.name, color } : { name: material.name, color: material.color },
  );
}
