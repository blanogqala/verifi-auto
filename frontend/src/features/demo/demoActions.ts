import { phoneError, normalizePhone } from '../account/phoneNumber';
import { demoCustomerId } from '../admin/customerRecords';
import { grantHistoryAccess, revokeHistoryAccess, settleHistoryAccess } from '../garage/historyAccess';
import { transitionJob } from '../jobs/jobWorkflow';
import { deleteCustomerReview, saveCustomerReview } from '../reviews/customerReviews';
import { activeVehicles, historyCouldBelongTo, textValue, vehicleOptionLabel, vehicleSnapshot } from './links';

function customerIdOf(data: any) {
  return textValue(data?.settings?.id) || demoCustomerId;
}

function readableBookingReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `VA-${code}`;
}

export function createBooking(
  data: any,
  input: {
    professional: any;
    vehicle: any;
    date: string;
    time: string;
    description: string;
    customerId?: string;
    clientRequestId: string;
    now?: string;
  },
) {
  const requestId = textValue(input.clientRequestId);
  if (!requestId) throw Error('This request could not be identified.');
  const existing = (data.jobs || []).find((job: any) => job.clientRequestId === requestId);
  if (existing) return { data, job: existing, duplicate: true };
  const professionalId = textValue(input.professional?.id);
  const vehicle = activeVehicles(data.vehicles || []).find((item) => item.id === input.vehicle?.id);
  if (!professionalId || !input.professional?.name) throw Error('Choose a professional.');
  if (!vehicle) throw Error('Choose one of your active vehicles.');
  const description = textValue(input.description);
  if (description.length < 3) throw Error('Describe the symptoms or service you need.');
  if (!input.date || !input.time) throw Error('Choose a preferred date and time.');
  const now = input.now || new Date().toISOString();
  const customerId = input.customerId || customerIdOf(data);
  const label = vehicleSnapshot(vehicle);
  const job = {
    id: crypto.randomUUID(),
    reference: readableBookingReference(),
    clientRequestId: requestId,
    provider: input.professional.name,
    professionalId,
    professionalLink: 'resolved',
    vehicle: label,
    vehicleLabel: label,
    vehicleId: vehicle.id,
    vehicleLink: 'resolved',
    registration: vehicle.registration,
    date: input.date,
    time: input.time,
    fee: input.professional.fee,
    description,
    status: 'Requested',
    accepted: false,
    items: [],
    notes: '',
    quoteApproved: false,
    paid: false,
    customerId,
    createdAt: now,
    events: [{ at: now, type: 'request', label: 'Assessment requested' }],
  };
  return {
    data: {
      ...data,
      jobs: [job, ...(data.jobs || [])],
      notifications: [
        { id: crypto.randomUUID(), text: 'Your sample assessment request was created.', read: false },
        ...(data.notifications || []),
      ],
    },
    job,
    duplicate: false,
  };
}

export function updateRequestedBooking(
  data: any,
  input: {
    bookingId: string;
    customerId: string;
    vehicleId: string;
    date: string;
    time: string;
    description: string;
  },
) {
  const job = (data.jobs || []).find((item: any) => item.id === input.bookingId);
  if (!job) throw Error('Booking not found.');
  const owner = textValue(job.customerId) || demoCustomerId;
  if (owner !== input.customerId) throw Error('Only the customer who made this request can edit it.');
  if (job.status !== 'Requested' || job.items?.length || job.quoteApproved || job.paid)
    throw Error('This request can only be edited before it is accepted.');
  const vehicle = activeVehicles(data.vehicles || []).find((item) => item.id === input.vehicleId);
  if (!vehicle) throw Error('Choose one of your active vehicles.');
  const description = textValue(input.description);
  if (description.length < 3) throw Error('Describe the symptoms or service you need.');
  if (!input.date || !input.time) throw Error('Choose a preferred date and time.');
  const label = vehicleSnapshot(vehicle);
  const next = {
    ...job,
    vehicle: label,
    vehicleLabel: label,
    vehicleId: vehicle.id,
    vehicleLink: 'resolved',
    registration: vehicle.registration,
    date: input.date,
    time: input.time,
    description,
  };
  return {
    ...data,
    jobs: data.jobs.map((item: any) => (item.id === job.id ? next : item)),
  };
}

export function applyJobTransition(data: any, job: any, action: string, extra: any = {}) {
  const current = (data.jobs || []).find((item: any) => item.id === job?.id) || job;
  const changed = transitionJob(current, action, extra);
  const last = Array.isArray(changed.events) ? changed.events[changed.events.length - 1] : null;
  const at = last?.at || new Date().toISOString();
  let records = Array.isArray(data.records) ? data.records : [];
  if (action === 'pay' && !records.some((record: any) => record.id === changed.id)) {
    records = [
      {
        id: changed.id,
        title: 'Completed repair',
        date: at.slice(0, 10),
        vehicle: changed.vehicleLabel || changed.vehicle,
        vehicleLabel: changed.vehicleLabel || changed.vehicle,
        vehicleId: changed.vehicleId || '',
        vehicleLink: changed.vehicleId ? 'resolved' : changed.vehicleLink || 'unmatched',
        professionalId: changed.professionalId || '',
        professionalLink: changed.professionalId ? 'resolved' : changed.professionalLink || 'unmatched',
        customerId: changed.customerId || '',
        mileage: extra.mileage || changed.completedMileage || 'Not recorded',
        notes: changed.completionNotes,
        provider: changed.provider,
        source: 'mechanic',
      },
      ...records,
    ];
  }
  return {
    data: {
      ...data,
      jobs: (data.jobs || []).map((item: any) => (item.id === changed.id ? changed : item)),
      records,
      historyAccess: settleHistoryAccess(data, changed, action, at),
    },
    job: changed,
  };
}

export function saveCustomerProfile(
  data: any,
  input: { name: string; email: string; phone: string; emailUpdates: boolean; photo?: string },
) {
  const phoneMessage = phoneError(input.phone);
  if (phoneMessage) throw Error(phoneMessage);
  const name = textValue(input.name);
  const email = textValue(input.email);
  if (!name) throw Error('Enter your full name.');
  if (!email.includes('@')) throw Error('Enter an email address.');
  const phone = normalizePhone(input.phone);
  const id = customerIdOf(data);
  const settings = {
    ...data.settings,
    id,
    name,
    email,
    phone,
    emailUpdates: input.emailUpdates === true,
    photo: typeof input.photo === 'string' ? input.photo : data.settings?.photo || '',
  };
  const customers = (Array.isArray(data.customers) ? data.customers : []).map((customer: any) =>
    customer?.id === id ? { ...customer, name, email, phone, city: settings.city || customer.city } : customer,
  );
  const hasLinked = customers.some((customer: any) => customer?.id === id);
  return {
    ...data,
    settings,
    customers: hasLinked
      ? customers
      : [{ id, name, email, phone, city: settings.city || '', sample: true }, ...customers],
  };
}

export function saveVehicle(data: any, vehicle: any) {
  const next = {
    id: textValue(vehicle.id) || crypto.randomUUID(),
    make: textValue(vehicle.make),
    model: textValue(vehicle.model),
    year: String(vehicle.year || '').trim(),
    registration: textValue(vehicle.registration),
    mileage: String(vehicle.mileage ?? '').trim(),
    licenceDiscExpiry: textValue(vehicle.licenceDiscExpiry),
    licenceDiscSource: vehicle.licenceDiscSource === 'mechanic' ? 'mechanic' : 'owner',
    nextServiceDate: textValue(vehicle.nextServiceDate),
    nextServiceMileage: textValue(vehicle.nextServiceMileage),
    nextServiceSource: vehicle.nextServiceSource === 'mechanic' ? 'mechanic' : 'owner',
    archived: vehicle.archived === true,
    variant: textValue(vehicle.variant),
    bodyStyle: textValue(vehicle.bodyStyle),
    paintColor: /^#[0-9a-fA-F]{6}$/.test(textValue(vehicle.paintColor)) ? textValue(vehicle.paintColor).toLowerCase() : '',
  };
  if (!next.make || !next.model || !next.year || !next.registration) throw Error('Complete the vehicle details.');
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const exists = vehicles.some((item: any) => item.id === next.id);
  return {
    ...data,
    vehicles: exists ? vehicles.map((item: any) => (item.id === next.id ? { ...item, ...next } : item)) : [...vehicles, next],
  };
}

function vehicleHasHistory(data: any, vehicleId: string) {
  const vehicle = (data.vehicles || []).find((item: any) => item.id === vehicleId);
  const items = [...(data.jobs || []), ...(data.records || [])];
  return items.some((item) => historyCouldBelongTo(item, vehicle));
}

export function removeOrArchiveVehicle(data: any, vehicleId: string) {
  const vehicles = Array.isArray(data.vehicles) ? data.vehicles : [];
  const vehicle = vehicles.find((item: any) => item.id === vehicleId);
  if (!vehicle) throw Error('Vehicle not found.');
  if (vehicleHasHistory(data, vehicleId)) {
    return {
      ...data,
      vehicles: vehicles.map((item: any) =>
        item.id === vehicleId ? { ...item, archived: true, archivedAt: new Date().toISOString() } : item,
      ),
    };
  }
  return { ...data, vehicles: vehicles.filter((item: any) => item.id !== vehicleId) };
}

/** Explicit customer confirmation. This does not guess a vehicle from a shared name. */
export function resolveHistoryVehicle(
  data: any,
  input: { recordId?: string; jobId?: string; vehicleId: string; confirmed: boolean; now?: string },
) {
  if (input.confirmed !== true) throw Error('Confirm which vehicle this history belongs to.');
  const vehicle = (data.vehicles || []).find((item: any) => item.id === input.vehicleId);
  if (!vehicle) throw Error('Choose a vehicle.');
  const now = input.now || new Date().toISOString();
  const apply = (item: any) => ({
    ...item,
    vehicleId: vehicle.id,
    vehicleLink: 'resolved',
    vehicleLinkCandidates: [vehicle.id],
    linkResolution: {
      at: now,
      vehicleId: vehicle.id,
      registration: vehicle.registration || '',
      label: vehicleOptionLabel(vehicle),
      source: 'manual',
      previous: item.vehicleLink || '',
    },
  });
  if (input.recordId) {
    const records = data.records || [];
    if (!records.some((record: any) => record.id === input.recordId)) throw Error('Record not found.');
    return {
      ...data,
      records: records.map((record: any) =>
        record.id === input.recordId
          ? apply(record)
          : record,
      ),
    };
  }
  if (input.jobId) {
    const jobs = data.jobs || [];
    if (!jobs.some((job: any) => job.id === input.jobId)) throw Error('Booking not found.');
    return {
      ...data,
      jobs: jobs.map((job: any) =>
        job.id === input.jobId
          ? apply(job)
          : job,
      ),
    };
  }
  throw Error('Choose a history record.');
}

export { grantHistoryAccess, revokeHistoryAccess, saveCustomerReview, deleteCustomerReview };
