const acceptedStatuses = [
  'Confirmed',
  'Awaiting approval',
  'Changes requested',
  'Approved',
  'In progress',
  'Awaiting payment',
  'Completed',
];

/** Accepted repair work, including jobs cancelled after acceptance. */
export function isAcceptedJob(job: any) {
  if (!job) return false;
  if (job.status === 'Requested' || job.status === 'Rejected') return false;
  if (job.status === 'Cancelled') return job.accepted === true;
  return acceptedStatuses.includes(job.status);
}

export function isPendingRequest(job: any) {
  return job?.status === 'Requested';
}

export function isRejectedRequest(job: any) {
  return job?.status === 'Rejected';
}

/** Cancelled before the mechanic accepted the request. */
export function isCancelledRequest(job: any) {
  return job?.status === 'Cancelled' && job.accepted !== true;
}

/** Mark jobs that already passed acceptance. Do not invent dates for older records. */
export function migrateJob(job: any) {
  if (!job || typeof job !== 'object') return job;
  if (job.accepted === true || job.accepted === false) return job;
  if (acceptedStatuses.includes(job.status)) return { ...job, accepted: true };
  return job;
}
