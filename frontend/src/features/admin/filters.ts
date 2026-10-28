import { providers } from '../../data/professionals';
import { demoAreaByLabel } from '../../data/demoAreas';
import { customerRecords, demoCustomerId } from './customerRecords';
import { jobProfessionalId, activeMechanicProfessionalId } from '../identity/participants';

export const missingValue = 'Not recorded';
export function cityName(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : '';
  return name ? demoAreaByLabel(name)?.city || name : missingValue;
}
export function choices(rows: any[], field: string): string[] {
  return [...new Set<string>(rows.map((row) => String(row[field] || missingValue)))].sort((a, b) =>
    a.localeCompare(b),
  );
}
export function matchesAdminFilters(row: any, city: string, type = 'All') {
  return (
    (city === 'All' || cityName(row.city) === city) &&
    (type === 'All' || (row.type || missingValue) === type)
  );
}
/** City refers to the linked customer account, not an inferred workshop address. */
export function adminJobRows(data: any) {
  const customers = customerRecords(data);
  return (data.jobs || []).map((job: any) => {
    const id = jobProfessionalId(job, data);
    const professional =
      id && id === activeMechanicProfessionalId(data)
        ? data.profile
        : providers.find((p) => p.id === id);
    const customer = customers.find((c) => c.id === (job.customerId || demoCustomerId));
    return {
      ...job,
      city: cityName(customer?.city),
      type: professional?.type || missingValue,
      customerName: customer?.name || '',
    };
  });
}
export function disputeRows(data: any) {
  const stored = Array.isArray(data.disputes) ? data.disputes : [];
  const bookingDisputes = (data.jobs || [])
    .filter((job: any) => job?.disputeStatus || job?.status === 'Disputed')
    .map((job: any) => ({
      id: 'booking-' + job.id, bookingId: job.id, title: 'Repair completion dispute',
      description: job.disputeReason || 'The customer challenged the finished work.',
      status: job.disputeStatus === 'OPEN' || job.status === 'Disputed' ? 'Open' : 'Resolved',
      resolution: job.disputeResolution || '', resolvedAt: job.disputeResolvedAt || null,
      createdAt: job.createdAt || '',
      provider: job.provider || '', customerName: job.customerName || '',
      liveBooking: true,
    }));
  return [...bookingDisputes, ...stored.filter((row: any) =>
    !bookingDisputes.some((b: any) => b.bookingId === row.bookingId))];
}
export function resolveDispute(data: any, id: string, resolution: string, actor: string) {
  if (!resolution.trim()) throw new Error('Add a resolution note first.');
  const existing = disputeRows(data).find((d: any) => d.id === id);
  if (!existing) throw new Error('This dispute no longer exists.');
  if (existing.status === 'Resolved') return data;
  return {
    ...data,
    disputes: disputeRows(data).map((d: any) =>
      d.id === id
        ? {
            ...d,
            status: 'Resolved',
            resolution: resolution.trim(),
            resolvedAt: new Date().toISOString(),
            resolvedBy: actor,
          }
        : d,
    ),
  };
}
