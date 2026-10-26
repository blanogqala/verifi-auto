/**
 * Vehicle identity never generates manufacturer-specific geometry on its own.
 * An exact 3D asset must have been published, checked and licensed separately.
 * When none is available, the client may render a labelled body-style preview.
 */
type RecordAsset = {
  id: string; variant: string; modelUrl: string; verifiedAt: Date;
  licence: string; attribution: string; sourceUrl: string;
};
type Identity = {
  make: string; model: string; year: number; variant: string; bodyStyle: string;
};
const normalized = (value: string) => value.trim().toLowerCase();
const bodyStyles = new Set(['hatchback', 'sedan', 'estate', 'coupe', 'concept coupe', 'suv', 'van']);
function publishedModelUrl(url: string) {
  return /^\/models\/[a-z0-9_.\-/]+\.glb$/i.test(url) ||
    /^https:\/\/[a-z0-9.-]+(?::443)?\/[a-z0-9_./%~+-]+\.glb(?:\?[a-z0-9_=%&.-]+)?$/i.test(url);
}
export function selectVerified3dAsset<T extends RecordAsset>(
  identity: Pick<Identity, 'variant'>,
  assets: T[],
): T | null {
  const wanted = normalized(identity.variant || '');
  const safe = assets.filter((asset) => (
    !!asset.licence.trim() && !!asset.attribution.trim() &&
    !!asset.sourceUrl.trim() && !!asset.verifiedAt && publishedModelUrl(asset.modelUrl)
  ));
  // Specific trims must match precisely. A generic model may be used only
  // when it is the sole reviewed asset for this model year.
  const exact = wanted
    ? safe.filter(asset => normalized(asset.variant) === wanted)
    : safe.filter(asset => !normalized(asset.variant));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return null;
  return safe.length === 1 && !normalized(safe[0].variant) ? safe[0] : null;
}
export function vehicle3dPlan(identity: Identity, verified: boolean) {
  const style = normalized(identity.bodyStyle || '');
  return {
    kind: verified ? 'verified' as const : 'representative' as const,
    bodyStyle: bodyStyles.has(style) ? style : 'other',
    // Only a reviewed make/model/year/trim asset is called exact.
    label: verified ? 'Verified vehicle 3D model'
      : 'Interactive 3D body-style preview — not an exact manufacturer model',
    reason: verified
      ? 'The published 3D model was reviewed and licensed for this vehicle identity.'
      : 'Make, model, year and variant identify a vehicle, but do not contain its 3D geometry. A representative shape is shown until a matching reviewed 3D model is available.',
  };
}
