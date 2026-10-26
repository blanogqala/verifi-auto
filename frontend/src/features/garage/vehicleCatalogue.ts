/** Published local assets. Identity fields on a vehicle are not a visual asset. */

export type VehicleAsset = {
  id: string;
  src: string;
  /** Reviewed public embed. Loaded by iframe only; no Sketchfab token or GLB download required. */
  embedUrl?: string;
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

/**
 * Reviewed public 3D reference: Polo Mk5 (6R/6C), the generation on which
 * South Africa's 2018–2024 Polo Vivo is based. This is not a verified 2021
 * Polo Vivo trim or a standard Polo Mk6. Source is embedded with attribution
 * under its CC BY licence; do not copy third-party meshes into this repo.
 * A Sketchfab embed controls its own network payload, so no size claim is made.
 */
export const poloMk5ReferenceAsset: VehicleAsset = {
  id: 'sketchfab-polo-mk5-reference',
  src: '',
  embedUrl: 'https://sketchfab.com/models/d0463d789e7c46039e979511ec8f5e92/embed?autostart=1&ui_hint=2&ui_annotations=0&ui_infos=1&ui_stop=0',
  thumbnail: '',
  paintMaterials: [],
  source: 'https://sketchfab.com/3d-models/volkswagen-polo-mk5-2009-2018-d0463d789e7c46039e979511ec8f5e92',
  author: 'Merc_TV (@szymonpasterczyk)',
  licence: 'CC BY',
  licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Volkswagen Polo MK5 2009–2018 by Merc_TV on Sketchfab, CC BY. Generation-level reference only.',
  description: 'Public 3D Polo Mk5 reference. The South African Polo Vivo (2018–2024) is based on the Mk5, but its styling and trim can differ.',
};

export const vehicleAssets: Record<string, VehicleAsset> = {
  [khronosConceptAsset.id]: khronosConceptAsset,
  [poloMk5ReferenceAsset.id]: poloMk5ReferenceAsset,
};

/**
 * Exact rows require the asset to be that vehicle.
 * Polo rows record the generation and body style, but no Polo file is published.
 */
export const vehicleModelCatalogue: CatalogueEntry[] = [
  {
    id: 'polo-vivo-2018-2024-reference',
    make: 'Volkswagen',
    model: 'Polo Vivo',
    yearFrom: 2018,
    yearTo: 2024,
    variant: '',
    bodyStyle: 'hatchback',
    assetId: poloMk5ReferenceAsset.id,
    accuracy: 'approximate',
  },
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
