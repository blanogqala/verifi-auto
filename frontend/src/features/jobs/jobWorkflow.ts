import { quoteTotalCents } from './quotations';

const eventLabels: Record<string, string> = {
  confirm: 'Request accepted',
  quote: 'Quotation updated',
  approve: 'Quotation approved',
  changes: 'Changes requested',
  start: 'Work started',
  complete: 'Work completed',
  pay: 'Demo payment recorded',
  reject: 'Request rejected',
  cancel: 'Request cancelled',
};

function withEvent(job: any, patch: any, type: string) {
  const { events: _ignored, ...rest } = patch || {};
  const events = Array.isArray(job.events) ? [...job.events] : [];
  events.push({ at: new Date().toISOString(), type, label: eventLabels[type] || type });
  return { ...job, ...rest, events };
}

export function quoteTotal(job: any) {
  const cents = quoteTotalCents(job?.items || []);
  return Number.isFinite(cents) ? cents / 100 : NaN;
}
export function transitionJob(job: any, action: string, extra: any = {}) {
  switch (action) {
    case 'confirm':
      if (job.status !== 'Requested') throw Error('Only a new request can be confirmed.');
      return withEvent(job, { status: 'Confirmed', accepted: true, quoteApproved: false }, 'confirm');
    case 'quote':
      if (!['Confirmed', 'Awaiting approval', 'Changes requested'].includes(job.status))
        throw Error('Confirm the assessment before creating a quote.');
      if (
        !extra.items?.length ||
        extra.items.some(
          (i: any) => !i.name.trim() || !Number.isFinite(Number(i.amount)) || Number(i.amount) <= 0,
        )
      )
        throw Error('Add valid quote line items.');
      return withEvent(
        job,
        { ...extra, status: 'Awaiting approval', quoteApproved: false },
        'quote',
      );
    case 'approve':
      if (job.status !== 'Awaiting approval') throw Error('This quote is not awaiting approval.');
      return withEvent(job, { status: 'Approved', quoteApproved: true }, 'approve');
    case 'changes':
      if (job.status !== 'Awaiting approval') throw Error('This quote is not awaiting approval.');
      return withEvent(job, { ...extra, status: 'Changes requested' }, 'changes');
    case 'start':
      if (job.status !== 'Approved' || !job.quoteApproved)
        throw Error('Customer approval is required first.');
      return withEvent(job, { status: 'In progress' }, 'start');
    case 'complete':
      if (job.status !== 'In progress') throw Error('Start the approved work first.');
      if (!extra.completionNotes?.trim())
        throw Error('Add work details before completing the job.');
      return withEvent(job, { ...extra, status: 'Awaiting payment' }, 'complete');
    case 'pay':
      if (job.status !== 'Awaiting payment' || !job.quoteApproved)
        throw Error('Only completed approved work can be paid.');
      if (job.paid === true) throw Error('This invoice has already been paid.');
      return withEvent(
        job,
        {
          status: 'Completed',
          paid: true,
          paidAt: new Date().toISOString(),
          paymentReference:
            typeof job.paymentReference === 'string' && job.paymentReference
              ? job.paymentReference
              : `DEMO-${job.id || 'payment'}`,
        },
        'pay',
      );
    case 'reject':
      if (job.status !== 'Requested') throw Error('Only a pending request can be rejected.');
      if (!extra.reason?.trim()) throw Error('Add a short reason for rejecting this request.');
      return withEvent(
        job,
        {
          status: 'Rejected',
          accepted: false,
          rejectionReason: extra.reason.trim(),
        },
        'reject',
      );
    case 'cancel':
      if (!['Requested', 'Confirmed'].includes(job.status))
        throw Error('This request cannot be cancelled at this stage.');
      return withEvent(
        job,
        {
          status: 'Cancelled',
          accepted: job.status === 'Confirmed' ? true : job.accepted === true,
        },
        'cancel',
      );
    default:
      throw Error('Unknown action');
  }
}
