import type { LiveUser } from './api';

const bookingStatus: Record<string, string> = {
  REQUESTED: 'Requested',
  CONFIRMED: 'Confirmed',
  APPROVED: 'Approved',
  IN_PROGRESS: 'In progress',
  AWAITING_PAYMENT: 'Awaiting payment',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
};

const applicationStatus: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Pending review',
  CHANGES_REQUESTED: 'Changes requested',
  APPROVED: 'Approved',
  SUSPENDED: 'Suspended',
};

export function emptyWorkspace() {
  return {
    settings: {
      id: '',
      name: '',
      email: '',
      phone: '',
      city: '',
      photo: '',
      emailUpdates: false,
    },
    customers: [] as any[],
    vehicles: [] as any[],
    jobs: [] as any[],
    records: [] as any[],
    messages: [] as any[],
    conversationReads: {},
    notifications: [] as any[],
    documents: [] as any[],
    reviews: [] as any[],
    customerReviews: [] as any[],
    historyAccess: [] as any[],
    reports: [] as any[],
    adminActivity: [] as any[],
    application: { status: 'Draft', note: '', submittedAt: '', previouslyApproved: false },
    profile: {
      id: '',
      name: '',
      type: 'Workshop',
      city: '',
      phone: '',
      bio: '',
      about: '',
      services: [] as string[],
      address: '',
      website: '',
      fee: null,
      version: 0,
      latitude: null,
      longitude: null,
    },
    mechanicAccount: { name: '', email: '', emailUpdates: false, professionalId: '' },
    mechanicBanking: null,
    adminAccount: { name: '', email: '' },
    platform: { pilot: true, applicationsOpen: true, managedByServer: true },
    disputes: [] as any[],
  };
}

function localParts(value: string) {
  const when = new Date(value);
  if (Number.isNaN(when.getTime())) return { date: '', time: '' };
  const month = String(when.getMonth() + 1).padStart(2, '0');
  const day = String(when.getDate()).padStart(2, '0');
  return {
    date: `${when.getFullYear()}-${month}-${day}`,
    time: when.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false }),
  };
}

function lineItems(quote: any) {
  return (quote?.lines || []).map((line: any) => ({
    id: line.id,
    name: line.description,
    category: line.category,
    quantity: line.quantity,
    unitPriceCents: line.unitPriceCents,
    amount: (line.quantity * line.unitPriceCents) / 100,
    approved: line.selected !== false,
  }));
}

function quoteView(quote: any) {
  const paid = Boolean(quote.payment);
  const draft = quote.status === 'DRAFT';
  const status =
    quote.status === 'SENT'
      ? 'Awaiting approval'
      : quote.status === 'CHANGES_REQUESTED'
        ? 'Changes requested'
        : quote.status === 'WITHDRAWN'
          ? 'Withdrawn'
          : quote.status === 'IN_PROGRESS'
            ? 'In progress'
            : quote.status === 'APPROVED' || quote.status === 'PAID'
              ? 'Approved'
              : 'Confirmed';
  return {
    quoteId: quote.id,
    serverQuoteId: quote.id,
    quoteNumber: quote.number,
    quoteVersion: quote.version,
    status,
    items: draft ? [] : lineItems(quote),
    notes: quote.notes || '',
    quoteDraft: draft
      ? { items: lineItems(quote), notes: quote.notes || '', updatedAt: quote.createdAt }
      : null,
    quoteApproved: ['APPROVED', 'IN_PROGRESS', 'PAID'].includes(quote.status) || paid,
    paid,
    paidAt: quote.payment?.paidAt || '',
    paymentReference: quote.payment?.providerReference || '',
    testPayment: quote.payment?.provider === 'TEST',
    customerRequest: quote.customerRequest || '',
    changeRequest: quote.status === 'CHANGES_REQUESTED' ? quote.customerRequest || '' : '',
  };
}

export function mapBooking(row: any) {
  const when = localParts(row.appointmentAt);
  const quotes = [...(row.quotes || [])].sort((a: any, b: any) => a.number - b.number);
  const visible = quotes.filter((quote: any) => quote.status !== 'WITHDRAWN');
  const primary = visible[0] ? quoteView(visible[0]) : null;
  let status = bookingStatus[row.status] || row.status;
  if (row.status === 'CONFIRMED' && primary && !['Confirmed', 'Withdrawn'].includes(primary.status))
    status = primary.status;
  const vehicleLabel = [row.vehicle?.year, row.vehicle?.make, row.vehicle?.model]
    .filter(Boolean)
    .join(' ');
  const messages = (row.messages || []).map((message: any) => ({
    id: message.id,
    bookingId: row.id,
    clientMessageId: message.clientRequestId,
    senderId: message.authorId,
    senderRole: String(message.author?.role || 'CUSTOMER').toLowerCase(),
    senderName: message.author?.name || '',
    body: message.body,
    createdAt: message.createdAt,
  }));
  return {
    id: row.id,
    reference: '',
    version: row.version,
    clientRequestId: row.clientRequestId,
    provider: row.professional?.name || '',
    professionalId: row.professionalId,
    professionalLink: 'resolved',
    vehicle: vehicleLabel,
    vehicleLabel,
    vehicleId: row.vehicleId,
    vehicleLink: 'resolved',
    registration: row.vehicle?.registration || '',
    customerId: row.customerId,
    customerName: row.customer?.name || '',
    date: when.date,
    time: when.time,
    description: row.description || '',
    fee: null,
    pricingModel: 'quotation-inclusive',
    status,
    accepted: !['REQUESTED', 'REJECTED'].includes(row.status),
    rejectionReason: row.rejectionReason || '',
    completionNotes: row.completionNotes || '',
    items: primary?.items || [],
    notes: primary?.notes || '',
    quoteDraft: primary?.quoteDraft || null,
    quoteApproved: primary?.quoteApproved || false,
    paid: primary?.paid || false,
    paidAt: primary?.paidAt || '',
    paymentReference: primary?.paymentReference || '',
    testPayment: primary?.testPayment || false,
    quoteId: 'primary',
    serverQuoteId: primary?.serverQuoteId || '',
    quoteNumber: primary?.quoteNumber || 1,
    quoteVersion: primary?.quoteVersion || 0,
    customerRequest: primary?.customerRequest || '',
    changeRequest: primary?.changeRequest || '',
    additionalQuotes: visible.slice(1).map((quote: any) => quoteView(quote)),
    createdAt: row.createdAt,
    city: row.professional?.city || '',
    type: row.professional?.type || '',
    messages,
  };
}

export function mapVehicle(row: any) {
  return {
    ...row,
    archived: Boolean(row.archivedAt),
    licenceDiscExpiry: row.licenceDiscExpiry || '',
    nextServiceDate: row.nextServiceDate || '',
  };
}

export function mapRecords(vehicleId: string, history: any[]) {
  return (history || []).map((record: any) => ({
    id: record.id,
    vehicleId,
    bookingId: record.bookingId,
    date: record.createdAt,
    title: 'Completed service',
    notes: record.notes || '',
    repairs: record.repairs || [],
  }));
}

export function mapNotification(note: any, role: string) {
  const topic = note.topic || '';
  return {
    id: String(note.id),
    recipientId: note.userId,
    recipientRole: role,
    type:
      topic === 'booking'
        ? 'request'
        : topic === 'quotation'
          ? 'quote'
          : topic === 'message'
            ? 'message'
            : topic === 'payment'
              ? 'payment'
              : 'account',
    title: note.title || 'Update',
    message: note.title || '',
    text: note.title || '',
    createdAt: note.createdAt,
    read: Boolean(note.readAt),
    bookingId: ['booking', 'quotation', 'message', 'payment', 'history-access'].includes(topic)
      ? note.resourceId
      : undefined,
    topic,
    resourceId: note.resourceId,
  };
}

export function mapApplication(row: any) {
  const status = applicationStatus[row.status] || row.status;
  return {
    id: row.id,
    name: row.name || '',
    type: row.type || '',
    city: row.city || '',
    phone: row.phone || '',
    email: row.email || row.user?.email || '',
    status,
    note: row.reviewNote || '',
    previouslyApproved: status === 'Approved' || status === 'Suspended' || Boolean(row.credentialId),
    version: row.version,
    date: row.updatedAt || row.createdAt || '',
    services: row.services || [],
    about: row.about || '',
    address: row.address || '',
    credentialId: row.credentialId || '',
    documents: row.user?.documents || row.documents || [],
    own: false,
  };
}

export function mapUserAccount(user: LiveUser) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || '',
    photo: user.photo || '',
    emailUpdates: Boolean(user.emailUpdates),
    city: '',
  };
}

export function appointmentStamp(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const local = new Date(year, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0);
  const offset = -local.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const abs = Math.abs(offset);
  const hours = String(Math.floor(abs / 60)).padStart(2, '0');
  const minutes = String(abs % 60).padStart(2, '0');
  return `${date}T${String(hour || 0).padStart(2, '0')}:${String(minute || 0).padStart(2, '0')}:00${sign}${hours}:${minutes}`;
}

export function quoteLines(items: any[]) {
  return (items || []).map((item, index) => {
    const name = String(item?.name || '').trim();
    const category = item?.category;
    const quantity =
      Number.isInteger(item?.quantity) && item.quantity > 0 ? item.quantity : 1;
    const unit =
      Number.isInteger(item?.unitPriceCents) && item.unitPriceCents > 0
        ? item.unitPriceCents
        : Math.round(Number(item?.amount) * 100);
    if (!name || !['assessment', 'labour', 'parts', 'other'].includes(category) || unit <= 0)
      throw Error(`Add a type, description, and price for line ${index + 1}.`);
    return { description: name, category, quantity, unitPriceCents: unit };
  });
}
