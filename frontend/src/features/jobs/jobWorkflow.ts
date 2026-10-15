export function quoteTotal(job: any) {
  return (job.items || []).reduce((s: number, i: any) => s + Number(i.amount), 0);
}
export function transitionJob(job: any, action: string, extra: any = {}) {
  switch (action) {
    case 'confirm':
      if (job.status !== 'Requested') throw Error('Only a new request can be confirmed.');
      return { ...job, status: 'Confirmed', accepted: true, quoteApproved: false };
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
      return { ...job, ...extra, status: 'Awaiting approval', quoteApproved: false };
    case 'approve':
      if (job.status !== 'Awaiting approval') throw Error('This quote is not awaiting approval.');
      return { ...job, status: 'Approved', quoteApproved: true };
    case 'changes':
      if (job.status !== 'Awaiting approval') throw Error('This quote is not awaiting approval.');
      return { ...job, ...extra, status: 'Changes requested' };
    case 'start':
      if (job.status !== 'Approved' || !job.quoteApproved)
        throw Error('Customer approval is required first.');
      return { ...job, status: 'In progress' };
    case 'complete':
      if (job.status !== 'In progress') throw Error('Start the approved work first.');
      if (!extra.completionNotes?.trim())
        throw Error('Add work details before completing the job.');
      return { ...job, ...extra, status: 'Awaiting payment' };
    case 'pay':
      if (job.status !== 'Awaiting payment' || !job.quoteApproved)
        throw Error('Only completed approved work can be paid.');
      return { ...job, status: 'Completed', paid: true };
    case 'reject':
      if (job.status !== 'Requested') throw Error('Only a pending request can be rejected.');
      if (!extra.reason?.trim()) throw Error('Add a short reason for rejecting this request.');
      return {
        ...job,
        status: 'Rejected',
        accepted: false,
        rejectionReason: extra.reason.trim(),
      };
    case 'cancel':
      if (!['Requested', 'Confirmed'].includes(job.status))
        throw Error('This request cannot be cancelled at this stage.');
      return {
        ...job,
        status: 'Cancelled',
        accepted: job.status === 'Confirmed' ? true : job.accepted === true,
      };
    default:
      throw Error('Unknown action');
  }
}
