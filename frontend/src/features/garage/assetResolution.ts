import {
  type CatalogueEntry,
  type VehicleAsset,
  khronosConceptAsset,
  vehicleAssets,
  vehicleModelCatalogue,
} from './vehicleCatalogue';

export type AssetAccuracy = 'exact' | 'approximate' | 'illustrative' | 'unavailable';

export type AssetResolution = {
  status: 'exact' | 'approximate' | 'illustrative' | 'ambiguous' | 'unavailable';
  accuracy: AssetAccuracy;
  label: string;
  reason: string;
  asset: VehicleAsset | null;
  entry: CatalogueEntry | null;
  choices: CatalogueEntry[];
};

const illustrativeLabel = 'Illustrative model — not an exact match';
const approximateLabel = 'Approximate model — not an exact match';

function norm(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function yearOf(vehicle: any) {
  const year = Number(vehicle?.year);
  return Number.isFinite(year) ? year : NaN;
}

/**
 * Local catalogue lookup. This does not contact a server and does not invent a remote hit.
 * A future backend can implement the same result shape after a reviewed asset is published.
 */
export type VehicleAssetResolver = {
  resolve(vehicle: any): AssetResolution;
};

export function createLoadGeneration() {
  let current = 0;
  return {
    begin() {
      current += 1;
      return current;
    },
    isCurrent(id: number) {
      return id === current;
    },
  };
}

function illustrative(reason: string, entry: CatalogueEntry | null = null): AssetResolution {
  return {
    status: 'illustrative',
    accuracy: 'illustrative',
    label: illustrativeLabel,
    reason,
    asset: khronosConceptAsset,
    entry,
    choices: [],
  };
}

export function resolveVehicleAsset(vehicle: any): AssetResolution {
  if (!vehicle) {
    return {
      status: 'unavailable',
      accuracy: 'unavailable',
      label: '',
      reason: 'No vehicle is selected.',
      asset: null,
      entry: null,
      choices: [],
    };
  }
  const make = norm(vehicle.make);
  const model = norm(vehicle.model);
  const year = yearOf(vehicle);
  const bodyStyle = norm(vehicle.bodyStyle);
  const variantText = norm(vehicle.variant);
  // SA-specific automotive identity guard: Polo Vivo (2018–24) uses a Mk5
  // platform; the standard Polo introduced in 2018 is a different generation.
  // A saved "Polo 1.6" is often a Vivo in SA, but this remains a *suggestion*,
  // NEVER a verified identification or an exact physical-car representation.
  const explicitlyVivo = ['polo vivo', 'vivo'].includes(model);
  const likelyVivo = model === 'polo' && year >= 2018 && year <= 2024 &&
    /(?:^|\\s)1[.,]6(?:\\b|\\s)/.test(variantText) &&
    !/(gti|sedan|virtus|plus|6r|mk6|aw)/.test(variantText);
  if (make === 'volkswagen' && year >= 2018 && year <= 2024 &&
      (explicitlyVivo || likelyVivo) &&
      (!bodyStyle || bodyStyle === 'hatchback')) {
    const entry = vehicleModelCatalogue.find(item => item.id === 'polo-vivo-2018-2024-reference') || null;
    const asset = entry?.assetId ? vehicleAssets[entry.assetId] : null;
    if (asset && entry) {
      return {
        status: 'approximate',
        accuracy: 'approximate',
        label: 'Polo Mk5 3D reference — not your exact trim',
        reason: likelyVivo
          ? 'A 1.6 Polo may be a Polo Vivo in South Africa. Please confirm the model in Edit vehicle. This Mk5 model is a generation-level reference, not an exact match.'
          : 'The Polo Vivo uses Mk5 Polo architecture, but bumpers, lights, interior and wheels may differ from this reference.',
        asset,
        entry,
        choices: [],
      };
    }
  }
  const named = vehicleModelCatalogue.filter((entry) => norm(entry.make) === make && norm(entry.model) === model);
  if (!named.length || !Number.isFinite(year)) {
    return illustrative('No published catalogue entry matches this make and model.');
  }
  const generation = named.filter((entry) => year >= entry.yearFrom && year <= entry.yearTo);
  if (!generation.length) {
    return illustrative('This year is outside the generations listed for this model.');
  }
  const variant = norm(vehicle.variant);
  const body = norm(vehicle.bodyStyle);
  const matched = generation.filter((entry) => {
    if (variant && norm(entry.variant) !== variant) return false;
    if (body && norm(entry.bodyStyle) !== body) return false;
    return true;
  });
  if (!matched.length) {
    return illustrative('The body style and variant do not match the same listed vehicle.');
  }
  if (matched.length > 1) {
    return {
      status: 'ambiguous',
      accuracy: 'unavailable',
      label: '',
      reason: 'Choose a body style. This name covers more than one variant.',
      asset: null,
      entry: null,
      choices: matched,
    };
  }
  const chosen = matched[0];
  if (!chosen.assetId) {
    return illustrative('No verified 3D file is published for this vehicle. A local demonstration model is shown.', chosen);
  }
  const asset = vehicleAssets[chosen.assetId];
  if (!asset) {
    return {
      status: 'unavailable',
      accuracy: 'unavailable',
      label: '',
      reason: 'The catalogue entry has no local file.',
      asset: null,
      entry: chosen,
      choices: [],
    };
  }
  return {
    status: chosen.accuracy,
    accuracy: chosen.accuracy,
    label: chosen.accuracy === 'approximate' ? approximateLabel : '',
    reason:
      chosen.accuracy === 'exact'
        ? 'This catalogue entry is the published file for this make, model, year, and body style.'
        : 'The published file is a similar body from another year, not an exact match.',
    asset,
    entry: chosen,
    choices: [],
  };
}

export const localCatalogueResolver: VehicleAssetResolver = {
  resolve: resolveVehicleAsset,
};

/** Exact catalogue rows only. A Polo without a published file is not an exact model. */
export function catalogueModel(vehicle: any): CatalogueEntry | null {
  const match = resolveVehicleAsset(vehicle);
  if (match.status !== 'exact' || !match.entry?.assetId) return null;
  return match.entry;
}

export function modelForVehicle(vehicle: any) {
  const match = resolveVehicleAsset(vehicle);
  return {
    illustrative: match.accuracy === 'illustrative' || match.accuracy === 'approximate',
    originalGeometry: false,
    label: match.label,
    asset: match.asset,
    accuracy: match.accuracy,
  };
}
