import { demoCustomerId } from '../admin/customerRecords';
import { textValue } from '../demo/links';
import { customerIdOf, jobProfessionalId, participantId } from '../identity/participants';
import { bookingReference, isAcceptedJob, isCancelledRequest, isRejectedRequest } from '../jobs/jobViews';
import { canVisit } from '../../routes/access';

export type NotificationRecord = {
  id: string;
  recipientId: string;
  recipientRole: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  bookingId: string;
  panel: string;
  eventKey: string;
  section: string;
  legacy: boolean;
  text: string;
};

export const notificationTypeLabel: Record<string, string> = {
  request: 'Requests',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  quote: 'Quotations',
  'quote-revised': 'Quotations',
  approved: 'Approvals',
  changes: 'Changes',
  started: 'Work',
  completed: 'Work',
  payment: 'Payments',
  message: 'Messages',
  account: 'Account',
  'var-request': 'Vehicle history',
  'work-report': 'Work reports',
};

export function notificationLabel(type: string) {
  return notificationTypeLabel[type] || 'Updates';
}

export function appendNotification(data: any, input: any) {
  const notifications = Array.isArray(data?.notifications) ? data.notifications : [];
  const eventKey = textValue(input?.eventKey);
  if (eventKey && notifications.some((item: any) => item?.eventKey === eventKey)) return data;
  const message = textValue(input?.message) || textValue(input?.text);
  const record = {
    id: textValue(input?.id) || crypto.randomUUID(),
    recipientId: textValue(input?.recipientId),
    recipientRole: textValue(input?.recipientRole),
    type: textValue(input?.type) || 'account',
    title: textValue(input?.title) || 'Update',
    message,
    text: message,
    createdAt: typeof input?.createdAt === 'string' ? input.createdAt : new Date().toISOString(),
    read: input?.read === true,
    bookingId: textValue(input?.bookingId),
    panel: textValue(input?.panel),
    eventKey,
    section: textValue(input?.section),
    legacy: input?.legacy === true,
  };
  return { ...data, notifications: [record, ...notifications] };
}

export function normalizeNotification(item: any, customerId: string): NotificationRecord | null {
  if (!item || typeof item !== 'object') return null;
  const id = textValue(item.id);
  if (!id) return null;
  const role = textValue(item.recipientRole);
  const known = role === 'customer' || role === 'mechanic' || role === 'admin';
  const message = typeof item.message === 'string' && item.message.trim() ? item.message.trim() : textValue(item.text);
  return {
    id,
    recipientRole: known ? role : 'customer',
    recipientId: known ? textValue(item.recipientId) : customerId,
    type: textValue(item.type) || 'account',
    title: textValue(item.title) || (message ? 'Update' : 'Update'),
    message,
    text: typeof item.text === 'string' ? item.text : message,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
    read: item.read === true,
    bookingId: textValue(item.bookingId),
    panel: textValue(item.panel),
    eventKey: textValue(item.eventKey),
    section: textValue(item.section),
    legacy: !known,
  };
}

export function notificationsFor(data: any, role: string, id: string) {
  const customerId = customerIdOf(data);
  return (Array.isArray(data?.notifications) ? data.notifications : []).filter((item: any) => {
    if (!item || typeof item !== 'object') return false;
    if (item.recipientRole && item.recipientId) return item.recipientRole === role && item.recipientId === id;
    return !item.recipientRole && role === 'customer' && id === customerId;
  });
}

/** Associate unread notices with the exact card/section that contains the action. */
export function bookingNotificationSection(note: any): 'var' | 'activity' | 'quote' | 'messages' | 'overview' {
  const topic = textValue(note?.topic);
  const type = textValue(note?.type);
  const title = textValue(note?.title).toLowerCase();
  if (type === 'var-request' || (topic === 'history-access' && (title.includes('request') || title.includes('var')))) return 'var';
  if (type === 'work-report' || title.includes('work report updated')) return 'activity';
  if (note?.panel === 'quote' || type === 'quote' || topic === 'quotation' || topic === 'payment') return 'quote';
  if (note?.panel === 'messages' || type === 'message' || topic === 'message') return 'messages';
  return 'overview';
}

export function unreadBookingNotices(data: any, role: string, bookingId?: string, section?: string) {
  const self = participantId(data, role);
  return notificationsFor(data, role, self).filter((note: any) =>
    !note.read && !!note.bookingId &&
    (!bookingId || note.bookingId === bookingId) &&
    (!section || bookingNotificationSection(note) === section));
}

export function unreadBookingIds(data: any, role: string): string[] {
  return [...new Set<string>(unreadBookingNotices(data, role).map((note: any) => String(note.bookingId)))];
}

export function unreadNotificationCount(data: any, role: string, id = participantId(data, role)) {
  return notificationsFor(data, role, id).filter((item: any) => item.read !== true).length;
}

/** New appointment attention is tied to a specific unread backend event.
 * Visiting the appointment list does not acknowledge it.
 */
export function unreadAppointmentRequestIds(data: any, jobs: any[]): string[] {
  const self = participantId(data, 'mechanic');
  const pending = new Set(
    (jobs || []).filter((job: any) => job.status === 'Requested').map((job: any) => job.id),
  );
  return [...new Set<string>(
    notificationsFor(data, 'mechanic', self)
      .filter((note: any) =>
        !note.read &&
        pending.has(note.bookingId) &&
        (note.title === 'New assessment request' || note.title === 'URGENT roadside assistance request' ||
          (note.type === 'request' && /^new (assessment )?request\b/i.test(note.title || ''))),
      )
      .map((note: any) => String(note.bookingId)),
  )];
}

export function markNotificationsRead(data: any, input: { role: string; id: string; ids?: string[] | 'all' }) {
  const mine = new Set(notificationsFor(data, input.role, input.id).map((item: any) => item.id));
  const chosen =
    input.ids === 'all' || !input.ids ? mine : new Set(input.ids.filter((id) => mine.has(id)));
  if (!chosen.size) return data;
  let changed = false;
  const notifications = (data.notifications || []).map((item: any) => {
    if (!chosen.has(item?.id) || item.read === true) return item;
    changed = true;
    return { ...item, read: true };
  });
  return changed ? { ...data, notifications } : data;
}

function encodeId(id: string) {
  return encodeURIComponent(id);
}

/** Internal dashboard path. External URLs are never returned. */
export function notificationDestination(data: any, role: string, note: any) {
  if (!note || note.recipientRole !== role) return null;
  const self = participantId(data, role);
  if (note.recipientId && note.recipientId !== self) return null;
  if (role === 'admin') {
    const section = textValue(note.section) || 'reports/support';
    const path = `dashboard/${section}`;
    return canVisit('admin', path) ? path : null;
  }
  const bookingId = textValue(note.bookingId);
  if (!bookingId) return null;
  const job = (data?.jobs || []).find((item: any) => item?.id === bookingId);
  if (!job) return null;
  const section = bookingNotificationSection(note);
  const panel = section === 'messages' || section === 'quote' ? section : '';
  const suffix = panel ? `/${panel}` : '';
  if (role === 'customer') {
    if ((textValue(job.customerId) || demoCustomerId) !== self) return null;
    const path = `dashboard/bookings/${encodeId(bookingId)}${section === 'var' ? '/var' : section === 'activity' ? '/activity' : suffix}`;
    return canVisit('customer', path) ? path : null;
  }
  if (role === 'mechanic') {
    if (jobProfessionalId(job, data) !== self) return null;
    if (!isAcceptedJob(job)) {
      const section = isRejectedRequest(job) ? 'rejected' : isCancelledRequest(job) ? 'cancelled' : job.kind === 'EMERGENCY' ? 'emergency' : 'pending';
      const path = `dashboard/appointments/${section}/${encodeId(bookingId)}`;
      return canVisit('mechanic', path) ? path : null;
    }
    const path = `dashboard/jobs/${encodeId(bookingId)}${suffix}`;
    return canVisit('mechanic', path) ? path : null;
  }
  return null;
}

export function notificationDay(value: string) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'Date not recorded';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium' }).format(date);
}

export function transitionNotifications(before: any, job: any, action: string) {
  const reference = bookingReference(job);
  const customerId = textValue(job.customerId) || demoCustomerId;
  const professionalId = textValue(job.professionalId);
  const at = Array.isArray(job.events) && job.events.length ? job.events[job.events.length - 1].at : new Date().toISOString();
  const version = job.quoteVersion || 1;
  const customer = (input: any) => ({ recipientRole: 'customer', recipientId: customerId, createdAt: at, bookingId: job.id, ...input });
  const mechanic = (input: any) =>
    professionalId ? [{ recipientRole: 'mechanic', recipientId: professionalId, createdAt: at, bookingId: job.id, ...input }] : [];
  if (action === 'confirm') {
    return [customer({ type: 'accepted', title: 'Request accepted', message: `${reference} is confirmed.`, panel: 'overview', eventKey: `accepted:${job.id}` })];
  }
  if (action === 'reject') {
    return [customer({ type: 'rejected', title: 'Request rejected', message: job.rejectionReason ? `${reference}: ${job.rejectionReason}` : `${reference} was rejected.`, panel: 'overview', eventKey: `rejected:${job.id}` })];
  }
  if (action === 'cancel') {
    return mechanic({ type: 'cancelled', title: 'Request cancelled', message: `${reference} was cancelled by the customer.`, panel: 'overview', eventKey: `cancelled:${job.id}` });
  }
  if (action === 'quote') {
    const revised = ['Awaiting approval', 'Changes requested'].includes(before?.status);
    return [customer({
      type: revised ? 'quote-revised' : 'quote',
      title: revised ? 'Quotation updated' : 'Quotation ready',
      message: revised ? `${reference} has a revised quotation to review.` : `${reference} has a quotation to review.`,
      panel: 'quote',
      eventKey: `quote:${job.id}:v${version}`,
    })];
  }
  if (action === 'approve') {
    return mechanic({ type: 'approved', title: 'Quotation approved', message: `${reference}: selected repairs approved.${job.customerRequest ? ' Customer also sent an additional request; review before starting.' : ''}`, panel: 'quote', eventKey: `approved:${job.id}:v${version}:${job.events?.length || 0}` });
  }
  if (action === 'changes') {
    const feedback = textValue(job.changeRequest);
    return mechanic({ type: 'changes', title: 'Changes requested', message: feedback ? `${reference}: ${feedback}` : `${reference} needs a revised quotation.`, panel: 'quote', eventKey: `changes:${job.id}:v${version}:${job.events?.length || 0}` });
  }
  if (action === 'withdraw-quote' || action === 'start-quote') {
    return [customer({ type: 'quote', title: action === 'withdraw-quote' ? 'Quotation withdrawn' : 'Additional repairs started', message: `${reference}: ${action === 'withdraw-quote' ? 'this additional quotation was withdrawn.' : 'approved additional repairs are in progress.'}`, panel: 'quote', eventKey: `${action}:${job.id}` })];
  }
  if (action === 'start') {
    return [customer({ type: 'started', title: 'Work started', message: `${reference} is in progress.`, panel: 'overview', eventKey: `started:${job.id}` })];
  }
  if (action === 'complete') {
    return [customer({ type: 'completed', title: 'Work finished', message: job.status === 'Completed' ? `${reference} is complete; demo payment was already recorded.` : `${reference} is ready for payment.`, panel: 'quote', eventKey: `completed:${job.id}` })];
  }
  if (action === 'pay') {
    return mechanic({ type: 'payment', title: 'Demo payment recorded', message: `${reference} has a recorded demo payment.`, panel: 'quote', eventKey: `payment:${job.id}` });
  }
  return [];
}
