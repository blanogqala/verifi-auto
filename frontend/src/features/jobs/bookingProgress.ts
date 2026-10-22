export type ProgressState = 'complete' | 'current' | 'upcoming' | 'stopped';

export type ProgressStep = {
  id: string;
  label: string;
  state: ProgressState;
  note: string;
};

const notes = [
  'The request has been sent. It is not confirmed yet.',
  'The professional has accepted the request.',
  'The quotation lists every charge for approval, including any assessment or diagnostics. Repairs stay waiting until the customer approves it.',
  'The customer approved the quotation. Work can start only after that approval.',
  'The approved work is underway.',
  'The approved work is finished. Payment applies to this quotation, not a new charge.',
  'A demo payment was recorded. This booking is complete.',
];

const labels = ['Requested', 'Confirmed', 'Quotation', 'Approved', 'In progress', 'Awaiting payment', 'Completed'];

const indexByStatus: Record<string, number> = {
  Requested: 0,
  Confirmed: 1,
  'Awaiting approval': 2,
  'Changes requested': 2,
  Approved: 3,
  'In progress': 4,
  'Awaiting payment': 5,
  Completed: 6,
};

export function bookingProgress(job: { status?: string; accepted?: boolean; rejectionReason?: string; live?: boolean }) {
  const status = typeof job?.status === 'string' ? job.status : '';
  let terminal: '' | 'rejected' | 'cancelled' = '';
  let index = indexByStatus[status] ?? 0;
  if (status === 'Rejected') {
    terminal = 'rejected';
    index = 0;
  } else if (status === 'Cancelled') {
    terminal = 'cancelled';
    index = job?.accepted ? 1 : 0;
  }
  const complete = status === 'Completed';
  const steps: ProgressStep[] = labels.map((label, step) => {
    let state: ProgressState = 'upcoming';
    if (terminal) state = step < index ? 'complete' : step === index ? 'stopped' : 'upcoming';
    else if (complete || step < index) state = 'complete';
    else if (step === index) state = 'current';
    let note = job.live && step === 6 ? 'This booking is complete. Its service and payment records remain available.' : notes[step];
    if (status === 'Changes requested' && step === 2) note = 'Changes were requested. This quotation is not approved.';
    if (terminal === 'rejected' && step === index) note = job?.rejectionReason ? `Rejected: ${job.rejectionReason}` : 'This request was rejected. It is not complete.';
    if (terminal === 'cancelled' && step === index) note = 'This request was cancelled. It is not complete.';
    return { id: label.toLowerCase().replace(/\s+/g, '-'), label: terminal && step === index ? (terminal === 'rejected' ? 'Rejected' : 'Cancelled') : label, state, note };
  });
  const copy: Record<string, { summary: string; next: string }> = {
    Requested: { summary: 'Waiting for the professional to respond.', next: 'You can still edit or cancel this request.' },
    Confirmed: { summary: 'The request is accepted. A quotation has not been approved.', next: 'You can cancel until a quotation is in review.' },
    'Awaiting approval': { summary: 'A quotation is ready for review.', next: 'Approve it, or request changes. Repairs cannot start before approval.' },
    'Changes requested': { summary: 'Changes were requested on the quotation.', next: 'The professional needs to send an updated quotation.' },
    Approved: { summary: 'The selected repairs are approved.', next: 'You can pay for the approved repairs. The professional can start the authorised work.' },
    'In progress': { summary: 'Approved work is in progress.', next: 'Payment is available for the approved repairs.' },
    'Awaiting payment': { summary: 'The approved work is finished and waiting for payment.', next: 'Review and pay this invoice once.' },
    Completed: { summary: 'This booking is complete.', next: 'The recorded payment stays on this booking.' },
    Rejected: { summary: 'This request was rejected. It is not complete.', next: 'No repair or payment step follows a rejected request.' },
    Cancelled: { summary: 'This request was cancelled. It is not complete.', next: 'No further repair step is available.' },
  };
  const text = copy[status] || { summary: 'This booking has no recognised status.', next: 'Open the activity history for anything that was recorded.' };
  return { steps, current: index, terminal, summary: text.summary, next: text.next };
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
