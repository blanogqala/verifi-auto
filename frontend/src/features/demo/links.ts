import { providers } from '../../data/professionals';

export type LinkDecision = 'resolved' | 'ambiguous' | 'unmatched';

const decisions: LinkDecision[] = ['resolved', 'ambiguous', 'unmatched'];

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

export function textValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function storedDecision(value: unknown): LinkDecision | '' {
  return decisions.includes(value as LinkDecision) ? (value as LinkDecision) : '';
}

/** Every saved vehicle counts, including archived ones. */
export function vehiclesMatchingLabel(label: unknown, vehicles: any[]) {
  const wanted = textValue(label);
  if (!wanted) return [];
  return (Array.isArray(vehicles) ? vehicles : []).filter(
    (vehicle) => vehicle && textValue(vehicle.id) && vehicleSnapshot(vehicle) === wanted,
  );
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

function decideId(label: string, matches: { id: string }[]) {
  if (!label) return { id: '', decision: 'unmatched' as LinkDecision };
  if (matches.length === 1) return { id: matches[0].id, decision: 'resolved' as LinkDecision };
  if (matches.length > 1) return { id: '', decision: 'ambiguous' as LinkDecision };
  return { id: '', decision: 'unmatched' as LinkDecision };
}

/**
 * First pass may link a legacy name. Later saves keep that decision.
 * Ambiguous and unmatched names are not retried when the garage changes.
 */
export function withRecordLinks(record: any, vehicles: any[], options: { id: string; name: string }[]) {
  if (!record || typeof record !== 'object') return record;
  const vehicleLabel = textValue(record.vehicleLabel) || textValue(record.vehicle);
  const provider = textValue(record.provider);
  const vehicleDecision = storedDecision(record.vehicleLink);
  const professionalDecision = storedDecision(record.professionalLink);
  let vehicleId = textValue(record.vehicleId);
  let professionalId = textValue(record.professionalId);
  let nextVehicleDecision = vehicleDecision;
  let nextProfessionalDecision = professionalDecision;

  let candidates = Array.isArray(record.vehicleLinkCandidates)
    ? record.vehicleLinkCandidates.filter((id: unknown) => typeof id === 'string' && id)
    : [];
  if (!nextVehicleDecision) {
    if (vehicleId) {
      nextVehicleDecision = 'resolved';
      candidates = candidates.length ? candidates : [vehicleId];
    } else {
      const matches = vehiclesMatchingLabel(vehicleLabel, vehicles);
      const decided = decideId(vehicleLabel, matches);
      vehicleId = decided.id;
      nextVehicleDecision = decided.decision;
      candidates = matches.map((match) => match.id);
    }
  } else if (nextVehicleDecision !== 'resolved') {
    vehicleId = '';
  } else if (!candidates.length && vehicleId) {
    candidates = [vehicleId];
  }

  if (!nextProfessionalDecision) {
    if (professionalId) nextProfessionalDecision = 'resolved';
    else {
      const matches = options.filter((option) => option.name.trim() === provider);
      const unique = [...new Set(matches.map((option) => option.id))];
      const decided = decideId(provider, unique.map((id) => ({ id })));
      professionalId = decided.id;
      nextProfessionalDecision = decided.decision;
    }
  } else if (nextProfessionalDecision !== 'resolved') {
    professionalId = '';
  }

  return {
    ...record,
    ...(vehicleLabel ? { vehicle: vehicleLabel, vehicleLabel } : {}),
    vehicleLink: nextVehicleDecision,
    vehicleLinkCandidates: candidates,
    ...(vehicleId ? { vehicleId } : { vehicleId: '' }),
    professionalLink: nextProfessionalDecision,
    ...(professionalId ? { professionalId } : { professionalId: '' }),
  };
}

export function historyCouldBelongTo(item: any, vehicle: any) {
  if (!item || !vehicle?.id) return false;
  if (item.vehicleLink === 'resolved') return textValue(item.vehicleId) === vehicle.id;
  const candidates = Array.isArray(item.vehicleLinkCandidates) ? item.vehicleLinkCandidates : [];
  if (item.vehicleLink === 'ambiguous' && candidates.length) return candidates.includes(vehicle.id);
  if (textValue(item.vehicleId)) return textValue(item.vehicleId) === vehicle.id;
  const label = textValue(item.vehicleLabel) || textValue(item.vehicle);
  return !!label && label === vehicleSnapshot(vehicle);
}

export function unresolvedHistory(data: any) {
  const owner = textValue(data?.settings?.id) || 'cust-01';
  const jobs = (Array.isArray(data?.jobs) ? data.jobs : [])
    .filter((item: any) => {
      const customerId = textValue(item?.customerId) || 'cust-01';
      return customerId === owner && (item?.vehicleLink === 'ambiguous' || item?.vehicleLink === 'unmatched');
    })
    .map((item: any) => ({ ...item, historyKind: 'job' }));
  const records = (Array.isArray(data?.records) ? data.records : [])
    .filter((item: any) => item?.vehicleLink === 'ambiguous' || item?.vehicleLink === 'unmatched')
    .map((item: any) => ({ ...item, historyKind: 'record' }));
  return [...jobs, ...records];
}
