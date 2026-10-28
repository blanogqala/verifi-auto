/** Build owner-visible vehicle history from the exact vehicle's bookings and service records.
 * A finished booking may have both a work report and a ServiceRecord; render it once.
 * Older completed service records without a structured work report remain accessible.
 */
export type VehicleVarEntry = {
  id: string;
  bookingId?: string;
  workshop: string;
  date: string;
  kind: 'report' | 'record';
  final: boolean;
  title: string;
  description: string;
  job?: any;
  record?: any;
};

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function dateOf(job: any) {
  return text(job?.workReport?.updatedAt) || text(job?.createdAt) || text(job?.date) || '';
}

function visibleWork(job: any) {
  const items = Array.isArray(job?.workReport?.items) ? job.workReport.items : [];
  return items.filter((item: any) => item.completed === true);
}

function describeReport(job: any) {
  const work = visibleWork(job);
  if (work.length) return work.slice(0, 2).map((item: any) => text(item.description)).filter(Boolean).join(' · ');
  return text(job?.workReport?.notes).slice(0, 110) || 'Workshop service notes';
}

export function vehicleVarEntries(bookings: any[], records: any[]): VehicleVarEntry[] {
  const byBooking = new Map<string, any>();
  for (const job of bookings) if (job?.id) byBooking.set(String(job.id), job);
  const entries: VehicleVarEntry[] = [];
  const represented = new Set<string>();

  for (const job of bookings) {
    if (!job?.id || !job?.workReport || !Array.isArray(job.workReport.items)) continue;
    const id = String(job.id);
    represented.add(id);
    entries.push({
      id: 'report:' + id,
      bookingId: id,
      workshop: text(job.provider) || 'Workshop not recorded',
      date: dateOf(job),
      kind: 'report',
      final: job.status === 'Completed',
      title: job.status === 'Completed' ? 'Completed service report' : 'Work report · Not final',
      description: describeReport(job),
      job,
    });
  }
  for (const record of records) {
    if (!record?.id) continue;
    const bookingId = text(record.bookingId);
    if ((bookingId && represented.has(bookingId)) || represented.has(String(record.id))) continue;
    // Records without booking relations are genuine historic vehicle entries, not duplicates.
    const job = bookingId ? byBooking.get(bookingId) : undefined;
    entries.push({
      id: 'record:' + record.id,
      bookingId: bookingId || undefined,
      workshop: text(record.provider) || text(job?.provider) || 'Workshop not recorded',
      date: text(record.date) || text(job?.date) || '',
      kind: 'record',
      final: true,
      title: text(record.title) || 'Completed service record',
      description: text(record.notes).slice(0, 110) || 'Service details recorded by the workshop',
      record,
    });
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date));
}

export type WorkshopGroup<T> = { key: string; name: string; entries: T[] };

export function groupByWorkshop<T extends { workshop: string; date: string }>(items: T[]): WorkshopGroup<T>[] {
  const groups = new Map<string, WorkshopGroup<T>>();
  for (const item of items) {
    const name = text(item.workshop) || 'Workshop not recorded';
    const key = name.toLocaleLowerCase('en-ZA');
    const group = groups.get(key) || { key, name, entries: [] };
    group.entries.push(item);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, entries: group.entries.sort((a, b) => b.date.localeCompare(a.date)) }))
    .sort((a, b) => (b.entries[0]?.date || '').localeCompare(a.entries[0]?.date || ''));
}

export function groupedVehicleBookings(bookings: any[]) {
  return groupByWorkshop(bookings
    .filter((job) => Boolean(job?.id))
    .map((job) => ({ ...job, workshop: text(job.provider) || 'Workshop not recorded', date: text(job.date) || text(job.createdAt) || '' })));
}
