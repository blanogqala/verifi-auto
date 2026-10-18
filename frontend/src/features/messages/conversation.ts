import { demoCustomerId } from '../admin/customerRecords';
import { textValue } from '../demo/links';
import { customerOwnsJob, jobProfessionalId } from '../identity/participants';
import { bookingReference } from '../jobs/jobViews';
import { appendNotification } from '../notifications/inbox';

export const messageLimit = 2000;

export function messagesForBooking(data: any, bookingId: string) {
  return (Array.isArray(data?.messages) ? data.messages : [])
    .filter((message: any) => message?.bookingId === bookingId)
    .slice()
    .sort((a: any, b: any) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

export function conversationLocked(status: unknown) {
  if (status === 'Completed') return 'This conversation is closed because the booking is complete.';
  if (status === 'Rejected') return 'This conversation is closed because the request was rejected.';
  if (status === 'Cancelled') return 'This conversation is closed because the request was cancelled.';
  return '';
}

export function canAccessConversation(data: any, job: any, role: string, id: string) {
  if (!job) return false;
  if (role === 'customer') return customerOwnsJob(data, job, id);
  if (role === 'mechanic') {
    const professionalId = jobProfessionalId(job, data);
    return !!professionalId && professionalId === id;
  }
  return false;
}

export function unreadMessages(data: any, bookingId: string, role: 'customer' | 'mechanic') {
  const readAt = textValue(data?.conversationReads?.[bookingId]?.[role]);
  return messagesForBooking(data, bookingId).filter((message: any) => {
    if (message.senderRole === role) return false;
    if (!readAt) return true;
    return String(message.createdAt) > readAt;
  });
}

export function unreadMessageCount(data: any, bookingId: string, role: 'customer' | 'mechanic') {
  return unreadMessages(data, bookingId, role).length;
}

export function markConversationRead(
  data: any,
  input: { bookingId: string; role: 'customer' | 'mechanic'; id: string; now?: string },
) {
  const job = (data.jobs || []).find((item: any) => item.id === input.bookingId);
  if (!job || !canAccessConversation(data, job, input.role, input.id)) return data;
  const messages = messagesForBooking(data, input.bookingId);
  if (!messages.length) return data;
  const latest = messages.reduce((max: string, message: any) => (String(message.createdAt) > max ? String(message.createdAt) : max), '');
  const current = textValue(data?.conversationReads?.[input.bookingId]?.[input.role]);
  if (current && latest && current >= latest) return data;
  const readAt = input.now && input.now >= latest ? input.now : latest;
  return {
    ...data,
    conversationReads: {
      ...(data.conversationReads || {}),
      [input.bookingId]: {
        ...(data.conversationReads?.[input.bookingId] || {}),
        [input.role]: readAt,
      },
    },
  };
}

function otherParty(job: any, role: 'customer' | 'mechanic') {
  if (role === 'customer') {
    const id = textValue(job.professionalId);
    return id ? { role: 'mechanic' as const, id } : null;
  }
  return { role: 'customer' as const, id: textValue(job.customerId) || demoCustomerId };
}

export function sendMessage(
  data: any,
  input: {
    bookingId: string;
    role: 'customer' | 'mechanic';
    id: string;
    name: string;
    body: string;
    clientMessageId: string;
    now?: string;
  },
) {
  const job = (data.jobs || []).find((item: any) => item.id === input.bookingId);
  if (!job) throw Error('Booking not found.');
  if (!canAccessConversation(data, job, input.role, input.id)) throw Error('You cannot message on this booking.');
  const locked = conversationLocked(job.status);
  if (locked) throw Error(locked);
  const body = String(input.body || '').replace(/\r\n/g, '\n').trim();
  if (!body) throw Error('Write a message before sending.');
  if (body.length > messageLimit) throw Error(`Keep the message under ${messageLimit} characters.`);
  const clientMessageId = textValue(input.clientMessageId);
  if (!clientMessageId) throw Error('This message could not be identified.');
  const existing = (data.messages || []).find((message: any) => message?.id === clientMessageId || message?.clientMessageId === clientMessageId);
  if (existing) return { data, message: existing, duplicate: true };
  const now = input.now || new Date().toISOString();
  const message = {
    id: clientMessageId,
    clientMessageId,
    bookingId: job.id,
    senderId: input.id,
    senderRole: input.role,
    senderName: textValue(input.name) || (input.role === 'customer' ? 'Customer' : 'Mechanic'),
    body,
    createdAt: now,
  };
  const recipient = otherParty(job, input.role);
  let next = { ...data, messages: [...(Array.isArray(data.messages) ? data.messages : []), message] };
  if (recipient) {
    const snippet = body.length > 140 ? `${body.slice(0, 137)}...` : body;
    next = appendNotification(next, {
      recipientRole: recipient.role,
      recipientId: recipient.id,
      type: 'message',
      title: 'New message',
      message: `${bookingReference(job)}: ${snippet}`,
      createdAt: now,
      bookingId: job.id,
      panel: 'messages',
      eventKey: `message:${message.id}`,
    });
  }
  return { data: next, message, duplicate: false };
}
