import { quoteTotalCents, quoteReviewToken, quoteLineKey } from './quotations';

const eventLabels: Record<string, string> = {
  confirm: 'Request accepted',
  quote: 'Quotation updated',
  approve: 'Quotation approved',
  changes: 'Changes requested',
  start: 'Work started',
  complete: 'Work submitted for customer confirmation',
  'confirm-work': 'Customer confirmed completed work',
  'dispute-work': 'Customer disputed completed work',
  'resolve-accept': 'Admin accepted the workshop completion',
  'resolve-rework': 'Admin requested corrective work',
  pay: 'Test payment recorded (no escrow transfer)',
  reject: 'Request rejected',
  cancel: 'Request cancelled',
  'withdraw-quote': 'Quotation withdrawn',
  'start-quote': 'Additional repairs started',
};

function withEvent(job: any, patch: any, type: string) {
  const { events: _ignored, ...rest } = patch || {};
  const events = Array.isArray(job.events) ? [...job.events] : [];
  events.push({ at: new Date().toISOString(), type, label: eventLabels[type] || type });
  return { ...job, ...rest, events };
}

/** Submitted quotation total in rands. Legacy job.fee is not added. */
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
      if (job.paid || (job.status === 'Approved' && !job.customerRequest) || !['Confirmed', 'Awaiting approval', 'Changes requested', 'Approved'].includes(job.status))
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
      if (job.paid || !['Awaiting approval', 'Approved'].includes(job.status)) throw Error('Repair choices can only change before payment or work starts.');
      if (extra.reviewToken && extra.reviewToken !== quoteReviewToken(job)) throw Error('The quotation changed. Close and reopen it to review the latest prices.');
      if (extra.selectedLineIds && (!Array.isArray(extra.selectedLineIds) || extra.selectedLineIds.some((id: string) => !job.items.some((item: any, index: number) => quoteLineKey(item, index) === id)))) throw Error('Select valid quotation items.');
      const items = (job.items || []).map((item: any, index: number) => ({ ...item, approved: extra.selectedLineIds ? extra.selectedLineIds.includes(quoteLineKey(item, index)) : true }));
      if (!items.some((item: any) => item.approved) || !(quoteTotalCents(items) > 0)) throw Error('Select at least one repair to approve.');
      return withEvent(job, { items, status: 'Approved', quoteApproved: true, customerRequest: String(extra.customerRequest || '').trim().slice(0, 2000) }, 'approve');
    case 'changes':
      if (extra.reviewToken && extra.reviewToken !== quoteReviewToken(job)) throw Error('The quotation changed. Reopen the review.');
      if (job.paid || !['Awaiting approval', 'Approved'].includes(job.status)) throw Error('Repair choices can only change before payment or work starts.');
      return withEvent(job, { ...extra, status: 'Changes requested', quoteApproved: false }, 'changes');
    case 'withdraw-quote':
      if (!job.quoteId || job.quoteId === 'primary' || job.paid || job.quoteApproved || !['Confirmed', 'Awaiting approval', 'Changes requested'].includes(job.status)) throw Error('Only an unapproved additional quotation can be withdrawn.');
      return withEvent(job, { status: 'Withdrawn', quoteDraft: null }, 'withdraw-quote');
    case 'start-quote':
      if (!job.quoteId || job.quoteId === 'primary' || job.status !== 'Ready to start' || !job.quoteApproved || !job.paid) throw Error('Pay the additional quotation before starting its repairs.');
      return withEvent(job, { status: 'In progress' }, 'start-quote');
    case 'start':
      if (!['Ready to start', 'Approved'].includes(job.status) || !job.quoteApproved || !job.paid)
        throw Error('The customer must pay the approved quotation before work starts.');
      return withEvent(job, { status: 'In progress' }, 'start');
    case 'complete':
      if (job.status !== 'In progress') throw Error('Start the approved work first.');
      if (!extra.completionNotes?.trim())
        throw Error('Add work details before completing the job.');
      if (!job.paid) throw Error('The quotation must be paid before work can be finished.');
      return withEvent(job, { ...extra, status: 'Awaiting confirmation' }, 'complete');
    case 'confirm-work':
      if (job.status !== 'Awaiting confirmation' || !job.paid)
        throw Error('Only paid jobs awaiting customer confirmation can be completed.');
      return withEvent(job, { status: 'Completed', confirmedAt: new Date().toISOString() }, 'confirm-work');
    case 'dispute-work':
      if (job.status !== 'Awaiting confirmation') throw Error('Only finished work can be disputed here.');
      if (!String(extra.reason || '').trim() || String(extra.reason).trim().length < 10)
        throw Error('Explain the issue in at least 10 characters.');
      return withEvent(job, { status: 'Disputed', disputeStatus: 'OPEN', disputeReason: String(extra.reason).trim() }, 'dispute-work');
    case 'resolve-accept':
    case 'resolve-rework':
      if (job.status !== 'Disputed' || job.disputeStatus !== 'OPEN') throw Error('An open dispute is required.');
      if (String(extra.reason || '').trim().length < 10) throw Error('Provide admin resolution notes.');
      return withEvent(job, {
        status: action === 'resolve-accept' ? 'Completed' : 'In progress',
        disputeStatus: action === 'resolve-accept' ? 'RESOLVED_ACCEPTED' : 'RESOLVED_REWORK',
        disputeResolution: String(extra.reason).trim(), disputeResolvedAt: new Date().toISOString(),
      }, action);
    case 'pay':
      if (extra.reviewToken && extra.reviewToken !== quoteReviewToken(job)) throw Error('The payable quotation changed. Reopen checkout.');
      if (!['Approved', 'Awaiting payment'].includes(job.status) || !job.quoteApproved)
        throw Error('Approve the quotation before paying.');
      if (job.paid === true) throw Error('This invoice has already been paid.');
      return withEvent(
        job,
        {
          status: 'Ready to start',
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
