/** Active-vehicle selection for the garage showroom. Archived vehicles are already excluded by the caller. */

export function selectVehicleId(vehicles: { id: string }[], selectedId: string, offset: number) {
  const ids = vehicles.map((vehicle) => vehicle.id).filter((id) => typeof id === 'string' && id);
  if (!ids.length) return '';
  const index = ids.indexOf(selectedId);
  const current = index === -1 ? 0 : index;
  if (ids.length === 1 || offset === 0) return ids[current];
  return ids[(current + offset + ids.length) % ids.length];
}

export function vehicleCardLabel(vehicle: { make?: string; model?: string; registration?: string }, vehicles: { make?: string; model?: string }[]) {
  const name = [vehicle.make, vehicle.model]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(' ');
  const key = name.toLowerCase();
  const duplicates = vehicles.filter((item) => {
    const other = [item.make, item.model]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return other === key;
  });
  const registration = typeof vehicle.registration === 'string' ? vehicle.registration.trim() : '';
  if (duplicates.length > 1 && registration) return `${name}, ${registration}`;
  return name || 'Vehicle';
}

/** Exact published thumbnails only. An illustrative model must not pose as another car. */
export function vehicleCardImage(match: { status?: string; asset?: { thumbnail?: string } | null }) {
  if (match.status === 'exact' && match.asset?.thumbnail) return match.asset.thumbnail;
  return '';
}
