import { quoteTotal } from '../jobs/jobWorkflow';

/** Keep the first record for an id so a paid job is never totalled twice. */
export function uniqueJobs(jobs: any[]) {
  const seen = new Set<string>();
  return (Array.isArray(jobs) ? jobs : []).filter((job) => {
    if (!job || typeof job.id !== 'string' || !job.id) return false;
    if (seen.has(job.id)) return false;
    seen.add(job.id);
    return true;
  });
}

export function recordedCustomerPayments(jobs: any[]) {
  return uniqueJobs(jobs).filter((job) => job.paid === true);
}

export function awaitingCustomerPayments(jobs: any[]) {
  return uniqueJobs(jobs).filter((job) => job.status === 'Awaiting payment' && job.paid !== true);
}

export function paymentRecordTotal(jobs: any[]) {
  return jobs.reduce((sum, job) => sum + quoteTotal(job), 0);
}

export function money(amount: number) {
  return 'R' + amount.toLocaleString();
}
