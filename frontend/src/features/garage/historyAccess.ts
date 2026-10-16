/**
 * Demo permission flow. Default is no access.
 *
 * A customer may grant the assigned professional selected records for the
 * booking vehicle after the mechanic accepts, until the booking ends.
 * Cancellation and rejection revoke access immediately. A recorded completion
 * (the demo payment that moves the booking to Completed) expires access at
 * that stored timestamp.
 *
 * Browser visibility is not security. A real product must enforce this on the
 * server. See features/sync/realtimeContract.ts.
 */

const openStatuses = [
  'Confirmed',
  'Awaiting approval',
  'Changes requested',
  'Approved',
  'In progress',
  'Awaiting payment',
];

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function grantsOf(data: any) {
  return Array.isArray(data?.historyAccess) ? data.historyAccess : [];
}

export function canOfferHistoryAccess(job: any) {
  return !!job && openStatuses.includes(job.status) && !!text(job.professionalId) && !!text(job.vehicleId);
}

export function activeGrantForBooking(data: any, bookingId: string) {
  return grantsOf(data).find(
    (grant: any) => grant?.bookingId === bookingId && grant?.status === 'active',
  );
}

function recordBelongsToVehicle(record: any, vehicleId: string) {
  return text(record?.vehicleId) === vehicleId;
}

export function grantHistoryAccess(
  data: any,
  input: {
    bookingId: string;
    customerId: string;
    recordIds: string[];
    now?: string;
  },
) {
  const job = (data.jobs || []).find((item: any) => item.id === input.bookingId);
  if (!job) throw Error('Booking not found.');
  const owner = text(job.customerId) || 'cust-01';
  if (owner !== input.customerId) throw Error('Only the customer who owns this booking can share history.');
  if (!canOfferHistoryAccess(job))
    throw Error('History can be shared after the assigned professional accepts, until the booking ends.');
  const ids = [...new Set((input.recordIds || []).map((id) => text(id)).filter(Boolean))];
  const records = Array.isArray(data.records) ? data.records : [];
  if (!ids.length) throw Error('Choose at least one record for this vehicle.');
  if (ids.some((id) => !records.some((record: any) => record.id === id && recordBelongsToVehicle(record, job.vehicleId))))
    throw Error('Only records for this booking vehicle can be shared.');
  const now = input.now || new Date().toISOString();
  const next = {
    id: activeGrantForBooking(data, job.id)?.id || `grant-${job.id}`,
    bookingId: job.id,
    customerId: input.customerId,
    professionalId: job.professionalId,
    vehicleId: job.vehicleId,
    recordIds: ids,
    status: 'active',
    grantedAt: now,
  };
  const historyAccess = [
    next,
    ...grantsOf(data).filter((grant: any) => grant?.bookingId !== job.id || grant?.status !== 'active'),
  ];
  return { ...data, historyAccess };
}

export function revokeHistoryAccess(data: any, grantId: string, customerId: string, now = new Date().toISOString()) {
  let found = false;
  const historyAccess = grantsOf(data).map((grant: any) => {
    if (grant?.id !== grantId) return grant;
    found = true;
    if (grant.customerId !== customerId) throw Error('Only the customer who granted access can revoke it.');
    if (grant.status !== 'active') return grant;
    return { ...grant, status: 'revoked', revokedAt: now };
  });
  if (!found) throw Error('Access grant not found.');
  return { ...data, historyAccess };
}

export function settleHistoryAccess(data: any, job: any, action: string, at: string) {
  const historyAccess = grantsOf(data).map((grant: any) => {
    if (grant?.bookingId !== job.id || grant?.status !== 'active') return grant;
    if (action === 'cancel' || action === 'reject') return { ...grant, status: 'revoked', revokedAt: at };
    if (action === 'pay') return { ...grant, status: 'expired', expiresAt: at };
    return grant;
  });
  return historyAccess;
}

export function sharedRecordsForProfessional(data: any, job: any, professionalId: string) {
  const grant = activeGrantForBooking(data, job?.id);
  if (!grant || grant.professionalId !== professionalId) return [];
  const allowed = new Set(grant.recordIds || []);
  return (data.records || []).filter(
    (record: any) => allowed.has(record.id) && record.vehicleId === grant.vehicleId,
  );
}
