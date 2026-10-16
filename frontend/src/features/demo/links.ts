import { providers } from '../../data/professionals';

export function vehicleSnapshot(vehicle: any) {
  if (!vehicle) return '';
  return [vehicle.year, vehicle.make, vehicle.model]
    .map((part) => (typeof part === 'string' || typeof part === 'number' ? String(part).trim() : ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function vehicleOptionLabel(vehicle: any) {
  const name = vehicleSnapshot(vehicle);
  const registration = typeof vehicle?.registration === 'string' ? vehicle.registration.trim() : '';
  return registration ? `${name} · ${registration}` : name;
}

export function activeVehicles(vehicles: any[]) {
  return (Array.isArray(vehicles) ? vehicles : []).filter(
    (vehicle) => vehicle && typeof vehicle.id === 'string' && vehicle.id && vehicle.archived !== true,
  );
}

/** Link only when one active vehicle has this exact year, make, and model. */
export function uniqueVehicleId(label: unknown, vehicles: any[]) {
  const wanted = typeof label === 'string' ? label.trim() : '';
  if (!wanted) return '';
  const matches = activeVehicles(vehicles).filter((vehicle) => vehicleSnapshot(vehicle) === wanted);
  return matches.length === 1 ? matches[0].id : '';
}

export function professionalOptions(data: any) {
  const options = providers.map((provider) => ({ id: provider.id, name: provider.name }));
  const status = data?.application?.status;
  const name = typeof data?.profile?.name === 'string' ? data.profile.name.trim() : '';
  if (status === 'Approved' && name) {
    const id = typeof data.profile.id === 'string' && data.profile.id ? data.profile.id : 'pro-own';
    options.push({ id, name });
  }
  return options;
}

/** Link only when one directory name matches. Two profiles with the same name stay unlinked. */
export function uniqueProfessionalId(name: unknown, options: { id: string; name: string }[]) {
  const wanted = typeof name === 'string' ? name.trim() : '';
  if (!wanted) return '';
  const ids = [
    ...new Set(options.filter((option) => option.name.trim() === wanted).map((option) => option.id)),
  ];
  return ids.length === 1 ? ids[0] : '';
}

export function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function withRecordLinks(record: any, vehicles: any[], options: { id: string; name: string }[]) {
  if (!record || typeof record !== 'object') return record;
  const vehicleLabel = textValue(record.vehicleLabel) || textValue(record.vehicle);
  const vehicleId = textValue(record.vehicleId) || uniqueVehicleId(vehicleLabel, vehicles);
  const professionalId =
    textValue(record.professionalId) || uniqueProfessionalId(textValue(record.provider), options);
  return {
    ...record,
    ...(vehicleLabel ? { vehicle: vehicleLabel, vehicleLabel } : {}),
    ...(vehicleId ? { vehicleId } : {}),
    ...(professionalId ? { professionalId } : {}),
  };
}
