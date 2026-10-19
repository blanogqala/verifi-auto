import { providers } from '../../data/professionals';
import { activeMechanicProfessionalId, jobProfessionalId } from '../identity/participants';
import { uniqueJobs, recordedCustomerPayments, paymentRecordTotal } from './paymentRecords';

/** Never merge people by a partial name or guess ownership of a booking. */
export function applicationProfessionalId(data: any, record: any): string {
  if (!record) return '';
  if (record.professionalId) return record.professionalId;
  if (record.own) return activeMechanicProfessionalId(data);
  const matches = providers.filter((p) => p.name === record.name);
  return matches.length === 1 ? matches[0].id : '';
}
export function professionalJobs(data: any, record: any) {
  const id = applicationProfessionalId(data, record);
  return id ? uniqueJobs(data.jobs).filter((job) => jobProfessionalId(job, data) === id) : [];
}
export function accountMetrics(jobs: any[]) {
  const rows = uniqueJobs(jobs);
  return {
    total: rows.length,
    completed: rows.filter((j) => j.status === 'Completed').length,
    active: rows.filter((j) => !['Completed', 'Cancelled', 'Rejected'].includes(j.status)).length,
    stopped: rows.filter((j) => ['Cancelled', 'Rejected'].includes(j.status)).length,
    paid: paymentRecordTotal(recordedCustomerPayments(rows)),
  };
}
export function appendAdminActivity(
  data: any,
  event: { action: string; actor: string; role: string; target?: string },
  at = new Date().toISOString(),
) {
  return {
    ...data,
    adminActivity: [
      { ...event, id: crypto.randomUUID(), at, source: 'browser-demo' },
      ...(Array.isArray(data.adminActivity) ? data.adminActivity : []),
    ].slice(0, 500),
  };
}
