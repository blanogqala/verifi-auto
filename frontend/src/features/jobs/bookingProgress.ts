export type ProgressState = 'complete' | 'current' | 'upcoming' | 'stopped';

export type ProgressStep = {
  id: string;
  label: string;
  state: ProgressState;
  note: string;
};

const labels = ['Requested', 'Quotation', 'Awaiting payment', 'In progress', 'Awaiting confirmation', 'Completed'];
const notes = [
  'Waiting for the workshop to accept the request. No quotation has been issued yet.',
  'The workshop has accepted the request and is preparing a quotation. Review and approve the proposed repairs.',
  'The approved quotation must be paid before the workshop can begin work. Online payments are not configured yet.',
  'Payment has been recorded. The workshop may begin the approved repairs, or is currently working.',
  'The workshop submitted its report. Confirm the work or open a dispute; funds cannot be released during a dispute.',
  'The customer accepted the completed service. A rating and review can now be submitted.',
];
const indexByStatus: Record<string, number> = {
  Requested: 0,
  Confirmed: 1,
  'Awaiting approval': 1,
  'Changes requested': 1,
  Approved: 2,
  'Awaiting payment': 2, // Historical unpaid jobs remain visible without falsely marking payment complete.
  'Ready to start': 3,
  'In progress': 3,
  'Awaiting confirmation': 4,
  Disputed: 4,
  Completed: 5,
};
export function bookingProgress(job: { status?: string; accepted?: boolean; rejectionReason?: string; live?: boolean; disputeReason?: string }) {
  const status = typeof job?.status === 'string' ? job.status : '';
  const terminal = status === 'Rejected' ? 'rejected' : status === 'Cancelled' ? 'cancelled' : status === 'Disputed' ? 'disputed' : '';
  const index = status === 'Cancelled' ? (job.accepted ? 1 : 0) : indexByStatus[status] ?? 0;
  const steps: ProgressStep[] = labels.map((label, step) => {
    const state: ProgressState = terminal && step === index ? 'stopped'
      : terminal && step > index ? 'upcoming'
      : status === 'Completed' || step < index ? 'complete'
      : step === index ? 'current' : 'upcoming';
    let note = notes[step];
    if (status === 'Confirmed' && step === 1) note = 'Request accepted. The workshop will inspect the vehicle and send a quotation.';
    if (status === 'Awaiting approval' && step === 1) note = 'Quotation received. Waiting for the customer to approve the repairs.';
    if (status === 'Changes requested' && step === 1) note = 'Customer requested changes to the quotation.';
    if (status === 'Ready to start' && step === 3) note = 'Test payment recorded. The workshop can start; no real money has been held in escrow.';
    if (status === 'Awaiting confirmation' && step === 4) note = 'Workshop marked work done. Customer must confirm or dispute the completed service.';
    if (status === 'Disputed' && step === 4) note = job.disputeReason ? 'Disputed: ' + job.disputeReason : 'Customer opened a dispute. Admin review required; release is blocked.';
    if (status === 'Rejected' && step === 0) note = job.rejectionReason ? 'Rejected: ' + job.rejectionReason : 'Professional rejected this request.';
    if (status === 'Cancelled' && step === index) note = 'This booking was cancelled.';
    return { id: label.toLowerCase().replace(/\s+/g, '-'),
      label: terminal && step === index ? (status === 'Disputed' ? 'Disputed' : status) : label, state, note };
  });
  return {
    steps, current: index, terminal,
    summary: steps[index]?.note || '',
    next: status === 'Disputed' ? 'An administrator must review the evidence and record a resolution.'
      : status === 'Completed' ? 'The customer can now rate the workshop.'
      : steps[index]?.note || '',
  };
}

export function formatWhen(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.trim();
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function formatDay(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return 'Date not recorded';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00`);
    if (!Number.isNaN(date.getTime())) return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(date);
  }
  return formatWhen(value) || value;
}
